<script>
	import { _ } from 'svelte-i18n';
	import LanguageSwitcher from '$lib/components/common/LanguageSwitcher.svelte';
</script>

<svelte:head>
	<title>{$_('home.eyebrow')}</title>
	<meta
		name="description"
		content={$_('home.metaDescription')}
	/>
</svelte:head>

<main class="home-page">
	<header class="site-header container">
		<a class="brand" href="/" aria-label={`${$_('home.eyebrow')} — Home`}>
			<img src="/images/polito_logo_desktop.svg" alt="Politecnico di Torino" />
		</a>
		<div class="header-actions">
			<LanguageSwitcher />
			<a class="login-link" href="/login">{$_('login')}</a>
		</div>
	</header>

	<section class="hero container">
		<div class="hero-copy">
			<p class="eyebrow">{$_('home.eyebrow')}</p>
			<h1>{$_('home.title')}<br /><span>{$_('home.titleAccent')}</span></h1>
			<p class="intro">{$_('home.intro')}</p>
			<div class="actions">
				<a class="primary-action" href="/login">
					{$_('home.action')} <i class="ri-arrow-right-line" aria-hidden="true"></i>
				</a>
			</div>
		</div>

		<div class="project-card">
			<p class="card-kicker">{$_('home.goal')}</p>
			<h2>{$_('home.cardTitle')}</h2>
			<p>{$_('home.cardBody')}</p>
			<div class="alpha-note">
				<i class="ri-flask-line" aria-hidden="true"></i>
				<div><strong>{$_('home.alpha')}</strong><span>{$_('home.alphaNote')}</span></div>
			</div>
		</div>
	</section>
</main>

<style lang="scss">
	.home-page {
		min-height: 100vh;
		color: #00284b;
		background:
			radial-gradient(circle at 85% 15%, rgba(0, 123, 161, 0.1), transparent 28rem),
			linear-gradient(90deg, rgba(0, 123, 161, 0.035) 1px, transparent 1px),
			#ffffff;
		background-size: auto, 84px 84px, auto;
	}

	.site-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 1.4rem;
		padding-bottom: 1.4rem;
		border-bottom: 1px solid rgba(0, 40, 75, 0.12);
	}

	.brand img { display: block; width: 150px; height: auto; }
	.header-actions { display: flex; align-items: center; gap: 1rem; }

	.login-link {
		color: #00284b;
		font-family: 'Poppins', sans-serif;
		font-weight: 600;
		text-decoration: none;
		border-bottom: 2px solid #007ba1;
		padding: 0.35rem 0;
	}

	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
		gap: clamp(3rem, 8vw, 8rem);
		align-items: center;
		padding-top: clamp(4rem, 10vh, 8rem);
		padding-bottom: 5rem;
	}

	.status {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.42rem 0.75rem;
		border: 1px solid rgba(0, 123, 161, 0.25);
		border-radius: 999px;
		background: rgba(0, 123, 161, 0.07);
		color: #007ba1;
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.status span {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #007ba1;
		box-shadow: 0 0 0 4px rgba(0, 123, 161, 0.12);
	}

	.eyebrow {
		margin: 1.8rem 0 0.75rem;
		color: #007ba1;
		font-family: 'Poppins', sans-serif;
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	h1 {
		max-width: 820px;
		margin: 0;
		color: #00284b;
		font-size: clamp(2.75rem, 6vw, 5.75rem);
		font-weight: 700;
		line-height: 1.03;
		letter-spacing: -0.045em;
	}

	h1 span { color: #007ba1; }

	.intro {
		max-width: 690px;
		margin: 1.8rem 0 0;
		color: #40566a;
		font-size: clamp(1.05rem, 1.5vw, 1.22rem);
		line-height: 1.75;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 1.2rem;
		margin-top: 2.2rem;
		color: #617181;
		font-size: 0.84rem;
	}

	.primary-action {
		display: inline-flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.95rem 1.35rem;
		border-radius: 6px;
		background: #007ba1;
		box-shadow: 0 10px 24px rgba(0, 123, 161, 0.2);
		color: #ffffff;
		font-family: 'Poppins', sans-serif;
		font-weight: 600;
		text-decoration: none;
		transition: background 160ms ease, transform 160ms ease;
	}

	.primary-action:hover { background: #00284b; color: #ffffff; transform: translateY(-2px); }

	.project-card {
		position: relative;
		padding: clamp(1.7rem, 4vw, 2.5rem);
		border: 1px solid rgba(0, 40, 75, 0.12);
		border-top: 5px solid #007ba1;
		border-radius: 8px;
		background: #ffffff;
		box-shadow: 0 28px 70px rgba(0, 40, 75, 0.1);
	}

	.card-number {
		position: absolute;
		top: 1.8rem;
		right: 2rem;
		color: rgba(0, 40, 75, 0.1);
		font-family: 'Poppins', sans-serif;
		font-size: 2.7rem;
		font-weight: 700;
	}

	.card-kicker {
		margin: 0 0 1rem;
		color: #007ba1;
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.11em;
		text-transform: uppercase;
	}

	.project-card h2 {
		max-width: 390px;
		margin: 0 0 1.2rem;
		color: #00284b;
		font-size: clamp(1.45rem, 2.5vw, 2rem);
		line-height: 1.25;
	}

	.project-card > p:not(.card-kicker) { color: #5d6f7f; line-height: 1.7; }

	.alpha-note {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		margin-top: 1.7rem;
		padding-top: 1.35rem;
		border-top: 1px solid rgba(0, 40, 75, 0.1);
	}

	.alpha-note i { color: #007ba1; font-size: 1.6rem; }
	.alpha-note div { display: grid; gap: 0.12rem; }
	.alpha-note strong { color: #00284b; font-size: 0.9rem; }
	.alpha-note span { color: #6d7d8b; font-size: 0.78rem; }

	@media (max-width: 991.98px) {
		.hero { grid-template-columns: 1fr; gap: 3rem; }
		.project-card { max-width: 680px; }
	}

	@media (max-width: 575.98px) {
		.site-header, .hero { padding-left: 1.25rem; padding-right: 1.25rem; }
		.brand img { width: 125px; }
		.hero { padding-top: 3rem; }
		.actions { align-items: flex-start; flex-direction: column; }
		h1 { font-size: 2.65rem; }
	}
</style>
