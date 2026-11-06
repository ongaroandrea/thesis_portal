import { A as escape_html, g as unsubscribe_stores, m as store_get, s as head } from "../../../../../chunks/server.js";
import "../../../../../chunks/navigation.js";
import { t as goto } from "../../../../../chunks/client.js";
import { n as apiRequest } from "../../../../../chunks/api.js";
import { t as CourseForm } from "../../../../../chunks/CourseForm.js";
import { t as PageHeader } from "../../../../../chunks/PageHeader.js";
import { t as $format } from "../../../../../chunks/runtime.js";
// src/routes/(protected)/corsi/aggiungi/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let busy = false;
		let errorMessage = "";
		async function createCourse(values) {
			busy = true;
			errorMessage = "";
			try {
				const course = await apiRequest("/api/corsi", {
					method: "POST",
					body: JSON.stringify(values)
				});
				goto(`/corsi/${course.id}`);
			} catch (error) {
				errorMessage = error.message;
			} finally {
				busy = false;
			}
		}
		head("ra1opl", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("course.new"))}</title>`);
			});
		});
		$$renderer.push(`<div class="page-content"><div class="container-fluid py-4">`);
		PageHeader($$renderer, {
			title: store_get($$store_subs ??= {}, "$_", $format)("course.new"),
			subtitle: store_get($$store_subs ??= {}, "$_", $format)("course.newSubtitle")
		});
		$$renderer.push(`<!----> <div class="row justify-content-center"><div class="col-xl-9">`);
		if (errorMessage) $$renderer.push(`<!--[0--><div class="alert alert-danger">${escape_html(errorMessage)}</div>`);
		else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="card border-0 shadow-sm"><div class="card-header bg-transparent p-4"><h2 class="h5 mb-1 text-primary">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("course.information"))}</h2><p class="text-muted mb-0">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("course.informationHelp"))}</p></div><div class="card-body p-4">`);
		CourseForm($$renderer, {
			onSubmit: createCourse,
			busy,
			submitLabel: store_get($$store_subs ??= {}, "$_", $format)("course.create")
		});
		$$renderer.push(`<!----></div></div></div></div></div></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
export { _page as default };
