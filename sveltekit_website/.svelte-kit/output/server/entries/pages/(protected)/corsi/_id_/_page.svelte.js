import { A as escape_html, g as unsubscribe_stores, m as store_get, s as head } from "../../../../../chunks/server.js";
import "../../../../../chunks/index-server2.js";
import { t as $format } from "../../../../../chunks/runtime.js";
import { n as page } from "../../../../../chunks/stores.js";
import "../../../../../chunks/navigation.js";
import "../../../../../chunks/api.js";
import "../../../../../chunks/ActivityForm.js";
//#region src/routes/(protected)/corsi/[id]/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let memberEmails, totalSessions, completedSessions;
		let activities = [];
		let members = [];
		let students = [];
		let statisticsRows = [];
		$: store_get($$store_subs ??= {}, "$page", page).params.id;
		$: activities.filter((activity) => true);
		$: memberEmails = new Set(members.map((member) => member.email.toLowerCase()));
		$: students.filter((student) => student.role === "student" && !student.banned && !memberEmails.has(student.email.toLowerCase()));
		$: totalSessions = statisticsRows.reduce((sum, row) => sum + row.sessions.length, 0);
		$: completedSessions = statisticsRows.reduce((sum, row) => sum + row.sessions.filter((session) => session.status === "ANSWERED").length, 0);
		$: totalSessions && Math.round(completedSessions / totalSessions * 100);
		head("rc0099", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.course"))}</title>`);
			});
		});
		$$renderer.push(`<div class="page-content"><div class="container-fluid py-4">`);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push(`<!--[0--><div class="text-center py-5"><div class="spinner-border text-primary"></div></div>`);
		$$renderer.push(`<!--]--></div></div> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { _page as default };
