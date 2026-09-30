<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { apiListRequest, apiRequest } from '$lib/client/api.js';
	import PageHeader from '$lib/components/portal/PageHeader.svelte';
	import { _ } from 'svelte-i18n';

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

<svelte:head><title>{$_('stats.courseStats')}</title></svelte:head>
<div class="page-content"><div class="container-fluid py-4">
	<PageHeader title={$_('stats.title')} subtitle={course?.name ?? $_('stats.courseProgress')} parentHref={`/corsi/${courseId}`} parentLabel={$_('activity.course')} />
	{#if errorMessage}<div class="alert alert-danger">{errorMessage}</div>{/if}
	{#if loading}<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
	{:else}
		<div class="row g-4 mb-4">
			<div class="col-md-4"><div class="card metric-card border-0 shadow-sm"><div class="card-body p-4 d-flex align-items-center gap-3"><div class="metric-icon primary"><i class="ri-list-check-2"></i></div><div><div class="display-6 fw-semibold">{rows.length}</div><span class="text-muted">{$_('activity.activities')}</span></div></div></div></div>
			<div class="col-md-4"><div class="card metric-card border-0 shadow-sm"><div class="card-body p-4 d-flex align-items-center gap-3"><div class="metric-icon success"><i class="ri-message-3-line"></i></div><div><div class="display-6 fw-semibold">{totalSessions}</div><span class="text-muted">{$_('stats.sessions')}</span></div></div></div></div>
			<div class="col-md-4"><div class="card metric-card border-0 shadow-sm"><div class="card-body p-4 d-flex align-items-center gap-3"><div class="metric-icon warning"><i class="ri-check-double-line"></i></div><div><div class="display-6 fw-semibold">{completion}%</div><span class="text-muted">{$_('stats.completedSessions')}</span></div></div></div></div>
		</div>
		<div class="card border-0 shadow-sm"><div class="card-header bg-transparent p-4"><h5 class="mb-1">{$_('stats.participation')}</h5><p class="text-muted mb-0">{$_('stats.participationHelp')}</p></div><div class="card-body p-0">
			{#if rows.length === 0}<div class="text-center text-muted py-5">{$_('common.noData')}</div>{:else}<div class="table-responsive"><table class="table align-middle mb-0"><thead class="table-light"><tr><th class="ps-4">{$_('activity.activity')}</th><th>{$_('stats.sessionCount')}</th><th>{$_('stats.answers')}</th><th>{$_('stats.processing')}</th><th class="pe-4">{$_('stats.completion')}</th></tr></thead><tbody>{#each rows as row}{@const completed = row.sessions.filter((session) => session.status === 'ANSWERED').length}{@const pending = row.sessions.filter((session) => ['OPEN', 'PROCESSING'].includes(session.status)).length}{@const rate = row.sessions.length ? Math.round(completed / row.sessions.length * 100) : 0}<tr><td class="ps-4"><a class="fw-semibold" href={`/corsi/${courseId}/esercitazioni/${row.activity.id}`}>{row.activity.title}</a><small class="d-block text-muted">{$_(`status.${row.activity.status.toLowerCase()}`)}</small></td><td>{row.sessions.length}</td><td>{completed}</td><td>{pending}</td><td class="pe-4"><div class="d-flex align-items-center gap-2"><div class="progress flex-grow-1" style="height: 7px"><div class="progress-bar bg-success" style={`width:${rate}%`}></div></div><small>{rate}%</small></div></td></tr>{/each}</tbody></table></div>{/if}
		</div></div>
	{/if}
</div></div>

<style>
	.metric-card { height: 100%; }
	.metric-icon { width: 60px; height: 60px; display: grid; place-items: center; border-radius: 16px; font-size: 1.65rem; }
	.metric-icon.primary { color: #405189; background: rgba(64,81,137,.12); }
	.metric-icon.success { color: #0ab39c; background: rgba(10,179,156,.12); }
	.metric-icon.warning { color: #f7b84b; background: rgba(247,184,75,.15); }
</style>
