<script>
	import { _ } from 'svelte-i18n';
	import LanguageSwitcher from '$lib/components/common/LanguageSwitcher.svelte';

	const steps = ['home.step1', 'home.step2', 'home.step3'];
	const checks = [
		['correction.camera', 'home.check.camera'],
		['correction.lighting', 'home.check.light'],
		['correction.materials', 'home.check.material'],
		['correction.texture', 'home.check.texture']
	];
</script>

<svelte:head>
	<title>{$_('site.name')}</title>
	<meta name="description" content={$_('home.metaDescription')} />
</svelte:head>

<div class="home-page" data-bs-theme="light">
	<header class="site-header">
		<div class="container site-header-inner">
			<a class="brand" href="/" aria-label={`${$_('site.name')}, home`}>
				<img src="/images/polito_logo_desktop.svg" alt="Politecnico di Torino" />
			</a>
			<div class="header-actions">
				<LanguageSwitcher />
				<a class="login-link" href="/login">{$_('login')}</a>
			</div>
		</div>
	</header>

	<main class="container home-main" id="main-content" tabindex="-1">
		<section class="home-intro" aria-labelledby="home-title">
			<h1 id="home-title">{$_('home.title')}</h1>
			<p class="intro">{$_('home.intro')}</p>
			<a class="primary-action" href="/login">{$_('home.action')}</a>
			<p class="access-note">{$_('home.accessNote')}</p>
		</section>

		<div class="home-details">
			<section aria-labelledby="home-steps-title">
				<h2 id="home-steps-title">{$_('home.stepsTitle')}</h2>
				<ol class="steps">
					{#each steps as step}<li>{$_(step)}</li>{/each}
				</ol>
				<p class="professor-note">{$_('home.professorNote')}</p>
			</section>

			<section aria-labelledby="home-checks-title">
				<h2 id="home-checks-title">{$_('home.checksTitle')}</h2>
				<dl class="checks">
					{#each checks as [label, description]}
						<div><dt>{$_(label)}</dt><dd>{$_(description)}</dd></div>
					{/each}
				</dl>
			</section>
		</div>
	</main>

	<footer class="home-footer">
		<div class="container">{new Date().getFullYear()} © Federico Manuri - Andrea Sanna, Politecnico di Torino</div>
	</footer>
</div>

<style lang="scss">
	.home-page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		color: var(--portal-polito-ink);
		background: var(--portal-public-surface);
	}

	.site-header { border-bottom: 1px solid rgba(var(--portal-polito-ink-rgb), 0.12); }
	.site-header-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding-block: 1.1rem;
	}

	.brand img { display: block; width: 150px; height: auto; }
	.header-actions { display: flex; align-items: center; gap: 1rem; }

	.login-link {
		padding: 0.35rem 0;
		color: var(--portal-polito-ink);
		font-weight: 600;
		text-decoration: none;
		border-bottom: 2px solid var(--portal-polito-blue);
	}

	.home-main { flex: 1; padding-block: clamp(2.5rem, 7vh, 4.5rem) 4rem; }

	.home-intro { max-width: 46rem; }

	h1 {
		margin: 0;
		color: var(--portal-polito-ink);
		font-size: clamp(2rem, 3.6vw, 2.75rem);
		font-weight: 600;
		line-height: 1.15;
		letter-spacing: -0.015em;
		text-wrap: balance;
	}

	.intro {
		max-width: 65ch;
		margin: 1.25rem 0 1.75rem;
		color: var(--portal-public-copy);
		font-size: 1.125rem;
		line-height: 1.65;
	}

	.primary-action {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0.7rem 1.25rem;
		border-radius: var(--portal-radius-sm);
		background: var(--portal-polito-blue);
		color: var(--portal-public-surface);
		font-weight: 600;
		text-decoration: none;
		transition: background-color 160ms ease-out;
	}

	.primary-action:hover { background: var(--portal-polito-ink); color: var(--portal-public-surface); }

	.access-note { max-width: 60ch; margin: 0.9rem 0 0; color: var(--portal-public-muted); font-size: 0.9rem; }

	.home-details {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 2.5rem 4rem;
		margin-top: clamp(3rem, 7vh, 4.5rem);
		padding-top: 2rem;
		border-top: 1px solid rgba(var(--portal-polito-ink-rgb), 0.12);
	}

	h2 { margin: 0 0 1rem; color: var(--portal-polito-ink); font-size: 1.15rem; font-weight: 600; }

	.steps {
		display: grid;
		gap: 0.75rem;
		margin: 0;
		padding-left: 1.25rem;
		color: var(--portal-public-copy);
		line-height: 1.6;
	}

	.steps li::marker { color: var(--portal-polito-blue); font-weight: 600; }

	.professor-note { max-width: 60ch; margin: 1.25rem 0 0; color: var(--portal-public-muted); line-height: 1.6; }

	.checks { display: grid; gap: 0; margin: 0; }
	.checks > div {
		display: grid;
		grid-template-columns: 8rem minmax(0, 1fr);
		gap: 1rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid rgba(var(--portal-polito-ink-rgb), 0.1);
	}
	.checks > div:first-child { padding-top: 0; }
	.checks dt { color: var(--portal-polito-ink); font-weight: 600; }
	.checks dd { margin: 0; color: var(--portal-public-copy); line-height: 1.55; }

	.home-footer {
		padding-block: 1.25rem;
		border-top: 1px solid rgba(var(--portal-polito-ink-rgb), 0.12);
		color: var(--portal-public-muted);
		font-size: 0.85rem;
	}

	@media (max-width: 991.98px) {
		.home-details { grid-template-columns: 1fr; }
	}

	@media (max-width: 575.98px) {
		.brand img { width: 125px; }
		.checks > div { grid-template-columns: 1fr; gap: 0.15rem; }
	}
</style>
