import { n as readJson, t as apiResponse } from "../../../../../../../chunks/handler.js";
import { t as activityReferenceImageService } from "../../../../../../../chunks/activity-reference-image.service.js";
//#region src/routes/api/esercitazioni/[id]/immagini/[imageId]/+server.js
var update = ({ params, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return activityReferenceImageService.update(params.id, params.imageId, input, locals.user);
});
var PATCH = update;
var PUT = update;
var DELETE = ({ params, locals }) => apiResponse(() => activityReferenceImageService.remove(params.id, params.imageId, locals.user));
//#endregion
export { DELETE, PATCH, PUT };
