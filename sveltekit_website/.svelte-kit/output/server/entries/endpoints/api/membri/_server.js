import { n as readJson, t as apiResponse } from "../../../../chunks/handler.js";
import { t as courseMemberService } from "../../../../chunks/course-member.service.js";
// src/routes/api/membri/+server.js
var GET = ({ url, locals }) => apiResponse(() => courseMemberService.list(url.searchParams.get("courseId"), locals.user, url.searchParams));
var POST = ({ request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return courseMemberService.create(input, locals.user);
}, 201);
export { GET, POST };
