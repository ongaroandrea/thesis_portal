import { A as escape_html, O as attr, a as derived, g as unsubscribe_stores, m as store_get, s as head, w as getContext } from "../../chunks/server.js";
import "../../chunks/index-server2.js";
import { t as $format } from "../../chunks/runtime.js";
import "../../chunks/client.js";
import { h as Col, m as Container, n as Row, v as CardBody, y as Card } from "../../chunks/dist.js";
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
		var $$store_subs;
		const messages = {
			400: ["error.badRequest", "error.badRequestBody"],
			403: ["error.forbidden", "error.forbiddenBody"],
			404: ["error.notFound", "error.notFoundBody"],
			500: ["error.server", "error.serverBody"]
		};
		let content = derived(() => messages[page.status] ?? ["error.generic", "error.genericBody"]);
		head("1j96wlh", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(page.status)} | ${escape_html(store_get($$store_subs ??= {}, "$_", $format)("home.eyebrow"))}</title>`);
			});
		});
		ParticlesAuth($$renderer, {
			children: ($$renderer) => {
				$$renderer.push(`<div class="auth-page-content">`);
				Container($$renderer, {
					children: ($$renderer) => {
						Row($$renderer, {
							children: ($$renderer) => {
								Col($$renderer, {
									lg: 12,
									children: ($$renderer) => {
										$$renderer.push(`<div class="text-center mt-sm-5 mb-4"><a href="/"${attr("aria-label", store_get($$store_subs ??= {}, "$_", $format)("common.backHome"))}><img src="/images/polito_logo_desktop.svg" alt="Politecnico di Torino" height="76"/></a></div>`);
									},
									$$slots: { default: true }
								});
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!----> `);
						Row($$renderer, {
							class: "justify-content-center",
							children: ($$renderer) => {
								Col($$renderer, {
									md: 8,
									lg: 6,
									xl: 5,
									children: ($$renderer) => {
										Card($$renderer, {
											class: "mt-4",
											children: ($$renderer) => {
												CardBody($$renderer, {
													class: "p-4 p-sm-5 text-center",
													children: ($$renderer) => {
														$$renderer.push(`<p class="display-1 fw-semibold text-primary mb-2">${escape_html(page.status)}</p> <h1 class="h3 mb-3">${escape_html(store_get($$store_subs ??= {}, "$_", $format)(content()[0]))}</h1> <p class="text-muted mb-4">${escape_html(store_get($$store_subs ??= {}, "$_", $format)(content()[1]))}</p> <a href="/" class="btn btn-primary"><i class="mdi mdi-home me-1" aria-hidden="true"></i>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("common.backHome"))}</a>`);
													},
													$$slots: { default: true }
												});
											},
											$$slots: { default: true }
										});
									},
									$$slots: { default: true }
								});
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!---->`);
					},
					$$slots: { default: true }
				});
				$$renderer.push(`<!----></div>`);
			},
			$$slots: { default: true }
		});
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { _error as default };
