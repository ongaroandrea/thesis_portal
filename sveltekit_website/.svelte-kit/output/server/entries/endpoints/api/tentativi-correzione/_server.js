import { n as readJson, t as apiResponse } from "../../../../chunks/handler.js";
import { t as correctionAttemptService } from "../../../../chunks/correction-attempt.service.js";
// src/routes/api/tentativi-correzione/+server.js
var GET = ({ url, locals }) => apiResponse(() => correctionAttemptService.list(url.searchParams.get("sessionId"), locals.user, url.searchParams));
var POST = ({ request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return correctionAttemptService.create(input, locals.user);
}, 201);
export { GET, POST };
