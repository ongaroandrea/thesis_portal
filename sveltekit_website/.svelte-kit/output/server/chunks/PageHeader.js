import { A as escape_html, Lt as fallback, O as attr, i as bind_props } from "./server.js";
//#region src/lib/components/portal/PageHeader.svelte
function PageHeader($$renderer, $$props) {
	let title = $$props["title"];
	let subtitle = fallback($$props["subtitle"], "");
	let parentLabel = fallback($$props["parentLabel"], "Corsi");
	let parentHref = fallback($$props["parentHref"], "/corsi");
	$$renderer.push(`<div class="page-title-box d-flex flex-wrap align-items-center justify-content-between gap-3"><div><h4 class="mb-1">${escape_html(title)}</h4> `);
	if (subtitle) $$renderer.push(`<!--[0--><p class="text-muted mb-0">${escape_html(subtitle)}</p>`);
	else $$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--></div> <nav aria-label="breadcrumb"><ol class="breadcrumb m-0"><li class="breadcrumb-item"><a${attr("href", parentHref)}>${escape_html(parentLabel)}</a></li> <li class="breadcrumb-item active" aria-current="page">${escape_html(title)}</li></ol></nav></div>`);
	bind_props($$props, {
		title,
		subtitle,
		parentLabel,
		parentHref
	});
}
//#endregion
export { PageHeader as t };
