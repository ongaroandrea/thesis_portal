import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { supportTicketService } from '$lib/server/services/support-ticket.service.js';

export const GET = ({ url, locals }) => apiResponse(() => supportTicketService.list(url.searchParams, locals.user));

export const POST = ({ request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return supportTicketService.create(input, locals.user);
}, 201);
