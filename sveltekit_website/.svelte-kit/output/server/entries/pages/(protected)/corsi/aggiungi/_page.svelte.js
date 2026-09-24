import { A as escape_html, s as head } from "../../../../../chunks/server.js";
import { t as goto } from "../../../../../chunks/client.js";
import "../../../../../chunks/navigation.js";
import { n as apiRequest } from "../../../../../chunks/api.js";
import { t as PageHeader } from "../../../../../chunks/PageHeader.js";
import { t as CourseForm } from "../../../../../chunks/CourseForm.js";
//#region src/routes/(protected)/corsi/aggiungi/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
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
				$$renderer.push(`<title>Nuovo corso</title>`);
			});
		});
		$$renderer.push(`<div class="page-content"><div class="container-fluid py-4">`);
		PageHeader($$renderer, {
			title: "Nuovo corso",
			subtitle: "Configura il corso e il periodo di riferimento"
		});
		$$renderer.push(`<!----> <div class="row justify-content-center"><div class="col-xl-9">`);
		if (errorMessage) $$renderer.push(`<!--[0--><div class="alert alert-danger">${escape_html(errorMessage)}</div>`);
		else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="card border-0 shadow-sm"><div class="card-header bg-transparent p-4"><h5 class="mb-1 text-primary">Informazioni del corso</h5><p class="text-muted mb-0">Potrai aggiungere membri e attività dopo la creazione.</p></div><div class="card-body p-4">`);
		CourseForm($$renderer, {
			onSubmit: createCourse,
			busy,
			submitLabel: "Crea corso"
		});
		$$renderer.push(`<!----></div></div></div></div></div></div>`);
	});
}
//#endregion
export { _page as default };
