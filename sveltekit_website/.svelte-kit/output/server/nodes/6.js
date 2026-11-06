import * as server from '../entries/pages/auth/_layout.server.js';

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/auth/+layout.server.js";
export const imports = ["_app/immutable/nodes/6.C5XGNcdq.js","_app/immutable/chunks/BBXRAPuj.js","_app/immutable/chunks/xihTtKlq.js","_app/immutable/chunks/xpPworqp.js"];
export const stylesheets = [];
export const fonts = [];
