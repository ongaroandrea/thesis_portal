<script>
	import { onMount } from 'svelte';
	import { apiRequest } from '$lib/client/api.js';
	import { _ } from 'svelte-i18n';
	import { tableScrollHint } from '$lib/client/table-scroll-hint.js';

	export let activityId;
	export let allowedFocuses = [];

	const categories = [
		{ id: 'CAMERA', label: 'correction.camera', icon: 'ri-camera-lens-line' },
		{ id: 'MATERIAL', label: 'correction.materials', icon: 'ri-shapes-line' },
		{ id: 'TEXTURE', label: 'correction.texture', icon: 'ri-grid-line' },
		{ id: 'LIGHT', label: 'correction.lighting', icon: 'ri-sun-line' },
		{ id: 'GENERAL', label: 'correction.general', icon: 'ri-focus-3-line' }
	];
	let statistics = null;
	let loading = true;
	let errorMessage = '';

	$: availableCategories = categories.filter((category) => allowedFocuses.length === 0 || allowedFocuses.includes(category.id));
	$: reviewed = statistics?.reviewedResponses ?? 0;
	$: usefulRate = statistics?.studentResponses ? Math.round(statistics.usefulResponses / statistics.studentResponses * 100) : 0;
	$: reviewRate = statistics?.completedAttempts ? Math.round(reviewed / statistics.completedAttempts * 100) : 0;
	$: correctRate = reviewed ? Math.round(statistics.correct / reviewed * 100) : 0;

	onMount(async () => {
		try {
			statistics = await apiRequest(`/api/feedback-correzione/statistiche?activityId=${activityId}`);
		} catch (error) {
			errorMessage = error.message;
		} finally {
			loading = false;
		}
	});

	function focusRow(focus) {
		return statistics?.byFocus?.find((row) => row.focus === focus) ?? { total: 0, reviewed: 0, correct: 0, partial: 0, incorrect: 0 };
	}
</script>

