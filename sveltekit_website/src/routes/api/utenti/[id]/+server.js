import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { userService } from '$lib/server/services/users.service.js';

export const GET = ({ params, locals }) => apiResponse(() => userService.get(params.id, locals.user));

const update = ({ params, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return userService.update(params.id, input, locals.user);
});

export const PATCH = update;
export const PUT = update;

export const DELETE = ({ params, request, locals }) => apiResponse(
	() => userService.remove(params.id, locals.user, request.headers)
);
