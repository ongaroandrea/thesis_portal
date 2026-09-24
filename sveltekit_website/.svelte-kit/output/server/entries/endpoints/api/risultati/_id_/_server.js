import { n as readJson, t as apiResponse } from "../../../../../chunks/handler.js";
import { t as examResultService } from "../../../../../chunks/exam-result.service.js";
//#region src/routes/api/risultati/[id]/+server.js
var GET = ({ params, locals }) => apiResponse(() => examResultService.get(params.id, locals.user));
var update = ({ params, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return examResultService.update(params.id, input, locals.user);
});
var PATCH = update;
var PUT = update;
var DELETE = ({ params, locals }) => apiResponse(() => examResultService.remove(params.id, locals.user));
//#endregion
export { DELETE, GET, PATCH, PUT };
