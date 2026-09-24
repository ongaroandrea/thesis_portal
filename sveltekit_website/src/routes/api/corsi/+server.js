import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { courseService } from '$lib/server/services/course.service.js';

export const GET = ({ url, locals }) => apiResponse(() => courseService.list(locals.user, url.searchParams));

export const POST = ({ request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return courseService.create(input, locals.user);
}, 201);
