<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { apiListRequest, apiRequest, formatDateTime, formatWindowDuration } from '$lib/client/api.js';
	import { modalDialog } from '$lib/client/modal-dialog.js';
	import PageHeader from '$lib/components/portal/PageHeader.svelte';
	import ActivityStatistics from '$lib/components/portal/ActivityStatistics.svelte';
	import ExamActivityView from '$lib/components/portal/ExamActivityView.svelte';
	import { correctionFocusOption } from '$lib/correction-focus.js';
	import { _ } from 'svelte-i18n';
	import { zoomable } from '$lib/client/lightbox.js';
	import { tableScrollHint } from '$lib/client/table-scroll-hint.js';

	let course; let activity; let referenceImages = []; let sessions = []; let loading = true; let errorMessage = '';
	let showDeleteDialog = false;
	let deleting = false;
	let activeView = 'details';
	let sessionTypeFilter = 'ALL';
	let sessionViewFilter = 'ALL';
	let sessionStudentFilter = 'ALL';
	let sessionIdentityFilter = 'ALL';
	$: courseId = $page.params.id;
	$: activityId = $page.params.activityId;
	$: sessionTypeOptions = [...new Set(sessions.map((session) => session.analysisFocus).filter(Boolean))];
	$: sessionViewOptions = [...new Map(sessions.map((session) => [sessionViewKey(session), sessionViewLabel(session)])).entries()];
	$: sessionStudentOptions = [...new Map(sessions.map((session) => [sessionStudentKey(session), session.studentDisplayName])).entries()];
	$: filteredSessions = sessions.filter((session) =>
		(sessionTypeFilter === 'ALL' || session.analysisFocus === sessionTypeFilter)
		&& (sessionViewFilter === 'ALL' || sessionViewKey(session) === sessionViewFilter)
		&& (sessionStudentFilter === 'ALL' || sessionStudentKey(session) === sessionStudentFilter)
		&& (sessionIdentityFilter === 'ALL'
			|| (sessionIdentityFilter === 'ANONYMOUS' && session.isAnonymous)
			|| (sessionIdentityFilter === 'IDENTIFIED' && !session.isAnonymous))
	);

	async function load() {
		try {
			[course, activity, referenceImages] = await Promise.all([
				apiRequest(`/api/corsi/${courseId}`),
				apiRequest(`/api/esercitazioni/${activityId}`),
				apiRequest(`/api/esercitazioni/${activityId}/immagini`)
			]);
			sessions = activity.kind === 'EXAM'
				? []
				: await apiListRequest(`/api/sessioni-correzione?activityId=${activityId}`);
		} catch (error) { errorMessage = error.message; }
		finally { loading = false; }
	}
	onMount(load);

	async function deleteActivity() {
		deleting = true;
		errorMessage = '';
		try {
			await apiRequest(`/api/esercitazioni/${activityId}`, { method: 'DELETE' });
			goto(`/corsi/${courseId}`);
		} catch (error) {
			errorMessage = error.message;
			showDeleteDialog = false;
		} finally {
			deleting = false;
		}
	}

	function closeDeleteDialog() {
		if (!deleting) showDeleteDialog = false;
	}

	function viewLabel(image) {
		if (image.viewType === 'OTHER') return image.customViewLabel;
		const key = { FRONT: 'view.front', SIDE: 'view.side', TOP: 'view.top', ANGLED: 'view.angled' }[image.viewType];
		return key ? $_(key) : image.viewType;
	}

	function sessionViewLabel(session) {
		return viewLabel({ viewType: session.referenceViewType, customViewLabel: session.referenceCustomViewLabel }) || $_('view.unavailable');
	}

	function sessionViewKey(session) {
		return `${session.referenceViewType ?? 'NONE'}:${session.referenceCustomViewLabel ?? ''}`;
	}

	function sessionStudentKey(session) {
		return session.isAnonymous
			? `anonymous:${session.studentDisplayName}`
			: `student:${session.studentUserId ?? session.studentDisplayName}`;
	}

	function resetSessionFilters() {
		sessionTypeFilter = 'ALL';
		sessionViewFilter = 'ALL';
		sessionStudentFilter = 'ALL';
		sessionIdentityFilter = 'ALL';
	}

	function sessionStatusLabel(status) {
		const key = { OPEN: 'status.open', PROCESSING: 'status.processing', ANSWERED: 'status.answered', FAILED: 'status.failed' }[status];
		return key ? $_(key) : status;
	}

	function focusLabel(focusId) {
		const option = correctionFocusOption(focusId);
		return option ? $_(option.labelKey) : (focusId || $_('correction.general'));
	}
