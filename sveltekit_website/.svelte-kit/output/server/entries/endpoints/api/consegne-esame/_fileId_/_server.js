import { t as apiResponse } from "../../../../../chunks/handler.js";
import { t as examSubmissionService } from "../../../../../chunks/exam-submission.service.js";
// src/routes/api/consegne-esame/[fileId]/+server.js
var DELETE = ({ params, locals }) => apiResponse(() => examSubmissionService.removeFile(params.fileId, locals.user));
export { DELETE };
