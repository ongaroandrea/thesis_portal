import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { activityService } from '$lib/server/services/activity.service.js';

export const GET = ({ url, locals }) => apiResponse(
	() => activityService.list(url.searchParams.get('courseId'), locals.user, url.searchParams)
);

export const POST = ({ request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return activityService.create(input, locals.user);
}, 201);
