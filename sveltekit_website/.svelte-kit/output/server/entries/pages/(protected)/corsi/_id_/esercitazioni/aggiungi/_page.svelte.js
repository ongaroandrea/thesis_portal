import { A as escape_html, g as unsubscribe_stores, m as store_get, s as head } from "../../../../../../../chunks/server.js";
import { t as $format } from "../../../../../../../chunks/runtime.js";
import { t as goto } from "../../../../../../../chunks/client.js";
import { n as page } from "../../../../../../../chunks/stores.js";
import "../../../../../../../chunks/navigation.js";
import { n as apiRequest } from "../../../../../../../chunks/api.js";
import { t as PageHeader } from "../../../../../../../chunks/PageHeader.js";
import { t as ActivityForm } from "../../../../../../../chunks/ActivityForm.js";
//#region src/routes/(protected)/corsi/[id]/esercitazioni/aggiungi/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let courseId;
		let busy = false;
		let errorMessage = "";
		async function createActivity(values) {
			busy = true;
			errorMessage = "";
			try {
				const activity = await apiRequest("/api/esercitazioni", {
					method: "POST",
					body: JSON.stringify({
						...values,
						courseId: Number(courseId)
					})
				});
				goto(`/corsi/${courseId}/esercitazioni/${activity.id}`);
			} catch (error) {
				errorMessage = error.message;
			} finally {
				busy = false;
			}
		}
		$: courseId = store_get($$store_subs ??= {}, "$page", page).params.id;
		head("1hdaskp", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.new"))}</title>`);
			});
		});
		$$renderer.push(`<div class="page-content"><div class="container-fluid py-4">`);
		PageHeader($$renderer, {
			title: store_get($$store_subs ??= {}, "$_", $format)("activity.new"),
			subtitle: store_get($$store_subs ??= {}, "$_", $format)("activity.newSubtitle"),
			parentHref: `/corsi/${courseId}/esercitazioni`,
			parentLabel: store_get($$store_subs ??= {}, "$_", $format)("activity.activities")
		});
		$$renderer.push(`<!---->`);
		if (errorMessage) $$renderer.push(`<!--[0--><div class="alert alert-danger">${escape_html(errorMessage)}</div>`);
		else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--><div class="row justify-content-center"><div class="col-xl-10"><div class="card border-0 shadow-sm"><div class="card-body p-4">`);
		ActivityForm($$renderer, {
			onSubmit: createActivity,
			busy,
			submitLabel: store_get($$store_subs ??= {}, "$_", $format)("activity.create"),
			cancelHref: `/corsi/${courseId}/esercitazioni`
		});
		$$renderer.push(`<!----></div></div></div></div></div></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { _page as default };
