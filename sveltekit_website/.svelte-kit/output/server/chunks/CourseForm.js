import { A as escape_html, O as attr, Rt as fallback, g as unsubscribe_stores, i as bind_props, m as store_get } from "./server.js";
import { a as toDateInput } from "./api.js";
import { t as $format } from "./runtime.js";
// src/lib/components/portal/CourseForm.svelte
function CourseForm($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let initial = fallback($$props["initial"], () => ({}), true);
		let submitLabel = fallback($$props["submitLabel"], "");
		let busy = fallback($$props["busy"], false);
		let onSubmit = $$props["onSubmit"];
		let name = initial.name ?? "";
		let description = initial.description ?? "";
		let startsAt = toDateInput(initial.startsAt);
		let endsAt = toDateInput(initial.endsAt);
		let isActive = initial.isActive ?? true;
		$$renderer.push(`<form><div class="mb-4"><label class="form-label fw-semibold" for="course-name">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("course.name"))}</label> <input id="course-name" class="form-control form-control-lg"${attr("value", name)} maxlength="200" required=""${attr("placeholder", store_get($$store_subs ??= {}, "$_", $format)("course.namePlaceholder"))}/></div> <div class="mb-4"><label class="form-label fw-semibold" for="course-description">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("common.description"))}</label> <textarea id="course-description" class="form-control" rows="5" maxlength="20000"${attr("placeholder", store_get($$store_subs ??= {}, "$_", $format)("course.descriptionPlaceholder"))}>`);
		const $$body = escape_html(description);
		if ($$body) $$renderer.push(`${$$body}`);
		$$renderer.push(`</textarea></div> <div class="row g-3 mb-4"><div class="col-md-6"><label class="form-label fw-semibold" for="course-start">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("common.start"))}</label> <input id="course-start" type="date" class="form-control"${attr("value", startsAt)}/></div> <div class="col-md-6"><label class="form-label fw-semibold" for="course-end">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("common.end"))}</label> <input id="course-end" type="date" class="form-control"${attr("value", endsAt)}/></div></div> <div class="form-check form-switch mb-4"><input id="course-active" class="form-check-input" type="checkbox"${attr("checked", isActive, true)}/> <label class="form-check-label" for="course-active">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("course.activeHelp"))}</label></div> <div class="d-flex justify-content-end gap-2"><a class="btn btn-light" href="/corsi">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("common.cancel"))}</a> <button class="btn btn-success px-4" type="submit"${attr("disabled", busy || !name.trim(), true)}>`);
		if (busy) $$renderer.push(`<!--[0--><span class="spinner-border spinner-border-sm me-2"></span>`);
		else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->${escape_html(submitLabel || store_get($$store_subs ??= {}, "$_", $format)("course.save"))}</button></div></form>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
		bind_props($$props, {
			initial,
			submitLabel,
			busy,
			onSubmit
		});
	});
}
export { CourseForm as t };
