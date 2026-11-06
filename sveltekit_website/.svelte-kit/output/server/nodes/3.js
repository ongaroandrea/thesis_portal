import * as server from '../entries/pages/(protected)/(professore)/_layout.server.js';

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/(protected)/(professore)/+layout.server.js";
export const imports = ["_app/immutable/nodes/3.C5XGNcdq.js","_app/immutable/chunks/BBXRAPuj.js","_app/immutable/chunks/xihTtKlq.js","_app/immutable/chunks/xpPworqp.js"];
export const stylesheets = [];
export const fonts = [];
