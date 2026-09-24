import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { courseMemberService } from '$lib/server/services/course-member.service.js';

export const GET = ({ url, locals }) => apiResponse(
	() => courseMemberService.list(url.searchParams.get('courseId'), locals.user, url.searchParams)
);

export const POST = ({ request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return courseMemberService.create(input, locals.user);
}, 201);
