import { apiResponse } from '$lib/server/api/handler.js';
import { correctionSessionService } from '$lib/server/services/correction-session.service.js';

export const GET = ({ params, locals }) => apiResponse(() => correctionSessionService.get(params.id, locals.user));

export const DELETE = ({ params, locals }) => apiResponse(
	() => correctionSessionService.remove(params.id, locals.user)
);
