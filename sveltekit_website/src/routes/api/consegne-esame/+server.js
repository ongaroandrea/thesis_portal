import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { examSubmissionService } from '$lib/server/services/exam-submission.service.js';

export const GET = ({ url, locals }) => apiResponse(
	() => examSubmissionService.list(url.searchParams.get('activityId'), locals.user, url.searchParams)
);

export const POST = ({ request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return examSubmissionService.upload(input.activityId, input, locals.user);
}, 201);
