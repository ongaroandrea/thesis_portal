import { A as escape_html, f as slot } from "./server.js";
//#region src/lib/components/layouts/ParticlesAuth.svelte
function ParticlesAuth($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		$$renderer.push(`<div class="auth-page-wrapper pt-5"><div class="auth-one-bg-position auth-one-bg" id="auth-particles"><div class="bg-overlay"></div> <div class="shape"><svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 1440 120"><path d="M 0,36 C 144,53.6 432,123.2 720,124 C 1008,124.8 1296,56.8 1440,40L1440 140L0 140z"></path></svg></div></div> <!--[-->`);
		slot($$renderer, $$props, "default", {}, null);
		$$renderer.push(`<!--]--> <footer class="footer"><div class="container"><div class="row"><div class="col-lg-12"><div class="text-center"><p class="mb-0 text-muted">© ${escape_html((/* @__PURE__ */ new Date()).getFullYear())} Portale correzione automatica · Versione Alpha</p></div></div></div></div></footer></div>`);
	});
}
//#endregion
export { ParticlesAuth as t };
