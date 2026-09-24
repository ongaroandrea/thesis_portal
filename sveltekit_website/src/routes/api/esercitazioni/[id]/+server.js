import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { activityService } from '$lib/server/services/activity.service.js';

export const GET = ({ params, locals }) => apiResponse(() => activityService.get(params.id, locals.user));

const update = ({ params, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return activityService.update(params.id, input, locals.user);
});

export const PATCH = update;
export const PUT = update;

export const DELETE = ({ params, locals }) => apiResponse(() => activityService.remove(params.id, locals.user));
