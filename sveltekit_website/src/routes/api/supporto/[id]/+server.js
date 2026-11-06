import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { supportTicketService } from '$lib/server/services/support-ticket.service.js';

export const GET = ({ params, locals }) => apiResponse(() => supportTicketService.get(params.id, locals.user));

export const PATCH = ({ params, request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return supportTicketService.update(params.id, input, locals.user);
});
