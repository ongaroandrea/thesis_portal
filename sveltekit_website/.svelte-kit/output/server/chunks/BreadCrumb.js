import { A as escape_html, Lt as fallback, O as attr, i as bind_props } from "./server.js";
import { h as Col, n as Row } from "./dist.js";
//#region src/lib/components/common/BreadCrumb.svelte
function BreadCrumb($$renderer, $$props) {
	let title = $$props["title"];
	let pageTitle = $$props["pageTitle"];
	let pageHref = fallback($$props["pageHref"], "/");
	Row($$renderer, {
		children: ($$renderer) => {
			Col($$renderer, {
				xs: 12,
				children: ($$renderer) => {
					$$renderer.push(`<div class="page-title-box d-sm-flex align-items-center justify-content-between"><h4 class="mb-sm-0">${escape_html(title)}</h4> <div class="page-title-right"><ol class="breadcrumb m-0"><li class="breadcrumb-item"><a${attr("href", pageHref)}>${escape_html(pageTitle)}</a></li> <li class="breadcrumb-item active">${escape_html(title)}</li></ol></div></div>`);
				},
				$$slots: { default: true }
			});
		},
		$$slots: { default: true }
	});
	bind_props($$props, {
		title,
		pageTitle,
		pageHref
	});
}
//#endregion
export { BreadCrumb as t };