<section class="statistics-shell" aria-labelledby="activity-statistics-title" aria-busy={loading}>
	<div class="statistics-heading">
		<div><h2 class="h3" id="activity-statistics-title">{$_('stats.feedbackTitle')}</h2><p>{$_('stats.feedbackHelp')}</p></div>
	</div>

	{#if errorMessage}<div class="alert alert-danger" role="alert">{errorMessage}</div>
	{:else if loading}<div class="statistics-loading"><span class="spinner-border text-primary" role="status"><span class="visually-hidden">{$_('common.loading')}</span></span></div>
	{:else}
		<div class="summary-grid">
			<article><div><small>{$_('stats.completedCorrections')}</small><strong>{statistics.completedAttempts}</strong><span>{$_('stats.feedbackBase')}</span></div></article>
			<article><div><small>{$_('stats.usefulnessRate')}</small><strong>{usefulRate}%</strong><span>{statistics.studentResponses} {$_('stats.studentResponses').toLowerCase()}</span></div></article>
			<article><div><small>{$_('stats.reviewCoverage')}</small><strong>{reviewRate}%</strong><span>{reviewed}/{statistics.completedAttempts}</span></div></article>
			<article><div><small>{$_('stats.correctnessRate')}</small><strong>{correctRate}%</strong><span>{statistics.correct} {$_('feedback.correct').toLowerCase()}</span></div></article>
		</div>

		<div class="outcome-panel">
			<div class="panel-heading"><div><h3 class="h4">{$_('stats.professorVerdicts')}</h3><p>{$_('stats.professorVerdictsHelp')}</p></div><span class="text-muted small">{reviewed} {$_('stats.reviewed').toLowerCase()}</span></div>
			<div class="outcome-bar" role="img" aria-label={`${$_('stats.professorVerdicts')}: ${$_('feedback.correct')} ${statistics.correct}, ${$_('feedback.partial')} ${statistics.partial}, ${$_('feedback.incorrect')} ${statistics.incorrect}`}><span class="correct" style={`width:${reviewed ? statistics.correct / reviewed * 100 : 0}%`}></span><span class="partial" style={`width:${reviewed ? statistics.partial / reviewed * 100 : 0}%`}></span><span class="incorrect" style={`width:${reviewed ? statistics.incorrect / reviewed * 100 : 0}%`}></span></div>
			<div class="legend"><span><i class="correct"></i>{$_('feedback.correct')} <strong>{statistics.correct}</strong></span><span><i class="partial"></i>{$_('feedback.partial')} <strong>{statistics.partial}</strong></span><span><i class="incorrect"></i>{$_('feedback.incorrect')} <strong>{statistics.incorrect}</strong></span></div>
		</div>

		<div class="focus-panel">
			<div class="panel-heading"><div><h3 class="h4">{$_('stats.byAnalysis')}</h3><p>{$_('stats.byAnalysisHelp')}</p></div></div>
			<div class="table-responsive" use:tableScrollHint={$_('common.scrollTable')}><table class="table align-middle mb-0"><thead><tr><th>{$_('correction.analysis')}</th><th class="text-end">{$_('stats.completedCorrections')}</th><th class="text-end">{$_('stats.reviewed')}</th><th class="text-end">{$_('feedback.correct')}</th><th class="text-end">{$_('feedback.partial')}</th><th class="text-end">{$_('feedback.incorrect')}</th></tr></thead><tbody>
				{#each availableCategories as category}{@const row = focusRow(category.id)}<tr><td><span class="focus-name">{$_(category.label)}</span></td><td class="text-end">{row.total}</td><td class="text-end">{row.reviewed}</td><td class="text-end"><span class="count correct">{row.correct}</span></td><td class="text-end"><span class="count partial">{row.partial}</span></td><td class="text-end"><span class="count incorrect">{row.incorrect}</span></td></tr>{/each}
			</tbody></table></div>
		</div>
	{/if}
</section>

<style>
	.statistics-shell { display: grid; gap: 1.4rem; }
	.statistics-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; }
	.statistics-heading h2 { margin: 0 0 .35rem; }
	.statistics-heading p, .panel-heading p { margin: 0; color: var(--portal-muted); }
	.statistics-loading { display: grid; min-height: 220px; place-items: center; }
	.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; }
	.summary-grid article { padding: 1rem; border: 1px solid var(--portal-border); border-radius: var(--portal-radius); background: var(--portal-surface); }
	.summary-grid article > div { min-width: 0; display: grid; }
	.summary-grid small, .summary-grid span { color: var(--portal-muted); }
	.summary-grid span { font-size: .75rem; }
	.summary-grid strong { font-size: 1.5rem; line-height: 1.2; font-variant-numeric: tabular-nums; }
	.outcome-panel, .focus-panel { overflow: hidden; border: 1px solid var(--portal-border); border-radius: var(--portal-radius); background: var(--portal-surface); }
	.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.15rem 1.25rem; border-bottom: 1px solid var(--portal-border); }
	.panel-heading h3 { margin: 0 0 .15rem; font-size: 1.03rem; }
	.outcome-bar { height: 14px; display: flex; overflow: hidden; margin: 1.25rem 1.25rem .8rem; border-radius: var(--portal-radius-sm); background: var(--portal-surface-muted); }
	.outcome-bar span { display: block; height: 100%; }
	.outcome-bar .correct, .legend i.correct { background: var(--portal-positive); }
	.outcome-bar .partial, .legend i.partial { background: var(--portal-warning); }
	.outcome-bar .incorrect, .legend i.incorrect { background: var(--portal-danger); }
	.legend { display: flex; flex-wrap: wrap; gap: 1rem; padding: 0 1.25rem 1.2rem; color: var(--portal-muted); font-size: .82rem; }
	.legend span { display: flex; align-items: center; gap: .4rem; }
	.legend i { width: 9px; height: 9px; border-radius: 3px; }
	.legend strong { color: var(--portal-ink); font-variant-numeric: tabular-nums; }
	thead th { padding: .8rem 1rem; color: var(--portal-muted); background: var(--portal-surface-muted); font-size: .75rem; white-space: nowrap; }
	tbody td { padding: .85rem 1rem; border-color: var(--portal-border); font-variant-numeric: tabular-nums; }
	.focus-name { display: inline-flex; align-items: center; gap: .55rem; font-weight: 600; }
	.count { min-width: 30px; display: inline-grid; place-items: center; padding: .15rem .4rem; border-radius: var(--portal-radius-sm); font-weight: 700; }
	.count.correct { color: var(--portal-positive-text); background: rgba(var(--portal-positive-rgb),.1); }
	.count.partial { color: var(--portal-warning-text); background: rgba(var(--portal-warning-rgb),.14); }
	.count.incorrect { color: var(--portal-danger-text); background: rgba(var(--portal-danger-rgb),.1); }
	@media (max-width: 1199.98px) { .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
	/* Phones keep a 2×2 grid so all four figures fit above the fold. */
	@media (max-width: 575.98px) { .statistics-heading { display: grid; } .summary-grid { gap: .75rem; } .summary-grid article { padding: .85rem; } .summary-grid strong { font-size: 1.3rem; } }
</style>
