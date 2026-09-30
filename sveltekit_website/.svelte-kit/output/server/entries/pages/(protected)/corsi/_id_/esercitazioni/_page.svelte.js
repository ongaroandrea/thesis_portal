import { A as escape_html, g as unsubscribe_stores, m as store_get, s as head, t as attr_class } from "../../../../../../chunks/server.js";
import "../../../../../../chunks/index-server2.js";
import { t as $format } from "../../../../../../chunks/runtime.js";
import { n as page } from "../../../../../../chunks/stores.js";
import "../../../../../../chunks/api.js";
import { t as PageHeader } from "../../../../../../chunks/PageHeader.js";
//#region src/routes/(protected)/corsi/[id]/esercitazioni/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let courseId;
		let activities = [];
		$: courseId = store_get($$store_subs ??= {}, "$page", page).params.id;
		$: activities.filter((activity) => true);
		head("pdvfp", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.courseActivities"))}</title>`);
			});
		});
		$$renderer.push(`<div class="page-content"><div class="container-fluid py-4">`);
		PageHeader($$renderer, {
			title: store_get($$store_subs ??= {}, "$_", $format)("activity.activities"),
			subtitle: store_get($$store_subs ??= {}, "$_", $format)("activity.courseActivities"),
			parentHref: `/corsi/${courseId}`,
			parentLabel: store_get($$store_subs ??= {}, "$_", $format)("activity.course")
		});
		$$renderer.push(`<!----> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="card border-0 shadow-sm"><div class="card-header bg-transparent p-4 d-flex flex-wrap gap-3 justify-content-between align-items-center"><div class="btn-group" role="group"><button${attr_class(`btn btn-primary`)}>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("common.allFeminine"))}</button><button${attr_class(`btn btn-light`)}>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("status.publishedPlural"))}</button><button${attr_class(`btn btn-light`)}>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("status.draftPlural"))}</button></div> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div> <div class="card-body p-0">`);
		$$renderer.push(`<!--[0--><div class="text-center py-5"><div class="spinner-border text-primary"></div></div>`);
		$$renderer.push(`<!--]--></div></div></div></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { _page as default };
