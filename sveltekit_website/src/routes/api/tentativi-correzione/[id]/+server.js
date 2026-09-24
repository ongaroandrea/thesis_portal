import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { correctionAttemptService } from '$lib/server/services/correction-attempt.service.js';

export const GET = ({ params, locals }) => apiResponse(() => correctionAttemptService.get(params.id, locals.user));

const update = ({ params, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return correctionAttemptService.update(params.id, input, locals.user);
});

export const PATCH = update;
export const PUT = update;

export const DELETE = ({ params, locals }) => apiResponse(
	() => correctionAttemptService.remove(params.id, locals.user)
);
