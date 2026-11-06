<script>
	import { _ } from 'svelte-i18n';
	import { lightbox, closeLightbox } from '$lib/client/lightbox.js';
	import { modalDialog } from '$lib/client/modal-dialog.js';

	// Fit to screen by default; clicking the image switches to its actual
	// pixel size (scrollable) to inspect render details, and back. There is
	// no separate toolbar toggle: the zoom-in/zoom-out cursor signals it.
	let actualSize = $state(false);

	const state = $derived($lightbox);
	const item = $derived(state ? state.items[state.index] : null);
	const total = $derived(state?.items.length ?? 0);

	function go(step) {
		if (!state || total < 2) return;
		actualSize = false;
		lightbox.set({ ...state, index: (state.index + step + total) % total });
	}

	function close() {
		actualSize = false;
		closeLightbox();
	}

	function onKeydown(event) {
		if (event.key === 'ArrowRight') { event.preventDefault(); go(1); }
		else if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1); }
	}

	// A click on the backdrop (the dialog itself, outside the content) closes it.
	function onDialogClick(event) {
		if (event.target === event.currentTarget) close();
	}
</script>

{#if state && item}
	<dialog
		class="image-lightbox"
		aria-label={item.caption || item.alt || $_('lightbox.title')}
		use:modalDialog={{ onCancel: close, initialFocus: '[data-lightbox-close]' }}
		onclick={onDialogClick}
		onkeydown={onKeydown}
	>
		<header>
			<div class="caption">
				<strong>{item.caption || item.alt}</strong>
				{#if total > 1}<span>{$_('lightbox.counter', { values: { current: state.index + 1, total } })}</span>{/if}
			</div>
			<div class="tools">
				<button type="button" class="tool icon" data-lightbox-close onclick={close} aria-label={$_('common.close')}>
					<i class="ri-close-line" aria-hidden="true"></i>
				</button>
			</div>
		</header>

		<div class="stage" class:actual={actualSize} onclick={onDialogClick} role="presentation">
			<button type="button" class="image-toggle" onclick={() => (actualSize = !actualSize)} aria-label={actualSize ? $_('lightbox.fit') : $_('lightbox.actualSize')}>
				<img src={item.src} alt={item.alt} />
			</button>
		</div>

		{#if total > 1}
			<button type="button" class="nav prev" onclick={() => go(-1)} aria-label={$_('lightbox.previous')}><i class="ri-arrow-left-s-line" aria-hidden="true"></i></button>
			<button type="button" class="nav next" onclick={() => go(1)} aria-label={$_('lightbox.next')}><i class="ri-arrow-right-s-line" aria-hidden="true"></i></button>
		{/if}
	</dialog>
{/if}

<style>
	.image-lightbox {
		position: fixed; inset: 0; width: 100vw; height: 100dvh; max-width: none; max-height: none;
		display: grid; grid-template-rows: auto minmax(0, 1fr);
		margin: 0; padding: 0; border: 0; color: #f1f5fb; background: transparent;
	}
	.image-lightbox::backdrop { background: rgba(8, 14, 24, 0.9); }

	header {
		display: flex; align-items: center; justify-content: space-between; gap: 1rem;
		padding: .75rem max(1rem, env(safe-area-inset-right)) .75rem max(1rem, env(safe-area-inset-left));
		background: rgba(8, 14, 24, 0.6);
	}
	.caption { min-width: 0; display: grid; gap: .1rem; }
	.caption strong { overflow: hidden; font-size: .95rem; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
	.caption span { color: #a9b5c7; font-size: .8rem; font-variant-numeric: tabular-nums; }
	.tools { display: flex; flex-shrink: 0; gap: .5rem; }

	.tool, .nav {
		min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: .4rem;
		padding: 0 .85rem; color: #f1f5fb; border: 1px solid rgba(241, 245, 251, 0.18); border-radius: var(--portal-radius-sm);
		background: rgba(241, 245, 251, 0.06); font: 600 .85rem/1 var(--vz-font-sans-serif);
		transition: background-color 160ms ease-out, border-color 160ms ease-out;
	}
	.tool.icon { padding: 0; font-size: 1.25rem; }
	.tool:hover, .nav:hover { border-color: rgba(241, 245, 251, 0.4); background: rgba(241, 245, 251, 0.14); }
	.tool:focus-visible, .nav:focus-visible, .image-toggle:focus-visible { outline: 2px solid #3fa9cf; outline-offset: 2px; }

	.stage { min-height: 0; display: grid; place-items: center; overflow: hidden; padding: 1rem 4.5rem 1.5rem; }
	.image-toggle { width: 100%; height: 100%; display: grid; place-items: center; padding: 0; border: 0; background: none; cursor: zoom-in; }
	/* Fit mode fills the stage, so small renders are enlarged too, not just big ones shrunk. */
	.stage img { width: 100%; height: 100%; max-height: calc(100dvh - 8rem); object-fit: contain; }

	/* Actual size: the image keeps its pixel dimensions and the stage scrolls. */
	.stage.actual { place-items: start center; overflow: auto; }
	.stage.actual .image-toggle { width: auto; height: auto; cursor: zoom-out; }
	.stage.actual img { width: auto; height: auto; max-height: none; }

	.nav { position: absolute; top: 50%; padding: 0; font-size: 1.6rem; transform: translateY(-50%); }
	.nav.prev { left: max(.75rem, env(safe-area-inset-left)); }
	.nav.next { right: max(.75rem, env(safe-area-inset-right)); }

	@media (max-width: 575.98px) {
		.stage { padding: .5rem .5rem 4.5rem; }
		.nav { top: auto; bottom: max(.75rem, env(safe-area-inset-bottom)); transform: none; }
		.nav.prev { left: calc(50% - 52px); }
		.nav.next { right: calc(50% - 52px); }
	}
	@media (prefers-reduced-motion: no-preference) {
		.image-lightbox[open] .stage img { animation: lightbox-in 180ms cubic-bezier(.16, 1, .3, 1); }
		/* Scale only: the image is visible from the first frame even if the animation never runs. */
		@keyframes lightbox-in { from { transform: scale(.97); } }
	}
</style>
