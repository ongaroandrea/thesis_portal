import { n as readJson, t as apiResponse } from "../../../../../chunks/handler.js";
import { t as activityService } from "../../../../../chunks/activity.service.js";
//#region src/routes/api/esercitazioni/[id]/+server.js
var GET = ({ params, locals }) => apiResponse(() => activityService.get(params.id, locals.user));
var update = ({ params, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return activityService.update(params.id, input, locals.user);
});
var PATCH = update;
var PUT = update;
var DELETE = ({ params, locals }) => apiResponse(() => activityService.remove(params.id, locals.user));
//#endregion
export { DELETE, GET, PATCH, PUT };
