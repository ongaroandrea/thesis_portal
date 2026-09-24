import { A as escape_html, E as setContext, Lt as fallback, O as attr, P as writable, d as sanitize_slots, f as slot, g as unsubscribe_stores, i as bind_props, k as clsx, l as rest_props, m as store_get, o as ensure_array_like, p as spread_props, r as attributes, t as attr_class, u as sanitize_props, w as getContext } from "./server.js";
import "./index-server.js";
import { r as onDestroy, t as createEventDispatcher } from "./index-server2.js";
import { createPopper } from "@popperjs/core";
function isObject(value) {
	const type = typeof value;
	return value !== null && (type === "object" || type === "function");
}
function getColumnSizeClass(isXs, colWidth, colSize) {
	if (colSize === true || colSize === "") return isXs ? "col" : `col-${colWidth}`;
	else if (colSize === "auto") return isXs ? "col-auto" : `col-${colWidth}-auto`;
	return isXs ? `col-${colSize}` : `col-${colWidth}-${colSize}`;
}
function toClassName(value) {
	let result = "";
	if (typeof value === "string" || typeof value === "number") result += value;
	else if (typeof value === "object") {
		if (Array.isArray(value)) result = value.map(toClassName).filter(Boolean).join(" ");
		else for (let key in value) if (value[key]) {
			result && (result += " ");
			result += key;
		}
	}
	return result;
}
var classnames = (...args) => args.map(toClassName).filter(Boolean).join(" ");
function uuid() {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = Math.random() * 16 | 0;
		return (c === "x" ? r : r & 3 | 8).toString(16);
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/Alert/Alert.svelte
function Alert($$renderer, $$props) {
	const $$slots = sanitize_slots($$props);
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, [
		"class",
		"content",
		"closeAriaLabel",
		"closeClassName",
		"color",
		"dismissible",
		"fade",
		"heading",
		"isOpen",
		"toggle",
		"theme",
		"transition"
	]);
	$$renderer.component(($$renderer) => {
		let showClose, classes, closeClassNames;
		let className = fallback($$props["class"], "");
		let content = fallback($$props["content"], void 0);
		let closeAriaLabel = fallback($$props["closeAriaLabel"], "Close");
		let closeClassName = fallback($$props["closeClassName"], "");
		let color = fallback($$props["color"], "success");
		let dismissible = fallback($$props["dismissible"], false);
		let fade = fallback($$props["fade"], true);
		let heading = fallback($$props["heading"], "");
		let isOpen = fallback($$props["isOpen"], true);
		let toggle = fallback($$props["toggle"], void 0);
		let theme = fallback($$props["theme"], void 0);
		let transition = fallback($$props["transition"], () => ({ duration: fade ? 400 : 0 }), true);
		$: showClose = dismissible || toggle;
		$: classes = classnames(className, "alert", `alert-${color}`, { "alert-dismissible": showClose });
		$: closeClassNames = classnames("btn-close", closeClassName);
		if (isOpen) {
			$$renderer.push(`<!--[0--><div${attributes({
				...$$restProps,
				"data-bs-theme": theme,
				class: clsx(classes),
				role: "alert"
			})}>`);
			if (heading || $$slots.heading) {
				$$renderer.push(`<!--[0--><h4 class="alert-heading">${escape_html(heading)}<!--[-->`);
				slot($$renderer, $$props, "heading", {}, null);
				$$renderer.push(`<!--]--></h4>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (showClose) $$renderer.push(`<!--[0--><button type="button"${attr_class(clsx(closeClassNames))}${attr("aria-label", closeAriaLabel)}></button>`);
			else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (content) $$renderer.push(`<!--[0-->${escape_html(content)}`);
			else {
				$$renderer.push(`<!--[-1--><!--[-->`);
				slot($$renderer, $$props, "default", {}, null);
				$$renderer.push(`<!--]-->`);
			}
			$$renderer.push(`<!--]--></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		bind_props($$props, {
			class: className,
			content,
			closeAriaLabel,
			closeClassName,
			color,
			dismissible,
			fade,
			heading,
			isOpen,
			toggle,
			theme,
			transition
		});
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/Button/Button.svelte
function Button($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, [
		"class",
		"active",
		"block",
		"content",
		"close",
		"color",
		"disabled",
		"href",
		"inner",
		"outline",
		"size",
		"value"
	]);
	$$renderer.component(($$renderer) => {
		let ariaLabel, classes, defaultAriaLabel;
		let className = fallback($$props["class"], "");
		let active = fallback($$props["active"], false);
		let block = fallback($$props["block"], false);
		let content = fallback($$props["content"], "");
		let close = fallback($$props["close"], false);
		let color = fallback($$props["color"], "secondary");
		let disabled = fallback($$props["disabled"], false);
		let href = fallback($$props["href"], "");
		let inner = fallback($$props["inner"], void 0);
		let outline = fallback($$props["outline"], false);
		let size = fallback($$props["size"], "");
		let value = fallback($$props["value"], "");
		$: ariaLabel = $$sanitized_props["aria-label"];
		$: classes = classnames(className, close ? "btn-close" : "btn", close || `btn${outline ? "-outline" : ""}-${color}`, size ? `btn-${size}` : false, block ? "d-block w-100" : false, { active });
		$: defaultAriaLabel = close ? "Close" : null;
		if (href) {
			$$renderer.push(`<!--[0--><a${attributes({
				...$$restProps,
				class: clsx(classes),
				href,
				"aria-label": ariaLabel || defaultAriaLabel
			}, void 0, { disabled })}>`);
			if (content) $$renderer.push(`<!--[0-->${escape_html(content)}`);
			else {
				$$renderer.push(`<!--[-1--><!--[-->`);
				slot($$renderer, $$props, "default", {}, null);
				$$renderer.push(`<!--]-->`);
			}
			$$renderer.push(`<!--]--></a>`);
		} else {
			$$renderer.push(`<!--[-1--><button${attributes({
				...$$restProps,
				class: clsx(classes),
				disabled,
				value,
				"aria-label": ariaLabel || defaultAriaLabel
			})}><!--[-->`);
			slot($$renderer, $$props, "default", {}, () => {
				if (content) $$renderer.push(`<!--[0-->${escape_html(content)}`);
				else {
					$$renderer.push(`<!--[-1--><!--[-->`);
					slot($$renderer, $$props, "default", {}, null);
					$$renderer.push(`<!--]-->`);
				}
				$$renderer.push(`<!--]-->`);
			});
			$$renderer.push(`<!--]--></button>`);
		}
		$$renderer.push(`<!--]-->`);
		bind_props($$props, {
			class: className,
			active,
			block,
			content,
			close,
			color,
			disabled,
			href,
			inner,
			outline,
			size,
			value
		});
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/popper.js
function createPopperActions(initOptions) {
	let contentNode;
	let options = initOptions;
	let popperInstance = null;
	let referenceNode;
	const initPopper = () => {
		if (referenceNode && contentNode) popperInstance = createPopper(referenceNode, contentNode, options);
	};
	const deinitPopper = () => {
		if (popperInstance) {
			popperInstance.destroy();
			popperInstance = null;
		}
	};
	const referenceAction = (node) => {
		referenceNode = node;
		initPopper();
		return { destroy() {
			deinitPopper();
		} };
	};
	const contentAction = (node, contentOptions) => {
		contentNode = node;
		options = Object.assign(Object.assign({}, initOptions), contentOptions);
		initPopper();
		return {
			update(newContentOptions) {
				options = Object.assign(Object.assign({}, initOptions), newContentOptions);
				if (popperInstance && options) popperInstance.setOptions(options);
			},
			destroy() {
				deinitPopper();
			}
		};
	};
	return [
		referenceAction,
		contentAction,
		() => popperInstance
	];
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/Dropdown/DropdownContext.js
var createContext = () => writable({});
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/Dropdown/Dropdown.svelte
function Dropdown($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, [
		"class",
		"active",
		"autoClose",
		"direction",
		"dropup",
		"group",
		"inNavbar",
		"isOpen",
		"nav",
		"setActiveFromChild",
		"size",
		"theme",
		"toggle"
	]);
	$$renderer.component(($$renderer) => {
		let subItemIsActive, handleToggle, classes;
		const noop = () => void 0;
		let context = createContext();
		setContext("dropdownContext", context);
		const navbarContext = getContext("navbar");
		let className = fallback($$props["class"], "");
		let active = fallback($$props["active"], false);
		let autoClose = fallback($$props["autoClose"], true);
		let direction = fallback($$props["direction"], "down");
		let dropup = fallback($$props["dropup"], false);
		let group = fallback($$props["group"], false);
		let inNavbar = fallback($$props["inNavbar"], () => navbarContext ? navbarContext.inNavbar : false, true);
		let isOpen = fallback($$props["isOpen"], false);
		let nav = fallback($$props["nav"], false);
		let setActiveFromChild = fallback($$props["setActiveFromChild"], false);
		let size = fallback($$props["size"], "");
		let theme = fallback($$props["theme"], null);
		let toggle = fallback($$props["toggle"], void 0);
		const [popperRef, popperContent] = createPopperActions();
		if ([
			"up",
			"down",
			"left",
			"right",
			"start",
			"end"
		].indexOf(direction) === -1) throw new Error(`Invalid direction sent: '${direction}' is not one of 'up', 'down', 'left', 'right', 'start', 'end'`);
		let component;
		let dropdownDirection;
		function handleDocumentClick(e) {
			if (e && (e.which === 3 || e.type === "keyup" && e.which !== 9)) return;
			if (component.contains(e.target) && component !== e.target && (e.type !== "keyup" || e.which === 9)) return;
			if (autoClose === true || autoClose === "outside") handleToggle(e);
		}
		onDestroy(() => {
			if (typeof document !== "undefined") [
				"click",
				"touchstart",
				"keyup"
			].forEach((event) => document.removeEventListener(event, handleDocumentClick, true));
		});
		$: subItemIsActive = false;
		$: if (direction === "left") dropdownDirection = "start";
		else if (direction === "right") dropdownDirection = "end";
		else dropdownDirection = direction;
		$: handleToggle = toggle || (() => isOpen = !isOpen);
		$: classes = classnames(className, direction !== "down" && `drop${dropdownDirection}`, nav && active ? "active" : false, setActiveFromChild && subItemIsActive ? "active" : false, {
			"btn-group": group,
			[`btn-group-${size}`]: !!size,
			dropdown: !group,
			show: isOpen,
			"nav-item": nav
		});
		$: if (typeof document !== "undefined") {
			if (isOpen) [
				"click",
				"touchstart",
				"keyup"
			].forEach((event) => document.addEventListener(event, handleDocumentClick, true));
			else [
				"click",
				"touchstart",
				"keyup"
			].forEach((event) => document.removeEventListener(event, handleDocumentClick, true));
		}
		$: context.update(() => {
			return {
				toggle: handleToggle,
				isOpen,
				autoClose,
				direction: direction === "down" && dropup ? "up" : direction,
				inNavbar: nav || inNavbar,
				popperRef: nav ? noop : popperRef,
				popperContent: nav ? noop : popperContent
			};
		});
		if (nav) {
			$$renderer.push(`<!--[0--><li${attributes({
				...$$restProps,
				class: clsx(classes),
				"data-bs-theme": theme
			})}><!--[-->`);
			slot($$renderer, $$props, "default", {}, null);
			$$renderer.push(`<!--]--></li>`);
		} else {
			$$renderer.push(`<!--[-1--><div${attributes({
				...$$restProps,
				class: clsx(classes),
				"data-bs-theme": theme
			})}><!--[-->`);
			slot($$renderer, $$props, "default", {}, null);
			$$renderer.push(`<!--]--></div>`);
		}
		$$renderer.push(`<!--]-->`);
		bind_props($$props, {
			class: className,
			active,
			autoClose,
			direction,
			dropup,
			group,
			inNavbar,
			isOpen,
			nav,
			setActiveFromChild,
			size,
			theme,
			toggle
		});
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/Card/Card.svelte
function Card($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, [
		"class",
		"body",
		"color",
		"inverse",
		"outline",
		"theme"
	]);
	$$renderer.component(($$renderer) => {
		let classes;
		let className = fallback($$props["class"], "");
		let body = fallback($$props["body"], false);
		let color = fallback($$props["color"], "");
		let inverse = fallback($$props["inverse"], false);
		let outline = fallback($$props["outline"], false);
		let theme = fallback($$props["theme"], void 0);
		$: classes = classnames(className, "card", inverse ? "text-white" : false, body ? "card-body" : false, color ? `${outline ? "border" : "bg"}-${color}` : false);
		$$renderer.push(`<div${attributes({
			...$$restProps,
			"data-bs-theme": theme,
			class: clsx(classes)
		})}><!--[-->`);
		slot($$renderer, $$props, "default", {}, null);
		$$renderer.push(`<!--]--></div>`);
		bind_props($$props, {
			class: className,
			body,
			color,
			inverse,
			outline,
			theme
		});
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/CardBody/CardBody.svelte
function CardBody($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, ["class"]);
	$$renderer.component(($$renderer) => {
		let classes;
		let className = fallback($$props["class"], "");
		$: classes = classnames(className, "card-body");
		$$renderer.push(`<div${attributes({
			...$$restProps,
			class: clsx(classes)
		})}><!--[-->`);
		slot($$renderer, $$props, "default", {}, null);
		$$renderer.push(`<!--]--></div>`);
		bind_props($$props, { class: className });
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/CardHeader/CardHeader.svelte
function CardHeader($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, ["class", "tag"]);
	$$renderer.component(($$renderer) => {
		let classes;
		let className = fallback($$props["class"], "");
		let tag = fallback($$props["tag"], "div");
		$: classes = classnames(className, "card-header");
		if (tag === "h3") {
			$$renderer.push(`<!--[0--><h3${attributes({
				...$$restProps,
				class: clsx(classes)
			})}><!--[-->`);
			slot($$renderer, $$props, "default", {}, null);
			$$renderer.push(`<!--]--></h3>`);
		} else {
			$$renderer.push(`<!--[-1--><div${attributes({
				...$$restProps,
				class: clsx(classes)
			})}><!--[-->`);
			slot($$renderer, $$props, "default", {}, null);
			$$renderer.push(`<!--]--></div>`);
		}
		$$renderer.push(`<!--]-->`);
		bind_props($$props, {
			class: className,
			tag
		});
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/CardTitle/CardTitle.svelte
function CardTitle($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, ["class"]);
	$$renderer.component(($$renderer) => {
		let classes;
		let className = fallback($$props["class"], "");
		$: classes = classnames(className, "card-title");
		$$renderer.push(`<h5${attributes({
			...$$restProps,
			class: clsx(classes)
		})}><!--[-->`);
		slot($$renderer, $$props, "default", {}, null);
		$$renderer.push(`<!--]--></h5>`);
		bind_props($$props, { class: className });
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/Col/Col.svelte
function Col($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, [
		"class",
		"xs",
		"sm",
		"md",
		"lg",
		"xl",
		"xxl"
	]);
	$$renderer.component(($$renderer) => {
		let className = fallback($$props["class"], "");
		let xs = fallback($$props["xs"], void 0);
		let sm = fallback($$props["sm"], void 0);
		let md = fallback($$props["md"], void 0);
		let lg = fallback($$props["lg"], void 0);
		let xl = fallback($$props["xl"], void 0);
		let xxl = fallback($$props["xxl"], void 0);
		const colClasses = [];
		const lookup = {
			xs,
			sm,
			md,
			lg,
			xl,
			xxl
		};
		Object.keys(lookup).forEach((colWidth) => {
			const columnProp = lookup[colWidth];
			if (!columnProp && columnProp !== "") return;
			const isXs = colWidth === "xs";
			if (isObject(columnProp)) {
				const colSizeInterfix = isXs ? "-" : `-${colWidth}-`;
				const colClass = getColumnSizeClass(isXs, colWidth, columnProp.size);
				if (columnProp.size || columnProp.size === "") colClasses.push(colClass);
				if (columnProp.push) colClasses.push(`push${colSizeInterfix}${columnProp.push}`);
				if (columnProp.pull) colClasses.push(`pull${colSizeInterfix}${columnProp.pull}`);
				if (columnProp.offset) colClasses.push(`offset${colSizeInterfix}${columnProp.offset}`);
				if (columnProp.order) colClasses.push(`order${colSizeInterfix}${columnProp.order}`);
			} else colClasses.push(getColumnSizeClass(isXs, colWidth, columnProp));
		});
		if (!colClasses.length) colClasses.push("col");
		if (className) colClasses.push(className);
		$$renderer.push(`<div${attributes({
			...$$restProps,
			class: clsx(colClasses.join(" "))
		})}><!--[-->`);
		slot($$renderer, $$props, "default", {}, null);
		$$renderer.push(`<!--]--></div>`);
		bind_props($$props, {
			class: className,
			xs,
			sm,
			md,
			lg,
			xl,
			xxl
		});
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/Container/Container.svelte
function Container($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, [
		"class",
		"sm",
		"md",
		"lg",
		"xl",
		"xxl",
		"fluid"
	]);
	$$renderer.component(($$renderer) => {
		let classes;
		let className = fallback($$props["class"], "");
		let sm = fallback($$props["sm"], void 0);
		let md = fallback($$props["md"], void 0);
		let lg = fallback($$props["lg"], void 0);
		let xl = fallback($$props["xl"], void 0);
		let xxl = fallback($$props["xxl"], void 0);
		let fluid = fallback($$props["fluid"], false);
		$: classes = classnames(className, {
			"container-sm": sm,
			"container-md": md,
			"container-lg": lg,
			"container-xl": xl,
			"container-xxl": xxl,
			"container-fluid": fluid,
			container: !sm && !md && !lg && !xl && !xxl && !fluid
		});
		$$renderer.push(`<div${attributes({
			...$$restProps,
			class: clsx(classes)
		})}><!--[-->`);
		slot($$renderer, $$props, "default", {}, null);
		$$renderer.push(`<!--]--></div>`);
		bind_props($$props, {
			class: className,
			sm,
			md,
			lg,
			xl,
			xxl,
			fluid
		});
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/DropdownItem/DropdownItem.svelte
function DropdownItem($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, [
		"class",
		"active",
		"disabled",
		"divider",
		"header",
		"toggle",
		"href"
	]);
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let classes;
		getContext("dropdownContext");
		let className = fallback($$props["class"], "");
		let active = fallback($$props["active"], false);
		let disabled = fallback($$props["disabled"], false);
		let divider = fallback($$props["divider"], false);
		let header = fallback($$props["header"], false);
		let toggle = fallback($$props["toggle"], true);
		let href = fallback($$props["href"], "");
		$: classes = classnames(className, {
			disabled,
			"dropdown-item": !divider && !header,
			active,
			"dropdown-header": header,
			"dropdown-divider": divider
		});
		$$renderer.push(`<li>`);
		if (header) {
			$$renderer.push(`<!--[0--><h6${attributes({
				...$$restProps,
				class: clsx(classes)
			})}><!--[-->`);
			slot($$renderer, $$props, "default", {}, null);
			$$renderer.push(`<!--]--></h6>`);
		} else if (divider) {
			$$renderer.push(`<!--[1--><div${attributes({
				...$$restProps,
				class: clsx(classes)
			})}><!--[-->`);
			slot($$renderer, $$props, "default", {}, null);
			$$renderer.push(`<!--]--></div>`);
		} else if (href) {
			$$renderer.push(`<!--[2--><a${attributes({
				...$$restProps,
				click: true,
				href,
				class: clsx(classes)
			})}><!--[-->`);
			slot($$renderer, $$props, "default", {}, null);
			$$renderer.push(`<!--]--></a>`);
		} else {
			$$renderer.push(`<!--[-1--><button${attributes({
				type: "button",
				...$$restProps,
				class: clsx(classes)
			})}><!--[-->`);
			slot($$renderer, $$props, "default", {}, null);
			$$renderer.push(`<!--]--></button>`);
		}
		$$renderer.push(`<!--]--></li>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
		bind_props($$props, {
			class: className,
			active,
			disabled,
			divider,
			header,
			toggle,
			href
		});
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/DropdownMenu/DropdownMenu.svelte
function DropdownMenu($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, [
		"class",
		"end",
		"right"
	]);
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let classes;
		const context = getContext("dropdownContext");
		let className = fallback($$props["class"], "");
		let end = fallback($$props["end"], false);
		let right = fallback($$props["right"], false);
		const popperPlacement = (direction, end) => {
			let prefix = direction;
			if (direction === "up") prefix = "top";
			if (direction === "down") prefix = "bottom";
			return `${prefix}-${end ? "end" : "start"}`;
		};
		$: popperPlacement(store_get($$store_subs ??= {}, "$context", context).direction, end || right);
		$: classes = classnames(className, "dropdown-menu", {
			"dropdown-menu-end": end || right,
			show: store_get($$store_subs ??= {}, "$context", context).isOpen
		});
		$$renderer.push(`<ul${attributes({
			...$$restProps,
			class: clsx(classes),
			"data-bs-popper": store_get($$store_subs ??= {}, "$context", context).inNavbar ? "static" : void 0
		})}><!--[-->`);
		slot($$renderer, $$props, "default", {}, null);
		$$renderer.push(`<!--]--></ul>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
		bind_props($$props, {
			class: className,
			end,
			right
		});
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/DropdownToggle/DropdownToggle.svelte
function DropdownToggle($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, [
		"class",
		"ariaLabel",
		"active",
		"block",
		"caret",
		"color",
		"disabled",
		"inner",
		"nav",
		"outline",
		"size",
		"split",
		"tag"
	]);
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let classes, btnClasses;
		const context = getContext("dropdownContext");
		let className = fallback($$props["class"], "");
		let ariaLabel = fallback($$props["ariaLabel"], "Toggle Dropdown");
		let active = fallback($$props["active"], false);
		let block = fallback($$props["block"], false);
		let caret = fallback($$props["caret"], false);
		let color = fallback($$props["color"], "secondary");
		let disabled = fallback($$props["disabled"], false);
		let inner = fallback($$props["inner"], void 0);
		let nav = fallback($$props["nav"], false);
		let outline = fallback($$props["outline"], false);
		let size = fallback($$props["size"], "");
		let split = fallback($$props["split"], false);
		let tag = fallback($$props["tag"], null);
		$: classes = classnames(className, {
			"dropdown-toggle": caret || split,
			"dropdown-toggle-split": split,
			"nav-link": nav,
			show: store_get($$store_subs ??= {}, "$context", context).isOpen
		});
		$: btnClasses = classnames(classes, "btn", `btn${outline ? "-outline" : ""}-${color}`, size ? `btn-${size}` : false, block ? "d-block w-100" : false, { active });
		if (nav) {
			$$renderer.push(`<!--[0--><a${attributes({
				...$$restProps,
				href: "#nav",
				"aria-expanded": store_get($$store_subs ??= {}, "$context", context).isOpen,
				class: clsx(classes)
			})}><!--[-->`);
			slot($$renderer, $$props, "default", {}, () => {
				$$renderer.push(`<span class="visually-hidden">${escape_html(ariaLabel)}</span>`);
			});
			$$renderer.push(`<!--]--></a>`);
		} else if (tag === "div") {
			$$renderer.push(`<!--[1--><div${attributes({
				...$$restProps,
				"aria-expanded": store_get($$store_subs ??= {}, "$context", context).isOpen,
				class: clsx(classes)
			})}><!--[-->`);
			slot($$renderer, $$props, "default", {}, () => {
				$$renderer.push(`<span class="visually-hidden">${escape_html(ariaLabel)}</span>`);
			});
			$$renderer.push(`<!--]--></div>`);
		} else if (tag === "span") {
			$$renderer.push(`<!--[2--><span${attributes({
				...$$restProps,
				"aria-expanded": store_get($$store_subs ??= {}, "$context", context).isOpen,
				class: clsx(classes)
			})}><!--[-->`);
			slot($$renderer, $$props, "default", {}, () => {
				$$renderer.push(`<span class="visually-hidden">${escape_html(ariaLabel)}</span>`);
			});
			$$renderer.push(`<!--]--></span>`);
		} else {
			$$renderer.push(`<!--[-1--><button${attributes({
				...$$restProps,
				type: "button",
				"aria-expanded": store_get($$store_subs ??= {}, "$context", context).isOpen,
				class: clsx(btnClasses)
			})}><!--[-->`);
			slot($$renderer, $$props, "default", {}, () => {
				$$renderer.push(`<span class="visually-hidden">${escape_html(ariaLabel)}</span>`);
			});
			$$renderer.push(`<!--]--></button>`);
		}
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
		bind_props($$props, {
			class: className,
			ariaLabel,
			active,
			block,
			caret,
			color,
			disabled,
			inner,
			nav,
			outline,
			size,
			split,
			tag
		});
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/Form/Form.svelte
function Form($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, [
		"class",
		"inline",
		"validated"
	]);
	$$renderer.component(($$renderer) => {
		let classes;
		let className = fallback($$props["class"], "");
		let inline = fallback($$props["inline"], false);
		let validated = fallback($$props["validated"], false);
		$: classes = classnames(className, {
			"form-inline": inline,
			"was-validated": validated
		});
		$$renderer.push(`<form${attributes({
			...$$restProps,
			class: clsx(classes)
		})}><!--[-->`);
		slot($$renderer, $$props, "default", {}, null);
		$$renderer.push(`<!--]--></form>`);
		bind_props($$props, {
			class: className,
			inline,
			validated
		});
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/FormCheck/FormCheck.svelte
function FormCheck($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, [
		"class",
		"checked",
		"disabled",
		"group",
		"id",
		"inline",
		"inner",
		"invalid",
		"label",
		"name",
		"reverse",
		"size",
		"type",
		"valid",
		"value"
	]);
	$$renderer.component(($$renderer) => {
		let classes, inputClasses, idFor;
		let className = fallback($$props["class"], "");
		let checked = fallback($$props["checked"], false);
		let disabled = fallback($$props["disabled"], false);
		let group = fallback($$props["group"], void 0);
		let id = fallback($$props["id"], void 0);
		let inline = fallback($$props["inline"], false);
		let inner = fallback($$props["inner"], void 0);
		let invalid = fallback($$props["invalid"], false);
		let label = fallback($$props["label"], "");
		let name = fallback($$props["name"], "");
		let reverse = fallback($$props["reverse"], false);
		let size = fallback($$props["size"], "");
		let type = fallback($$props["type"], "checkbox");
		let valid = fallback($$props["valid"], false);
		let value = fallback($$props["value"], void 0);
		$: classes = classnames(className, "form-check", {
			"form-check-reverse": reverse,
			"form-switch": type === "switch",
			"form-check-inline": inline,
			[`form-control-${size}`]: size
		});
		$: inputClasses = classnames("form-check-input", {
			"is-invalid": invalid,
			"is-valid": valid
		});
		$: idFor = id || label;
		$$renderer.push(`<div${attr_class(clsx(classes))}>`);
		if (type === "radio") $$renderer.push(`<!--[0--><input${attributes({
			...$$restProps,
			class: clsx(inputClasses),
			id: idFor,
			type: "radio",
			checked: group === value,
			disabled,
			name,
			value
		}, void 0, void 0, void 0, 4)}/>`);
		else if (type === "switch") $$renderer.push(`<!--[1--><input${attributes({
			...$$restProps,
			class: clsx(inputClasses),
			id: idFor,
			type: "checkbox",
			checked,
			disabled,
			name,
			value
		}, void 0, void 0, void 0, 4)}/>`);
		else $$renderer.push(`<!--[-1--><input${attributes({
			...$$restProps,
			class: clsx(inputClasses),
			id: idFor,
			type: "checkbox",
			checked,
			disabled,
			name,
			value
		}, void 0, void 0, void 0, 4)}/>`);
		$$renderer.push(`<!--]--> `);
		if (label) {
			$$renderer.push(`<!--[0--><label class="form-check-label"${attr("for", idFor)}><!--[-->`);
			slot($$renderer, $$props, "label", {}, () => {
				$$renderer.push(`${escape_html(label)}`);
			});
			$$renderer.push(`<!--]--></label>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div>`);
		bind_props($$props, {
			class: className,
			checked,
			disabled,
			group,
			id,
			inline,
			inner,
			invalid,
			label,
			name,
			reverse,
			size,
			type,
			valid,
			value
		});
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/FormFeedback/FormFeedback.svelte
function FormFeedback($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, [
		"class",
		"valid",
		"tooltip"
	]);
	$$renderer.component(($$renderer) => {
		let className = fallback($$props["class"], "");
		let valid = fallback($$props["valid"], void 0);
		let tooltip = fallback($$props["tooltip"], false);
		let classes;
		$: {
			const validMode = tooltip ? "tooltip" : "feedback";
			classes = classnames(className, valid ? `valid-${validMode}` : `invalid-${validMode}`);
		}
		$$renderer.push(`<div${attributes({
			...$$restProps,
			class: clsx(classes)
		})}><!--[-->`);
		slot($$renderer, $$props, "default", {}, null);
		$$renderer.push(`<!--]--></div>`);
		bind_props($$props, {
			class: className,
			valid,
			tooltip
		});
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/FormGroup/FormGroup.svelte
function FormGroup($$renderer, $$props) {
	const $$slots = sanitize_slots($$props);
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, [
		"class",
		"check",
		"disabled",
		"floating",
		"inline",
		"label",
		"row",
		"spacing",
		"tag"
	]);
	$$renderer.component(($$renderer) => {
		let classes;
		let className = fallback($$props["class"], "");
		let check = fallback($$props["check"], false);
		let disabled = fallback($$props["disabled"], false);
		let floating = fallback($$props["floating"], false);
		let inline = fallback($$props["inline"], false);
		let label = fallback($$props["label"], "");
		let row = fallback($$props["row"], false);
		let spacing = fallback($$props["spacing"], "mb-3");
		let tag = fallback($$props["tag"], null);
		$: classes = classnames(className, spacing, {
			row,
			"form-check": check,
			"form-check-inline": check && inline,
			"form-floating": floating,
			disabled: check && disabled
		});
		if (tag === "fieldset") {
			$$renderer.push(`<!--[0--><fieldset${attributes({
				...$$restProps,
				class: clsx(classes)
			})}><!--[-->`);
			slot($$renderer, $$props, "default", {}, null);
			$$renderer.push(`<!--]--> `);
			if (label || $$slots.label) {
				$$renderer.push(`<!--[0--><label>${escape_html(label)} <!--[-->`);
				slot($$renderer, $$props, "label", {}, null);
				$$renderer.push(`<!--]--></label>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></fieldset>`);
		} else {
			$$renderer.push(`<!--[-1--><div${attributes({
				...$$restProps,
				class: clsx(classes)
			})}><!--[-->`);
			slot($$renderer, $$props, "default", {}, null);
			$$renderer.push(`<!--]--> `);
			if (label || $$slots.label) {
				$$renderer.push(`<!--[0--><label>${escape_html(label)} <!--[-->`);
				slot($$renderer, $$props, "label", {}, null);
				$$renderer.push(`<!--]--></label>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div>`);
		}
		$$renderer.push(`<!--]-->`);
		bind_props($$props, {
			class: className,
			check,
			disabled,
			floating,
			inline,
			label,
			row,
			spacing,
			tag
		});
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/InlineContainer/InlineContainer.svelte
function InlineContainer($$renderer, $$props) {
	$$renderer.push(`<div><!--[-->`);
	slot($$renderer, $$props, "default", {}, null);
	$$renderer.push(`<!--]--></div>`);
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/Input/Input.svelte
function Input($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, [
		"class",
		"bsSize",
		"checked",
		"color",
		"disabled",
		"feedback",
		"files",
		"group",
		"inner",
		"invalid",
		"label",
		"max",
		"min",
		"multiple",
		"name",
		"placeholder",
		"plaintext",
		"readonly",
		"reverse",
		"size",
		"theme",
		"type",
		"valid",
		"value"
	]);
	$$renderer.component(($$renderer) => {
		/**
		* Additional CSS classes for the input.
		* @type {string}
		* @default ''
		*/
		let className = fallback($$props["class"], "");
		/**
		* Bootstrap size to apply to the input.
		* @type {string | undefined}
		* @default undefined
		*/
		let bsSize = fallback($$props["bsSize"], void 0);
		/**
		* Indicates whether the input should be checked
		* Used with type "checkbox", "radio", and "switch".
		* @type {boolean}
		* @default false
		*/
		let checked = fallback($$props["checked"], false);
		/**
		* Color selection of the input
		* Used with type "color"
		* @type {string | undefined}
		* @default undefined
		*/
		let color = fallback($$props["color"], void 0);
		/**
		* Determines whether the input is disabled.
		* @type {boolean | undefined}
		* @default undefined
		*/
		let disabled = fallback($$props["disabled"], void 0);
		/**
		* Feedback message for the Input.
		* @type {string | Array}
		* @default undefined
		*/
		let feedback = fallback($$props["feedback"], void 0);
		/**
		* Array of files for file names for input.
		* Used with type "file"
		* @type {Array | undefined}
		* @default undefined
		*/
		let files = fallback($$props["files"], void 0);
		/**
		* Group identifier for the Input.
		* Used with type "checkbox", "radio", and "switch".
		* @type {string | undefined}
		* @default undefined
		*/
		let group = fallback($$props["group"], void 0);
		/**
		* Inner content for the Input.
		* @type {string | undefined}
		* @default undefined
		*/
		let inner = fallback($$props["inner"], void 0);
		/**
		* Indicates whether the input is invalid.
		* @type {boolean}
		* @default false
		*/
		let invalid = fallback($$props["invalid"], false);
		/**
		* Label for the input.
		* Used with type "checkbox", "radio", "switch".
		* @type {string | undefined}
		* @default undefined
		*/
		let label = fallback($$props["label"], void 0);
		/**
		* Maximum value for the Input.
		* Used with type "date", "datetime", "datetime-local", "month", "number", "time", "range", and "week"
		* @type {string | number | undefined}
		* @default undefined
		*/
		let max = fallback($$props["max"], void 0);
		/**
		* Minimum value for the Input.
		* Used with type "date", "datetime", "datetime-local", "month", "number", "time", "range", and "week"
		* @type {string | number | undefined}
		* @default undefined
		*/
		let min = fallback($$props["min"], void 0);
		/**
		* Indicates whether the Input allows multiple selections.
		* Used with type "email" and "file".
		* @type {boolean | undefined}
		* @default undefined
		*/
		let multiple = fallback($$props["multiple"], void 0);
		/**
		* Name attribute for the Input.
		* @type {string}
		* @default ''
		*/
		let name = fallback($$props["name"], "");
		/**
		* Placeholder text for the input.
		* @type {string}
		* @default ''
		*/
		let placeholder = fallback($$props["placeholder"], "");
		/**
		* Indicates whether the input should be rendered in plaintext mode.
		* @type {boolean}
		* @default false
		*/
		let plaintext = fallback($$props["plaintext"], false);
		/**
		* Indicates whether the input is read-only.
		* @type {boolean | undefined}
		* @default undefined
		*/
		let readonly = fallback($$props["readonly"], void 0);
		/**
		* Indicates whether the input is reversed.
		* @type {boolean}
		* @default false
		*/
		let reverse = fallback($$props["reverse"], false);
		/**
		* Determines the size of the input.
		* @type {string | undefined}
		* @default undefined
		*/
		let size = fallback($$props["size"], void 0);
		/**
		* Theme name override to apply to the input.
		* @type {string | undefined}
		*/
		let theme = fallback($$props["theme"], void 0);
		/**
		* Determines the type of input.
		* @type {string}
		* @default 'text'
		*/
		let type = fallback($$props["type"], "text");
		/**
		* Indicates whether the input is valid.
		* @type {boolean}
		* @default false
		*/
		let valid = fallback($$props["valid"], false);
		/**
		* Value of the input.
		* @type {string | undefined}
		* @default undefined
		*/
		let value = fallback($$props["value"], void 0);
		let classes;
		let tag;
		$: {
			const isNotaNumber = /* @__PURE__ */ new RegExp("\\D", "g");
			let isBtn = false;
			let formControlClass = "form-control";
			tag = "input";
			switch (type) {
				case "color":
					formControlClass = `form-control form-control-color`;
					break;
				case "range":
					formControlClass = "form-range";
					break;
				case "select":
					formControlClass = `form-select`;
					tag = "select";
					break;
				case "textarea":
					tag = "textarea";
					break;
				case "button":
				case "reset":
				case "submit":
					formControlClass = `btn btn-${color || "secondary"}`;
					isBtn = true;
					break;
				case "hidden":
				case "image":
					formControlClass = void 0;
					break;
				default:
					formControlClass = "form-control";
					tag = "input";
			}
			if (plaintext) {
				formControlClass = `${formControlClass}-plaintext`;
				tag = "input";
			}
			if (size && isNotaNumber.test(size)) {
				console.warn("Please use the prop \"bsSize\" instead of the \"size\" to bootstrap's input sizing.");
				bsSize = size;
				size = void 0;
			}
			classes = classnames(className, formControlClass, {
				"is-invalid": invalid,
				"is-valid": valid,
				[`form-control-${bsSize}`]: bsSize && !isBtn && tag !== "select",
				[`form-select-${bsSize}`]: bsSize && tag === "select",
				[`btn-${bsSize}`]: bsSize && isBtn
			});
		}
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (tag === "input") {
				$$renderer.push("<!--[0-->");
				if (type === "text" || type === "password" || type === "search" || type === "tel" || type === "url") $$renderer.push(`<!--[0--><input${attributes({
					...$$restProps,
					type,
					"data-bs-theme": theme,
					class: clsx(classes),
					value,
					disabled,
					name,
					placeholder,
					readonly,
					size
				}, void 0, void 0, void 0, 4)}/>`);
				else if (type === "color") $$renderer.push(`<!--[1--><input${attributes({
					...$$restProps,
					"data-bs-theme": theme,
					class: clsx(classes),
					type: "color",
					value,
					disabled,
					name,
					placeholder,
					readonly
				}, void 0, void 0, void 0, 4)}/>`);
				else if (type === "email") $$renderer.push(`<!--[2--><input${attributes({
					...$$restProps,
					"data-bs-theme": theme,
					class: clsx(classes),
					type: "email",
					value,
					disabled,
					multiple,
					name,
					placeholder,
					readonly,
					size
				}, void 0, void 0, void 0, 4)}/>`);
				else if (type === "file") $$renderer.push(`<!--[3--><input${attributes({
					...$$restProps,
					"data-bs-theme": theme,
					class: clsx(classes),
					type: "file",
					disabled,
					invalid,
					multiple,
					name,
					placeholder,
					readonly,
					valid
				}, void 0, void 0, void 0, 4)}/>`);
				else if (type === "checkbox" || type === "radio" || type === "switch") {
					$$renderer.push("<!--[4-->");
					FormCheck($$renderer, spread_props([$$restProps, {
						"data-bs-theme": theme,
						class: className,
						size: bsSize,
						type,
						disabled,
						invalid,
						label,
						name,
						placeholder,
						reverse,
						readonly,
						valid,
						get checked() {
							return checked;
						},
						set checked($$value) {
							checked = $$value;
							$$settled = false;
						},
						get inner() {
							return inner;
						},
						set inner($$value) {
							inner = $$value;
							$$settled = false;
						},
						get group() {
							return group;
						},
						set group($$value) {
							group = $$value;
							$$settled = false;
						},
						get value() {
							return value;
						},
						set value($$value) {
							value = $$value;
							$$settled = false;
						}
					}]));
				} else if (type === "number") $$renderer.push(`<!--[5--><input${attributes({
					...$$restProps,
					type: "number",
					"data-bs-theme": theme,
					class: clsx(classes),
					value,
					disabled,
					max,
					min,
					name,
					placeholder,
					readonly
				}, void 0, void 0, void 0, 4)}/>`);
				else if (type === "range") $$renderer.push(`<!--[6--><input${attributes({
					...$$restProps,
					type: "range",
					"data-bs-theme": theme,
					class: clsx(classes),
					value,
					disabled,
					max,
					min,
					name,
					placeholder,
					readonly
				}, void 0, void 0, void 0, 4)}/>`);
				else if (type === "date" || type === "datetime" || type === "datetime-local" || type === "month" || type === "time" || type === "week") $$renderer.push(`<!--[7--><input${attributes({
					...$$restProps,
					type,
					"data-bs-theme": theme,
					class: clsx(classes),
					value,
					disabled,
					max,
					min,
					name,
					placeholder,
					readonly
				}, void 0, void 0, void 0, 4)}/>`);
				else $$renderer.push(`<!--[-1--><input${attributes({
					...$$restProps,
					"data-bs-theme": theme,
					class: clsx(classes),
					type,
					value,
					name,
					disabled,
					placeholder,
					readonly
				}, void 0, void 0, void 0, 4)}/>`);
				$$renderer.push(`<!--]-->`);
			} else if (tag === "textarea") {
				$$renderer.push(`<!--[1--><textarea${attributes({
					...$$restProps,
					"data-bs-theme": theme,
					class: clsx(classes),
					disabled,
					name,
					placeholder,
					readonly
				})}>`);
				const $$body = escape_html(value);
				if ($$body) $$renderer.push(`${$$body}`);
				$$renderer.push(`</textarea>`);
			} else if (tag === "select" && !multiple) {
				$$renderer.push("<!--[2-->");
				$$renderer.select({
					...$$restProps,
					"data-bs-theme": theme,
					class: classes,
					value,
					this: inner,
					name,
					disabled,
					readonly
				}, ($$renderer) => {
					$$renderer.push(`<!--[-->`);
					slot($$renderer, $$props, "default", {}, null);
					$$renderer.push(`<!--]-->`);
				}, void 0, void 0, void 0, void 0, true);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (feedback) {
				$$renderer.push("<!--[0-->");
				if (Array.isArray(feedback)) {
					$$renderer.push(`<!--[0--><!--[-->`);
					const each_array = ensure_array_like(feedback);
					for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
						let msg = each_array[$$index];
						FormFeedback($$renderer, {
							valid,
							children: ($$renderer) => {
								$$renderer.push(`<!---->${escape_html(msg)}`);
							},
							$$slots: { default: true }
						});
					}
					$$renderer.push(`<!--]-->`);
				} else {
					$$renderer.push("<!--[-1-->");
					FormFeedback($$renderer, {
						valid,
						children: ($$renderer) => {
							$$renderer.push(`<!---->${escape_html(feedback)}`);
						},
						$$slots: { default: true }
					});
				}
				$$renderer.push(`<!--]-->`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		bind_props($$props, {
			class: className,
			bsSize,
			checked,
			color,
			disabled,
			feedback,
			files,
			group,
			inner,
			invalid,
			label,
			max,
			min,
			multiple,
			name,
			placeholder,
			plaintext,
			readonly,
			reverse,
			size,
			theme,
			type,
			valid,
			value
		});
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/Label/Label.svelte
function Label($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, [
		"class",
		"hidden",
		"check",
		"size",
		"for",
		"xs",
		"sm",
		"md",
		"lg",
		"xl",
		"xxl",
		"widths"
	]);
	$$renderer.component(($$renderer) => {
		let classes;
		let className = fallback($$props["class"], "");
		let hidden = fallback($$props["hidden"], false);
		let check = fallback($$props["check"], false);
		let size = fallback($$props["size"], "");
		let fore = fallback($$props["for"], null);
		let xs = fallback($$props["xs"], "");
		let sm = fallback($$props["sm"], "");
		let md = fallback($$props["md"], "");
		let lg = fallback($$props["lg"], "");
		let xl = fallback($$props["xl"], "");
		let xxl = fallback($$props["xxl"], "");
		const colWidths = {
			xs,
			sm,
			md,
			lg,
			xl,
			xxl
		};
		let widths = fallback($$props["widths"], () => Object.keys(colWidths), true);
		const colClasses = [];
		widths.forEach((colWidth) => {
			let columnProp = $$sanitized_props[colWidth];
			if (!columnProp && columnProp !== "") return;
			const isXs = colWidth === "xs";
			let colClass;
			if (isObject(columnProp)) {
				const colSizeInterfix = isXs ? "-" : `-${colWidth}-`;
				colClass = getColumnSizeClass(isXs, colWidth, columnProp.size);
				colClasses.push(classnames({
					[colClass]: columnProp.size || columnProp.size === "",
					[`order${colSizeInterfix}${columnProp.order}`]: columnProp.order || columnProp.order === 0,
					[`offset${colSizeInterfix}${columnProp.offset}`]: columnProp.offset || columnProp.offset === 0
				}));
			} else {
				colClass = getColumnSizeClass(isXs, colWidth, columnProp);
				colClasses.push(colClass);
			}
		});
		$: classes = classnames(className, hidden ? "visually-hidden" : false, check ? "form-check-label" : false, size ? `col-form-label-${size}` : false, colClasses, colClasses.length ? "col-form-label" : "form-label");
		$$renderer.push(`<label${attributes({
			...$$restProps,
			class: clsx(classes),
			for: fore
		})}><!--[-->`);
		slot($$renderer, $$props, "default", {}, null);
		$$renderer.push(`<!--]--></label>`);
		bind_props($$props, {
			class: className,
			hidden,
			check,
			size,
			for: fore,
			xs,
			sm,
			md,
			lg,
			xl,
			xxl,
			widths
		});
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/ModalBackdrop/ModalBackdrop.svelte
function ModalBackdrop($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	rest_props($$sanitized_props, [
		"class",
		"isOpen",
		"fade"
	]);
	$$renderer.component(($$renderer) => {
		let className = fallback($$props["class"], "");
		let isOpen = fallback($$props["isOpen"], false);
		let fade = fallback($$props["fade"], true);
		$: classnames(className, "modal-backdrop");
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		bind_props($$props, {
			class: className,
			isOpen,
			fade
		});
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/ModalBody/ModalBody.svelte
function ModalBody($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, ["class"]);
	$$renderer.component(($$renderer) => {
		let classes;
		let className = fallback($$props["class"], "");
		$: classes = classnames(className, "modal-body");
		$$renderer.push(`<div${attributes({
			...$$restProps,
			class: clsx(classes)
		})}><!--[-->`);
		slot($$renderer, $$props, "default", {}, null);
		$$renderer.push(`<!--]--></div>`);
		bind_props($$props, { class: className });
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/ModalHeader/ModalHeader.svelte
function ModalHeader($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, [
		"class",
		"toggle",
		"closeAriaLabel",
		"id",
		"content"
	]);
	$$renderer.component(($$renderer) => {
		let classes;
		let className = fallback($$props["class"], "");
		let toggle = fallback($$props["toggle"], void 0);
		let closeAriaLabel = fallback($$props["closeAriaLabel"], "Close");
		let id = fallback($$props["id"], void 0);
		let content = fallback($$props["content"], void 0);
		$: classes = classnames(className, "modal-header");
		$$renderer.push(`<div${attributes({
			...$$restProps,
			class: clsx(classes)
		})}><h5 class="modal-title"${attr("id", id)}>`);
		if (content) $$renderer.push(`<!--[0-->${escape_html(content)}`);
		else {
			$$renderer.push(`<!--[-1--><!--[-->`);
			slot($$renderer, $$props, "default", {}, null);
			$$renderer.push(`<!--]-->`);
		}
		$$renderer.push(`<!--]--></h5> <!--[-->`);
		slot($$renderer, $$props, "close", {}, () => {
			if (typeof toggle === "function") $$renderer.push(`<!--[0--><button type="button" class="btn-close"${attr("aria-label", closeAriaLabel)}></button>`);
			else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		});
		$$renderer.push(`<!--]--></div>`);
		bind_props($$props, {
			class: className,
			toggle,
			closeAriaLabel,
			id,
			content
		});
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/Portal/Portal.svelte
function Portal($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, []);
	$$renderer.component(($$renderer) => {
		onDestroy(() => {});
		$$renderer.push(`<div${attributes({ ...$$restProps })}><!--[-->`);
		slot($$renderer, $$props, "default", {}, null);
		$$renderer.push(`<!--]--></div>`);
	});
}
function Modal($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	rest_props($$sanitized_props, [
		"class",
		"static",
		"autoFocus",
		"body",
		"centered",
		"container",
		"fullscreen",
		"header",
		"isOpen",
		"keyboard",
		"backdrop",
		"contentClassName",
		"fade",
		"labelledBy",
		"modalClassName",
		"modalStyle",
		"returnFocusAfterClose",
		"scrollable",
		"size",
		"theme",
		"toggle",
		"unmountOnClose",
		"wrapClassName"
	]);
	$$renderer.component(($$renderer) => {
		let outer;
		createEventDispatcher();
		let className = fallback($$props["class"], "");
		let staticModal = fallback($$props["static"], false);
		let autoFocus = fallback($$props["autoFocus"], true);
		let body = fallback($$props["body"], false);
		let centered = fallback($$props["centered"], false);
		let container = fallback($$props["container"], void 0);
		let fullscreen = fallback($$props["fullscreen"], false);
		let header = fallback($$props["header"], void 0);
		let isOpen = fallback($$props["isOpen"], false);
		let keyboard = fallback($$props["keyboard"], true);
		let backdrop = fallback($$props["backdrop"], true);
		let contentClassName = fallback($$props["contentClassName"], "");
		let fade = fallback($$props["fade"], true);
		let labelledBy = fallback($$props["labelledBy"], () => header ? `modal-${uuid()}` : void 0, true);
		let modalClassName = fallback($$props["modalClassName"], "");
		let modalStyle = fallback($$props["modalStyle"], null);
		let returnFocusAfterClose = fallback($$props["returnFocusAfterClose"], true);
		let scrollable = fallback($$props["scrollable"], false);
		let size = fallback($$props["size"], "");
		let theme = fallback($$props["theme"], null);
		let toggle = fallback($$props["toggle"], void 0);
		let unmountOnClose = fallback($$props["unmountOnClose"], true);
		let wrapClassName = fallback($$props["wrapClassName"], "");
		let _triggeringElement;
		onDestroy(() => {
			destroy();
		});
		function manageFocusAfterClose() {
			if (_triggeringElement) {
				if (typeof _triggeringElement.focus === "function" && returnFocusAfterClose) _triggeringElement.focus();
				_triggeringElement = null;
			}
		}
		function destroy() {
			manageFocusAfterClose();
		}
		const dialogBaseClass = "modal-dialog";
		$: classnames(dialogBaseClass, className, {
			[`modal-${size}`]: size,
			"modal-fullscreen": fullscreen === true,
			[`modal-fullscreen-${fullscreen}-down`]: fullscreen && typeof fullscreen === "string",
			[`${dialogBaseClass}-centered`]: centered,
			[`${dialogBaseClass}-scrollable`]: scrollable
		});
		$: outer = container === "inline" || staticModal ? InlineContainer : Portal;
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (backdrop && !staticModal) {
			$$renderer.push("<!--[0-->");
			if (outer) {
				$$renderer.push("<!--[-->");
				outer($$renderer, {
					children: ($$renderer) => {
						ModalBackdrop($$renderer, {
							fade,
							isOpen
						});
					},
					$$slots: { default: true }
				});
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		bind_props($$props, {
			class: className,
			static: staticModal,
			autoFocus,
			body,
			centered,
			container,
			fullscreen,
			header,
			isOpen,
			keyboard,
			backdrop,
			contentClassName,
			fade,
			labelledBy,
			modalClassName,
			modalStyle,
			returnFocusAfterClose,
			scrollable,
			size,
			theme,
			toggle,
			unmountOnClose,
			wrapClassName
		});
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/ModalFooter/ModalFooter.svelte
function ModalFooter($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, ["class"]);
	$$renderer.component(($$renderer) => {
		let classes;
		let className = fallback($$props["class"], "");
		$: classes = classnames(className, "modal-footer");
		$$renderer.push(`<div${attributes({
			...$$restProps,
			class: clsx(classes)
		})}><!--[-->`);
		slot($$renderer, $$props, "default", {}, null);
		$$renderer.push(`<!--]--></div>`);
		bind_props($$props, { class: className });
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/Row/Row.svelte
function Row($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, [
		"class",
		"noGutters",
		"form",
		"cols",
		"inner"
	]);
	$$renderer.component(($$renderer) => {
		let classes;
		let className = fallback($$props["class"], "");
		let noGutters = fallback($$props["noGutters"], false);
		let form = fallback($$props["form"], false);
		let cols = fallback($$props["cols"], 0);
		let inner = fallback($$props["inner"], void 0);
		function getCols(cols) {
			const colsValue = parseInt(cols);
			if (!isNaN(colsValue)) {
				if (colsValue > 0) return [`row-cols-${colsValue}`];
			} else if (typeof cols === "object") return [
				"xs",
				"sm",
				"md",
				"lg",
				"xl"
			].map((colWidth) => {
				const colSizeInterfix = colWidth === "xs" ? "-" : `-${colWidth}-`;
				const value = cols[colWidth];
				if (typeof value === "number" && value > 0) return `row-cols${colSizeInterfix}${value}`;
				return null;
			}).filter((value) => !!value);
			return [];
		}
		$: classes = classnames(className, noGutters ? "gx-0" : null, form ? "form-row" : "row", ...getCols(cols));
		$$renderer.push(`<div${attributes({
			...$$restProps,
			class: clsx(classes)
		})}><!--[-->`);
		slot($$renderer, $$props, "default", {}, null);
		$$renderer.push(`<!--]--></div>`);
		bind_props($$props, {
			class: className,
			noGutters,
			form,
			cols,
			inner
		});
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/Spinner/Spinner.svelte
function Spinner($$renderer, $$props) {
	const $$sanitized_props = sanitize_props($$props);
	const $$restProps = rest_props($$sanitized_props, [
		"class",
		"type",
		"size",
		"color"
	]);
	$$renderer.component(($$renderer) => {
		let classes;
		let className = fallback($$props["class"], "");
		let type = fallback($$props["type"], "border");
		let size = fallback($$props["size"], "");
		let color = fallback($$props["color"], "");
		$: classes = classnames(className, size ? `spinner-${type}-${size}` : false, `spinner-${type}`, color ? `text-${color}` : false);
		$$renderer.push(`<div${attributes({
			...$$restProps,
			role: "status",
			class: clsx(classes)
		})}><span class="visually-hidden"><!--[-->`);
		slot($$renderer, $$props, "default", {}, () => {
			$$renderer.push(`Loading...`);
		});
		$$renderer.push(`<!--]--></span></div>`);
		bind_props($$props, {
			class: className,
			type,
			size,
			color
		});
	});
}
//#endregion
//#region node_modules/@sveltestrap/sveltestrap/dist/Theme/helpers.js
var colorMode = writable(getInitialColorMode());
colorMode.subscribe((mode) => useColorMode(mode));
function getInitialColorMode() {
	const currentTheme = globalThis.document?.documentElement.getAttribute("data-bs-theme") || "light";
	const prefersDarkMode = typeof globalThis.window?.matchMedia === "function" ? globalThis.window?.matchMedia("(prefers-color-scheme: dark)").matches : false;
	return currentTheme === "dark" || currentTheme === "auto" && prefersDarkMode ? "dark" : "light";
}
function useColorMode(element, mode) {
	let target = element;
	if (arguments.length === 1) {
		target = globalThis.document?.documentElement;
		if (!target) return;
		mode = element;
		colorMode.update(() => mode);
	}
	target.setAttribute("data-bs-theme", mode);
}
//#endregion
export { Alert as S, CardHeader as _, ModalHeader as a, Dropdown as b, Input as c, DropdownToggle as d, DropdownMenu as f, CardTitle as g, Col as h, Modal as i, FormGroup as l, Container as m, Row as n, ModalBody as o, DropdownItem as p, ModalFooter as r, Label as s, Spinner as t, Form as u, CardBody as v, Button as x, Card as y };
