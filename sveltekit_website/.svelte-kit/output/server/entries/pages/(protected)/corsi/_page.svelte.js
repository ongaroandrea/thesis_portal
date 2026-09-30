import { A as escape_html, O as attr, g as unsubscribe_stores, m as store_get, s as head } from "../../../../chunks/server.js";
import "../../../../chunks/index-server2.js";
import { t as $format } from "../../../../chunks/runtime.js";
import { t as authClient } from "../../../../chunks/auth-client.js";
import "../../../../chunks/api.js";
import { t as PageHeader } from "../../../../chunks/PageHeader.js";
//#region src/routes/(protected)/corsi/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let currentUser, canCreate;
		const session = authClient.useSession();
		let courses = [];
		let search = "";
		let statusFilter = "all";
		$: currentUser = store_get($$store_subs ??= {}, "$session", session)?.data?.user;
		$: canCreate = ["professor", "developer"].includes(currentUser?.role);
		$: courses.filter((course) => {
			return `${course.name} ${course.description}`.toLowerCase().includes(search.toLowerCase()) && true;
		});
		head("11i6lxh", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("nav.courses"))}</title>`);
			});
		});
		$$renderer.push(`<div class="page-content"><div class="container-fluid py-4">`);
		PageHeader($$renderer, {
			title: store_get($$store_subs ??= {}, "$_", $format)("nav.courses"),
			subtitle: store_get($$store_subs ??= {}, "$_", $format)("courses.subtitle"),
			parentLabel: store_get($$store_subs ??= {}, "$_", $format)("common.portal"),
			parentHref: "/"
		});
		$$renderer.push(`<!----> <div class="card border-0 shadow-sm mb-4"><div class="card-body course-filters svelte-11i6lxh"><div class="input-group search-box flex-grow-1 svelte-11i6lxh"><span class="input-group-text bg-transparent"><i class="ri-search-line"></i></span> <input class="form-control" type="search"${attr("value", search)}${attr("placeholder", store_get($$store_subs ??= {}, "$_", $format)("courses.search"))}/></div> `);
		$$renderer.select({
			class: "form-select status-filter",
			value: statusFilter
		}, ($$renderer) => {
			$$renderer.option({ value: "all" }, ($$renderer) => {
				$$renderer.push(`${escape_html(store_get($$store_subs ??= {}, "$_", $format)("courses.allStatuses"))}`);
			});
			$$renderer.option({ value: "active" }, ($$renderer) => {
				$$renderer.push(`${escape_html(store_get($$store_subs ??= {}, "$_", $format)("status.activePlural"))}`);
			});
			$$renderer.option({ value: "inactive" }, ($$renderer) => {
				$$renderer.push(`${escape_html(store_get($$store_subs ??= {}, "$_", $format)("status.inactivePlural"))}`);
			});
		}, "svelte-11i6lxh");
		$$renderer.push(` `);
		if (canCreate) $$renderer.push(`<!--[0--><a class="btn btn-primary" href="/corsi/aggiungi"><i class="ri-add-line me-1"></i>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("course.new"))}</a>`);
		else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div></div> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push(`<!--[0--><div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="text-muted mt-3">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("courses.loading"))}</p></div>`);
		$$renderer.push(`<!--]--></div></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { _page as default };
