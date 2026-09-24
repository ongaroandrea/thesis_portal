import { A as escape_html, Lt as fallback, M as derived, O as attr, P as writable, f as slot, g as unsubscribe_stores, i as bind_props, k as clsx, m as store_get, o as ensure_array_like, s as head, t as attr_class } from "../../../chunks/server.js";
import "../../../chunks/index-server.js";
import "../../../chunks/index-server2.js";
import { t as formatNameForDisplay } from "../../../chunks/text.js";
import { b as Dropdown, c as Input, d as DropdownToggle, f as DropdownMenu, h as Col, m as Container, n as Row, p as DropdownItem, u as Form, x as Button } from "../../../chunks/dist.js";
import { n as page, t as navigating } from "../../../chunks/stores.js";
import "../../../chunks/navigation.js";
import { t as authClient } from "../../../chunks/auth-client.js";
import deepmerge from "deepmerge";
import { IntlMessageFormat } from "intl-messageformat";
//#region node_modules/svelte-i18n/dist/runtime.js
function delve(obj, fullKey) {
	if (fullKey == null) return void 0;
	if (fullKey in obj) return obj[fullKey];
	const keys = fullKey.split(".");
	let result = obj;
	for (let p = 0; p < keys.length; p++) if (typeof result === "object") {
		if (p > 0) {
			const partialKey = keys.slice(p, keys.length).join(".");
			if (partialKey in result) {
				result = result[partialKey];
				break;
			}
		}
		result = result[keys[p]];
	} else result = void 0;
	return result;
}
var lookupCache = {};
var addToCache = (path, locale, message) => {
	if (!message) return message;
	if (!(locale in lookupCache)) lookupCache[locale] = {};
	if (!(path in lookupCache[locale])) lookupCache[locale][path] = message;
	return message;
};
var lookup = (path, refLocale) => {
	if (refLocale == null) return void 0;
	if (refLocale in lookupCache && path in lookupCache[refLocale]) return lookupCache[refLocale][path];
	const locales = getPossibleLocales(refLocale);
	for (let i = 0; i < locales.length; i++) {
		const locale = locales[i];
		const message = getMessageFromDictionary(locale, path);
		if (message) return addToCache(path, refLocale, message);
	}
};
var dictionary;
var $dictionary = writable({});
function getLocaleDictionary(locale) {
	return dictionary[locale] || null;
}
function hasLocaleDictionary(locale) {
	return locale in dictionary;
}
function getMessageFromDictionary(locale, id) {
	if (!hasLocaleDictionary(locale)) return null;
	return delve(getLocaleDictionary(locale), id);
}
function getClosestAvailableLocale(refLocale) {
	if (refLocale == null) return void 0;
	const relatedLocales = getPossibleLocales(refLocale);
	for (let i = 0; i < relatedLocales.length; i++) {
		const locale = relatedLocales[i];
		if (hasLocaleDictionary(locale)) return locale;
	}
}
function addMessages(locale, ...partials) {
	delete lookupCache[locale];
	$dictionary.update((d) => {
		d[locale] = deepmerge.all([d[locale] || {}, ...partials]);
		return d;
	});
}
derived([$dictionary], ([dictionary2]) => Object.keys(dictionary2));
$dictionary.subscribe((newDictionary) => dictionary = newDictionary);
var queue = {};
function removeLoaderFromQueue(locale, loader) {
	queue[locale].delete(loader);
	if (queue[locale].size === 0) delete queue[locale];
}
function getLocaleQueue(locale) {
	return queue[locale];
}
function getLocalesQueues(locale) {
	return getPossibleLocales(locale).map((localeItem) => {
		const localeQueue = getLocaleQueue(localeItem);
		return [localeItem, localeQueue ? [...localeQueue] : []];
	}).filter(([, localeQueue]) => localeQueue.length > 0);
}
function hasLocaleQueue(locale) {
	if (locale == null) return false;
	return getPossibleLocales(locale).some((localeQueue) => {
		var _a;
		return (_a = getLocaleQueue(localeQueue)) == null ? void 0 : _a.size;
	});
}
function loadLocaleQueue(locale, localeQueue) {
	return Promise.all(localeQueue.map((loader) => {
		removeLoaderFromQueue(locale, loader);
		return loader().then((partial) => partial.default || partial);
	})).then((partials) => addMessages(locale, ...partials));
}
var activeFlushes = {};
function flush(locale) {
	if (!hasLocaleQueue(locale)) {
		if (locale in activeFlushes) return activeFlushes[locale];
		return Promise.resolve();
	}
	const queues = getLocalesQueues(locale);
	activeFlushes[locale] = Promise.all(queues.map(([localeName, localeQueue]) => loadLocaleQueue(localeName, localeQueue))).then(() => {
		if (hasLocaleQueue(locale)) return flush(locale);
		delete activeFlushes[locale];
	});
	return activeFlushes[locale];
}
var __getOwnPropSymbols$2 = Object.getOwnPropertySymbols;
var __hasOwnProp$2 = Object.prototype.hasOwnProperty;
var __propIsEnum$2 = Object.prototype.propertyIsEnumerable;
var __objRest$1 = (source, exclude) => {
	var target = {};
	for (var prop in source) if (__hasOwnProp$2.call(source, prop) && exclude.indexOf(prop) < 0) target[prop] = source[prop];
	if (source != null && __getOwnPropSymbols$2) {
		for (var prop of __getOwnPropSymbols$2(source)) if (exclude.indexOf(prop) < 0 && __propIsEnum$2.call(source, prop)) target[prop] = source[prop];
	}
	return target;
};
var defaultFormats = {
	number: {
		scientific: { notation: "scientific" },
		engineering: { notation: "engineering" },
		compactLong: {
			notation: "compact",
			compactDisplay: "long"
		},
		compactShort: {
			notation: "compact",
			compactDisplay: "short"
		}
	},
	date: {
		short: {
			month: "numeric",
			day: "numeric",
			year: "2-digit"
		},
		medium: {
			month: "short",
			day: "numeric",
			year: "numeric"
		},
		long: {
			month: "long",
			day: "numeric",
			year: "numeric"
		},
		full: {
			weekday: "long",
			month: "long",
			day: "numeric",
			year: "numeric"
		}
	},
	time: {
		short: {
			hour: "numeric",
			minute: "numeric"
		},
		medium: {
			hour: "numeric",
			minute: "numeric",
			second: "numeric"
		},
		long: {
			hour: "numeric",
			minute: "numeric",
			second: "numeric",
			timeZoneName: "short"
		},
		full: {
			hour: "numeric",
			minute: "numeric",
			second: "numeric",
			timeZoneName: "short"
		}
	}
};
function defaultMissingKeyHandler({ locale, id }) {
	console.warn(`[svelte-i18n] The message "${id}" was not found in "${getPossibleLocales(locale).join("\", \"")}".${hasLocaleQueue(getCurrentLocale()) ? `

Note: there are at least one loader still registered to this locale that wasn't executed.` : ""}`);
}
var options = {
	fallbackLocale: null,
	loadingDelay: 200,
	formats: defaultFormats,
	warnOnMissingMessages: true,
	handleMissingMessage: void 0,
	ignoreTag: true
};
function getOptions() {
	return options;
}
function init(opts) {
	const _a = opts, { formats } = _a, rest = __objRest$1(_a, ["formats"]);
	let initialLocale = opts.fallbackLocale;
	if (opts.initialLocale) try {
		if (IntlMessageFormat.resolveLocale(opts.initialLocale)) initialLocale = opts.initialLocale;
	} catch (e) {
		console.warn(`[svelte-i18n] The initial locale "${opts.initialLocale}" is not a valid locale.`);
	}
	if (rest.warnOnMissingMessages) {
		delete rest.warnOnMissingMessages;
		if (rest.handleMissingMessage == null) rest.handleMissingMessage = defaultMissingKeyHandler;
		else console.warn("[svelte-i18n] The \"warnOnMissingMessages\" option is deprecated. Please use the \"handleMissingMessage\" option instead.");
	}
	Object.assign(options, rest, { initialLocale });
	if (formats) {
		if ("number" in formats) Object.assign(options.formats.number, formats.number);
		if ("date" in formats) Object.assign(options.formats.date, formats.date);
		if ("time" in formats) Object.assign(options.formats.time, formats.time);
	}
	return $locale.set(initialLocale);
}
var $isLoading = writable(false);
var __defProp$1 = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols$1 = Object.getOwnPropertySymbols;
var __hasOwnProp$1 = Object.prototype.hasOwnProperty;
var __propIsEnum$1 = Object.prototype.propertyIsEnumerable;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, {
	enumerable: true,
	configurable: true,
	writable: true,
	value
}) : obj[key] = value;
var __spreadValues$1 = (a, b) => {
	for (var prop in b || (b = {})) if (__hasOwnProp$1.call(b, prop)) __defNormalProp$1(a, prop, b[prop]);
	if (__getOwnPropSymbols$1) {
		for (var prop of __getOwnPropSymbols$1(b)) if (__propIsEnum$1.call(b, prop)) __defNormalProp$1(a, prop, b[prop]);
	}
	return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var current;
var internalLocale = writable(null);
function getSubLocales(refLocale) {
	return refLocale.split("-").map((_, i, arr) => arr.slice(0, i + 1).join("-")).reverse();
}
function getPossibleLocales(refLocale, fallbackLocale = getOptions().fallbackLocale) {
	const locales = getSubLocales(refLocale);
	if (fallbackLocale) return [.../* @__PURE__ */ new Set([...locales, ...getSubLocales(fallbackLocale)])];
	return locales;
}
function getCurrentLocale() {
	return current != null ? current : void 0;
}
internalLocale.subscribe((newLocale) => {
	current = newLocale != null ? newLocale : void 0;
	if (typeof window !== "undefined" && newLocale != null) document.documentElement.setAttribute("lang", newLocale);
});
var set = (newLocale) => {
	if (newLocale && getClosestAvailableLocale(newLocale) && hasLocaleQueue(newLocale)) {
		const { loadingDelay } = getOptions();
		let loadingTimer;
		if (typeof window !== "undefined" && getCurrentLocale() != null && loadingDelay) loadingTimer = window.setTimeout(() => $isLoading.set(true), loadingDelay);
		else $isLoading.set(true);
		return flush(newLocale).then(() => {
			internalLocale.set(newLocale);
		}).finally(() => {
			clearTimeout(loadingTimer);
			$isLoading.set(false);
		});
	}
	return internalLocale.set(newLocale);
};
var $locale = __spreadProps(__spreadValues$1({}, internalLocale), { set });
var getLocaleFromNavigator = () => {
	if (typeof window === "undefined") return null;
	return window.navigator.language || window.navigator.languages[0];
};
var monadicMemoize = (fn) => {
	const cache = /* @__PURE__ */ Object.create(null);
	const memoizedFn = (arg) => {
		const cacheKey = JSON.stringify(arg);
		if (cacheKey in cache) return cache[cacheKey];
		return cache[cacheKey] = fn(arg);
	};
	return memoizedFn;
};
var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, {
	enumerable: true,
	configurable: true,
	writable: true,
	value
}) : obj[key] = value;
var __spreadValues = (a, b) => {
	for (var prop in b || (b = {})) if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
	if (__getOwnPropSymbols) {
		for (var prop of __getOwnPropSymbols(b)) if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
	}
	return a;
};
var __objRest = (source, exclude) => {
	var target = {};
	for (var prop in source) if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0) target[prop] = source[prop];
	if (source != null && __getOwnPropSymbols) {
		for (var prop of __getOwnPropSymbols(source)) if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop)) target[prop] = source[prop];
	}
	return target;
};
var getIntlFormatterOptions = (type, name) => {
	const { formats } = getOptions();
	if (type in formats && name in formats[type]) return formats[type][name];
	throw new Error(`[svelte-i18n] Unknown "${name}" ${type} format.`);
};
var createNumberFormatter = monadicMemoize((_a) => {
	var _b = _a, { locale, format } = _b, options = __objRest(_b, ["locale", "format"]);
	if (locale == null) throw new Error("[svelte-i18n] A \"locale\" must be set to format numbers");
	if (format) options = getIntlFormatterOptions("number", format);
	return new Intl.NumberFormat(locale, options);
});
var createDateFormatter = monadicMemoize((_c) => {
	var _d = _c, { locale, format } = _d, options = __objRest(_d, ["locale", "format"]);
	if (locale == null) throw new Error("[svelte-i18n] A \"locale\" must be set to format dates");
	if (format) options = getIntlFormatterOptions("date", format);
	else if (Object.keys(options).length === 0) options = getIntlFormatterOptions("date", "short");
	return new Intl.DateTimeFormat(locale, options);
});
var createTimeFormatter = monadicMemoize((_e) => {
	var _f = _e, { locale, format } = _f, options = __objRest(_f, ["locale", "format"]);
	if (locale == null) throw new Error("[svelte-i18n] A \"locale\" must be set to format time values");
	if (format) options = getIntlFormatterOptions("time", format);
	else if (Object.keys(options).length === 0) options = getIntlFormatterOptions("time", "short");
	return new Intl.DateTimeFormat(locale, options);
});
var getNumberFormatter = (_g = {}) => {
	var _h = _g, { locale = getCurrentLocale() } = _h, args = __objRest(_h, ["locale"]);
	return createNumberFormatter(__spreadValues({ locale }, args));
};
var getDateFormatter = (_i = {}) => {
	var _j = _i, { locale = getCurrentLocale() } = _j, args = __objRest(_j, ["locale"]);
	return createDateFormatter(__spreadValues({ locale }, args));
};
var getTimeFormatter = (_k = {}) => {
	var _l = _k, { locale = getCurrentLocale() } = _l, args = __objRest(_l, ["locale"]);
	return createTimeFormatter(__spreadValues({ locale }, args));
};
var getMessageFormatter = monadicMemoize((message, locale = getCurrentLocale()) => new IntlMessageFormat(message, locale, getOptions().formats, { ignoreTag: getOptions().ignoreTag }));
var formatMessage = (id, options = {}) => {
	var _a, _b, _c, _d;
	let messageObj = options;
	if (typeof id === "object") {
		messageObj = id;
		id = messageObj.id;
	}
	const { values, locale = getCurrentLocale(), default: defaultValue } = messageObj;
	if (locale == null) throw new Error("[svelte-i18n] Cannot format a message without first setting the initial locale.");
	let message = lookup(id, locale);
	if (!message) message = (_d = (_c = (_b = (_a = getOptions()).handleMissingMessage) == null ? void 0 : _b.call(_a, {
		locale,
		id,
		defaultValue
	})) != null ? _c : defaultValue) != null ? _d : id;
	else if (typeof message !== "string") {
		console.warn(`[svelte-i18n] Message with id "${id}" must be of type "string", found: "${typeof message}". Gettin its value through the "$format" method is deprecated; use the "json" method instead.`);
		return message;
	}
	if (!values) return message;
	let result = message;
	try {
		result = getMessageFormatter(message, locale).format(values);
	} catch (e) {
		if (e instanceof Error) console.warn(`[svelte-i18n] Message "${id}" has syntax error:`, e.message);
	}
	return result;
};
var formatTime = (t, options) => {
	return getTimeFormatter(options).format(t);
};
var formatDate = (d, options) => {
	return getDateFormatter(options).format(d);
};
var formatNumber = (n, options) => {
	return getNumberFormatter(options).format(n);
};
var getJSON = (id, locale = getCurrentLocale()) => {
	return lookup(id, locale);
};
derived([$locale, $dictionary], () => formatMessage);
derived([$locale], () => formatTime);
derived([$locale], () => formatDate);
derived([$locale], () => formatNumber);
derived([$locale, $dictionary], () => getJSON);
//#endregion
//#region src/lib/components/layouts/LayoutMenuData.js
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
		roles: ["developer", "professor"],
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
			roles: ["developer"]
		}]
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
//#endregion
//#region src/lib/components/layouts/HorizontalLayout.svelte
function HorizontalLayout($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let currentPath;
		let user = fallback($$props["user"], null);
		const menuItems = MOCK_DATA.Navdata;
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
			return !item.adminOnly || user?.role === "developer";
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
					$$renderer.push(`<!--[1--><li class="nav-item"><a${attr_class("nav-link menu-link", void 0, { "active": isGroupActive(item) })}${attr("href", item.link ?? "/")}${attr("aria-expanded", openMenuId === item.id)}${attr("aria-controls", `menu-${item.id}`)}><i${attr_class(clsx(item.icon))}></i> <span>${escape_html(item.label)}</span></a> <div${attr("id", `menu-${item.id}`)}${attr_class("collapse menu-dropdown", void 0, { "show": openMenuId === item.id })}><ul class="nav nav-sm flex-column"><!--[-->`);
					const each_array_1 = ensure_array_like(item.subItems);
					for (let $$index = 0, $$length = each_array_1.length; $$index < $$length; $$index++) {
						let subItem = each_array_1[$$index];
						if (canShow(subItem)) $$renderer.push(`<!--[0--><li class="nav-item"><a${attr("href", subItem.link ?? "/")}${attr_class("nav-link", void 0, { "active": normalizePath(subItem.link) === currentPath })}>${escape_html(subItem.label)}</a></li>`);
						else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]-->`);
					}
					$$renderer.push(`<!--]--></ul></div></li>`);
				} else $$renderer.push(`<!--[-1--><li class="nav-item"><a${attr_class("nav-link menu-link", void 0, { "active": isWithinPath(currentPath, item.link) })}${attr("href", item.link ?? "/")}><i${attr_class(clsx(item.icon))}></i> <span>${escape_html(item.label)}</span></a></li>`);
				$$renderer.push(`<!--]-->`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		}
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
		bind_props($$props, { user });
	});
}
//#endregion
//#region src/lib/components/layouts/Sidebar.svelte
function Sidebar($$renderer, $$props) {
	let user = fallback($$props["user"], null);
	head("3hvs4c", $$renderer, ($$renderer) => {
		$$renderer.push(`<script src="https://cdn.jsdelivr.net/npm/simplebar@latest/dist/simplebar.min.js"><\/script>`);
		$$renderer.push(`<!---->`);
	});
	$$renderer.push(`<div class="app-menu navbar-menu"><div class="navbar-brand-box"><a href="/#" class="logo logo-dark"><span class="logo-sm"><img src="/images/favicon.ico" alt="Portale correzione automatica" height="22"/></span> <span class="logo-lg"><img src="/images/polito_logo_desktop.svg" alt="Politecnico di Torino" height="42"/></span></a> <a href="/#" class="logo logo-light"><span class="logo-sm"><img src="/images/favicon.ico" alt="Portale correzione automatica" height="22"/></span> <span class="logo-lg"><img src="/images/polito_logo_desktop_bianco.png" alt="Politecnico di Torino" height="42"/></span></a> <button type="button" class="btn btn-sm p-0 fs-20 header-item float-end btn-vertical-sm-hover" id="vertical-hover" aria-label="Ridimensiona il menu laterale"><i class="ri-record-circle-line"></i></button></div> <div id="scrollbar"><div class="container-fluid"><div id="two-column-menu"></div> <ul class="navbar-nav" id="navbar-nav">`);
	HorizontalLayout($$renderer, { user });
	$$renderer.push(`<!----></ul></div></div> <div class="sidebar-background"></div></div>`);
	bind_props($$props, { user });
}
//#endregion
//#region src/lib/components/common/FullScreenDropdown.svelte
function FullScreenDropdown($$renderer) {
	$$renderer.push(`<div class="ms-1 header-item d-none d-sm-flex"><button type="button" class="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle"${attr("aria-label", "Esci dalla modalità schermo intero")}><i${attr_class(clsx("bx bx-fullscreen fs-22"))}></i></button></div>`);
}
//#endregion
//#region src/lib/components/common/ProfileDropdown.svelte
function ProfileDropdown($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		const session = authClient.useSession();
		Dropdown($$renderer, {
			class: "ms-sm-3 header-item topbar-user",
			children: ($$renderer) => {
				DropdownToggle($$renderer, {
					type: "button",
					color: "",
					class: "btn",
					id: "page-header-user-dropdown p-0",
					children: ($$renderer) => {
						$$renderer.push(`<span class="d-flex align-items-center"><img class="rounded-circle header-profile-user" src="/images/favicon.ico" alt="Profilo utente"/> <span class="text-start ms-xl-2"><span class="d-none d-xl-inline-block ms-1 fw-medium user-name-text">`);
						if (store_get($$store_subs ??= {}, "$session", session).data) $$renderer.push(`<!--[0-->${escape_html(formatNameForDisplay(store_get($$store_subs ??= {}, "$session", session).data.user.name))}`);
						else $$renderer.push(`<!--[-1-->Loading...`);
						$$renderer.push(`<!--]--> <span class="d-none d-xl-block ms-1 fs-12 user-name-sub-text">`);
						if (store_get($$store_subs ??= {}, "$session", session).data) {
							$$renderer.push("<!--[0-->");
							if (store_get($$store_subs ??= {}, "$session", session).data.user.role === "sviluppatore") $$renderer.push(`<!--[0-->Sviluppatore`);
							else if (store_get($$store_subs ??= {}, "$session", session).data.user.role === "professore") $$renderer.push(`<!--[1-->Professore`);
							else if (store_get($$store_subs ??= {}, "$session", session).data.user.role === "studente") $$renderer.push(`<!--[2-->Studente`);
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
						$$renderer.push(`<h6 class="dropdown-header">Benvenuto ${escape_html(store_get($$store_subs ??= {}, "$session", session).data ? formatNameForDisplay(store_get($$store_subs ??= {}, "$session", session).data.user.name) : "Loading...")}</h6> `);
						DropdownItem($$renderer, {
							href: "/profilo",
							children: ($$renderer) => {
								$$renderer.push(`<i class="mdi mdi-cog-outline text-muted fs-16 align-middle me-1"></i> <span class="align-middle">Impostazioni</span>`);
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!----> `);
						DropdownItem($$renderer, {
							href: null,
							children: ($$renderer) => {
								$$renderer.push(`<i class="mdi mdi-logout text-muted fs-16 align-middle me-1"></i> <span class="align-middle" data-key="t-logout">Esci</span> `);
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
//#endregion
//#region src/lib/components/common/LightDark.svelte
function LightDark($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		$$renderer.push(`<div class="ms-1 header-item d-none d-sm-flex"><button type="button" class="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle light-dark-mode"${attr("aria-label", "Passa alla modalità scura")}${attr("title", "Modalità scura")}><i${attr_class(`bx bx-moon fs-22`)}></i></button></div>`);
	});
}
//#endregion
//#region src/lib/components/layouts/Header.svelte
function Header($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let headerClass = $$props["headerClass"];
		$$renderer.push(`<header id="page-topbar"${attr_class(clsx(headerClass))}><div class="layout-width"><div class="navbar-header"><div class="d-flex"><div class="navbar-brand-box horizontal-logo"><a href="/corsi" class="logo logo-dark"><span class="logo-sm"><img src="/images/favicon.ico" alt="Portale correzione automatica" height="22"/></span> <span class="logo-lg"><img src="/images/polito_logo_desktop.svg" alt="Politecnico di Torino" height="42"/></span></a> <a href="/corsi" class="logo logo-light"><span class="logo-sm"><img src="/images/favicon.ico" alt="Portale correzione automatica" height="22"/></span> <span class="logo-lg"><img src="/images/polito_logo_desktop_bianco.png" alt="Politecnico di Torino" height="42"/></span></a></div> <button type="button" class="btn btn-sm px-3 fs-16 header-item vertical-menu-btn topnav-hamburger" id="topnav-hamburger-icon" aria-label="Apri o chiudi il menu"><span class="hamburger-icon"><span></span> <span></span> <span></span></span></button></div> <div class="d-flex align-items-center">`);
		Dropdown($$renderer, {
			class: "d-md-none topbar-head-dropdown header-item",
			children: ($$renderer) => {
				$$renderer.push(`<button type="button" class="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle" id="page-header-search-dropdown" aria-label="Cerca"><i class="bx bx-search fs-22"></i></button> `);
				DropdownMenu($$renderer, {
					class: "dropdown-menu-lg dropdown-menu-end p-0",
					children: ($$renderer) => {
						Form($$renderer, {
							class: "p-3",
							children: ($$renderer) => {
								$$renderer.push(`<div class="form-group m-0"><div class="input-group">`);
								Input($$renderer, {
									type: "text",
									class: "form-control",
									placeholder: "Search ..."
								});
								$$renderer.push(`<!----> `);
								Button($$renderer, {
									color: "primary",
									type: "submit",
									children: ($$renderer) => {
										$$renderer.push(`<i class="mdi mdi-magnify"></i>`);
									},
									$$slots: { default: true }
								});
								$$renderer.push(`<!----></div></div>`);
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
		FullScreenDropdown($$renderer, {});
		$$renderer.push(`<!----> `);
		LightDark($$renderer, {});
		$$renderer.push(`<!----> `);
		ProfileDropdown($$renderer, {});
		$$renderer.push(`<!----></div></div></div></header> <div class="vertical-overlay"></div>`);
		bind_props($$props, { headerClass });
	});
}
//#endregion
//#region src/lib/components/layouts/Footer.svelte
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
//#endregion
//#region src/lib/components/common/RightSidebar.svelte
function RightSidebar($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let layoutType = $$props["layoutType"];
		bind_props($$props, { layoutType });
	});
}
//#endregion
//#region src/routes/(protected)/+layout.svelte
function _layout($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let data = $$props["data"];
		init({
			fallbackLocale: "en",
			initialLocale: getLocaleFromNavigator()
		});
		let open = false;
		let headerClass = "";
		let layoutType = "horizontal";
		$: store_get($$store_subs ??= {}, "$navigating", navigating);
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			$$renderer.push(`<div id="preloader"><div id="status"><div class="spinner-border text-primary avatar-sm" role="status"><span class="visually-hidden">Caricamento...</span></div></div></div> <div id="layout-wrapper">`);
			Header($$renderer, { headerClass });
			$$renderer.push(`<!----> `);
			Sidebar($$renderer, {
				layoutType,
				user: data.user
			});
			$$renderer.push(`<!----> <div class="main-content" id="maincontent"><!--[-->`);
			slot($$renderer, $$props, "default", {}, null);
			$$renderer.push(`<!--]--> `);
			Footer($$renderer, {});
			$$renderer.push(`<!----></div> `);
			RightSidebar($$renderer, {
				layoutType,
				get open() {
					return open;
				},
				set open($$value) {
					open = $$value;
					$$settled = false;
				}
			});
			$$renderer.push(`<!----></div>`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		if ($$store_subs) unsubscribe_stores($$store_subs);
		bind_props($$props, { data });
	});
}
//#endregion
export { _layout as default };
