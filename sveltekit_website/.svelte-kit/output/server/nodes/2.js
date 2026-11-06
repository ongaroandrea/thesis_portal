import * as server from '../entries/pages/(protected)/_layout.server.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(protected)/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/(protected)/+layout.server.js";
export const imports = ["_app/immutable/nodes/2.D9PhcmJL.js","_app/immutable/chunks/xihTtKlq.js","_app/immutable/chunks/DQOf03GT.js","_app/immutable/chunks/xpPworqp.js","_app/immutable/chunks/BVpGFOjf.js","_app/immutable/chunks/Bkx_ML_s.js","_app/immutable/chunks/Bw7NJ2q8.js","_app/immutable/chunks/BznIrGAg.js","_app/immutable/chunks/Buxw31gH.js","_app/immutable/chunks/CSJul4hH.js","_app/immutable/chunks/CieDv6t9.js","_app/immutable/chunks/UmC8rn0o.js","_app/immutable/chunks/mpn6tF2r.js"];
export const stylesheets = ["_app/immutable/assets/dist.DhaulA-e.css","_app/immutable/assets/LanguageSwitcher.Btdv-VAz.css"];
export const fonts = [];
