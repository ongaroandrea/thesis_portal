import { A as escape_html, a as derived, s as head, w as getContext } from "../../chunks/server.js";
import "../../chunks/index-server2.js";
import "../../chunks/client.js";
import { h as Col, m as Container, n as Row } from "../../chunks/dist.js";
import { t as ParticlesAuth } from "../../chunks/ParticlesAuth.js";
//#endregion
//#region node_modules/@sveltejs/kit/src/runtime/app/state/server.js
function context() {
	return getContext("__request__");
}
//#endregion
//#region node_modules/@sveltejs/kit/src/runtime/app/state/index.js
/**
* A read-only reactive object with information about the current page, serving several use cases:
* - retrieving the combined `data` of all pages/layouts anywhere in your component tree (also see [loading data](https://svelte.dev/docs/kit/load))
* - retrieving the current value of the `form` prop anywhere in your component tree (also see [form actions](https://svelte.dev/docs/kit/form-actions))
* - retrieving the page state that was set through `goto`, `pushState` or `replaceState` (also see [goto](https://svelte.dev/docs/kit/$app-navigation#goto) and [shallow routing](https://svelte.dev/docs/kit/shallow-routing))
* - retrieving metadata such as the URL you're on, the current route and its parameters, and whether or not there was an error
*
* ```svelte
* <!--- file: +layout.svelte --->
* <script>
* 	import { page } from '$app/state';
* <\/script>
*
* <p>Currently at {page.url.pathname}</p>
*
* {#if page.error}
* 	<span class="red">Problem detected</span>
* {:else}
* 	<span class="small">All systems operational</span>
* {/if}
* ```
*
* Changes to `page` are available exclusively with runes. (The legacy reactivity syntax will not reflect any changes)
*
* ```svelte
* <!--- file: +page.svelte --->
* <script>
* 	import { page } from '$app/state';
* 	const id = $derived(page.params.id); // This will correctly update id for usage on this page
* 	$: badId = page.params.id; // Do not use; will never update after initial load
* <\/script>
* ```
*
* On the server, values can only be read during rendering (in other words _not_ in e.g. `load` functions). In the browser, the values can be read at any time.
*
* @type {import('@sveltejs/kit').Page}
*/
var page = {
	get data() {
		return context().page.data;
	},
	get error() {
		return context().page.error;
	},
	get form() {
		return context().page.form;
	},
	get params() {
		return context().page.params;
	},
	get route() {
		return context().page.route;
	},
	get state() {
		return context().page.state;
	},
	get status() {
		return context().page.status;
	},
	get url() {
		return context().page.url;
	}
};
//#endregion
//#region src/routes/+error.svelte
function _error($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const messages = {
			403: {
				title: "Accesso negato",
				body: "Non hai i permessi necessari per visualizzare questa pagina."
			},
			404: {
				title: "Pagina non trovata",
				body: "La pagina che stai cercando non esiste o è stata spostata."
			},
			500: {
				title: "Errore interno del server",
				body: "Si è verificato un problema inatteso. Riprova tra poco."
			}
		};
		let content = derived(() => messages[page.status] ?? {
			title: "Qualcosa è andato storto",
			body: page.error?.message ?? "Si è verificato un errore inatteso."
		});
		head("1j96wlh", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(page.status)} | Portale correzione automatica</title>`);
			});
		});
		ParticlesAuth($$renderer, {
			children: ($$renderer) => {
				$$renderer.push(`<div class="auth-page-content d-flex align-items-center">`);
				Container($$renderer, {
					children: ($$renderer) => {
						Row($$renderer, {
							class: "justify-content-center",
							children: ($$renderer) => {
								Col($$renderer, {
									lg: 8,
									class: "text-center text-white",
									children: ($$renderer) => {
										$$renderer.push(`<img src="/images/polito_logo_desktop.svg" alt="Politecnico di Torino" height="80" class="mb-4 bg-white p-2 rounded"/> <h1 class="display-1 fw-semibold">${escape_html(page.status)}</h1> <h2>${escape_html(content().title)}</h2> <p class="mb-4">${escape_html(content().body)}</p> <a href="/" class="btn btn-success"><i class="mdi mdi-home me-1"></i>Torna alla home</a>`);
									},
									$$slots: { default: true }
								});
							},
							$$slots: { default: true }
						});
					},
					$$slots: { default: true }
				});
				$$renderer.push(`<!----></div>`);
			},
			$$slots: { default: true }
		});
	});
}
//#endregion
export { _error as default };
