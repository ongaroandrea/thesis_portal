/**
 * Svelte action for `.table-responsive` wrappers.
 *
 * Shows a localized "scroll sideways" hint above the table only while the table
 * is actually wider than its container, and makes the scroll region focusable so
 * keyboard users can scroll it with the arrow keys.
 *
 * Usage: <div class="table-responsive" use:tableScrollHint={$_('common.scrollTable')}>
 */
export function tableScrollHint(node, label) {
	const hint = document.createElement('p');
	hint.className = 'table-scroll-hint';
	hint.setAttribute('aria-hidden', 'true');
	const icon = document.createElement('i');
	icon.className = 'ri-arrow-left-right-line';
	const text = document.createElement('span');
	hint.append(icon, text);
	node.before(hint);

	function setLabel(value) {
		text.textContent = value ?? '';
		if (node.hasAttribute('tabindex')) node.setAttribute('aria-label', value ?? '');
	}

	function refresh() {
		const overflowing = node.scrollWidth - node.clientWidth > 1;
		hint.hidden = !overflowing;
		if (overflowing) {
			node.setAttribute('tabindex', '0');
			node.setAttribute('role', 'region');
			node.setAttribute('aria-label', text.textContent);
		} else {
			node.removeAttribute('tabindex');
			node.removeAttribute('role');
			node.removeAttribute('aria-label');
		}
	}

	setLabel(label);
	const observer = new ResizeObserver(refresh);
	observer.observe(node);
	const mutations = new MutationObserver(() => {
		for (const child of node.children) observer.observe(child);
		refresh();
	});
	mutations.observe(node, { childList: true });
	for (const child of node.children) observer.observe(child);
	refresh();

	return {
		update(value) {
			setLabel(value);
			refresh();
		},
		destroy() {
			observer.disconnect();
			mutations.disconnect();
			hint.remove();
		}
	};
}
