<script>
	// Shared shell for sign-in, password and error pages: institutional header,
	// one left-aligned column of content, credit footer. No decorative bands.
	import LanguageSwitcher from '$lib/components/common/LanguageSwitcher.svelte';
	import { _ } from 'svelte-i18n';
</script>

<div class="auth-page-wrapper" data-bs-theme="light">
	<header class="auth-header">
		<div class="container auth-header-inner">
			<a class="auth-brand" href="/" aria-label={`${$_('site.name')}, home`}>
				<img src="/images/polito_logo_desktop.svg" alt="Politecnico di Torino" />
			</a>
			<LanguageSwitcher />
		</div>
	</header>

	<main class="container auth-main" id="main-content" tabindex="-1">
		<div class="auth-column">
			<slot />
		</div>
	</main>

	<footer class="auth-footer">
		<div class="container">{new Date().getFullYear()} © Federico Manuri - Andrea Sanna, Politecnico di Torino</div>
	</footer>
</div>

<style>
	.auth-page-wrapper { min-height: 100vh; display: flex; flex-direction: column; color: var(--portal-polito-ink); background: var(--portal-public-surface); }
	.auth-header { border-bottom: 1px solid rgba(var(--portal-polito-ink-rgb), 0.12); }
	.auth-header-inner { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-block: 1.1rem; }
	.auth-brand img { display: block; width: 150px; height: auto; }
	.auth-main { flex: 1; padding-block: clamp(2rem, 7vh, 4rem) 3rem; }
	.auth-column { max-width: 26rem; }
	.auth-footer { padding-block: 1.25rem; border-top: 1px solid rgba(var(--portal-polito-ink-rgb), 0.12); color: var(--portal-public-muted); font-size: 0.85rem; }

	/* Public pages always render on the light institutional surface. */
	.auth-page-wrapper :global(h1) { margin: 0 0 .5rem; color: var(--portal-polito-ink); font-size: 1.6rem; font-weight: 600; line-height: 1.25; }
	.auth-page-wrapper :global(.auth-lead) { margin: 0 0 1.5rem; color: var(--portal-public-copy); line-height: 1.6; }
	.auth-page-wrapper :global(.form-label) { color: var(--portal-polito-ink); }
	.auth-page-wrapper :global(.btn-primary) { border-color: var(--portal-polito-blue); background: var(--portal-polito-blue); }
	.auth-page-wrapper :global(.btn-primary:hover) { border-color: var(--portal-polito-ink); background: var(--portal-polito-ink); }
	.auth-page-wrapper :global(a:not(.btn)) { color: var(--portal-polito-blue); }
	.auth-page-wrapper :global(.auth-secondary) { margin: 1.5rem 0 0; padding-top: 1.25rem; border-top: 1px solid rgba(var(--portal-polito-ink-rgb), 0.12); color: var(--portal-public-copy); font-size: .92rem; }

	@media (max-width: 575.98px) {
		.auth-brand img { width: 125px; }
	}
</style>
