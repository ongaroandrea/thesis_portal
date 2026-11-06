import { t as apiResponse } from "../../../../../chunks/handler.js";
import { t as correctionSessionService } from "../../../../../chunks/correction-session.service.js";
// src/routes/api/sessioni-correzione/[id]/+server.js
var GET = ({ params, locals }) => apiResponse(() => correctionSessionService.get(params.id, locals.user));
var DELETE = ({ params, locals }) => apiResponse(() => correctionSessionService.remove(params.id, locals.user));
export { DELETE, GET };
