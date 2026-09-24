import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { correctionAttemptService } from '$lib/server/services/correction-attempt.service.js';

export const GET = ({ url, locals }) => apiResponse(
	() => correctionAttemptService.list(url.searchParams.get('sessionId'), locals.user, url.searchParams)
);

export const POST = ({ request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return correctionAttemptService.create(input, locals.user);
}, 201);
