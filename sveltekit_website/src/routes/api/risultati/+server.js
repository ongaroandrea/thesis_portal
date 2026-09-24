import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { examResultService } from '$lib/server/services/exam-result.service.js';

export const GET = ({ url, locals }) => apiResponse(
	() => examResultService.list(url.searchParams.get('activityId'), locals.user, url.searchParams)
);

export const POST = ({ request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return examResultService.create(input, locals.user);
}, 201);
