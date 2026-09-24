import { g as unsubscribe_stores, m as store_get, s as head } from "../../../../../../chunks/server.js";
import "../../../../../../chunks/index-server2.js";
import { n as page } from "../../../../../../chunks/stores.js";
import "../../../../../../chunks/api.js";
import { t as PageHeader } from "../../../../../../chunks/PageHeader.js";
//#region src/routes/(protected)/corsi/[id]/statistiche/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let courseId, totalSessions, completedSessions;
		let rows = [];
		$: courseId = store_get($$store_subs ??= {}, "$page", page).params.id;
		$: totalSessions = rows.reduce((sum, row) => sum + row.sessions.length, 0);
		$: completedSessions = rows.reduce((sum, row) => sum + row.sessions.filter((session) => ["ANSWERED", "CLOSED"].includes(session.status)).length, 0);
		$: totalSessions && Math.round(completedSessions / totalSessions * 100);
		head("4w0g2z", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>Statistiche corso</title>`);
			});
		});
		$$renderer.push(`<div class="page-content"><div class="container-fluid py-4">`);
		PageHeader($$renderer, {
			title: "Statistiche",
			subtitle: "Andamento del corso",
			parentHref: `/corsi/${courseId}`,
			parentLabel: "Corso"
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
