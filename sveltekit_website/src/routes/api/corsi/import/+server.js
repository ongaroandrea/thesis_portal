import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { courseImportService } from '$lib/server/services/course-import.service.js';

export const POST = ({ request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return courseImportService.importMembers(input, locals.user);
}, 201);
