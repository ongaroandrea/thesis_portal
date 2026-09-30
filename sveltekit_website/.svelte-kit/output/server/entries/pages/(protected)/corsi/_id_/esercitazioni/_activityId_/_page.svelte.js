import { A as escape_html, g as unsubscribe_stores, m as store_get, s as head } from "../../../../../../../chunks/server.js";
import "../../../../../../../chunks/index-server2.js";
import "../../../../../../../chunks/correction-focus.js";
import { t as $format } from "../../../../../../../chunks/runtime.js";
import { n as page } from "../../../../../../../chunks/stores.js";
import "../../../../../../../chunks/navigation.js";
import "../../../../../../../chunks/api.js";
import { t as PageHeader } from "../../../../../../../chunks/PageHeader.js";
//#endregion
//#region src/routes/(protected)/corsi/[id]/esercitazioni/[activityId]/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let courseId;
		let sessions = [];
		function viewLabel(image) {
			if (image.viewType === "OTHER") return image.customViewLabel;
			const key = {
				FRONT: "view.front",
				SIDE: "view.side",
				TOP: "view.top",
				ANGLED: "view.angled"
			}[image.viewType];
			return key ? store_get($$store_subs ??= {}, "$_", $format)(key) : image.viewType;
		}
		function sessionViewLabel(session) {
			return viewLabel({
				viewType: session.referenceViewType,
				customViewLabel: session.referenceCustomViewLabel
			}) || store_get($$store_subs ??= {}, "$_", $format)("view.unavailable");
		}
		function sessionViewKey(session) {
			return `${session.referenceViewType ?? "NONE"}:${session.referenceCustomViewLabel ?? ""}`;
		}
		function sessionStudentKey(session) {
			return session.isAnonymous ? `anonymous:${session.studentDisplayName}` : `student:${session.studentUserId ?? session.studentDisplayName}`;
		}
		$: courseId = store_get($$store_subs ??= {}, "$page", page).params.id;
		$: store_get($$store_subs ??= {}, "$page", page).params.activityId;
		$: [...new Set(sessions.map((session) => session.analysisFocus).filter(Boolean))];
		$: [...new Map(sessions.map((session) => [sessionViewKey(session), sessionViewLabel(session)])).entries()];
		$: [...new Map(sessions.map((session) => [sessionStudentKey(session), session.studentDisplayName])).entries()];
		$: sessions.filter((session) => true);
		head("1wen46y", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.activity"))}</title>`);
			});
		});
		$$renderer.push(`<div class="page-content"><div class="container-fluid py-4">`);
		PageHeader($$renderer, {
			title: store_get($$store_subs ??= {}, "$_", $format)("activity.activity"),
			subtitle: store_get($$store_subs ??= {}, "$_", $format)("activity.detailSubtitle"),
			parentHref: `/corsi/${courseId}`,
			parentLabel: store_get($$store_subs ??= {}, "$_", $format)("activity.course")
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
