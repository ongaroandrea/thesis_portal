import { A as escape_html, O as attr, g as unsubscribe_stores, m as store_get, s as head } from "../../chunks/server.js";
import { t as $format } from "../../chunks/runtime.js";
import { t as LanguageSwitcher } from "../../chunks/LanguageSwitcher.js";
// src/routes/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		head("1uha8ag", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("home.eyebrow"))}</title>`);
			});
			$$renderer.push(`<meta name="description"${attr("content", store_get($$store_subs ??= {}, "$_", $format)("home.metaDescription"))}/>`);
		});
		$$renderer.push(`<main class="home-page svelte-1uha8ag" id="main-content" tabindex="-1"><header class="site-header container svelte-1uha8ag"><a class="brand svelte-1uha8ag" href="/"${attr("aria-label", `${store_get($$store_subs ??= {}, "$_", $format)("home.eyebrow")} — Home`)}><img src="/images/polito_logo_desktop.svg" alt="Politecnico di Torino" class="svelte-1uha8ag"/></a> <div class="header-actions svelte-1uha8ag">`);
		LanguageSwitcher($$renderer, {});
		$$renderer.push(`<!----> <a class="login-link svelte-1uha8ag" href="/login">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("login"))}</a></div></header> <section class="hero container svelte-1uha8ag"><div class="hero-copy"><h1 class="svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("home.title"))}<br/><span class="svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("home.titleAccent"))}</span></h1> <p class="intro svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("home.intro"))}</p> <div class="actions svelte-1uha8ag"><a class="primary-action svelte-1uha8ag" href="/login">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("home.action"))} <i class="ri-arrow-right-line" aria-hidden="true"></i></a></div></div> <div class="project-card svelte-1uha8ag"><h2 class="svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("home.cardTitle"))}</h2> <p class="svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("home.cardBody"))}</p></div></section></main>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
export { _page as default };
