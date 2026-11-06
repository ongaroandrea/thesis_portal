import { n as readJson, t as apiResponse } from "../../../../chunks/handler.js";
import { t as activityService } from "../../../../chunks/activity.service.js";
// src/routes/api/esercitazioni/+server.js
var GET = ({ url, locals }) => apiResponse(() => activityService.list(url.searchParams.get("courseId"), locals.user, url.searchParams));
var POST = ({ request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return activityService.create(input, locals.user);
}, 201);
export { GET, POST };
