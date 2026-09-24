import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { correctionSessionService } from '$lib/server/services/correction-session.service.js';

export const GET = ({ params, locals }) => apiResponse(() => correctionSessionService.get(params.id, locals.user));

const update = ({ params, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return correctionSessionService.update(params.id, input, locals.user);
});

export const PATCH = update;
export const PUT = update;

export const DELETE = ({ params, locals }) => apiResponse(
	() => correctionSessionService.remove(params.id, locals.user)
);
