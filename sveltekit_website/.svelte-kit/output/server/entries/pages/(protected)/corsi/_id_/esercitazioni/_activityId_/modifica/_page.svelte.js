import { g as unsubscribe_stores, m as store_get, s as head } from "../../../../../../../../chunks/server.js";
import "../../../../../../../../chunks/index-server2.js";
import "../../../../../../../../chunks/client.js";
import { n as page } from "../../../../../../../../chunks/stores.js";
import "../../../../../../../../chunks/navigation.js";
import "../../../../../../../../chunks/api.js";
import { t as PageHeader } from "../../../../../../../../chunks/PageHeader.js";
import "../../../../../../../../chunks/ActivityForm.js";
//#region src/routes/(protected)/corsi/[id]/esercitazioni/[activityId]/modifica/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let courseId, activityId;
		$: courseId = store_get($$store_subs ??= {}, "$page", page).params.id;
		$: activityId = store_get($$store_subs ??= {}, "$page", page).params.activityId;
		head("3s64tl", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>Modifica attività</title>`);
			});
		});
		$$renderer.push(`<div class="page-content"><div class="container-fluid py-4">`);
		PageHeader($$renderer, {
			title: "Modifica attività",
			subtitle: "Aggiorna consegna e disponibilità",
			parentHref: `/corsi/${courseId}/esercitazioni/${activityId}`,
			parentLabel: "Attività"
		});
		$$renderer.push(`<!----> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push(`<!--[0--><div class="text-center py-5"><div class="spinner-border text-primary"></div></div>`);
		$$renderer.push(`<!--]--></div></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { _page as default };
