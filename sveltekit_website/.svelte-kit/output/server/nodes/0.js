

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.Z-gdY1qH.js","_app/immutable/chunks/QWA6UrYV.js","_app/immutable/chunks/xihTtKlq.js"];
export const stylesheets = ["_app/immutable/assets/0.C7Mv_jua.css"];
export const fonts = ["_app/immutable/assets/materialdesignicons-webfont.DsMmahHu.woff2","_app/immutable/assets/boxicons.CeGEncwm.woff2","_app/immutable/assets/remixicon.BCkO1-UF.woff2"];
