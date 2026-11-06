import { n as readJson, t as apiResponse } from "../../../../../chunks/handler.js";
import { t as correctionAttemptService } from "../../../../../chunks/correction-attempt.service.js";
// src/routes/api/tentativi-correzione/[id]/+server.js
var GET = ({ params, locals }) => apiResponse(() => correctionAttemptService.get(params.id, locals.user));
var update = ({ params, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return correctionAttemptService.update(params.id, input, locals.user);
});
var PATCH = update;
var PUT = update;
var DELETE = ({ params, locals }) => apiResponse(() => correctionAttemptService.remove(params.id, locals.user));
export { DELETE, GET, PATCH, PUT };
