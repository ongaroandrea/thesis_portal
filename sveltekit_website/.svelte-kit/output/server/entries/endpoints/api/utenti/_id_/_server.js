import { n as readJson, t as apiResponse } from "../../../../../chunks/handler.js";
import { t as userService } from "../../../../../chunks/users.service.js";
//#region src/routes/api/utenti/[id]/+server.js
var GET = ({ params, locals }) => apiResponse(() => userService.get(params.id, locals.user));
var update = ({ params, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return userService.update(params.id, input, locals.user);
});
var PATCH = update;
var PUT = update;
var DELETE = ({ params, request, locals }) => apiResponse(() => userService.remove(params.id, locals.user, request.headers));
//#endregion
export { DELETE, GET, PATCH, PUT };
