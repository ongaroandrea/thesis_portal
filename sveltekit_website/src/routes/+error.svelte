<script>
	import { page } from '$app/state';
	import ParticlesAuth from '$lib/components/layouts/ParticlesAuth.svelte';
	import { _ } from 'svelte-i18n';

	const messages = {
		400: ['error.badRequest', 'error.badRequestBody'],
		401: ['error.unauthorized', 'error.unauthorizedBody'],
		403: ['error.forbidden', 'error.forbiddenBody'],
		404: ['error.notFound', 'error.notFoundBody'],
		500: ['error.server', 'error.serverBody']
	};

	let content = $derived(messages[page.status] ?? ['error.generic', 'error.genericBody']);
	// /supporto needs a session, so signed-out visitors are sent to the login page instead.
	let canReport = $derived(page.status !== 401);
</script>

<svelte:head>
	<title>{$_(content[0])} ({page.status}) | {$_('site.name')}</title>
</svelte:head>

<ParticlesAuth>
	<p class="error-code">{$_('error.code', { values: { status: page.status } })}</p>
	<h1>{$_(content[0])}</h1>
	<p class="auth-lead">{$_(content[1])}</p>
	<div class="d-flex flex-wrap gap-2">
		{#if page.status === 401}
			<a href="/login" class="btn btn-primary">{$_('login')}</a>
		{:else}
			<a href="/corsi" class="btn btn-primary">{$_('error.toCourses')}</a>
		{/if}
		<a href="/" class="btn btn-light">{$_('common.backHome')}</a>
	</div>
	{#if canReport}
		<p class="auth-secondary">
			{$_('error.reportHelp')}
			<a href={`/supporto?category=WEBSITE&from=${encodeURIComponent(page.url.pathname)}`}>{$_('support.reportProblem')}</a>
		</p>
	{/if}
</ParticlesAuth>

<style>
	.error-code { margin: 0 0 .5rem; color: var(--portal-public-muted); font-size: .9rem; font-variant-numeric: tabular-nums; }
</style>
