import { n as readJson, t as apiResponse } from "../../../../chunks/handler.js";
import { t as correctionSessionService } from "../../../../chunks/correction-session.service.js";
// src/routes/api/sessioni-correzione/+server.js
var GET = ({ url, locals }) => apiResponse(() => correctionSessionService.list(url.searchParams.get("activityId"), locals.user, url.searchParams));
var POST = ({ request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return correctionSessionService.create(input, locals.user);
}, 201);
export { GET, POST };
