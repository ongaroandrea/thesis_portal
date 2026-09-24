import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { activityReferenceImageService } from '$lib/server/services/activity-reference-image.service.js';

export const GET = ({ params, locals }) => apiResponse(
	() => activityReferenceImageService.list(params.id, locals.user)
);

export const POST = ({ params, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return activityReferenceImageService.create(params.id, input, locals.user);
}, 201);

export const PUT = ({ params, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return activityReferenceImageService.sync(params.id, input.images, locals.user);
});
