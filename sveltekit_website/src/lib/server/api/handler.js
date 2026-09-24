import { json } from '@sveltejs/kit';
import { ApiError } from '$lib/server/services/api.service.js';

const DATABASE_CONFLICTS = new Map([
	['23505', { code: 'RESOURCE_ALREADY_EXISTS', message: 'A record with the same unique values already exists.' }],
	['23503', { code: 'RELATED_RESOURCE_CONFLICT', message: 'The operation conflicts with a related record.' }],
	['23502', { code: 'DATABASE_CONSTRAINT_CONFLICT', message: 'The operation violates a required database constraint.' }],
	['23514', { code: 'DATABASE_CONSTRAINT_CONFLICT', message: 'The operation violates a database constraint.' }],
	['23P01', { code: 'RESOURCE_CONFLICT', message: 'The operation conflicts with an existing record.' }],
	['40001', { code: 'CONCURRENT_WRITE_CONFLICT', message: 'The record changed concurrently. Retry the operation.' }],
	['40P01', { code: 'CONCURRENT_WRITE_CONFLICT', message: 'The operation conflicted with another write. Retry it.' }]
]);

export function normalizeApiError(error) {
	if (error instanceof ApiError) return error;
	const databaseCode = error?.code ?? error?.cause?.code;
	const conflict = DATABASE_CONFLICTS.get(databaseCode);
	return conflict ? new ApiError(409, conflict.message, conflict.code) : null;
}

export async function readJson(request) {
	try {
		const body = await request.json();
		if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
		return body;
	} catch {
		throw new ApiError(400, 'The request body must be a JSON object.', 'INVALID_JSON');
	}
}

export async function apiResponse(operation, status = 200) {
	try {
		return json({ data: await operation() }, { status });
	} catch (error) {
		const apiError = normalizeApiError(error);
		if (apiError) {
			return json({ error: { code: apiError.code, message: apiError.message } }, { status: apiError.status });
		}
		console.error('API request failed:', error);
		return json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error.' } }, { status: 500 });
	}
}
