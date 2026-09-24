import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { activityReferenceImageService } from '$lib/server/services/activity-reference-image.service.js';

const update = ({ params, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return activityReferenceImageService.update(params.id, params.imageId, input, locals.user);
});

export const PATCH = update;
export const PUT = update;

export const DELETE = ({ params, locals }) => apiResponse(
	() => activityReferenceImageService.remove(params.id, params.imageId, locals.user)
);
