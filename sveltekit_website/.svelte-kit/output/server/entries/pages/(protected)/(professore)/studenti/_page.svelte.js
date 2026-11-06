import { A as escape_html, O as attr, g as unsubscribe_stores, m as store_get, s as head } from "../../../../../chunks/server.js";
import "../../../../../chunks/index-server2.js";
import { t as authClient } from "../../../../../chunks/auth-client.js";
import "../../../../../chunks/api.js";
import { t as PageHeader } from "../../../../../chunks/PageHeader.js";
import { t as $format } from "../../../../../chunks/runtime.js";
// src/routes/(protected)/(professore)/studenti/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let currentUser, isAdmin;
		const session = authClient.useSession();
		let users = [];
		let searchTerm = "";
		const roleNames = {
			admin: "role.admin",
			professor: "role.professor",
			student: "role.student"
		};
		$: currentUser = store_get($$store_subs ??= {}, "$session", session)?.data?.user;
		$: isAdmin = currentUser?.role === "admin";
		$: users.filter((item) => {
			const query = searchTerm.trim().toLowerCase();
			if (!query) return true;
			return [
				item.name,
				item.surname,
				item.email,
				roleNames[item.role] ? store_get($$store_subs ??= {}, "$_", $format)(roleNames[item.role]) : item.role
			].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
		});
		head("1f1ws9j", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("nav.students"))}</title>`);
			});
		});
		$$renderer.push(`<div class="page-content"><div class="container-fluid py-4">`);
		PageHeader($$renderer, {
			title: store_get($$store_subs ??= {}, "$_", $format)("nav.students"),
			subtitle: store_get($$store_subs ??= {}, "$_", $format)("users.listSubtitle"),
			parentLabel: store_get($$store_subs ??= {}, "$_", $format)("common.portal"),
			parentHref: "/corsi"
		});
		$$renderer.push(`<!----> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="card border-0 shadow-sm"><div class="card-header d-flex flex-wrap gap-3 justify-content-between align-items-center"><h2 class="h5 mb-0">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("users.users"))}</h2> `);
		if (isAdmin) $$renderer.push(`<!--[0--><a class="btn btn-primary" href="/studenti/aggiungi"><i class="ri-user-add-line me-1"></i> ${escape_html(store_get($$store_subs ??= {}, "$_", $format)("users.new"))}</a>`);
		else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div> <div class="card-body"><label class="visually-hidden" for="user-search">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("users.searchLabel"))}</label> <input id="user-search" class="form-control mb-3" type="search"${attr("placeholder", store_get($$store_subs ??= {}, "$_", $format)("users.search"))}${attr("value", searchTerm)}/> `);
		$$renderer.push(`<!--[0--><div class="text-center py-5"><span class="spinner-border text-primary"></span></div>`);
		$$renderer.push(`<!--]--></div></div></div></div> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
export { _page as default };
