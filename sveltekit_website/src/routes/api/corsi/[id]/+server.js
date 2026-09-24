import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { courseService } from '$lib/server/services/course.service.js';

export const GET = ({ params, locals }) => apiResponse(() => courseService.get(params.id, locals.user));

const update = ({ params, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return courseService.update(params.id, input, locals.user);
});

export const PATCH = update;
export const PUT = update;

export const DELETE = ({ params, locals }) => apiResponse(() => courseService.remove(params.id, locals.user));
