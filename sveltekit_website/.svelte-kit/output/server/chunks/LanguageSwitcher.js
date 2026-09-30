import { A as escape_html, O as attr, g as unsubscribe_stores, m as store_get, o as ensure_array_like, t as attr_class } from "./server.js";
import "./index-server2.js";
import { n as $locale, t as $format } from "./runtime.js";
//#region src/lib/components/common/LanguageSwitcher.svelte
function LanguageSwitcher($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		$$renderer.push(`<div class="language-switcher svelte-1eaz7h7" role="group"${attr("aria-label", store_get($$store_subs ??= {}, "$_", $format)("language"))}><!--[-->`);
		const each_array = ensure_array_like(["it", "en"]);
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let language = each_array[$$index];
			$$renderer.push(`<button${attr("aria-pressed", store_get($$store_subs ??= {}, "$locale", $locale) === language)}${attr_class("svelte-1eaz7h7", void 0, { "active": store_get($$store_subs ??= {}, "$locale", $locale) === language })}>${escape_html(language.toUpperCase())}</button>`);
		}
		$$renderer.push(`<!--]--></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { LanguageSwitcher as t };
