const FOCUSABLE = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled]):not([type="hidden"])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])'
].join(',');

/** Promote a conditional dialog to the top layer and contain keyboard focus. */
export function modalDialog(node, options = {}) {
	const previouslyFocused = document.activeElement;
	const previousOverflow = document.body.style.overflow;
	document.body.style.overflow = 'hidden';

	if (typeof node.showModal === 'function') node.showModal();
	else node.setAttribute('open', '');

	function closeFromKeyboard(event) {
		event.preventDefault();
		event.stopPropagation();
		options.onCancel?.();
	}

	function keepFocusInside(event) {
		if (event.key === 'Escape') {
			closeFromKeyboard(event);
			return;
		}
		if (event.key !== 'Tab') return;
		const focusable = [...node.querySelectorAll(FOCUSABLE)].filter((element) => element.getClientRects().length > 0);
		if (focusable.length === 0) {
			event.preventDefault();
			node.focus();
			return;
		}
		const first = focusable[0];
		const last = focusable.at(-1);
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	node.addEventListener('cancel', closeFromKeyboard);
	node.addEventListener('keydown', keepFocusInside);
	queueMicrotask(() => {
		const initial = node.querySelector(options.initialFocus || '[data-dialog-initial]') || node.querySelector(FOCUSABLE) || node;
		initial.focus({ preventScroll: true });
	});

	return {
		destroy() {
			node.removeEventListener('cancel', closeFromKeyboard);
			node.removeEventListener('keydown', keepFocusInside);
			if (node.open && typeof node.close === 'function') node.close();
			document.body.style.overflow = previousOverflow;
			if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
				previouslyFocused.focus({ preventScroll: true });
			}
		}
	};
}
