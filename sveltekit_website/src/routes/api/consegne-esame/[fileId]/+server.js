import { apiResponse } from '$lib/server/api/handler.js';
import { examSubmissionService } from '$lib/server/services/exam-submission.service.js';

export const DELETE = ({ params, locals }) => apiResponse(
	() => examSubmissionService.removeFile(params.fileId, locals.user)
);
