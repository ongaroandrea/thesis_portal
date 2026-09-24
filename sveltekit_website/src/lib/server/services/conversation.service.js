import { createHash, createHmac, randomUUID } from 'node:crypto';
import { ApiError } from './api.service.js';

const JOBS_PATH = '/v1/jobs';
const ALLOWED_TYPES = new Set(['camera', 'texture', 'light', 'material']);

function configuration() {
	const baseUrl = process.env.PYTHON_SERVER_URL;
	const secret = process.env.PYTHON_SERVER_HMAC_SECRET;
	if (!baseUrl || !secret) {
		throw new ApiError(503, 'The conversation service is not configured.', 'CONVERSATION_SERVICE_UNAVAILABLE');
	}
	return { baseUrl, secret };
}

function isConfigured() {
	return Boolean(process.env.PYTHON_SERVER_URL && process.env.PYTHON_SERVER_HMAC_SECRET);
}

function signedHeaders(secret, method, path, body, contentType = 'application/json') {
	const timestamp = Math.floor(Date.now() / 1000).toString();
	const nonce = randomUUID();
	const bodyHash = createHash('sha256').update(body).digest('hex');
	const canonicalRequest = [method, path, timestamp, nonce, bodyHash].join('\n');
	const signature = createHmac('sha256', secret).update(canonicalRequest).digest('hex');
	return {
		'content-type': contentType,
		'X-Request-Timestamp': timestamp,
		'X-Request-Nonce': nonce,
		'X-Request-Signature': `v1=${signature}`
	};
}

function filePart(boundary, fieldName, image, filename, mimeType) {
	const safeFilename = String(filename || fieldName).replace(/[\r\n"]/g, '_');
	return [
		Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${safeFilename}"\r\nContent-Type: ${mimeType}\r\n\r\n`),
		image,
		Buffer.from('\r\n')
	];
}

function multipartImages(image, referenceImage, type) {
	if (!ALLOWED_TYPES.has(type)) throw new ApiError(400, 'Invalid correction type.', 'VALIDATION_ERROR');
	const boundary = `----correction-${randomUUID()}`;
	const chunks = [
		Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\n${type}\r\n`),
		...filePart(boundary, 'image', image.data, image.filename, image.mimeType),
		...filePart(boundary, 'reference_image', referenceImage.data, referenceImage.filename, referenceImage.mimeType),
		Buffer.from(`--${boundary}--\r\n`)
	];
	return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}

async function request(path, method, body = Buffer.alloc(0), contentType) {
	const { baseUrl, secret } = configuration();
	let response;
	try {
		response = await fetch(new URL(path, baseUrl), {
			method,
			body: method === 'GET' ? undefined : body,
			headers: signedHeaders(secret, method, path, body, contentType),
			signal: AbortSignal.timeout(10_000)
		});
	} catch (error) {
		console.error('Conversation service request failed:', error);
		throw new ApiError(503, 'The conversation service is unavailable.', 'CONVERSATION_SERVICE_UNAVAILABLE');
	}
	if (!response.ok) {
		const detail = await response.json().catch(() => ({}));
		if (response.status === 404) throw new ApiError(404, detail.detail || 'Analysis job not found.', 'CONVERSATION_JOB_NOT_FOUND');
		if (response.status === 503) throw new ApiError(503, 'The conversation queue is full. Try again later.', 'CONVERSATION_QUEUE_FULL');
		throw new ApiError(502, detail.detail || 'The conversation service rejected the request.', 'CONVERSATION_SERVICE_ERROR');
	}
	if (response.status === 204) return { destroyed: true };
	return response.json();
}

export const conversationService = {
	isConfigured,
	async start({ image, referenceImage, type }) {
		const payload = multipartImages(image, referenceImage, type);
		return request(JOBS_PATH, 'POST', payload.body, payload.contentType);
	},
	async get(jobId) {
		return request(`${JOBS_PATH}/${encodeURIComponent(jobId)}`, 'GET');
	},
	async destroy(jobId) {
		return request(`${JOBS_PATH}/${encodeURIComponent(jobId)}`, 'DELETE');
	}
};
