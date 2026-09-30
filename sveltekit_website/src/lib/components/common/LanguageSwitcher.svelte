<script>
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';

	function select(language) {
		locale.set(language);
		localStorage.setItem('language', language);
		document.documentElement.lang = language;
	}

	onMount(() => select(localStorage.getItem('language') || 'it'));
</script>

<div class="language-switcher" role="group" aria-label={$_('language')}>
	{#each ['it', 'en'] as language}
		<button class:active={$locale === language} aria-pressed={$locale === language} onclick={() => select(language)}>
			{language.toUpperCase()}
		</button>
	{/each}
</div>

<style>
	.language-switcher { display: flex; gap: .15rem; padding: .2rem; border: 1px solid rgba(0, 40, 75, .15); border-radius: 6px; background: #fff; }
	button { padding: .3rem .5rem; border: 0; border-radius: 4px; background: transparent; color: #40566a; font: 600 .72rem/1 'Poppins', sans-serif; }
	button.active { background: #007ba1; color: #fff; }
</style>
