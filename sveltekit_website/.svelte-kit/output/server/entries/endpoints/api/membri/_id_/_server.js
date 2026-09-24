import { n as readJson, t as apiResponse } from "../../../../../chunks/handler.js";
import { t as courseMemberService } from "../../../../../chunks/course-member.service.js";
//#region src/routes/api/membri/[id]/+server.js
var GET = ({ params, locals }) => apiResponse(() => courseMemberService.get(params.id, locals.user));
var update = ({ params, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return courseMemberService.update(params.id, input, locals.user);
});
var PATCH = update;
var PUT = update;
var DELETE = ({ params, locals }) => apiResponse(() => courseMemberService.remove(params.id, locals.user));
//#endregion
export { DELETE, GET, PATCH, PUT };
