import { n as readJson, t as apiResponse } from "../../../../chunks/handler.js";
import { t as userService } from "../../../../chunks/users.service.js";
//#region src/routes/api/utenti/+server.js
var GET = ({ url, locals }) => apiResponse(() => userService.list(locals.user, url.searchParams));
var POST = ({ request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return userService.create(input, locals.user, request.headers);
}, 201);
//#endregion
export { GET, POST };
