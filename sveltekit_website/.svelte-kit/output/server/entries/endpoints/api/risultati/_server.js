import { n as readJson, t as apiResponse } from "../../../../chunks/handler.js";
import { t as examResultService } from "../../../../chunks/exam-result.service.js";
//#region src/routes/api/risultati/+server.js
var GET = ({ url, locals }) => apiResponse(() => examResultService.list(url.searchParams.get("activityId"), locals.user, url.searchParams));
var POST = ({ request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return examResultService.create(input, locals.user);
}, 201);
//#endregion
export { GET, POST };
