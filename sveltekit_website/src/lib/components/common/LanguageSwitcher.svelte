<script>
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import { LANGUAGE_COOKIE, languageFromCookie } from '$lib/language.js';

	/**
	 * Switch the UI language and remember it. The cookie lets the server
	 * render the next page directly in this language; localStorage is kept
	 * for browsers that chose a language before the cookie existed.
	 */
	function select(language) {
		locale.set(language);
		localStorage.setItem('language', language);
		document.cookie = `${LANGUAGE_COOKIE}=${language}; path=/; max-age=31536000; samesite=lax`;
		document.documentElement.lang = language;
	}

	onMount(() => select(languageFromCookie(localStorage.getItem('language') || $locale)));
</script>

<div class="language-switcher" role="group" aria-label={$_('language')}>
	{#each ['it', 'en'] as language}
		<button class:active={$locale === language} aria-pressed={$locale === language} onclick={() => select(language)}>
			{language.toUpperCase()}
		</button>
	{/each}
</div>

<style>
	.language-switcher { display: flex; gap: .2rem; padding: .2rem; border: 1px solid rgba(var(--portal-polito-ink-rgb), .15); border-radius: var(--portal-radius-sm); background: var(--portal-public-surface); }
	/* 32px targets clear WCAG 2.5.8 (24px); 40px on touch screens without crowding the 70px header. */
	button {
		display: inline-flex; align-items: center; justify-content: center; min-width: 32px; min-height: 32px; padding: 0 .55rem;
		border: 0; border-radius: 6px; background: transparent; color: var(--portal-public-copy); font: 600 .75rem/1 var(--vz-font-sans-serif);
		transition: background-color .15s ease-out, color .15s ease-out;
	}
	button:hover:not(.active) { background: rgba(var(--portal-polito-blue-rgb), .1); color: var(--portal-polito-ink); }
	button:focus-visible { outline: 2px solid var(--portal-focus); outline-offset: 1px; }
	button.active { background: var(--portal-polito-blue); color: #fff; }
	@media (pointer: coarse) { button { min-width: 40px; min-height: 40px; } }
</style>
