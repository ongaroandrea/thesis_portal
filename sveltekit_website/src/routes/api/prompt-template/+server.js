import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { promptTemplateService } from '$lib/server/services/prompt-template.service.js';

export const GET = ({ url, locals }) => apiResponse(() => {
	const templateId = url.searchParams.get('templateId');
	if (templateId) return promptTemplateService.history(templateId, locals.user);
	return promptTemplateService.list(url.searchParams.get('courseId'), locals.user);
});

export const POST = ({ request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return promptTemplateService.createRevision(input, locals.user);
}, 201);
