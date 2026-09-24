import { n as readJson, r as ApiError, t as apiResponse, u as requiredText } from "../../../../../../chunks/handler.js";
import { t as correctionSessionService } from "../../../../../../chunks/correction-session.service.js";
import { createHash, createHmac, randomUUID } from "node:crypto";
//#region src/lib/server/services/conversation.service.js
var JOBS_PATH = "/v1/jobs";
var ALLOWED_TYPES = /* @__PURE__ */ new Set([
	"camera",
	"texture",
	"light",
	"material"
]);
function configuration() {
	const baseUrl = process.env.PYTHON_SERVER_URL;
	const secret = process.env.PYTHON_SERVER_HMAC_SECRET;
	if (!baseUrl || !secret) throw new ApiError(503, "The conversation service is not configured.", "CONVERSATION_SERVICE_UNAVAILABLE");
	return {
		baseUrl,
		secret
	};
}
function isConfigured() {
	return Boolean(process.env.PYTHON_SERVER_URL && process.env.PYTHON_SERVER_HMAC_SECRET);
}
function signedHeaders(secret, method, path, body, contentType = "application/json") {
	const timestamp = Math.floor(Date.now() / 1e3).toString();
	const nonce = randomUUID();
	const canonicalRequest = [
		method,
		path,
		timestamp,
		nonce,
		createHash("sha256").update(body).digest("hex")
	].join("\n");
	return {
		"content-type": contentType,
		"X-Request-Timestamp": timestamp,
		"X-Request-Nonce": nonce,
		"X-Request-Signature": `v1=${createHmac("sha256", secret).update(canonicalRequest).digest("hex")}`
	};
}
function multipartImage(image, filename, mimeType, type) {
	if (!ALLOWED_TYPES.has(type)) throw new ApiError(400, "Invalid correction type.", "VALIDATION_ERROR");
	const boundary = `----correction-${randomUUID()}`;
	const safeFilename = String(filename || "image").replace(/[\r\n"]/g, "_");
	const chunks = [
		Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\n${type}\r\n`),
		Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${safeFilename}"\r\nContent-Type: ${mimeType}\r\n\r\n`),
		image,
		Buffer.from(`\r\n--${boundary}--\r\n`)
	];
	return {
		body: Buffer.concat(chunks),
		contentType: `multipart/form-data; boundary=${boundary}`
	};
}
async function request(path, method, body = Buffer.alloc(0), contentType) {
	const { baseUrl, secret } = configuration();
	let response;
	try {
		response = await fetch(new URL(path, baseUrl), {
			method,
			body: method === "GET" ? void 0 : body,
			headers: signedHeaders(secret, method, path, body, contentType),
			signal: AbortSignal.timeout(1e4)
		});
	} catch (error) {
		console.error("Conversation service request failed:", error);
		throw new ApiError(503, "The conversation service is unavailable.", "CONVERSATION_SERVICE_UNAVAILABLE");
	}
	if (!response.ok) {
		const detail = await response.json().catch(() => ({}));
		if (response.status === 404) throw new ApiError(404, detail.detail || "Analysis job not found.", "CONVERSATION_JOB_NOT_FOUND");
		if (response.status === 503) throw new ApiError(503, "The conversation queue is full. Try again later.", "CONVERSATION_QUEUE_FULL");
		throw new ApiError(502, detail.detail || "The conversation service rejected the request.", "CONVERSATION_SERVICE_ERROR");
	}
	if (response.status === 204) return { destroyed: true };
	return response.json();
}
var conversationService = {
	isConfigured,
	async start({ image, filename, mimeType, type }) {
		const payload = multipartImage(image, filename, mimeType, type);
		return request(JOBS_PATH, "POST", payload.body, payload.contentType);
	},
	async get(jobId) {
		return request(`${JOBS_PATH}/${encodeURIComponent(jobId)}`, "GET");
	},
	async destroy(jobId) {
		return request(`${JOBS_PATH}/${encodeURIComponent(jobId)}`, "DELETE");
	}
};
//#endregion
//#region src/routes/api/sessioni-correzione/[id]/job/+server.js
var TYPES = /* @__PURE__ */ new Set([
	"camera",
	"texture",
	"light",
	"material"
]);
var IMAGE_TYPES = /* @__PURE__ */ new Set([
	"image/jpeg",
	"image/png",
	"image/webp"
]);
var MAX_IMAGE_BYTES = 12582912;
function analysisType(focus) {
	if (focus.startsWith("Camera")) return "camera";
	return {
		Illuminazione: "light",
		Materiali: "material",
		Texture: "texture",
		"Qualità generale": "texture"
	}[focus];
}
function jobId(input) {
	return requiredText(input, "jobId", 100);
}
var POST = ({ params, request, locals }) => apiResponse(async () => {
	const session = await correctionSessionService.requireCorrectionAvailable(params.id, locals.user);
	const form = await request.formData();
	const image = form.get("image");
	const focus = String(form.get("focus") || "");
	const referenceImageId = Number(form.get("referenceImageId"));
	const type = analysisType(session.analysisFocus || focus);
	if (!(image instanceof File) || image.size === 0) throw new ApiError(400, "Select an image to analyze.", "INVALID_IMAGE");
	if (!IMAGE_TYPES.has(image.type)) throw new ApiError(400, "Use a JPEG, PNG or WEBP image.", "INVALID_IMAGE");
	if (image.size > MAX_IMAGE_BYTES) throw new ApiError(413, "The image cannot exceed 12 MB.", "IMAGE_TOO_LARGE");
	if (!TYPES.has(type)) throw new ApiError(409, "The correction session has an unsupported analysis type. Create a new conversation.", "CONVERSATION_SETTINGS_LOCKED");
	if (session.analysisFocus && focus !== session.analysisFocus) throw new ApiError(409, "The analysis type is locked for this conversation. Create a new conversation to use a different one.", "CONVERSATION_SETTINGS_LOCKED");
	if (session.referenceImageId && referenceImageId !== session.referenceImageId) throw new ApiError(409, "The point of view is locked for this conversation. Create a new conversation to use a different one.", "CONVERSATION_SETTINGS_LOCKED");
	if (!conversationService.isConfigured()) return {
		id: null,
		status: "unavailable",
		position: null
	};
	const result = await conversationService.start({
		image: Buffer.from(await image.arrayBuffer()),
		filename: image.name,
		mimeType: image.type,
		type
	});
	await correctionSessionService.update(params.id, { status: "PROCESSING" }, locals.user);
	return result;
}, 202);
var GET = ({ params, url, locals }) => apiResponse(async () => {
	await correctionSessionService.requireSessionAccess(params.id, locals.user);
	return conversationService.get(jobId(url.searchParams.get("jobId")));
});
var DELETE = ({ params, request, locals }) => apiResponse(async () => {
	await correctionSessionService.requireSessionAccess(params.id, locals.user);
	const input = await readJson(request);
	return conversationService.destroy(jobId(input.jobId));
});
//#endregion
export { DELETE, GET, POST };
