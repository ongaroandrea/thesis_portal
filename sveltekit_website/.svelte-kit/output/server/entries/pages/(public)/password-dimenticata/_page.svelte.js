import { A as escape_html, O as attr, g as unsubscribe_stores, m as store_get, s as head } from "../../../../chunks/server.js";
import { t as $format } from "../../../../chunks/runtime.js";
import { S as Alert, h as Col, m as Container, n as Row, s as Label, v as CardBody, y as Card } from "../../../../chunks/dist.js";
import { t as ParticlesAuth } from "../../../../chunks/ParticlesAuth.js";
import "../../../../chunks/auth-client.js";
import { t as Link } from "../../../../chunks/svelte-link.js";
//#region src/routes/(public)/password-dimenticata/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let email = "";
		let loading = false;
		head("19zmier", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("auth.forgotPassword"))} | ${escape_html(store_get($$store_subs ??= {}, "$_", $format)("home.eyebrow"))}</title>`);
			});
		});
		ParticlesAuth($$renderer, {
			children: ($$renderer) => {
				$$renderer.push(`<div class="auth-page-content pt-5">`);
				Container($$renderer, {
					children: ($$renderer) => {
						Row($$renderer, {
							children: ($$renderer) => {
								Col($$renderer, {
									lg: 12,
									children: ($$renderer) => {
										$$renderer.push(`<div class="text-center mt-sm-5 mb-4 text-white-50"><div>`);
										Link($$renderer, {
											href: "/",
											class: "d-inline-block auth-logo",
											children: ($$renderer) => {
												$$renderer.push(`<img src="/images/polito_logo_desktop.svg" alt="Politecnico di Torino" height="76"/>`);
											},
											$$slots: { default: true }
										});
										$$renderer.push(`<!----></div> <p class="mt-3 fs-15 fw-medium">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("home.eyebrow"))}</p></div>`);
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
														$$renderer.push(`<div class="text-center mt-2"><h5 class="text-primary">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("auth.forgotPassword"))}</h5> <p class="text-muted">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("auth.forgotHelp"))}</p> <lord-icon src="//cdn.lordicon.com/rhvddzym.json" trigger="loop" colors="primary:#0ab39c" class="avatar-xl" style="width: 120px; height: 125px"></lord-icon></div> `);
														Alert($$renderer, {
															class: "border-0 alert-warning text-center mb-2 mx-2",
															role: "alert",
															children: ($$renderer) => {
																$$renderer.push(`<!---->${escape_html(store_get($$store_subs ??= {}, "$_", $format)("auth.forgotAlert"))}`);
															},
															$$slots: { default: true }
														});
														$$renderer.push(`<!----> <div class="p-2"><form><div class="mb-4">`);
														Label($$renderer, {
															class: "form-label",
															for: "email",
															children: ($$renderer) => {
																$$renderer.push(`<!---->Email`);
															},
															$$slots: { default: true }
														});
														$$renderer.push(`<!----> <input type="email" class="form-control" id="email"${attr("placeholder", store_get($$store_subs ??= {}, "$_", $format)("auth.emailPlaceholder"))}${attr("value", email)}/></div> <div class="text-center mt-4"><button class="btn btn-primary w-100" type="submit"${attr("disabled", loading, true)}>`);
														$$renderer.push(`<!--[-1-->${escape_html(store_get($$store_subs ??= {}, "$_", $format)("auth.sendReset"))}`);
														$$renderer.push(`<!--]--></button></div> `);
														$$renderer.push("<!--[-1-->");
														$$renderer.push(`<!--]--> `);
														$$renderer.push("<!--[-1-->");
														$$renderer.push(`<!--]--></form></div>`);
													},
													$$slots: { default: true }
												});
											},
											$$slots: { default: true }
										});
										$$renderer.push(`<!----> <div class="mt-4 text-center"><p class="mb-0">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("auth.backToLoginPrompt"))} `);
										Link($$renderer, {
											href: "/login",
											class: "fw-semibold text-primary text-decoration-underline",
											children: ($$renderer) => {
												$$renderer.push(`<!---->${escape_html(store_get($$store_subs ??= {}, "$_", $format)("auth.clickHere"))}`);
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
