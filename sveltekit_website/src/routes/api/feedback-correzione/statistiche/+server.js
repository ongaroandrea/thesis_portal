import { apiResponse } from '$lib/server/api/handler.js';
import { correctionFeedbackService } from '$lib/server/services/correction-feedback.service.js';

export const GET = ({ url, locals }) => apiResponse(
	() => correctionFeedbackService.statistics(url.searchParams.get('activityId'), locals.user)
);
