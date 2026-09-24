import { n as readJson, t as apiResponse } from "../../../../chunks/handler.js";
import { t as courseService } from "../../../../chunks/course.service.js";
//#region src/routes/api/corsi/+server.js
var GET = ({ url, locals }) => apiResponse(() => courseService.list(locals.user, url.searchParams));
var POST = ({ request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return courseService.create(input, locals.user);
}, 201);
//#endregion
export { GET, POST };
