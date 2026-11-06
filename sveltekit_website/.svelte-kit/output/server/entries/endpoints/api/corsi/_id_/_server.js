import { n as readJson, t as apiResponse } from "../../../../../chunks/handler.js";
import { t as courseService } from "../../../../../chunks/course.service.js";
// src/routes/api/corsi/[id]/+server.js
var GET = ({ params, locals }) => apiResponse(() => courseService.get(params.id, locals.user));
var update = ({ params, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return courseService.update(params.id, input, locals.user);
});
var PATCH = update;
var PUT = update;
var DELETE = ({ params, locals }) => apiResponse(() => courseService.remove(params.id, locals.user));
export { DELETE, GET, PATCH, PUT };
