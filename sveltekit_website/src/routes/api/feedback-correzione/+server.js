import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { correctionFeedbackService } from '$lib/server/services/correction-feedback.service.js';

export const GET = ({ url, locals }) => apiResponse(
	() => correctionFeedbackService.get(url.searchParams.get('attemptId'), locals.user)
);

export const PUT = ({ url, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return correctionFeedbackService.save(url.searchParams.get('attemptId'), input, locals.user);
});
