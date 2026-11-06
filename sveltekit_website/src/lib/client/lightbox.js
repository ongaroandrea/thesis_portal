import { writable } from 'svelte/store';

/**
 * Shared state for the full-screen image viewer (`ImageLightbox.svelte`,
 * mounted once in the root layout). `null` when closed, otherwise
 * `{ items: [{ src, alt, caption }], index }`.
 */
export const lightbox = writable(null);

/** Images registered by `use:zoomable`, keyed by group name. */
const groups = new Map();

/**
 * Open the viewer on a list of images.
 * @param {{ src: string, alt?: string, caption?: string }[]} items
 * @param {number} [index] - The image shown first.
 */
export function openLightbox(items, index = 0) {
	const valid = items.filter((item) => item?.src);
	if (valid.length === 0) return;
	lightbox.set({ items: valid, index: Math.min(Math.max(index, 0), valid.length - 1) });
}

export function closeLightbox() {
	lightbox.set(null);
}

function itemFor(node, options) {
	return { src: node.currentSrc || node.src, alt: node.alt || '', caption: options.caption || node.alt || '' };
}

/**
 * Make an `<img>` open the viewer when clicked, or with Enter/Space.
 * Images sharing a `group` open together, in page order, so the viewer can
 * step between them (for example a student's render and the reference).
 *
 * @param {HTMLImageElement} node
 * @param {{ group?: string, caption?: string, label?: string }} [options]
 *   `label` is the accessible name of the control, e.g. "Enlarge image".
 */
export function zoomable(node, options = {}) {
	let current = options;
	let group = current.group;

	node.classList.add('is-zoomable');
	node.setAttribute('role', 'button');
	node.setAttribute('tabindex', '0');
	const applyLabel = () => {
		if (current.label) node.setAttribute('aria-label', `${current.label}: ${current.caption || node.alt || ''}`.replace(/: $/, ''));
	};
	applyLabel();

	function register() {
		if (!group) return;
		if (!groups.has(group)) groups.set(group, new Map());
		groups.get(group).set(node, () => itemFor(node, current));
	}
	function unregister() {
		if (!group) return;
		groups.get(group)?.delete(node);
		if (groups.get(group)?.size === 0) groups.delete(group);
	}
	register();

	function open() {
		if (!group) {
			openLightbox([itemFor(node, current)]);
			return;
		}
		// Page order, skipping images that are hidden or not loaded yet.
		const members = [...groups.get(group).entries()]
			.filter(([element]) => element.isConnected && (element.currentSrc || element.src))
			.sort(([a], [b]) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
		openLightbox(members.map(([, toItem]) => toItem()), members.findIndex(([element]) => element === node));
	}
	function onClick(event) {
		event.preventDefault();
		event.stopPropagation();
		open();
	}
	function onKeydown(event) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		open();
	}

	node.addEventListener('click', onClick);
	node.addEventListener('keydown', onKeydown);

	return {
		update(next = {}) {
			unregister();
			current = next;
			group = next.group;
			applyLabel();
			register();
		},
		destroy() {
			unregister();
			node.removeEventListener('click', onClick);
			node.removeEventListener('keydown', onKeydown);
		}
	};
}
