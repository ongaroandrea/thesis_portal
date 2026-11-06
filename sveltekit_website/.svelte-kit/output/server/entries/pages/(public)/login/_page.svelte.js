import { A as escape_html, O as attr, g as unsubscribe_stores, m as store_get, s as head } from "../../../../chunks/server.js";
import { _ as Card, g as CardBody, m as Col, n as Row, p as Container, s as Label } from "../../../../chunks/dist.js";
import { t as Link } from "../../../../chunks/svelte-link.js";
import { t as ParticlesAuth } from "../../../../chunks/ParticlesAuth.js";
import "../../../../chunks/auth-client.js";
import "../../../../chunks/navigation.js";
import { t as $format } from "../../../../chunks/runtime.js";
// src/routes/(public)/login/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let email = "";
		let password = "";
		let loading = false;
		head("iv8lg3", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("login"))} | ${escape_html(store_get($$store_subs ??= {}, "$_", $format)("home.eyebrow"))}</title>`);
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
										$$renderer.push(`<div class="text-center mt-sm-5 mb-4 text-white-50"><a href="/" class="d-inline-block auth-logo svelte-iv8lg3"><img src="/images/polito_logo_desktop.svg" alt="Politecnico di Torino" height="76" class="svelte-iv8lg3"/></a></div>`);
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
														$$renderer.push(`<div class="text-center mt-2"><h1 class="h4 text-primary">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("auth.welcome"))}</h1> <p class="text-muted">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("auth.subtitle"))}</p></div> <div class="p-2 mt-4">`);
														$$renderer.push("<!--[-1-->");
														$$renderer.push(`<!--]--> <form class="form"><div class="mb-3">`);
														Label($$renderer, {
															for: "email",
															class: "form-label",
															children: ($$renderer) => {
																$$renderer.push(`<!---->Email`);
															},
															$$slots: { default: true }
														});
														$$renderer.push(`<!----> <input type="email" class="form-control" id="email" name="email" autocomplete="email" required=""${attr("placeholder", store_get($$store_subs ??= {}, "$_", $format)("auth.emailPlaceholder"))}${attr("value", email)}/></div> <div class="mb-3"><div class="float-end">`);
														Link($$renderer, {
															href: "/password-dimenticata",
															class: "text-muted",
															children: ($$renderer) => {
																$$renderer.push(`<!---->${escape_html(store_get($$store_subs ??= {}, "$_", $format)("auth.forgotPassword"))}`);
															},
															$$slots: { default: true }
														});
														$$renderer.push(`<!----></div> `);
														Label($$renderer, {
															class: "form-label",
															for: "password-input",
															children: ($$renderer) => {
																$$renderer.push(`<!---->Password`);
															},
															$$slots: { default: true }
														});
														$$renderer.push(`<!----> <div class="position-relative auth-pass-inputgroup mb-3">`);
														$$renderer.push(`<!--[-1--><input type="password" class="form-control pe-5"${attr("placeholder", store_get($$store_subs ??= {}, "$_", $format)("auth.passwordPlaceholder"))} id="password-input" name="password" autocomplete="current-password" required=""${attr("value", password)}/>`);
														$$renderer.push(`<!--]--> <button class="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted" type="button" id="password-addon"${attr("aria-label", store_get($$store_subs ??= {}, "$_", $format)("auth.showPassword"))}><i class="ri-eye-fill align-middle"></i></button></div></div> <div class="form-check"><input class="form-check-input" type="checkbox" value="" id="auth-remember-check"/> `);
														Label($$renderer, {
															class: "form-check-label",
															for: "auth-remember-check",
															children: ($$renderer) => {
																$$renderer.push(`<!---->${escape_html(store_get($$store_subs ??= {}, "$_", $format)("auth.remember"))}`);
															},
															$$slots: { default: true }
														});
														$$renderer.push(`<!----></div> <div class="mt-4"><button class="btn btn-primary w-100" type="submit"${attr("disabled", loading, true)}>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("login"))}</button></div></form></div>`);
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
export { _page as default };
