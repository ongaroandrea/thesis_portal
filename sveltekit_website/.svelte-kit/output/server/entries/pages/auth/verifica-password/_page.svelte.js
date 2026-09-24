import { A as escape_html, O as attr, g as unsubscribe_stores, k as clsx, m as store_get, s as head, t as attr_class } from "../../../../chunks/server.js";
import { S as Alert, h as Col, m as Container, n as Row, s as Label, v as CardBody, x as Button, y as Card } from "../../../../chunks/dist.js";
import { t as ParticlesAuth } from "../../../../chunks/ParticlesAuth.js";
import { n as page } from "../../../../chunks/stores.js";
import "../../../../chunks/navigation.js";
import "../../../../chunks/auth-client.js";
import { t as Link } from "../../../../chunks/svelte-link.js";
//#region src/routes/auth/verifica-password/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let errorParam, hasMinLength, hasLower, hasUpper, hasNumber;
		let password = "";
		let confirmPassword = "";
		let loading = false;
		$: store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("token");
		$: errorParam = store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("error");
		$: hasMinLength = false;
		$: hasLower = /[a-z]/.test(password);
		$: hasUpper = /[A-Z]/.test(password);
		$: hasNumber = /[0-9]/.test(password);
		$: (() => {
			return {
				score: 0,
				label: "",
				color: "",
				hex: "#dee2e6"
			};
		})();
		head("19d1qel", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>Reimposta password | Portale correzione automatica</title>`);
			});
		});
		ParticlesAuth($$renderer, {
			children: ($$renderer) => {
				$$renderer.push(`<div class="auth-page-content pt-5 svelte-19d1qel">`);
				Container($$renderer, {
					children: ($$renderer) => {
						Row($$renderer, {
							children: ($$renderer) => {
								Col($$renderer, {
									lg: 12,
									children: ($$renderer) => {
										$$renderer.push(`<div class="text-center mt-sm-5 mb-4 text-white-50 svelte-19d1qel"><div class="svelte-19d1qel">`);
										Link($$renderer, {
											href: "/",
											class: "d-inline-block auth-logo",
											children: ($$renderer) => {
												$$renderer.push(`<img src="/images/polito_logo_desktop.svg" alt="Politecnico di Torino" height="76" class="svelte-19d1qel"/>`);
											},
											$$slots: { default: true }
										});
										$$renderer.push(`<!----></div> <p class="mt-3 fs-15 fw-medium svelte-19d1qel">Portale correzione automatica <span class="alpha-label svelte-19d1qel">Alpha</span></p></div>`);
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
													class: "p-4",
													children: ($$renderer) => {
														$$renderer.push(`<div class="text-center mt-2 svelte-19d1qel"><h5 class="text-primary svelte-19d1qel">Crea Nuova Password</h5> <p class="text-muted svelte-19d1qel">La tua nuova password deve essere diversa dalla precedente.</p></div> <div class="p-2 svelte-19d1qel">`);
														$$renderer.push(`<!--[-1--><form class="svelte-19d1qel">`);
														if (errorParam) {
															$$renderer.push("<!--[0-->");
															Alert($$renderer, {
																color: "danger",
																class: "text-center",
																children: ($$renderer) => {
																	$$renderer.push(`<!---->${escape_html(errorParam)}`);
																},
																$$slots: { default: true }
															});
														} else $$renderer.push("<!--[-1-->");
														$$renderer.push(`<!--]--> <div class="mb-3 svelte-19d1qel">`);
														Label($$renderer, {
															class: "form-label",
															for: "password",
															children: ($$renderer) => {
																$$renderer.push(`<!---->Nuova Password`);
															},
															$$slots: { default: true }
														});
														$$renderer.push(`<!----> <div class="input-group svelte-19d1qel">`);
														$$renderer.push(`<!--[-1--><input type="password" class="form-control svelte-19d1qel" id="password" placeholder="Inserisci nuova password"${attr("value", password)} autocomplete="new-password" required=""/>`);
														$$renderer.push(`<!--]--> <button type="button" class="btn btn-outline-secondary svelte-19d1qel"${attr("title", "Mostra")}><i${attr_class(clsx("ri-eye-line"), "svelte-19d1qel")}></i></button></div></div> `);
														$$renderer.push("<!--[-1-->");
														$$renderer.push(`<!--]--> <div class="p-3 bg-light mb-3 rounded svelte-19d1qel"><h5 class="fs-13 svelte-19d1qel">La tua password deve contenere:</h5> <p${attr_class("fs-12 mb-2 svelte-19d1qel", void 0, {
															"valid": hasMinLength,
															"invalid": !hasMinLength
														})}>Almeno <b class="svelte-19d1qel">8 caratteri</b></p> <p${attr_class("fs-12 mb-2 svelte-19d1qel", void 0, {
															"valid": hasLower,
															"invalid": !hasLower
														})}>Almeno una lettera <b class="svelte-19d1qel">minuscola</b> (a-z)</p> <p${attr_class("fs-12 mb-2 svelte-19d1qel", void 0, {
															"valid": hasUpper,
															"invalid": !hasUpper
														})}>Almeno una lettera <b class="svelte-19d1qel">maiuscola</b> (A-Z)</p> <p${attr_class("fs-12 mb-0 svelte-19d1qel", void 0, {
															"valid": hasNumber,
															"invalid": !hasNumber
														})}>Almeno un <b class="svelte-19d1qel">numero</b> (0-9)</p></div> <div class="mb-3 svelte-19d1qel">`);
														Label($$renderer, {
															class: "form-label",
															for: "confirm-password",
															children: ($$renderer) => {
																$$renderer.push(`<!---->Conferma Password`);
															},
															$$slots: { default: true }
														});
														$$renderer.push(`<!----> <div class="input-group svelte-19d1qel">`);
														$$renderer.push(`<!--[-1--><input type="password" class="form-control svelte-19d1qel" id="confirm-password" placeholder="Conferma password"${attr("value", confirmPassword)} required=""/>`);
														$$renderer.push(`<!--]--> <button type="button" class="btn btn-outline-secondary svelte-19d1qel"${attr("title", "Mostra")}><i${attr_class(clsx("ri-eye-line"), "svelte-19d1qel")}></i></button></div> `);
														$$renderer.push("<!--[-1-->");
														$$renderer.push(`<!--]--></div> <div class="mt-4 svelte-19d1qel">`);
														Button($$renderer, {
															color: "primary",
															class: "w-100",
															type: "submit",
															disabled: loading,
															children: ($$renderer) => {
																$$renderer.push(`<!--[-1-->Reimposta Password`);
																$$renderer.push(`<!--]-->`);
															},
															$$slots: { default: true }
														});
														$$renderer.push(`<!----></div></form>`);
														$$renderer.push(`<!--]--></div>`);
													},
													$$slots: { default: true }
												});
											},
											$$slots: { default: true }
										});
										$$renderer.push(`<!----> <div class="mt-4 text-center svelte-19d1qel"><p class="mb-0 svelte-19d1qel">Ricordi la password? `);
										Link($$renderer, {
											href: "/login",
											class: "fw-semibold text-primary text-decoration-underline",
											children: ($$renderer) => {
												$$renderer.push(`<!---->Torna al Login`);
											},
											$$slots: { default: true }
										});
										$$renderer.push(`<!----></p></div>`);
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
export { _page as default };
