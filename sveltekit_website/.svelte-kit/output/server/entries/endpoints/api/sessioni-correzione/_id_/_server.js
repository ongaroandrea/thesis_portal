import { n as readJson, t as apiResponse } from "../../../../../chunks/handler.js";
import { t as correctionSessionService } from "../../../../../chunks/correction-session.service.js";
//#region src/routes/api/sessioni-correzione/[id]/+server.js
var GET = ({ params, locals }) => apiResponse(() => correctionSessionService.get(params.id, locals.user));
var update = ({ params, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return correctionSessionService.update(params.id, input, locals.user);
});
var PATCH = update;
var PUT = update;
var DELETE = ({ params, locals }) => apiResponse(() => correctionSessionService.remove(params.id, locals.user));
//#endregion
export { DELETE, GET, PATCH, PUT };
