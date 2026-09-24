import { A as escape_html, g as unsubscribe_stores, m as store_get, s as head } from "../../../../../../../chunks/server.js";
import "../../../../../../../chunks/index-server2.js";
import { n as page } from "../../../../../../../chunks/stores.js";
import "../../../../../../../chunks/navigation.js";
import "../../../../../../../chunks/api.js";
import { t as PageHeader } from "../../../../../../../chunks/PageHeader.js";
//#region src/routes/(protected)/corsi/[id]/esercitazioni/[activityId]/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let courseId;
		$: courseId = store_get($$store_subs ??= {}, "$page", page).params.id;
		$: store_get($$store_subs ??= {}, "$page", page).params.activityId;
		head("1wen46y", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html("Attività")}</title>`);
			});
		});
		$$renderer.push(`<div class="page-content"><div class="container-fluid py-4">`);
		PageHeader($$renderer, {
			title: "Attività",
			subtitle: "Consegna, riferimenti e sessioni di correzione",
			parentHref: `/corsi/${courseId}`,
			parentLabel: "Corso"
		});
		$$renderer.push(`<!----> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push(`<!--[0--><div class="text-center py-5"><div class="spinner-border text-primary"></div></div>`);
		$$renderer.push(`<!--]--></div></div> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { _page as default };
