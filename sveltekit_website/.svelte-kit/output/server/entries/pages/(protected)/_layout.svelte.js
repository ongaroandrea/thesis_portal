import { A as escape_html, O as attr, Rt as fallback, f as slot, g as unsubscribe_stores, i as bind_props, k as clsx, m as store_get, o as ensure_array_like, t as attr_class } from "../../../chunks/server.js";
import { n as page, t as navigating } from "../../../chunks/stores.js";
import "../../../chunks/index-server2.js";
import { t as $format } from "../../../chunks/runtime.js";
import { d as DropdownMenu, f as DropdownItem, m as Col, n as Row, p as Container, u as DropdownToggle, v as Dropdown } from "../../../chunks/dist.js";
import "../../../chunks/navigation.js";
import { t as authClient } from "../../../chunks/auth-client.js";
import { t as formatNameForDisplay } from "../../../chunks/text.js";
import { t as LanguageSwitcher } from "../../../chunks/LanguageSwitcher.js";
// src/lib/components/layouts/LayoutMenuData.js
var MOCK_DATA = { Navdata: [
	{
		label: "Menu",
		isHeader: true
	},
	{
		id: "corsi",
		label: "Corsi",
		icon: "ri-book-open-line",
		link: "/corsi",
		stateVariables: "isCorsi",
		subItems: [{
			id: "lista-corsi",
			label: "Lista corsi",
			link: "/corsi",
			parentId: "corsi"
		}, {
			id: "aggiungi-corso",
			label: "Aggiungi corso",
			link: "/corsi/aggiungi",
			parentId: "corsi"
		}]
	},
	{
		id: "studenti",
		label: "Studenti",
		icon: "ri-user-2-line",
		link: "/studenti",
		roles: ["admin", "professor"],
		stateVariables: "isStudenti",
		subItems: [{
			id: "lista-studenti",
			label: "Lista Studenti",
			link: "/studenti",
			parentId: "studenti"
		}, {
			id: "aggiungi-studente",
			label: "Aggiungi studente",
			link: "/studenti/aggiungi",
			parentId: "studenti",
			roles: ["admin"]
		}]
	},
	{
		id: "prompt",
		label: "Prompt globali",
		icon: "ri-terminal-box-line",
		link: "/prompt",
		roles: ["admin"]
	},
	{
		id: "support",
		label: "Supporto",
		icon: "ri-mail-send-line",
		link: "/supporto",
		stateVariables: "isSupport",
		subItems: [{
			id: "apri-ticket-supporto",
			label: "Apri ticket",
			link: "/supporto",
			parentId: "support"
		}, {
			id: "gestione-ticket-supporto",
			label: "Gestione ticket",
			link: "/supporto/gestione",
			parentId: "support",
			adminOnly: true
		}]
	}
] };
// src/lib/components/layouts/HorizontalLayout.svelte
function HorizontalLayout($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let currentPath;
		let user = fallback($$props["user"], null);
		const menuItems = MOCK_DATA.Navdata;
		const translationKeys = {
			corsi: "nav.courses",
			"lista-corsi": "nav.courseList",
			"aggiungi-corso": "nav.addCourse",
			studenti: "nav.students",
			"lista-studenti": "nav.studentList",
			"aggiungi-studente": "nav.addStudent",
			prompt: "nav.prompts",
			support: "nav.support",
			"apri-ticket-supporto": "nav.openTicket",
			"gestione-ticket-supporto": "nav.manageTickets"
		};
		let openMenuId = "";
		function normalizePath(path) {
			if (!path || path === "/") return "/";
			return path.replace(/\/+$/, "");
		}
		function isWithinPath(path, link) {
			if (!link) return false;
			const normalizedLink = normalizePath(link);
			return path === normalizedLink || path.startsWith(`${normalizedLink}/`);
		}
		function isGroupActive(item) {
			return item.subItems?.some((subItem) => isWithinPath(currentPath, subItem.link)) ?? false;
		}
		function canShow(item) {
			if (item.roles && !item.roles.includes(user?.role)) return false;
			return !item.adminOnly || user?.role === "admin";
		}
		$: currentPath = normalizePath(store_get($$store_subs ??= {}, "$page", page).url.pathname);
		$$renderer.push(`<!--[-->`);
		const each_array = ensure_array_like(menuItems);
		for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
			let item = each_array[$$index_1];
			if (canShow(item)) {
				$$renderer.push("<!--[0-->");
				if (item.isHeader) $$renderer.push(`<!--[0--><li class="menu-title"><span>${escape_html(item.label)}</span></li>`);
				else if (item.subItems) {
					$$renderer.push(`<!--[1--><li class="nav-item"><a${attr_class("nav-link menu-link", void 0, { "active": isGroupActive(item) })}${attr("href", item.link ?? "/")}${attr("aria-expanded", openMenuId === item.id)}${attr("aria-controls", `menu-${item.id}`)}><i${attr_class(clsx(item.icon))}></i> <span>${escape_html(translationKeys[item.id] ? store_get($$store_subs ??= {}, "$_", $format)(translationKeys[item.id]) : item.label)}</span></a> <div${attr("id", `menu-${item.id}`)}${attr_class("collapse menu-dropdown", void 0, { "show": openMenuId === item.id })}><ul class="nav nav-sm flex-column"><!--[-->`);
					const each_array_1 = ensure_array_like(item.subItems);
					for (let $$index = 0, $$length = each_array_1.length; $$index < $$length; $$index++) {
						let subItem = each_array_1[$$index];
						if (canShow(subItem)) $$renderer.push(`<!--[0--><li class="nav-item"><a${attr("href", subItem.link ?? "/")}${attr_class("nav-link", void 0, { "active": normalizePath(subItem.link) === currentPath })}>${escape_html(translationKeys[subItem.id] ? store_get($$store_subs ??= {}, "$_", $format)(translationKeys[subItem.id]) : subItem.label)}</a></li>`);
						else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]-->`);
					}
					$$renderer.push(`<!--]--></ul></div></li>`);
				} else $$renderer.push(`<!--[-1--><li class="nav-item"><a${attr_class("nav-link menu-link", void 0, { "active": isWithinPath(currentPath, item.link) })}${attr("href", item.link ?? "/")}><i${attr_class(clsx(item.icon))}></i> <span>${escape_html(translationKeys[item.id] ? store_get($$store_subs ??= {}, "$_", $format)(translationKeys[item.id]) : item.label)}</span></a></li>`);
				$$renderer.push(`<!--]-->`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		}
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
		bind_props($$props, { user });
	});
}
// src/lib/components/layouts/Sidebar.svelte
function Sidebar($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let user = fallback($$props["user"], null);
		$$renderer.push(`<div class="app-menu navbar-menu"><div class="navbar-brand-box"><a href="/#" class="logo logo-dark"><span class="logo-sm"><img src="/images/favicon.ico"${attr("alt", store_get($$store_subs ??= {}, "$_", $format)("home.eyebrow"))} height="22"/></span> <span class="logo-lg"><img src="/images/polito_logo_desktop.svg" alt="Politecnico di Torino" height="42"/></span></a> <a href="/#" class="logo logo-light"><span class="logo-sm"><img src="/images/favicon.ico"${attr("alt", store_get($$store_subs ??= {}, "$_", $format)("home.eyebrow"))} height="22"/></span> <span class="logo-lg"><img src="/images/polito_logo_desktop_bianco.png" alt="Politecnico di Torino" height="42"/></span></a> <button type="button" class="btn btn-sm p-0 fs-20 header-item float-end btn-vertical-sm-hover" id="vertical-hover"${attr("aria-label", store_get($$store_subs ??= {}, "$_", $format)("common.resizeSidebar"))}><i class="ri-record-circle-line"></i></button></div> <div id="scrollbar"><div class="container-fluid"><div id="two-column-menu"></div> <ul class="navbar-nav" id="navbar-nav">`);
		HorizontalLayout($$renderer, { user });
		$$renderer.push(`<!----></ul></div></div> <div class="sidebar-background"></div></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
		bind_props($$props, { user });
	});
}
// src/lib/components/common/FullScreenDropdown.svelte
function FullScreenDropdown($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		$$renderer.push(`<div class="ms-1 header-item d-none d-sm-flex"><button type="button" class="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle"${attr("aria-label", store_get($$store_subs ??= {}, "$_", $format)("common.enterFullscreen"))}><i${attr_class(clsx("ri-fullscreen-line fs-22"))} aria-hidden="true"></i></button></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
// src/lib/components/common/ProfileDropdown.svelte
function ProfileDropdown($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		const session = authClient.useSession();
		let isLoggingOut = false;
		Dropdown($$renderer, {
			class: "ms-sm-3 header-item topbar-user",
			children: ($$renderer) => {
				DropdownToggle($$renderer, {
					type: "button",
					color: "",
					class: "btn p-0",
					id: "page-header-user-dropdown",
					children: ($$renderer) => {
						$$renderer.push(`<span class="d-flex align-items-center"><img class="rounded-circle header-profile-user" src="/images/favicon.ico"${attr("alt", store_get($$store_subs ??= {}, "$_", $format)("users.profile"))}/> <span class="text-start ms-xl-2"><span class="d-none d-xl-inline-block ms-1 fw-medium user-name-text">`);
						if (store_get($$store_subs ??= {}, "$session", session).data) $$renderer.push(`<!--[0-->${escape_html(formatNameForDisplay(store_get($$store_subs ??= {}, "$session", session).data.user.name))}`);
						else $$renderer.push(`<!--[-1-->${escape_html(store_get($$store_subs ??= {}, "$_", $format)("common.loading"))}`);
						$$renderer.push(`<!--]--> <span class="d-none d-xl-block ms-1 fs-12 user-name-sub-text">`);
						if (store_get($$store_subs ??= {}, "$session", session).data) {
							$$renderer.push("<!--[0-->");
							if (store_get($$store_subs ??= {}, "$session", session).data.user.role === "admin") $$renderer.push(`<!--[0-->${escape_html(store_get($$store_subs ??= {}, "$_", $format)("role.admin"))}`);
							else if (store_get($$store_subs ??= {}, "$session", session).data.user.role === "professore" || store_get($$store_subs ??= {}, "$session", session).data.user.role === "professor") $$renderer.push(`<!--[1-->${escape_html(store_get($$store_subs ??= {}, "$_", $format)("role.professor"))}`);
							else if (store_get($$store_subs ??= {}, "$session", session).data.user.role === "studente" || store_get($$store_subs ??= {}, "$session", session).data.user.role === "student") $$renderer.push(`<!--[2-->${escape_html(store_get($$store_subs ??= {}, "$_", $format)("role.student"))}`);
							else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]-->`);
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]--></span></span></span></span>`);
					},
					$$slots: { default: true }
				});
				$$renderer.push(`<!----> `);
				DropdownMenu($$renderer, {
					class: "dropdown-menu-end",
					end: true,
					children: ($$renderer) => {
						$$renderer.push(`<h6 class="dropdown-header">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("profile.welcome", { values: { name: store_get($$store_subs ??= {}, "$session", session).data ? formatNameForDisplay(store_get($$store_subs ??= {}, "$session", session).data.user.name) : "…" } }))}</h6> `);
						DropdownItem($$renderer, {
							href: "/profilo",
							children: ($$renderer) => {
								$$renderer.push(`<i class="ri-settings-3-line text-muted fs-16 align-middle me-1"></i> <span class="align-middle">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("profile.settings"))}</span>`);
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!----> `);
						DropdownItem($$renderer, {
							href: null,
							disabled: isLoggingOut,
							children: ($$renderer) => {
								$$renderer.push(`<i class="ri-logout-box-r-line text-muted fs-16 align-middle me-1"></i> <span class="align-middle" data-key="t-logout">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("profile.logout"))}</span> `);
								$$renderer.push("<!--[-1-->");
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
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
// src/lib/components/common/LightDark.svelte
function LightDark($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		$$renderer.push(`<div class="ms-1 header-item d-none d-sm-flex"><button type="button" class="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle light-dark-mode"${attr("aria-label", store_get($$store_subs ??= {}, "$_", $format)("common.switchDark"))}${attr("title", store_get($$store_subs ??= {}, "$_", $format)("common.darkMode"))}><i${attr_class(`ri-moon-line fs-22`)} aria-hidden="true"></i></button></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
// src/lib/components/layouts/Header.svelte
function Header($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let headerClass = $$props["headerClass"];
		$$renderer.push(`<header id="page-topbar"${attr_class(clsx(headerClass))}><div class="layout-width"><div class="navbar-header"><div class="d-flex"><div class="navbar-brand-box horizontal-logo"><a href="/corsi" class="logo logo-dark"><span class="logo-sm"><img src="/images/favicon.ico"${attr("alt", store_get($$store_subs ??= {}, "$_", $format)("home.eyebrow"))} height="22"/></span> <span class="logo-lg"><img src="/images/polito_logo_desktop.svg" alt="Politecnico di Torino" height="42"/></span></a> <a href="/corsi" class="logo logo-light"><span class="logo-sm"><img src="/images/favicon.ico"${attr("alt", store_get($$store_subs ??= {}, "$_", $format)("home.eyebrow"))} height="22"/></span> <span class="logo-lg"><img src="/images/polito_logo_desktop_bianco.png" alt="Politecnico di Torino" height="42"/></span></a></div> <button type="button" class="btn btn-sm px-3 fs-16 header-item vertical-menu-btn topnav-hamburger" id="topnav-hamburger-icon"${attr("aria-label", store_get($$store_subs ??= {}, "$_", $format)("header.menu"))}><span class="hamburger-icon" aria-hidden="true"><span></span> <span></span> <span></span></span></button></div> <div class="d-flex align-items-center">`);
		LanguageSwitcher($$renderer, {});
		$$renderer.push(`<!----> `);
		FullScreenDropdown($$renderer, {});
		$$renderer.push(`<!----> `);
		LightDark($$renderer, {});
		$$renderer.push(`<!----> `);
		ProfileDropdown($$renderer, {});
		$$renderer.push(`<!----></div></div></div></header> <div class="vertical-overlay"></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
		bind_props($$props, { headerClass });
	});
}
// src/lib/components/layouts/Footer.svelte
function Footer($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		$$renderer.push(`<footer class="footer">`);
		Container($$renderer, {
			fluid: true,
			children: ($$renderer) => {
				Row($$renderer, {
					children: ($$renderer) => {
						Col($$renderer, {
							sm: 6,
							children: ($$renderer) => {
								$$renderer.push(`<!---->${escape_html((/* @__PURE__ */ new Date()).getFullYear())} © Federico Manuri - Andrea Sanna Politecnico di Torino`);
							},
							$$slots: { default: true }
						});
					},
					$$slots: { default: true }
				});
			},
			$$slots: { default: true }
		});
		$$renderer.push(`<!----></footer>`);
	});
}
// src/lib/components/common/RightSidebar.svelte
function RightSidebar($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let layoutType = $$props["layoutType"];
		bind_props($$props, { layoutType });
	});
}
// src/routes/(protected)/+layout.svelte
function _layout($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let data = $$props["data"];
		let headerClass = "";
		let layoutType = "horizontal";
		$: store_get($$store_subs ??= {}, "$navigating", navigating);
		$$renderer.push(`<div id="preloader"><div id="status"><div class="spinner-border text-primary avatar-sm" role="status"><span class="visually-hidden">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("common.loading"))}</span></div></div></div> <div id="layout-wrapper">`);
		Header($$renderer, { headerClass });
		$$renderer.push(`<!----> `);
		Sidebar($$renderer, {
			layoutType,
			user: data.user
		});
		$$renderer.push(`<!----> <div class="main-content" id="main-content" tabindex="-1"><!--[-->`);
		slot($$renderer, $$props, "default", {}, null);
		$$renderer.push(`<!--]--> `);
		Footer($$renderer, {});
		$$renderer.push(`<!----></div> `);
		RightSidebar($$renderer, { layoutType });
		$$renderer.push(`<!----></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
		bind_props($$props, { data });
	});
}
export { _layout as default };
