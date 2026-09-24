import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { examResultService } from '$lib/server/services/exam-result.service.js';

export const GET = ({ params, locals }) => apiResponse(() => examResultService.get(params.id, locals.user));

const update = ({ params, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return examResultService.update(params.id, input, locals.user);
});

export const PATCH = update;
export const PUT = update;

export const DELETE = ({ params, locals }) => apiResponse(() => examResultService.remove(params.id, locals.user));