</script>

<svelte:head><title>{activity?.title ?? $_('activity.activity')} | {$_('site.name')}</title></svelte:head>
<div class="page-content"><div class="container-fluid py-4">
	<PageHeader title={activity?.title ?? $_('activity.activity')} subtitle={$_('activity.detailSubtitle')} parentHref={`/corsi/${courseId}`} parentLabel={course?.name ?? $_('activity.course')} />
	{#if errorMessage}<div class="alert alert-danger">{errorMessage}</div>{/if}
	{#if loading}<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
	{:else if activity}
		{#if activity.kind === 'EXAM'}
			<ExamActivityView {activity} {course} {referenceImages} {courseId} onDelete={() => showDeleteDialog = true} />
		{:else}
		{#if course?.canManage}
			<ul class="nav nav-tabs mb-4" role="tablist" aria-label={$_('activity.pageSections')}>
				<li class="nav-item" role="presentation"><button class="nav-link" class:active={activeView === 'details'} type="button" role="tab" aria-selected={activeView === 'details'} on:click={() => activeView = 'details'}>{$_('activity.overview')}</button></li>
				<li class="nav-item" role="presentation"><button class="nav-link" class:active={activeView === 'statistics'} type="button" role="tab" aria-selected={activeView === 'statistics'} on:click={() => activeView = 'statistics'}>{$_('stats.title')}</button></li>
			</ul>
		{/if}
		{#if activeView === 'details'}
		<div class="row g-4">
			<div class="col-xl-8">
				<div class="card mb-4"><div class="card-body p-4">
					<div class="d-flex flex-wrap gap-2 mb-3"><span class="badge bg-primary-subtle text-primary">{$_(activity.kind === 'EXAM' ? 'activity.exam' : 'activity.exercise')}</span><span class="badge {activity.status === 'PUBLISHED' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}">{$_(`status.${activity.status.toLowerCase()}`)}</span></div>
					<h2 class="h5 mb-2">{$_('activity.objective')}</h2><p class="lead-copy">{activity.objective}</p>
					<hr class="my-4" /><h2 class="h5 mb-2">{$_('activity.instructions')}</h2><p class="preserve-lines mb-0">{activity.description || $_('activity.noInstructions')}</p>
					{#if referenceImages.length > 0}
						<hr class="my-4" />
						<div class="d-flex justify-content-between align-items-end gap-3 mb-3"><div><h2 class="h5 mb-1">{$_('activity.referenceImages')}</h2><p class="text-muted mb-0">{$_('activity.assignmentViews')}</p></div><span class="text-muted small">{$_('activity.imageCount', { values: { count: referenceImages.length } })}</span></div>
						<div class="reference-gallery">
							{#each referenceImages as image}
								<figure><div><img src={image.storageKey} alt={image.altText || image.originalFilename} loading="lazy" decoding="async" use:zoomable={{ group: 'activity-references', caption: `${viewLabel(image)} · ${image.originalFilename}`, label: $_('lightbox.enlarge') }} /></div><figcaption><strong>{viewLabel(image)}</strong><small>{image.originalFilename}</small></figcaption></figure>
							{/each}
						</div>
					{/if}
				</div></div>
			</div>
			<div class="col-xl-4">
				<div class="card mb-4"><div class="card-body p-4">
					<h2 class="h5 mb-1">{$_('activity.requestCorrection')}</h2>
					<p class="text-muted">{$_('activity.requestCorrectionHelp')}</p>
					<a class="btn btn-primary w-100" href={`/corsi/${courseId}/esercitazioni/${activityId}/correzione`}><i class="ri-camera-lens-line me-1" aria-hidden="true"></i>{$_('correction.start')}</a>
					{#if course?.canManage}
						<hr class="my-4" />
						<h2 class="h6 mb-2">{$_('activity.management')}</h2>
						<div class="d-grid gap-2">
							<a class="btn btn-light text-start" href={`/corsi/${courseId}/esercitazioni/${activityId}/modifica`}><i class="ri-edit-line me-2" aria-hidden="true"></i>{$_('activity.edit')}</a>
							<button class="btn btn-outline-danger text-start" type="button" on:click={() => showDeleteDialog = true}><i class="ri-delete-bin-line me-2" aria-hidden="true"></i>{$_('activity.delete')}</button>
						</div>
					{/if}
				</div></div>
				<div class="card mb-4"><div class="card-body p-4"><h2 class="h5 mb-3">{$_('activity.availability')}</h2><div class="timeline-info"><div><span>{$_('common.from')}</span><strong>{formatDateTime(activity.availableFrom)}</strong></div><div><span>{$_('common.until')}</span><strong>{formatDateTime(activity.availableUntil)}</strong></div><div><span>{$_('common.duration')}</span><strong>{#if activity.kind === 'EXAM'}{formatWindowDuration(activity.availableFrom, activity.availableUntil) ?? $_('exam.untilDeadline')}{:else}{activity.durationMinutes ? $_('activity.minutes', { values: { count: activity.durationMinutes } }) : $_('activity.freeDuration')}{/if}</strong></div><div><span>{$_('activity.corrections')}</span><strong>{activity.maxCorrectionsPerStudent ?? $_('common.unlimited')}</strong></div></div></div></div>
			</div>
		</div>
		<div class="card mt-4 correction-sessions">
			<div class="card-header bg-transparent p-4 d-flex flex-wrap justify-content-between align-items-center gap-2">
				<div><h2 class="h5 mb-1">{$_('correction.sessions')}</h2><p class="text-muted mb-0">{$_('correction.sessionsTableHelp')}</p></div>
				<span class="text-muted small">{$_('correction.filteredSessionCount', { values: { visible: filteredSessions.length, total: sessions.length } })}</span>
			</div>
			{#if sessions.length === 0}
				<div class="p-4 text-muted"><p class="mb-0">{$_(course?.canManage ? 'correction.noSessionsStaff' : 'correction.noSessionsStudent')}</p></div>
			{:else}
				<div class="session-filters">
					<div><label for="session-type-filter">{$_('correction.typeFilter')}</label><select id="session-type-filter" class="form-select" bind:value={sessionTypeFilter}><option value="ALL">{$_('correction.allTypes')}</option>{#each sessionTypeOptions as type}<option value={type}>{focusLabel(type)}</option>{/each}</select></div>
					<div><label for="session-view-filter">{$_('correction.viewFilter')}</label><select id="session-view-filter" class="form-select" bind:value={sessionViewFilter}><option value="ALL">{$_('correction.allViews')}</option>{#each sessionViewOptions as [key, label]}<option value={key}>{label}</option>{/each}</select></div>
					<div><label for="session-student-filter">{$_('correction.studentFilter')}</label><select id="session-student-filter" class="form-select" bind:value={sessionStudentFilter}><option value="ALL">{$_('correction.allStudents')}</option>{#each sessionStudentOptions as [key, label]}<option value={key}>{label}</option>{/each}</select></div>
					<div><label for="session-identity-filter">{$_('correction.identityFilter')}</label><select id="session-identity-filter" class="form-select" bind:value={sessionIdentityFilter}><option value="ALL">{$_('correction.allIdentities')}</option><option value="IDENTIFIED">{$_('correction.identified')}</option><option value="ANONYMOUS">{$_('correction.anonymousPlural')}</option></select></div>
					<button class="btn btn-light filter-reset" type="button" on:click={resetSessionFilters} aria-label={$_('correction.resetFilters')} title={$_('correction.resetFilters')}><i class="ri-refresh-line"></i></button>
				</div>
				{#if filteredSessions.length === 0}
					<div class="session-empty-filter"><strong>{$_('correction.noFilteredSessions')}</strong><button class="btn btn-sm btn-light" type="button" on:click={resetSessionFilters}>{$_('correction.resetFilters')}</button></div>
				{:else}
					<div class="table-responsive" use:tableScrollHint={$_('common.scrollTable')}>
						<table class="table session-table align-middle mb-0">
							<thead><tr><th class="ps-4">{$_('correction.session')}</th><th>{$_('correction.student')}</th><th>{$_('correction.analysis')}</th><th>{$_('correction.view')}</th><th>{$_('correction.started')}</th><th>{$_('common.status')}</th><th class="text-end pe-4"><span class="visually-hidden">{$_('common.actions')}</span></th></tr></thead>
							<tbody>{#each filteredSessions as correction}
								<tr>
									<td class="ps-4"><a class="session-link" href={`/corsi/${courseId}/esercitazioni/${activityId}/correzione?session=${correction.id}`}><strong>#{correction.id}</strong></a></td>
									<td><div class="student-cell"><strong>{correction.studentDisplayName}</strong>{#if correction.isAnonymous}<span class="anonymous-badge">{$_('correction.anonymous')}</span>{:else}<small>{$_('correction.identified')}</small>{/if}</div></td>
									<td><span class="data-pill">{focusLabel(correction.analysisFocus)}</span></td>
									<td><span class="data-pill">{sessionViewLabel(correction)}</span></td>
									<td><span class="date-cell">{formatDateTime(correction.openedAt)}</span></td>
									<td><span class="session-status status-{correction.status?.toLowerCase()}">{sessionStatusLabel(correction.status)}</span></td>
									<td class="text-end pe-4"><a class="btn btn-sm btn-light session-open" href={`/corsi/${courseId}/esercitazioni/${activityId}/correzione?session=${correction.id}`} aria-label={$_('correction.openSession', { values: { id: correction.id } })}><i class="ri-arrow-right-line"></i></a></td>
								</tr>
							{/each}</tbody>
						</table>
					</div>
				{/if}
			{/if}
		</div>
		{:else if course?.canManage}
			<ActivityStatistics {activityId} allowedFocuses={activity.allowedCorrectionFocuses ?? []} />
		{/if}
		{/if}
	{/if}
</div></div>

{#if showDeleteDialog}
	<dialog class="delete-dialog" use:modalDialog={{ onCancel: closeDeleteDialog }} aria-modal="true" aria-labelledby="delete-dialog-title">
			<h2 class="h3" id="delete-dialog-title">{$_('activity.confirmDelete')}</h2>
			<p>{$_('activity.confirmDeleteBody', { values: { title: activity?.title } })}</p>
			<div class="delete-warning"><span>{$_('common.cannotUndo')}</span></div>
			<div class="dialog-actions"><button class="btn btn-light" data-dialog-initial type="button" on:click={closeDeleteDialog} disabled={deleting}>{$_('common.cancel')}</button><button class="btn btn-danger" type="button" on:click={deleteActivity} disabled={deleting}>{#if deleting}<span class="spinner-border spinner-border-sm me-2"></span>{/if}{$_('common.deletePermanently')}</button></div>
	</dialog>
{/if}

<style>
	.preserve-lines { white-space: pre-wrap; line-height: 1.65; max-width: 75ch; }
	.lead-copy { max-width: 70ch; margin: 0; font-size: 1.05rem; line-height: 1.6; }
	.reference-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 260px)); justify-content: start; gap: 1rem; }
	.reference-gallery figure { overflow: hidden; margin: 0; border: 1px solid var(--portal-border); border-radius: var(--portal-radius); background: var(--portal-surface); }
	.reference-gallery figure > div { aspect-ratio: 1; background: #111827; }
	.reference-gallery img { width: 100%; height: 100%; object-fit: contain; }
	.reference-gallery figcaption { display: grid; padding: .75rem .9rem; }
	.reference-gallery figcaption small { overflow: hidden; color: var(--portal-muted); text-overflow: ellipsis; white-space: nowrap; }
	@media (max-width: 575.98px) {
		.reference-gallery { grid-template-columns: minmax(0, 1fr); }
	}
	.correction-sessions { width: 100%; }
	.session-filters { display: grid; grid-template-columns: repeat(4, minmax(150px, 1fr)) auto; align-items: end; gap: .75rem; padding: 1rem 1.25rem; border-bottom: 1px solid var(--portal-border); background: var(--portal-surface-muted); }
	.session-filters > div { min-width: 0; }
	.session-filters label { display: block; margin-bottom: .35rem; color: var(--portal-muted); font-size: .8rem; font-weight: 600; }
	.session-filters .form-select { min-width: 0; min-height: 44px; background-color: var(--portal-surface); }
	.filter-reset { width: 44px; height: 44px; display: grid; place-items: center; padding: 0; }
	.session-table tbody td { border-color: var(--portal-border); }
	.session-link { width: max-content; display: flex; align-items: center; gap: .65rem; color: var(--portal-ink); font-variant-numeric: tabular-nums; }
	.session-link:hover { color: var(--portal-info-text); }
	.student-cell { min-width: 145px; display: grid; justify-items: start; gap: .22rem; }
	.student-cell strong { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .87rem; }
	.student-cell small { color: var(--portal-muted); font-size: .75rem; }
	.anonymous-badge { display: inline-flex; align-items: center; padding: .15rem .4rem; color: var(--portal-warning-text); border-radius: var(--portal-radius-sm); background: rgba(var(--portal-warning-rgb),.14); font-size: .75rem; font-weight: 600; }
	.data-pill { white-space: nowrap; font-size: .85rem; }
	.date-cell { color: var(--portal-muted); font-size: .8rem; white-space: nowrap; }
	.session-status { display: inline-flex; align-items: center; padding: .25rem .5rem; border-radius: var(--portal-radius-sm); font-size: .75rem; font-weight: 600; white-space: nowrap; }
	.session-status.status-open { color: var(--portal-info-text); background: rgba(var(--portal-polito-blue-rgb),.1); }
	.session-status.status-processing { color: var(--portal-warning-text); background: rgba(var(--portal-warning-rgb),.14); }
	.session-status.status-answered { color: var(--portal-positive-text); background: rgba(var(--portal-positive-rgb),.12); }
	.session-status.status-failed { color: var(--portal-danger-text); background: rgba(var(--portal-danger-rgb),.12); }
	.session-open { width: 44px; height: 44px; display: inline-grid; place-items: center; padding: 0; color: var(--portal-info-text); }
	.session-empty-filter { display: grid; justify-items: start; gap: .65rem; padding: 2rem 1.25rem; color: var(--portal-muted); }
	.session-empty-filter .btn { min-height: 44px; }
	.timeline-info { display: grid; gap: 1rem; }
	.timeline-info > div { display: flex; justify-content: space-between; gap: 1rem; padding-bottom: .75rem; border-bottom: 1px solid var(--portal-border); }
	.timeline-info span { color: var(--portal-muted); }
	.timeline-info strong { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
	.delete-dialog { position: fixed; inset: 0; width: min(calc(100% - 2.5rem), 480px); max-height: min(90vh, 680px); margin: auto; padding: 1.5rem; color: var(--portal-ink); border: 1px solid var(--portal-border); border-radius: var(--portal-radius); background: var(--portal-surface); box-shadow: var(--portal-shadow-md); }
	.delete-dialog::backdrop { background: rgba(17,24,39,.58); }
	.delete-dialog h2 { margin-bottom: .65rem; font-size: 1.25rem; }
	.delete-dialog > p { color: var(--portal-muted); line-height: 1.6; }
	.delete-warning { padding: .75rem .85rem; color: var(--portal-danger-text); border: 1px solid rgba(var(--portal-danger-rgb),.2); border-radius: var(--portal-radius-sm); background: rgba(var(--portal-danger-rgb),.07); font-size: .88rem; }
	.dialog-actions { display: flex; justify-content: flex-end; gap: .65rem; margin-top: 1.35rem; }
	.dialog-actions .btn { min-height: 44px; }
	@media (max-width: 1199.98px) { .session-filters { grid-template-columns: repeat(2, minmax(0, 1fr)) auto; } .filter-reset { grid-column: 3; grid-row: 2; } }
	@media (max-width: 575px) { .session-filters { grid-template-columns: 1fr auto; } .filter-reset { grid-column: 2; grid-row: 4; } }
</style>
