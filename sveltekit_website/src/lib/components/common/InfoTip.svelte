<script>
	import { _ } from 'svelte-i18n';

	// Small "i" next to a form label. The explanation opens on hover, on
	// keyboard focus and on tap, and closes with Escape or a click elsewhere.
	// The text is always in the DOM and linked with aria-describedby, so
	// screen readers read it with the button even while it is hidden.
	let { text, label = '' } = $props();

	const id = `infotip-${Math.random().toString(36).slice(2, 9)}`;
	let pinned = $state(false);
	let hovered = $state(false);
	let focused = $state(false);
	let root;

	const open = $derived(pinned || hovered || focused);

	function onKeydown(event) {
		if (event.key === 'Escape' && open) {
			event.stopPropagation();
			pinned = hovered = focused = false;
		}
	}

	function onDocumentClick(event) {
		if (pinned && root && !root.contains(event.target)) pinned = false;
	}
</script>

<svelte:document onclick={onDocumentClick} />

<span
	class="infotip"
	bind:this={root}
	onmouseenter={() => (hovered = true)}
	onmouseleave={() => (hovered = false)}
	role="presentation"
>
	<button
		type="button"
		class="infotip-trigger"
		aria-label={label || $_('common.moreInfo')}
		aria-describedby={id}
		aria-expanded={open}
		onclick={(event) => { event.preventDefault(); pinned = !pinned; }}
		onfocus={() => (focused = true)}
		onblur={() => (focused = false)}
		onkeydown={onKeydown}
	>
		<i class="ri-information-line" aria-hidden="true"></i>
	</button>
	<span {id} role="tooltip" class="infotip-bubble" class:open>{text}</span>
</span>

<style>
	.infotip { position: relative; display: inline-flex; vertical-align: middle; margin-left: .25rem; }

	/* 24px visual, 44px hit area through the pseudo-element. */
	.infotip-trigger {
		position: relative; width: 1.5rem; height: 1.5rem; display: inline-grid; place-items: center;
		padding: 0; border: 0; border-radius: 50%; background: transparent;
		color: var(--portal-muted); font-size: 1rem; line-height: 1; cursor: help;
		transition: color 140ms ease-out, background-color 140ms ease-out;
	}
	.infotip-trigger::before { content: ''; position: absolute; inset: -10px; }
	.infotip-trigger:hover, .infotip-trigger[aria-expanded='true'] {
		color: var(--portal-polito-blue); background: rgba(var(--portal-polito-blue-rgb), 0.1);
	}
	.infotip-trigger:focus-visible { outline: 2px solid var(--portal-polito-blue); outline-offset: 2px; }

	.infotip-bubble {
		position: absolute; z-index: 1080; left: -.5rem; bottom: calc(100% + .5rem);
		width: max-content; max-width: min(18rem, 80vw);
		padding: .6rem .75rem; border: 1px solid var(--portal-border); border-radius: var(--portal-radius-sm);
		background: var(--portal-surface); color: var(--bs-body-color); box-shadow: var(--portal-shadow-md);
		font-size: .8125rem; font-weight: 400; line-height: 1.45; text-align: left; white-space: normal;
		opacity: 0; visibility: hidden; transform: translateY(4px); pointer-events: none;
		transition: opacity 140ms ease-out, transform 140ms ease-out, visibility 0s linear 140ms;
	}
	.infotip-bubble.open {
		opacity: 1; visibility: visible; transform: none; pointer-events: auto;
		transition: opacity 140ms ease-out, transform 140ms ease-out, visibility 0s;
	}
	@media (prefers-reduced-motion: reduce) {
		.infotip-bubble { transform: none; }
	}
</style>
