import { A as escape_html, g as unsubscribe_stores, m as store_get, s as head } from "../../../../../../chunks/server.js";
import "../../../../../../chunks/index-server2.js";
import { t as $format } from "../../../../../../chunks/runtime.js";
import "../../../../../../chunks/stores.js";
import { t as BreadCrumb } from "../../../../../../chunks/BreadCrumb.js";
//#region src/routes/(protected)/(professore)/studenti/[id]/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		head("100zey7", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("users.detail"))}</title>`);
			});
		});
		$$renderer.push(`<div class="page-content"><div class="container-fluid py-4">`);
		BreadCrumb($$renderer, {
			title: store_get($$store_subs ??= {}, "$_", $format)("users.detail"),
			pageTitle: store_get($$store_subs ??= {}, "$_", $format)("nav.students"),
			pageHref: "/studenti"
		});
		$$renderer.push(`<!----> `);
		$$renderer.push(`<!--[0--><div class="text-center py-5"><span class="spinner-border text-primary"></span></div>`);
		$$renderer.push(`<!--]--></div></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { _page as default };
