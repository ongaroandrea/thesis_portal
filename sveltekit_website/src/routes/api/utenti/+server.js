import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { userService } from '$lib/server/services/users.service.js';

export const GET = ({ url, locals }) => apiResponse(() => userService.list(locals.user, url.searchParams));

export const POST = ({ request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return userService.create(input, locals.user, request.headers);
}, 201);
