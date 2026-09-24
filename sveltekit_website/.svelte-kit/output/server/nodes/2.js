import * as server from '../entries/pages/(protected)/_layout.server.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(protected)/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/(protected)/+layout.server.js";
export const imports = ["_app/immutable/nodes/2.Dpm0nGV-.js","_app/immutable/chunks/QWA6UrYV.js","_app/immutable/chunks/BSlbTSE3.js","_app/immutable/chunks/BjR_Dw5y.js","_app/immutable/chunks/xihTtKlq.js","_app/immutable/chunks/fsmCX5iZ.js","_app/immutable/chunks/CToli_-t.js","_app/immutable/chunks/BCPhgLPQ.js","_app/immutable/chunks/7uUewDjd.js","_app/immutable/chunks/BkPMo14Q.js","_app/immutable/chunks/UmC8rn0o.js"];
export const stylesheets = ["_app/immutable/assets/dist.DhaulA-e.css","_app/immutable/assets/2.DN277Tmi.css"];
export const fonts = [];
