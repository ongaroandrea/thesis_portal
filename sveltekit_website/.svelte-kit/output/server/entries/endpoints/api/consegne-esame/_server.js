import { n as readJson, t as apiResponse } from "../../../../chunks/handler.js";
import { t as examSubmissionService } from "../../../../chunks/exam-submission.service.js";
// src/routes/api/consegne-esame/+server.js
var GET = ({ url, locals }) => apiResponse(() => examSubmissionService.list(url.searchParams.get("activityId"), locals.user, url.searchParams));
var POST = ({ request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return examSubmissionService.upload(input.activityId, input, locals.user);
}, 201);
export { GET, POST };
