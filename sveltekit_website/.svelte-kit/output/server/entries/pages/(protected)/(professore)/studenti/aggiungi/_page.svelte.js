import { A as escape_html, O as attr, s as head } from "../../../../../../chunks/server.js";
import { t as BreadCrumb } from "../../../../../../chunks/BreadCrumb.js";
//#region src/routes/(protected)/(professore)/studenti/aggiungi/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let userData = {
			name: "",
			surname: "",
			email: "",
			role: "student"
		};
		let saving = false;
		head("mdmg1v", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>Nuovo utente</title>`);
			});
		});
		$$renderer.push(`<div class="page-content"><div class="container-fluid py-4">`);
		BreadCrumb($$renderer, {
			title: "Nuovo utente",
			pageTitle: "Studenti",
			pageHref: "/studenti"
		});
		$$renderer.push(`<!----> <div class="row justify-content-center"><div class="col-xl-8"><div class="card border-0 shadow-sm"><div class="card-header"><h5 class="mb-0">Crea un account</h5></div> <form class="card-body">`);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push(`<!--[-1--><div class="alert alert-info"><i class="ri-key-2-line me-2"></i>La password temporanea verrà generata automaticamente dopo la creazione.</div> <div class="row g-3"><div class="col-md-6"><label for="name" class="form-label">Nome</label><input id="name" class="form-control" required=""${attr("value", userData.name)}/></div> <div class="col-md-6"><label for="surname" class="form-label">Cognome</label><input id="surname" class="form-control"${attr("value", userData.surname)}/></div> <div class="col-md-6"><label for="email" class="form-label">Email</label><input id="email" class="form-control" type="email" required=""${attr("value", userData.email)}/></div> <div class="col-md-6"><label for="role" class="form-label">Ruolo</label>`);
		$$renderer.select({
			id: "role",
			class: "form-select",
			value: userData.role
		}, ($$renderer) => {
			$$renderer.option({ value: "student" }, ($$renderer) => {
				$$renderer.push(`Studente`);
			});
			$$renderer.option({ value: "professor" }, ($$renderer) => {
				$$renderer.push(`Professore`);
			});
			$$renderer.option({ value: "developer" }, ($$renderer) => {
				$$renderer.push(`Sviluppatore`);
			});
		});
		$$renderer.push(`</div></div> <div class="d-flex justify-content-end gap-2 mt-4"><a class="btn btn-light" href="/studenti">Annulla</a><button class="btn btn-primary" type="submit"${attr("disabled", saving, true)}>${escape_html("Crea utente")}</button></div>`);
		$$renderer.push(`<!--]--></form></div></div></div></div></div>`);
	});
}
//#endregion
export { _page as default };
