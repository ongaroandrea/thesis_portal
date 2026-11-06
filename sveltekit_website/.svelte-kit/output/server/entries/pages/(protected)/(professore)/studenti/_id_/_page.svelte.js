import { A as escape_html, g as unsubscribe_stores, m as store_get, s as head } from "../../../../../../chunks/server.js";
import "../../../../../../chunks/index-server2.js";
import "../../../../../../chunks/stores.js";
import { t as PageHeader } from "../../../../../../chunks/PageHeader.js";
import { t as $format } from "../../../../../../chunks/runtime.js";
// src/routes/(protected)/(professore)/studenti/[id]/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		head("100zey7", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("users.detail"))}</title>`);
			});
		});
		$$renderer.push(`<div class="page-content"><div class="container-fluid py-4">`);
		PageHeader($$renderer, {
			title: store_get($$store_subs ??= {}, "$_", $format)("users.detail"),
			subtitle: store_get($$store_subs ??= {}, "$_", $format)("users.detailSubtitle"),
			parentLabel: store_get($$store_subs ??= {}, "$_", $format)("nav.students"),
			parentHref: "/studenti"
		});
		$$renderer.push(`<!----> `);
		$$renderer.push(`<!--[0--><div class="text-center py-5"><span class="spinner-border text-primary"></span></div>`);
		$$renderer.push(`<!--]--></div></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
export { _page as default };
