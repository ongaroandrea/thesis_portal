import { A as escape_html, O as attr, Rt as fallback, g as unsubscribe_stores, i as bind_props, m as store_get } from "./server.js";
import { t as $format } from "./runtime.js";
//#region src/lib/components/portal/PageHeader.svelte
function PageHeader($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let title = $$props["title"];
		let subtitle = fallback($$props["subtitle"], "");
		let parentLabel = fallback($$props["parentLabel"], "");
		let parentHref = fallback($$props["parentHref"], "/corsi");
		$$renderer.push(`<div class="page-title-box d-flex flex-wrap align-items-center justify-content-between gap-3"><div><h4 class="mb-1">${escape_html(title)}</h4> `);
		if (subtitle) $$renderer.push(`<!--[0--><p class="text-muted mb-0">${escape_html(subtitle)}</p>`);
		else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div> <nav${attr("aria-label", store_get($$store_subs ??= {}, "$_", $format)("common.breadcrumb"))}><ol class="breadcrumb m-0"><li class="breadcrumb-item"><a${attr("href", parentHref)}>${escape_html(parentLabel || store_get($$store_subs ??= {}, "$_", $format)("nav.courses"))}</a></li> <li class="breadcrumb-item active" aria-current="page">${escape_html(title)}</li></ol></nav></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
		bind_props($$props, {
			title,
			subtitle,
			parentLabel,
			parentHref
		});
	});
}
//#endregion
export { PageHeader as t };
