import { n as readJson, t as apiResponse } from "../../../../../../chunks/handler.js";
import { t as activityReferenceImageService } from "../../../../../../chunks/activity-reference-image.service.js";
//#region src/routes/api/esercitazioni/[id]/immagini/+server.js
var GET = ({ params, locals }) => apiResponse(() => activityReferenceImageService.list(params.id, locals.user));
var POST = ({ params, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return activityReferenceImageService.create(params.id, input, locals.user);
}, 201);
var PUT = ({ params, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return activityReferenceImageService.sync(params.id, input.images, locals.user);
});
//#endregion
export { GET, POST, PUT };
