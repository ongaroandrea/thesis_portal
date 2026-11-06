import * as server from '../entries/pages/(public)/_layout.server.js';

export const index = 4;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/(public)/+layout.server.js";
export const imports = ["_app/immutable/nodes/4.C5XGNcdq.js","_app/immutable/chunks/BBXRAPuj.js","_app/immutable/chunks/xihTtKlq.js","_app/immutable/chunks/xpPworqp.js"];
export const stylesheets = [];
export const fonts = [];
