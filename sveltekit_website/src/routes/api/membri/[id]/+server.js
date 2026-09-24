import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { courseMemberService } from '$lib/server/services/course-member.service.js';

export const GET = ({ params, locals }) => apiResponse(() => courseMemberService.get(params.id, locals.user));

const update = ({ params, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return courseMemberService.update(params.id, input, locals.user);
});

export const PATCH = update;
export const PUT = update;

export const DELETE = ({ params, locals }) => apiResponse(() => courseMemberService.remove(params.id, locals.user));
