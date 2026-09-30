import { Rt as fallback, f as slot, i as bind_props, l as rest_props, r as attributes, u as sanitize_props } from "./server.js";
//#region node_modules/svelte-link/Link.svelte
function Link($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, [
		"href",
		"disabled",
		"outbound",
		"target",
		"rel",
		"active"
	]);
	$$renderer.component(($$renderer) => {
		/** Specify the `href` attribute. */
		let href = fallback($$props["href"], "javascript:void(0);");
		/**
		* Set to `true` to disable the link.
		* A `span` tag will be rendered instead of `a`.
		*/
		let disabled = fallback($$props["disabled"], false);
		/**
		* Set to `true` to set `target="_blank"`
		* and `rel="noopener noreferrer"`.
		* @type {boolean}
		*/
		let outbound = fallback($$props["outbound"], void 0);
		/**
		* Specify the `target` attribute.
		* @type {"_self" | "_blank" | "_parent" | "_top"}
		*/
		let target = fallback($$props["target"], void 0);
		/**
		* Specify the `rel` attribute.
		* Set to "prefetch" to fetch the `href` value.
		* @type {string}
		*/
		let rel = fallback($$props["rel"], void 0);
		/**
		* Set to `true` for the link to be active:
		* - link is given an "active" class
		* - `aria-current` is set to "page"
		*/
		let active = fallback($$props["active"], false);
		$: if (typeof window !== "undefined") {
			if (new URL(href, `${location.protocol}//${location.host}`).host !== location.host && outbound === void 0) outbound = true;
		}
		$: if (outbound) {
			target = "_blank";
			if (rel === void 0) rel = "noopener noreferrer";
		}
		if (disabled) {
			$$renderer.push(`<!--[0--><span${attributes({ ...$$restProps })}><!--[-->`);
			slot($$renderer, $$props, "default", {}, null);
			$$renderer.push(`<!--]--></span>`);
		} else {
			$$renderer.push(`<!--[-1--><a${attributes({
				"aria-current": active ? "page" : void 0,
				...$$restProps,
				href,
				target,
				rel
			}, void 0, { active })}><!--[-->`);
			slot($$renderer, $$props, "default", {}, null);
			$$renderer.push(`<!--]--></a>`);
		}
		$$renderer.push(`<!--]-->`);
		bind_props($$props, {
			href,
			disabled,
			outbound,
			target,
			rel,
			active
		});
	});
}
//#endregion
export { Link as t };
