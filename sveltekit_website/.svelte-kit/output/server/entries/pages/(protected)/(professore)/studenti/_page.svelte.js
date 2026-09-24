import { O as attr, g as unsubscribe_stores, m as store_get, s as head } from "../../../../../chunks/server.js";
import "../../../../../chunks/index-server2.js";
import { t as authClient } from "../../../../../chunks/auth-client.js";
import "../../../../../chunks/api.js";
import { t as BreadCrumb } from "../../../../../chunks/BreadCrumb.js";
//#region src/routes/(protected)/(professore)/studenti/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let currentUser, isDeveloper;
		const session = authClient.useSession();
		let users = [];
		let searchTerm = "";
		const roleNames = {
			developer: "Sviluppatore",
			professor: "Professore",
			student: "Studente"
		};
		$: currentUser = store_get($$store_subs ??= {}, "$session", session)?.data?.user;
		$: isDeveloper = currentUser?.role === "developer";
		$: users.filter((item) => {
			const query = searchTerm.trim().toLowerCase();
			if (!query) return true;
			return [
				item.name,
				item.surname,
				item.email,
				roleNames[item.role]
			].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
		});
		head("1f1ws9j", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>Studenti</title>`);
			});
		});
		$$renderer.push(`<div class="page-content"><div class="container-fluid py-4">`);
		BreadCrumb($$renderer, {
			title: "Studenti",
			pageTitle: "Portale",
			pageHref: "/corsi"
		});
		$$renderer.push(`<!----> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="card border-0 shadow-sm"><div class="card-header d-flex flex-wrap gap-3 justify-content-between align-items-center"><h5 class="mb-0">Utenti</h5> `);
		if (isDeveloper) $$renderer.push(`<!--[0--><a class="btn btn-primary" href="/studenti/aggiungi"><i class="ri-user-add-line me-1"></i> Nuovo utente</a>`);
		else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div> <div class="card-body"><input class="form-control mb-3" type="search" placeholder="Cerca per nome, email o ruolo"${attr("value", searchTerm)}/> `);
		$$renderer.push(`<!--[0--><div class="text-center py-5"><span class="spinner-border text-primary"></span></div>`);
		$$renderer.push(`<!--]--></div></div></div></div> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { _page as default };
