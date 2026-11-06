<script>
	// Self-hosted fonts: no render-blocking request to Google Fonts.
	import '@fontsource/ibm-plex-sans/latin-400.css';
	import '@fontsource/ibm-plex-sans/latin-ext-400.css';
	import '@fontsource/ibm-plex-sans/latin-500.css';
	import '@fontsource/ibm-plex-sans/latin-ext-500.css';
	import '@fontsource/ibm-plex-sans/latin-600.css';
	import '@fontsource/ibm-plex-sans/latin-ext-600.css';
	import '@fontsource/ibm-plex-sans/latin-700.css';
	import '@fontsource/ibm-plex-sans/latin-ext-700.css';
	import '$lib/assets/scss/global.scss';
	import '$lib/i18n';
	import { untrack } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import ImageLightbox from '$lib/components/common/ImageLightbox.svelte';

	let { children, data } = $props();

	// Apply the language before anything renders. On the server this runs
	// synchronously inside this request's render, so concurrent requests in
	// other languages can't interleave; in the browser it runs before
	// hydration, so the page doesn't flash Italian first. Only the initial value
	// matters: later changes come from the language switcher itself.
	locale.set(untrack(() => data.language));
</script>

<a class="skip-link" href="#main-content">{$_('common.skipToContent')}</a>
{@render children()}
<ImageLightbox />
