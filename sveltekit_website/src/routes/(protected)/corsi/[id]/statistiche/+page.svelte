<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { apiListRequest, apiRequest } from '$lib/client/api.js';
	import PageHeader from '$lib/components/portal/PageHeader.svelte';
	import { _ } from 'svelte-i18n';
	import { tableScrollHint } from '$lib/client/table-scroll-hint.js';

	let course; let rows = []; let loading = true; let errorMessage = '';
	$: courseId = $page.params.id;
	$: totalSessions = rows.reduce((sum, row) => sum + row.sessions.length, 0);
	$: completedSessions = rows.reduce((sum, row) => sum + row.sessions.filter((session) => session.status === 'ANSWERED').length, 0);
	$: completion = totalSessions ? Math.round((completedSessions / totalSessions) * 100) : 0;

	onMount(async () => {
		try {
			course = await apiRequest(`/api/corsi/${courseId}`);
			const activities = await apiListRequest(`/api/esercitazioni?courseId=${courseId}`);
			rows = await Promise.all(activities.map(async (activity) => ({
				activity,
				sessions: await apiListRequest(`/api/sessioni-correzione?activityId=${activity.id}`)
			})));
		} catch (error) { errorMessage = error.message; }
		finally { loading = false; }
	});
</script>

<svelte:head><title>{$_('stats.courseStats')} | {$_('site.name')}</title></svelte:head>
<div class="page-content"><div class="container-fluid py-4">
	<PageHeader title={$_('stats.title')} subtitle={course?.name ?? $_('stats.courseProgress')} parentHref={`/corsi/${courseId}`} parentLabel={$_('activity.course')} />
	{#if errorMessage}<div class="alert alert-danger">{errorMessage}</div>{/if}
	{#if loading}<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
	{:else}
		<dl class="stats-summary">
			<div><dt>{$_('activity.activities')}</dt><dd>{rows.length}</dd></div>
			<div><dt>{$_('stats.sessions')}</dt><dd>{totalSessions}</dd></div>
			<div><dt>{$_('stats.completedSessions')}</dt><dd>{completion}%</dd></div>
		</dl>
		<div class="card"><div class="card-header bg-transparent p-4"><h2 class="h5 mb-1">{$_('stats.participation')}</h2><p class="text-muted mb-0">{$_('stats.participationHelp')}</p></div><div class="card-body p-0">
			{#if rows.length === 0}<p class="text-muted p-4 mb-0">{$_('stats.noActivitiesYet')}</p>{:else}<div class="table-responsive" use:tableScrollHint={$_('common.scrollTable')}><table class="table align-middle mb-0"><thead class="table-light"><tr><th class="ps-4">{$_('activity.activity')}</th><th>{$_('stats.sessionCount')}</th><th>{$_('stats.answers')}</th><th>{$_('stats.processing')}</th><th class="pe-4">{$_('stats.completion')}</th></tr></thead><tbody>{#each rows as row}{@const completed = row.sessions.filter((session) => session.status === 'ANSWERED').length}{@const pending = row.sessions.filter((session) => ['OPEN', 'PROCESSING'].includes(session.status)).length}{@const rate = row.sessions.length ? Math.round(completed / row.sessions.length * 100) : 0}<tr><td class="ps-4"><a class="fw-semibold" href={`/corsi/${courseId}/esercitazioni/${row.activity.id}`}>{row.activity.title}</a><small class="d-block text-muted">{$_(`status.${row.activity.status.toLowerCase()}`)}</small></td><td>{row.sessions.length}</td><td>{completed}</td><td>{pending}</td><td class="pe-4"><div class="d-flex align-items-center gap-2"><div class="progress flex-grow-1" style="height: 7px"><div class="progress-bar bg-success" style={`width:${rate}%`}></div></div><small>{rate}%</small></div></td></tr>{/each}</tbody></table></div>{/if}
		</div></div>
	{/if}
</div></div>

<style>
	.stats-summary { display: flex; flex-wrap: wrap; gap: .75rem 2.5rem; margin: 0 0 1.5rem; }
	.stats-summary > div { display: grid; gap: .1rem; }
	.stats-summary dt { color: var(--portal-muted); font-size: .85rem; font-weight: 500; }
	.stats-summary dd { margin: 0; color: var(--portal-ink); font-size: 1.5rem; font-weight: 600; font-variant-numeric: tabular-nums; }
</style>
