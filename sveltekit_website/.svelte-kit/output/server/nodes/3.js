import * as server from '../entries/pages/(protected)/(professore)/_layout.server.js';

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(protected)/(professore)/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/(protected)/(professore)/+layout.server.js";
export const imports = ["_app/immutable/nodes/3.C6_otM6Z.js","_app/immutable/chunks/CLKU1sNR.js","_app/immutable/chunks/xihTtKlq.js"];
export const stylesheets = [];
export const fonts = [];
