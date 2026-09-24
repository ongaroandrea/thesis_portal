import { A as escape_html, O as attr, g as unsubscribe_stores, h as stringify, k as clsx, m as store_get, n as attr_style, o as ensure_array_like, s as head, t as attr_class } from "../../../../chunks/server.js";
import { t as formatNameForDisplay } from "../../../../chunks/text.js";
import { S as Alert, _ as CardHeader, a as ModalHeader, c as Input, g as CardTitle, h as Col, i as Modal, l as FormGroup, m as Container, n as Row, o as ModalBody, r as ModalFooter, s as Label, t as Spinner, v as CardBody, x as Button, y as Card } from "../../../../chunks/dist.js";
import { t as authClient } from "../../../../chunks/auth-client.js";
//#region src/routes/(protected)/profilo/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let role, passwordStrength;
		const session = authClient.useSession();
		let pwModalOpen = false;
		let isLoading = false;
		let message = {
			text: "",
			type: "success"
		};
		const roleNames = {
			developer: "Sviluppatore",
			professor: "Professore",
			student: "Studente"
		};
		let pwData = {
			current: "",
			new: "",
			confirm: ""
		};
		let showCurrent = false;
		let showNew = false;
		let showConfirm = false;
		let passwordCopied = false;
		const togglePwModal = () => {
			pwModalOpen = !pwModalOpen;
			pwData = {
				current: "",
				new: "",
				confirm: ""
			};
			showCurrent = false;
			showNew = false;
			showConfirm = false;
			passwordCopied = false;
			message.text = "";
		};
		$: role = roleNames[store_get($$store_subs ??= {}, "$session", session).data?.user.role] ?? "Utente";
		$: passwordStrength = (() => {
			if (!pwData.new) return {
				score: 0,
				label: "",
				color: ""
			};
			let score = 0;
			if (pwData.new.length >= 12) score++;
			if (pwData.new.length >= 16) score++;
			if (/[A-Z]/.test(pwData.new)) score++;
			if (/[a-z]/.test(pwData.new)) score++;
			if (/[0-9]/.test(pwData.new)) score++;
			if (/[^A-Za-z0-9]/.test(pwData.new)) score++;
			if (score <= 2) return {
				score,
				label: "Debole",
				color: "danger",
				hex: "#dc3545"
			};
			if (score <= 4) return {
				score,
				label: "Discreta",
				color: "warning",
				hex: "#ffc107"
			};
			return {
				score,
				label: "Forte",
				color: "success",
				hex: "#198754"
			};
		})();
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			head("conn2a", $$renderer, ($$renderer) => {
				$$renderer.title(($$renderer) => {
					$$renderer.push(`<title>Profilo | Portale correzione automatica</title>`);
				});
			});
			Container($$renderer, {
				class: "py-5",
				children: ($$renderer) => {
					if (store_get($$store_subs ??= {}, "$session", session).isPending) {
						$$renderer.push(`<!--[0--><div class="text-center">`);
						Spinner($$renderer, { color: "primary" });
						$$renderer.push(`<!----></div>`);
					} else if (store_get($$store_subs ??= {}, "$session", session).data) {
						$$renderer.push("<!--[1-->");
						Row($$renderer, {
							children: ($$renderer) => {
								Col($$renderer, {
									xs: "12",
									class: "mb-4",
									children: ($$renderer) => {
										$$renderer.push(`<h2>Profilo</h2> <p class="text-muted">Gestisci le impostazioni del tuo account e la sicurezza.</p>`);
									},
									$$slots: { default: true }
								});
								$$renderer.push(`<!----> `);
								Col($$renderer, {
									lg: "8",
									class: "mb-4",
									children: ($$renderer) => {
										Card($$renderer, {
											class: "h-100 shadow-sm",
											children: ($$renderer) => {
												CardHeader($$renderer, {
													children: ($$renderer) => {
														CardTitle($$renderer, {
															class: "m-0",
															children: ($$renderer) => {
																$$renderer.push(`<!---->Informazioni Personali`);
															},
															$$slots: { default: true }
														});
													},
													$$slots: { default: true }
												});
												$$renderer.push(`<!----> `);
												CardBody($$renderer, {
													children: ($$renderer) => {
														Alert($$renderer, {
															color: "info",
															children: ($$renderer) => {
																$$renderer.push(`<strong>Nota:</strong> Per modificare le tue
                            informazioni personali, contatta l'amministratore
                            del sistema tramite la pagina di supporto <a href="/supporto" class="alert-link">qui</a>.`);
															},
															$$slots: { default: true }
														});
														$$renderer.push(`<!----> `);
														Row($$renderer, {
															class: "mb-3",
															children: ($$renderer) => {
																Col($$renderer, {
																	md: "6",
																	children: ($$renderer) => {
																		FormGroup($$renderer, {
																			children: ($$renderer) => {
																				Label($$renderer, {
																					class: "text-muted mb-1 small text-uppercase fw-bold",
																					children: ($$renderer) => {
																						$$renderer.push(`<!---->Nome`);
																					},
																					$$slots: { default: true }
																				});
																				$$renderer.push(`<!----> <div class="fs-6 fw-medium">${escape_html(formatNameForDisplay(store_get($$store_subs ??= {}, "$session", session).data.user.name) || "-")}</div>`);
																			},
																			$$slots: { default: true }
																		});
																	},
																	$$slots: { default: true }
																});
																$$renderer.push(`<!----> `);
																Col($$renderer, {
																	md: "6",
																	children: ($$renderer) => {
																		FormGroup($$renderer, {
																			children: ($$renderer) => {
																				Label($$renderer, {
																					class: "text-muted mb-1 small text-uppercase fw-bold",
																					children: ($$renderer) => {
																						$$renderer.push(`<!---->Cognome`);
																					},
																					$$slots: { default: true }
																				});
																				$$renderer.push(`<!----> <div class="fs-6 fw-medium">${escape_html(formatNameForDisplay(store_get($$store_subs ??= {}, "$session", session).data.user.surname) || "-")}</div>`);
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
														$$renderer.push(`<!----> `);
														Row($$renderer, {
															class: "mb-3",
															children: ($$renderer) => {
																Col($$renderer, {
																	md: "12",
																	children: ($$renderer) => {
																		FormGroup($$renderer, {
																			children: ($$renderer) => {
																				Label($$renderer, {
																					class: "text-muted mb-1 small text-uppercase fw-bold",
																					children: ($$renderer) => {
																						$$renderer.push(`<!---->Indirizzo Email`);
																					},
																					$$slots: { default: true }
																				});
																				$$renderer.push(`<!----> <div class="fs-6 fw-medium">${escape_html(store_get($$store_subs ??= {}, "$session", session).data.user.email)}</div>`);
																			},
																			$$slots: { default: true }
																		});
																	},
																	$$slots: { default: true }
																});
															},
															$$slots: { default: true }
														});
														$$renderer.push(`<!----> `);
														Row($$renderer, {
															children: ($$renderer) => {
																Col($$renderer, {
																	md: "6",
																	children: ($$renderer) => {
																		FormGroup($$renderer, {
																			children: ($$renderer) => {
																				Label($$renderer, {
																					class: "text-muted mb-1 small text-uppercase fw-bold",
																					children: ($$renderer) => {
																						$$renderer.push(`<!---->Ruolo`);
																					},
																					$$slots: { default: true }
																				});
																				$$renderer.push(`<!----> <div class="fs-6 fw-medium">${escape_html(role)}</div>`);
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
												$$renderer.push(`<!---->`);
											},
											$$slots: { default: true }
										});
									},
									$$slots: { default: true }
								});
								$$renderer.push(`<!----> `);
								Col($$renderer, {
									lg: "4",
									class: "mb-4",
									children: ($$renderer) => {
										Card($$renderer, {
											class: "h-100 shadow-sm border-warning",
											children: ($$renderer) => {
												CardHeader($$renderer, {
													class: "bg-warning  bg-opacity-10",
													children: ($$renderer) => {
														CardTitle($$renderer, {
															class: "m-0",
															children: ($$renderer) => {
																$$renderer.push(`<!---->Sicurezza`);
															},
															$$slots: { default: true }
														});
													},
													$$slots: { default: true }
												});
												$$renderer.push(`<!----> `);
												CardBody($$renderer, {
													class: "d-flex flex-column gap-3",
													children: ($$renderer) => {
														$$renderer.push(`<div><h6>Password</h6> <p class="text-muted small">Ultima modifica: Mai</p> `);
														Button($$renderer, {
															outline: true,
															color: "dark",
															class: "w-100",
															children: ($$renderer) => {
																$$renderer.push(`<!---->Cambia Password`);
															},
															$$slots: { default: true }
														});
														$$renderer.push(`<!----></div>`);
													},
													$$slots: { default: true }
												});
												$$renderer.push(`<!---->`);
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
					} else {
						$$renderer.push("<!--[-1-->");
						Alert($$renderer, {
							color: "warning",
							children: ($$renderer) => {
								$$renderer.push(`<!---->Devi essere loggato per visualizzare questa pagina.`);
							},
							$$slots: { default: true }
						});
					}
					$$renderer.push(`<!--]-->`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Modal($$renderer, {
				isOpen: pwModalOpen,
				toggle: togglePwModal,
				children: ($$renderer) => {
					ModalHeader($$renderer, {
						toggle: togglePwModal,
						children: ($$renderer) => {
							$$renderer.push(`<!---->Cambia Password`);
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					ModalBody($$renderer, {
						children: ($$renderer) => {
							if (message.text) {
								$$renderer.push("<!--[0-->");
								Alert($$renderer, {
									color: message.type,
									children: ($$renderer) => {
										$$renderer.push(`<!---->${escape_html(message.text)}`);
									},
									$$slots: { default: true }
								});
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]--> `);
							FormGroup($$renderer, {
								children: ($$renderer) => {
									Label($$renderer, {
										children: ($$renderer) => {
											$$renderer.push(`<!---->Password Attuale`);
										},
										$$slots: { default: true }
									});
									$$renderer.push(`<!----> <div class="input-group">`);
									Input($$renderer, {
										type: showCurrent ? "text" : "password",
										get value() {
											return pwData.current;
										},
										set value($$value) {
											pwData.current = $$value;
											$$settled = false;
										}
									});
									$$renderer.push(`<!----> <button type="button" class="btn btn-outline-secondary"${attr("title", showCurrent ? "Nascondi" : "Mostra")}><i${attr_class(clsx(showCurrent ? "ri-eye-off-line" : "ri-eye-line"))}></i></button></div>`);
								},
								$$slots: { default: true }
							});
							$$renderer.push(`<!----> `);
							FormGroup($$renderer, {
								children: ($$renderer) => {
									Label($$renderer, {
										children: ($$renderer) => {
											$$renderer.push(`<!---->Nuova Password`);
										},
										$$slots: { default: true }
									});
									$$renderer.push(`<!----> <div class="input-group">`);
									Input($$renderer, {
										type: showNew ? "text" : "password",
										autocomplete: "new-password",
										get value() {
											return pwData.new;
										},
										set value($$value) {
											pwData.new = $$value;
											$$settled = false;
										}
									});
									$$renderer.push(`<!----> <button type="button" class="btn btn-outline-secondary"${attr("title", showNew ? "Nascondi" : "Mostra")}><i${attr_class(clsx(showNew ? "ri-eye-off-line" : "ri-eye-line"))}></i></button> <button type="button" class="btn btn-outline-secondary"${attr("disabled", !pwData.new, true)} title="Copia password"><i${attr_class(clsx(passwordCopied ? "ri-check-line text-success" : "ri-file-copy-line"))}></i></button> <button type="button" class="btn btn-primary" title="Genera password sicura"><i class="ri-shield-keyhole-line me-1"></i> Genera</button></div> `);
									if (pwData.new) {
										$$renderer.push(`<!--[0--><div class="mt-2"><div class="d-flex gap-1 mb-1"><!--[-->`);
										const each_array = ensure_array_like([
											0,
											1,
											2,
											3,
											4,
											5
										]);
										for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
											let i = each_array[$$index];
											$$renderer.push(`<div class="flex-fill rounded"${attr_style(`height: 4px; background-color: ${stringify(i < passwordStrength.score ? passwordStrength.hex : "#dee2e6")};`)}></div>`);
										}
										$$renderer.push(`<!--]--></div> <small${attr_class(`text-${stringify(passwordStrength.color)} fw-semibold`)}>${escape_html(passwordStrength.label)}</small> <small class="text-muted ms-2">${escape_html(pwData.new.length)} caratteri</small></div>`);
									} else $$renderer.push("<!--[-1-->");
									$$renderer.push(`<!--]-->`);
								},
								$$slots: { default: true }
							});
							$$renderer.push(`<!----> `);
							FormGroup($$renderer, {
								children: ($$renderer) => {
									Label($$renderer, {
										children: ($$renderer) => {
											$$renderer.push(`<!---->Conferma Nuova Password`);
										},
										$$slots: { default: true }
									});
									$$renderer.push(`<!----> <div class="input-group">`);
									Input($$renderer, {
										type: showConfirm ? "text" : "password",
										invalid: pwData.new !== "" && pwData.confirm !== "" && pwData.new !== pwData.confirm,
										get value() {
											return pwData.confirm;
										},
										set value($$value) {
											pwData.confirm = $$value;
											$$settled = false;
										}
									});
									$$renderer.push(`<!----> <button type="button" class="btn btn-outline-secondary"${attr("title", showConfirm ? "Nascondi" : "Mostra")}><i${attr_class(clsx(showConfirm ? "ri-eye-off-line" : "ri-eye-line"))}></i></button></div> `);
									if (pwData.new !== "" && pwData.confirm !== "" && pwData.new !== pwData.confirm) $$renderer.push(`<!--[0--><div class="text-danger small mt-1">Le password non corrispondono</div>`);
									else $$renderer.push("<!--[-1-->");
									$$renderer.push(`<!--]-->`);
								},
								$$slots: { default: true }
							});
							$$renderer.push(`<!---->`);
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					ModalFooter($$renderer, {
						children: ($$renderer) => {
							Button($$renderer, {
								color: "secondary",
								children: ($$renderer) => {
									$$renderer.push(`<!---->Annulla`);
								},
								$$slots: { default: true }
							});
							$$renderer.push(`<!----> `);
							Button($$renderer, {
								color: "primary",
								disabled: isLoading,
								children: ($$renderer) => {
									$$renderer.push(`<!--[-1-->Aggiorna Password`);
									$$renderer.push(`<!--]-->`);
								},
								$$slots: { default: true }
							});
							$$renderer.push(`<!---->`);
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!---->`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!---->`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { _page as default };
