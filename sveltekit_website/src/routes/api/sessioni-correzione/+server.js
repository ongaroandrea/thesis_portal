import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { correctionSessionService } from '$lib/server/services/correction-session.service.js';

export const GET = ({ url, locals }) => apiResponse(
	() => correctionSessionService.list(url.searchParams.get('activityId'), locals.user, url.searchParams)
);

export const POST = ({ request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return correctionSessionService.create(input, locals.user);
}, 201);
