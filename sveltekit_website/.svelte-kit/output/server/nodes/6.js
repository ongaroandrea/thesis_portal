import * as server from '../entries/pages/auth/_layout.server.js';

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/auth/+layout.server.js";
export const imports = ["_app/immutable/nodes/6.Ckw1yFIh.js","_app/immutable/chunks/w67bvYON.js","_app/immutable/chunks/QWA6UrYV.js","_app/immutable/chunks/xihTtKlq.js"];
export const stylesheets = [];
export const fonts = [];
