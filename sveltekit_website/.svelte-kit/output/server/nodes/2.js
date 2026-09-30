import * as server from '../entries/pages/(protected)/_layout.server.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(protected)/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/(protected)/+layout.server.js";
export const imports = ["_app/immutable/nodes/2.G02v7fd4.js","_app/immutable/chunks/CLKU1sNR.js","_app/immutable/chunks/R-xf7ibW.js","_app/immutable/chunks/CtaBhaFl.js","_app/immutable/chunks/xihTtKlq.js","_app/immutable/chunks/DAVU2sXb.js","_app/immutable/chunks/8vhSUXJm.js","_app/immutable/chunks/Br9kuIcU.js","_app/immutable/chunks/BedtOJ0y.js","_app/immutable/chunks/BCnK7eWa.js","_app/immutable/chunks/C2Odk2GK.js","_app/immutable/chunks/BkPMo14Q.js","_app/immutable/chunks/UmC8rn0o.js"];
export const stylesheets = ["_app/immutable/assets/dist.DhaulA-e.css","_app/immutable/assets/LanguageSwitcher.CU0rOTlj.css","_app/immutable/assets/2.DN277Tmi.css"];
export const fonts = [];
