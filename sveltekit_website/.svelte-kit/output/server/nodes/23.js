import * as server from '../entries/pages/(protected)/prompt/_page.server.js';

export const index = 23;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(protected)/prompt/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/(protected)/prompt/+page.server.js";
export const imports = ["_app/immutable/nodes/23.BNxebvXx.js","_app/immutable/chunks/xihTtKlq.js","_app/immutable/chunks/Bkx_ML_s.js","_app/immutable/chunks/xpPworqp.js","_app/immutable/chunks/Bw8FW4R_.js","_app/immutable/chunks/Dv9-orXY.js","_app/immutable/chunks/BVpGFOjf.js","_app/immutable/chunks/BznIrGAg.js"];
export const stylesheets = ["_app/immutable/assets/PromptManager.DwjRUvA8.css"];
export const fonts = [];
