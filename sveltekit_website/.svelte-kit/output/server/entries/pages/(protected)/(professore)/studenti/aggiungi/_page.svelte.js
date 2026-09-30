import { A as escape_html, O as attr, g as unsubscribe_stores, m as store_get, s as head } from "../../../../../../chunks/server.js";
import { t as $format } from "../../../../../../chunks/runtime.js";
import "../../../../../../chunks/api.js";
import { t as BreadCrumb } from "../../../../../../chunks/BreadCrumb.js";
//#region src/routes/(protected)/(professore)/studenti/aggiungi/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let userData = {
			name: "",
			surname: "",
			email: "",
			role: "student"
		};
		let saving = false;
		head("mdmg1v", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("users.new"))}</title>`);
			});
		});
		$$renderer.push(`<div class="page-content"><div class="container-fluid py-4">`);
		BreadCrumb($$renderer, {
			title: store_get($$store_subs ??= {}, "$_", $format)("users.new"),
			pageTitle: store_get($$store_subs ??= {}, "$_", $format)("nav.students"),
			pageHref: "/studenti"
		});
		$$renderer.push(`<!----> <div class="row justify-content-center"><div class="col-xl-8"><div class="card border-0 shadow-sm"><div class="card-header"><h5 class="mb-0">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("users.createAccount"))}</h5></div> <form class="card-body">`);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push(`<!--[-1--><div class="alert alert-info"><i class="ri-key-2-line me-2"></i>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("users.passwordGenerated"))}</div> <div class="row g-3"><div class="col-md-6"><label for="name" class="form-label">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("common.name"))}</label><input id="name" class="form-control" required=""${attr("value", userData.name)}/></div> <div class="col-md-6"><label for="surname" class="form-label">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("common.surname"))}</label><input id="surname" class="form-control"${attr("value", userData.surname)}/></div> <div class="col-md-6"><label for="email" class="form-label">Email</label><input id="email" class="form-control" type="email" required=""${attr("value", userData.email)}/></div> <div class="col-md-6"><label for="role" class="form-label">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("common.role"))}</label>`);
		$$renderer.select({
			id: "role",
			class: "form-select",
			value: userData.role
		}, ($$renderer) => {
			$$renderer.option({ value: "student" }, ($$renderer) => {
				$$renderer.push(`${escape_html(store_get($$store_subs ??= {}, "$_", $format)("role.student"))}`);
			});
			$$renderer.option({ value: "professor" }, ($$renderer) => {
				$$renderer.push(`${escape_html(store_get($$store_subs ??= {}, "$_", $format)("role.professor"))}`);
			});
			$$renderer.option({ value: "developer" }, ($$renderer) => {
				$$renderer.push(`${escape_html(store_get($$store_subs ??= {}, "$_", $format)("role.developer"))}`);
			});
		});
		$$renderer.push(`</div></div> <div class="d-flex justify-content-end gap-2 mt-4"><a class="btn btn-light" href="/studenti">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("common.cancel"))}</a><button class="btn btn-primary" type="submit"${attr("disabled", saving, true)}>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("users.create"))}</button></div>`);
		$$renderer.push(`<!--]--></form></div></div></div></div></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { _page as default };
