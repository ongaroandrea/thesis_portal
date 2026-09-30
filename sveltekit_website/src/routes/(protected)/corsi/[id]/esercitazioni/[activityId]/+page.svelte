<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { apiListRequest, apiRequest, formatDateTime } from '$lib/client/api.js';
	import PageHeader from '$lib/components/portal/PageHeader.svelte';
	import ActivityStatistics from '$lib/components/portal/ActivityStatistics.svelte';
	import ExamActivityView from '$lib/components/portal/ExamActivityView.svelte';
	import { correctionFocusOption } from '$lib/correction-focus.js';
	import { _ } from 'svelte-i18n';

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

	function handleKeydown(event) {
		if (event.key === 'Escape' && showDeleteDialog && !deleting) showDeleteDialog = false;
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

<svelte:window on:keydown={handleKeydown} />

<svelte:head><title>{activity?.title ?? $_('activity.activity')}</title></svelte:head>
<div class="page-content"><div class="container-fluid py-4">
	<PageHeader title={activity?.title ?? $_('activity.activity')} subtitle={$_('activity.detailSubtitle')} parentHref={`/corsi/${courseId}`} parentLabel={course?.name ?? $_('activity.course')} />
	{#if errorMessage}<div class="alert alert-danger">{errorMessage}</div>{/if}
	{#if loading}<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
	{:else if activity}
		<a class="course-context" href={`/corsi/${courseId}`}>
			<span class="course-context-icon"><i class="ri-book-open-line"></i></span>
			<span class="flex-grow-1"><small>{$_('activity.belongsToCourse')}</small><strong>{course?.name ?? $_('activity.course')}</strong></span>
			<span class="course-context-link">{$_('course.open')} <i class="ri-arrow-right-line"></i></span>
		</a>
		{#if activity.kind === 'EXAM'}
			<ExamActivityView {activity} {course} {referenceImages} {courseId} onDelete={() => showDeleteDialog = true} />
		{:else}
		{#if course?.canManage}
			<div class="activity-tabbar" role="tablist" aria-label={$_('activity.pageSections')}>
				<button class:active={activeView === 'details'} type="button" role="tab" aria-selected={activeView === 'details'} on:click={() => activeView = 'details'}><i class="ri-file-list-3-line"></i><span>{$_('activity.overview')}</span></button>
				<button class:active={activeView === 'statistics'} type="button" role="tab" aria-selected={activeView === 'statistics'} on:click={() => activeView = 'statistics'}><i class="ri-bar-chart-box-line"></i><span>{$_('stats.title')}</span><small>{$_('stats.preview')}</small></button>
			</div>
		{/if}
		{#if activeView === 'details'}
		<div class="row g-4">
			<div class="col-xl-8">
				<div class="card border-0 shadow-sm mb-4"><div class="card-body p-4 p-lg-5">
					<div class="d-flex flex-wrap justify-content-between gap-3 mb-4"><div><span class="badge bg-primary-subtle text-primary mb-2">{$_(activity.kind === 'EXAM' ? 'activity.exam' : 'activity.exercise')}</span><h3 class="mb-0">{activity.title}</h3></div><span class="badge align-self-start {activity.status === 'PUBLISHED' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}">{$_(`status.${activity.status.toLowerCase()}`)}</span></div>
					<h6 class="text-uppercase text-muted small">{$_('activity.objective')}</h6><p class="fs-5">{activity.objective}</p>
					<hr class="my-4" /><h6 class="text-uppercase text-muted small">{$_('activity.instructions')}</h6><p class="text-muted preserve-lines">{activity.description || $_('activity.noInstructions')}</p>
					{#if referenceImages.length > 0}
						<hr class="my-4" />
						<div class="d-flex justify-content-between align-items-end gap-3 mb-3"><div><h5 class="mb-1">{$_('activity.referenceImages')}</h5><p class="text-muted mb-0">{$_('activity.assignmentViews')}</p></div><span class="badge bg-light text-dark">{$_('activity.imageCount', { values: { count: referenceImages.length } })}</span></div>
						<div class="reference-gallery">
							{#each referenceImages as image}
								<figure><div><img src={image.storageKey} alt={image.altText || image.originalFilename} /></div><figcaption><strong>{viewLabel(image)}</strong><small>{image.originalFilename}</small></figcaption></figure>
							{/each}
						</div>
					{/if}
				</div></div>
			</div>
			<div class="col-xl-4">
				<div class="activity-actions mb-4">
					<div class="action-heading"><span>{$_('common.actions')}</span><small>{$_('activity.chooseNext')}</small></div>
					<a class="correction-action" href={`/corsi/${courseId}/esercitazioni/${activityId}/correzione`}>
						<span class="action-icon"><i class="ri-camera-lens-line"></i></span>
						<span class="action-copy"><strong>{$_('activity.requestCorrection')}</strong><small>{$_('activity.requestCorrectionHelp')}</small></span>
						<i class="ri-arrow-right-line action-arrow"></i>
					</a>
					{#if course?.canManage}
						<div class="management-actions">
							<span class="management-label">{$_('activity.management')}</span>
							<a class="management-action" href={`/corsi/${courseId}/esercitazioni/${activityId}/modifica`}><span class="management-icon edit"><i class="ri-edit-line"></i></span><span><strong>{$_('activity.edit')}</strong><small>{$_('activity.editSubtitle')}</small></span><i class="ri-arrow-right-s-line ms-auto"></i></a>
							<button class="management-action danger" type="button" on:click={() => showDeleteDialog = true}><span class="management-icon"><i class="ri-delete-bin-line"></i></span><span><strong>{$_('activity.delete')}</strong><small>{$_('activity.deleteHelp')}</small></span><i class="ri-arrow-right-s-line ms-auto"></i></button>
						</div>
					{/if}
				</div>
				<div class="card border-0 shadow-sm mb-4"><div class="card-body p-4"><h5 class="mb-3">{$_('activity.availability')}</h5><div class="timeline-info"><div><span>{$_('common.from')}</span><strong>{formatDateTime(activity.availableFrom)}</strong></div><div><span>{$_('common.until')}</span><strong>{formatDateTime(activity.availableUntil)}</strong></div><div><span>{$_('common.duration')}</span><strong>{activity.durationMinutes ? $_('activity.minutes', { values: { count: activity.durationMinutes } }) : $_('activity.freeDuration')}</strong></div><div><span>{$_('activity.corrections')}</span><strong>{activity.maxCorrectionsPerStudent ?? $_('common.unlimited')}</strong></div></div></div></div>
			</div>
		</div>
		<div class="card border-0 shadow-sm mt-4 correction-sessions">
			<div class="card-header bg-transparent p-4 d-flex flex-wrap justify-content-between align-items-center gap-2">
				<div><h5 class="mb-1">{$_('correction.sessions')}</h5><p class="text-muted mb-0">{$_('correction.sessionsTableHelp')}</p></div>
				<span class="badge bg-primary-subtle text-primary">{$_('correction.filteredSessionCount', { values: { visible: filteredSessions.length, total: sessions.length } })}</span>
			</div>
			{#if sessions.length === 0}
				<div class="text-center py-5 text-muted"><div class="empty-session-icon"><i class="ri-chat-3-line"></i></div><p class="mb-0 mt-3">{$_('correction.noSessions')}</p></div>
			{:else}
				<div class="session-filters">
					<div><label for="session-type-filter">{$_('correction.typeFilter')}</label><select id="session-type-filter" class="form-select" bind:value={sessionTypeFilter}><option value="ALL">{$_('correction.allTypes')}</option>{#each sessionTypeOptions as type}<option value={type}>{focusLabel(type)}</option>{/each}</select></div>
					<div><label for="session-view-filter">{$_('correction.viewFilter')}</label><select id="session-view-filter" class="form-select" bind:value={sessionViewFilter}><option value="ALL">{$_('correction.allViews')}</option>{#each sessionViewOptions as [key, label]}<option value={key}>{label}</option>{/each}</select></div>
					<div><label for="session-student-filter">{$_('correction.studentFilter')}</label><select id="session-student-filter" class="form-select" bind:value={sessionStudentFilter}><option value="ALL">{$_('correction.allStudents')}</option>{#each sessionStudentOptions as [key, label]}<option value={key}>{label}</option>{/each}</select></div>
					<div><label for="session-identity-filter">{$_('correction.identityFilter')}</label><select id="session-identity-filter" class="form-select" bind:value={sessionIdentityFilter}><option value="ALL">{$_('correction.allIdentities')}</option><option value="IDENTIFIED">{$_('correction.identified')}</option><option value="ANONYMOUS">{$_('correction.anonymousPlural')}</option></select></div>
					<button class="btn btn-light filter-reset" type="button" on:click={resetSessionFilters} aria-label={$_('correction.resetFilters')} title={$_('correction.resetFilters')}><i class="ri-refresh-line"></i></button>
				</div>
				{#if filteredSessions.length === 0}
					<div class="session-empty-filter"><i class="ri-filter-off-line"></i><strong>{$_('correction.noFilteredSessions')}</strong><button class="btn btn-sm btn-light" type="button" on:click={resetSessionFilters}>{$_('correction.resetFilters')}</button></div>
				{:else}
					<div class="table-responsive">
						<table class="table session-table align-middle mb-0">
							<thead><tr><th class="ps-4">{$_('correction.session')}</th><th>{$_('correction.student')}</th><th>{$_('correction.analysis')}</th><th>{$_('correction.view')}</th><th>{$_('correction.started')}</th><th>{$_('common.status')}</th><th class="text-end pe-4"><span class="visually-hidden">{$_('common.actions')}</span></th></tr></thead>
							<tbody>{#each filteredSessions as correction}
								<tr>
									<td class="ps-4"><a class="session-link" href={`/corsi/${courseId}/esercitazioni/${activityId}/correzione?session=${correction.id}`}><span class="session-table-icon"><i class="ri-message-3-line"></i></span><strong>#{correction.id}</strong></a></td>
									<td><div class="student-cell"><strong>{correction.studentDisplayName}</strong>{#if correction.isAnonymous}<span class="anonymous-badge"><i class="ri-user-unfollow-line"></i>{$_('correction.anonymous')}</span>{:else}<small>{$_('correction.identified')}</small>{/if}</div></td>
									<td><span class="data-pill"><i class="ri-focus-3-line"></i>{focusLabel(correction.analysisFocus)}</span></td>
									<td><span class="data-pill"><i class="ri-layout-2-line"></i>{sessionViewLabel(correction)}</span></td>
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
			<ActivityStatistics allowedFocuses={activity.allowedCorrectionFocuses ?? []} />
		{/if}
		{/if}
	{/if}
</div></div>

{#if showDeleteDialog}
	<div class="dialog-backdrop" role="presentation">
		<dialog class="delete-dialog" open aria-labelledby="delete-dialog-title">
			<div class="delete-dialog-icon"><i class="ri-delete-bin-6-line"></i></div>
			<h3 id="delete-dialog-title">{$_('activity.confirmDelete')}</h3>
			<p>{$_('activity.confirmDeleteBody', { values: { title: activity?.title } })}</p>
			<div class="delete-warning"><i class="ri-error-warning-line"></i><span>{$_('common.cannotUndo')}</span></div>
			<div class="dialog-actions"><button class="btn btn-light" type="button" on:click={() => showDeleteDialog = false} disabled={deleting}>{$_('common.cancel')}</button><button class="btn btn-danger" type="button" on:click={deleteActivity} disabled={deleting}>{#if deleting}<span class="spinner-border spinner-border-sm me-2"></span>{/if}{$_('common.deletePermanently')}</button></div>
		</dialog>
	</div>
{/if}

<style>
	.preserve-lines { white-space: pre-wrap; }
	.course-context { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding: 1rem 1.15rem; color: var(--bs-body-color); border: 1px solid color-mix(in srgb, #405189 20%, var(--bs-border-color)); border-radius: 16px; background: linear-gradient(100deg, color-mix(in srgb, #405189 7%, var(--bs-body-bg)), var(--bs-body-bg)); box-shadow: 0 8px 22px rgba(31,43,79,.06); }
	.course-context:hover { color: var(--bs-body-color); border-color: color-mix(in srgb, #405189 45%, var(--bs-border-color)); transform: translateY(-1px); }
	.course-context-icon { width: 46px; height: 46px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 14px; color: #fff; background: #405189; font-size: 1.25rem; }
	.course-context > span:nth-child(2) { display: grid; }
	.course-context small { color: var(--bs-secondary-color); }
	.course-context strong { font-size: 1.02rem; }
	.course-context-link { display: inline-flex; align-items: center; gap: .4rem; color: #405189; font-weight: 600; }
	.activity-tabbar { display: flex; gap: .4rem; margin-bottom: 1.5rem; padding: .35rem; border: 1px solid var(--bs-border-color); border-radius: 14px; background: var(--bs-tertiary-bg); }
	.activity-tabbar button { display: flex; align-items: center; gap: .5rem; padding: .65rem .9rem; color: var(--bs-secondary-color); border: 0; border-radius: 10px; background: transparent; font-weight: 600; }
	.activity-tabbar button:hover { color: #405189; }
	.activity-tabbar button.active { color: #405189; background: var(--bs-body-bg); box-shadow: 0 3px 10px rgba(31,43,79,.08); }
	.activity-tabbar small { padding: .12rem .4rem; color: #8b6d1f; border-radius: 99px; background: rgba(247,184,75,.15); font-size: .65rem; text-transform: uppercase; }
	.reference-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 260px)); justify-content: start; gap: 1rem; }
	.reference-gallery figure { overflow: hidden; margin: 0; border: 1px solid var(--bs-border-color); border-radius: 15px; background: var(--bs-body-bg); }
	.reference-gallery figure > div { aspect-ratio: 1; background: #111827; }
	.reference-gallery img { width: 100%; height: 100%; object-fit: contain; }
	.reference-gallery figcaption { display: grid; padding: .85rem 1rem; }
	.reference-gallery figcaption small { overflow: hidden; color: var(--bs-secondary-color); text-overflow: ellipsis; white-space: nowrap; }
	@media (max-width: 575.98px) {
		.reference-gallery { grid-template-columns: minmax(0, 1fr); }
	}
	.activity-actions { overflow: hidden; border: 1px solid var(--bs-border-color); border-radius: 18px; background: var(--bs-body-bg); box-shadow: 0 10px 28px rgba(31,43,79,.09); }
	.action-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; padding: 1.1rem 1.2rem .8rem; }
	.action-heading span { font-size: 1rem; font-weight: 700; }
	.action-heading small { color: var(--bs-secondary-color); }
	.correction-action { display: flex; align-items: center; gap: .85rem; margin: 0 .8rem .8rem; padding: 1rem; color: #fff; border-radius: 14px; background: linear-gradient(135deg,#0ab39c,#078c7b); box-shadow: 0 9px 22px rgba(10,179,156,.2); }
	.correction-action:hover { color: #fff; transform: translateY(-2px); box-shadow: 0 12px 26px rgba(10,179,156,.26); }
	.action-icon { width: 46px; height: 46px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 13px; background: rgba(255,255,255,.17); font-size: 1.35rem; }
	.action-copy { min-width: 0; display: grid; }
	.action-copy strong { font-size: .96rem; }
	.action-copy small { color: rgba(255,255,255,.74); line-height: 1.35; }
	.action-arrow { margin-left: auto; font-size: 1.15rem; }
	.management-actions { padding: .85rem .8rem .8rem; border-top: 1px solid var(--bs-border-color); background: var(--bs-tertiary-bg); }
	.management-label { display: block; padding: 0 .35rem .55rem; color: var(--bs-secondary-color); font-size: .72rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
	.management-action { width: 100%; display: flex; align-items: center; gap: .75rem; padding: .75rem; color: var(--bs-body-color); border: 0; border-radius: 12px; background: transparent; text-align: left; }
	.management-action:hover { color: #405189; background: var(--bs-body-bg); }
	.management-action > span:nth-child(2) { display: grid; }
	.management-action small { color: var(--bs-secondary-color); font-size: .76rem; }
	.management-action.danger { color: #dc3545; }
	.management-action.danger:hover { color: #dc3545; background: rgba(220,53,69,.07); }
	.management-icon { width: 38px; height: 38px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 11px; color: #dc3545; background: rgba(220,53,69,.09); font-size: 1.05rem; }
	.management-icon.edit { color: #405189; background: rgba(64,81,137,.1); }
	.correction-sessions { width: 100%; }
	.session-filters { display: grid; grid-template-columns: repeat(4, minmax(150px, 1fr)) auto; align-items: end; gap: .75rem; padding: 1rem 1.25rem; border-bottom: 1px solid var(--bs-border-color); background: var(--bs-tertiary-bg); }
	.session-filters > div { min-width: 0; }
	.session-filters label { display: block; margin-bottom: .35rem; color: var(--bs-secondary-color); font-size: .7rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
	.session-filters .form-select { min-width: 0; background-color: var(--bs-body-bg); }
	.filter-reset { width: 38px; height: 38px; display: grid; place-items: center; padding: 0; }
	.session-table thead th { padding: .8rem .75rem; color: var(--bs-secondary-color); background: var(--bs-body-bg); border-bottom-width: 1px; font-size: .7rem; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; }
	.session-table tbody td { padding: .9rem .75rem; border-color: var(--bs-border-color); }
	.session-table tbody tr:hover > td { background: var(--bs-tertiary-bg); }
	.session-link { width: max-content; display: flex; align-items: center; gap: .65rem; color: var(--bs-body-color); }
	.session-link:hover { color: #405189; }
	.session-table-icon { width: 36px; height: 36px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 10px; color: #0a8f7d; background: rgba(10,179,156,.11); font-size: 1rem; }
	.student-cell { min-width: 145px; display: grid; justify-items: start; gap: .22rem; }
	.student-cell strong { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .87rem; }
	.student-cell small { color: var(--bs-secondary-color); font-size: .7rem; }
	.anonymous-badge { display: inline-flex; align-items: center; gap: .25rem; padding: .18rem .42rem; color: #8b5e00; border-radius: 99px; background: rgba(247,184,75,.14); font-size: .67rem; font-weight: 700; }
	.data-pill { width: max-content; display: inline-flex; align-items: center; gap: .35rem; padding: .3rem .5rem; color: var(--bs-body-color); border: 1px solid var(--bs-border-color); border-radius: 9px; background: var(--bs-body-bg); font-size: .78rem; white-space: nowrap; }
	.data-pill i { color: #405189; }
	.date-cell { color: var(--bs-secondary-color); font-size: .78rem; white-space: nowrap; }
	.session-status { display: inline-flex; align-items: center; padding: .3rem .52rem; border-radius: 99px; font-size: .7rem; font-weight: 700; white-space: nowrap; }
	.session-status.status-open { color: #405189; background: rgba(64,81,137,.1); }
	.session-status.status-processing { color: #8b5e00; background: rgba(247,184,75,.14); }
	.session-status.status-answered { color: #087b6b; background: rgba(10,179,156,.12); }
	.session-status.status-failed { color: #c44029; background: rgba(240,101,72,.12); }
	.session-open { width: 34px; height: 34px; display: inline-grid; place-items: center; padding: 0; color: #405189; }
	.session-empty-filter { display: grid; justify-items: center; gap: .65rem; padding: 3rem 1rem; color: var(--bs-secondary-color); text-align: center; }
	.session-empty-filter > i { color: #405189; font-size: 1.7rem; }
	.empty-session-icon { width: 58px; height: 58px; display: grid; place-items: center; margin: 0 auto; border-radius: 18px; color: #405189; background: rgba(64,81,137,.1); font-size: 1.5rem; }
	.timeline-info { display: grid; gap: 1rem; }
	.timeline-info > div { display: flex; justify-content: space-between; gap: 1rem; padding-bottom: .75rem; border-bottom: 1px solid var(--bs-border-color); }
	.timeline-info span { color: var(--bs-secondary-color); }
	.timeline-info strong { text-align: right; }
	.dialog-backdrop { position: fixed; z-index: 1080; inset: 0; display: grid; place-items: center; padding: 1.25rem; background: rgba(17,24,39,.58); backdrop-filter: blur(4px); }
	.delete-dialog { position: static; width: min(100%, 480px); margin: 0; padding: 1.6rem; color: var(--bs-body-color); border: 1px solid var(--bs-border-color); border-radius: 20px; background: var(--bs-body-bg); box-shadow: 0 28px 80px rgba(0,0,0,.28); }
	.delete-dialog-icon { width: 56px; height: 56px; display: grid; place-items: center; margin-bottom: 1rem; border-radius: 17px; color: #dc3545; background: rgba(220,53,69,.1); font-size: 1.5rem; }
	.delete-dialog h3 { margin-bottom: .65rem; font-size: 1.35rem; }
	.delete-dialog > p { color: var(--bs-secondary-color); line-height: 1.6; }
	.delete-warning { display: flex; align-items: center; gap: .6rem; padding: .75rem .85rem; color: #9b2430; border: 1px solid rgba(220,53,69,.15); border-radius: 11px; background: rgba(220,53,69,.07); font-size: .88rem; }
	.dialog-actions { display: flex; justify-content: flex-end; gap: .65rem; margin-top: 1.35rem; }
	@media (max-width: 1199.98px) { .session-filters { grid-template-columns: repeat(2, minmax(0, 1fr)) auto; } .filter-reset { grid-column: 3; grid-row: 2; } }
	@media (max-width: 575px) { .course-context-link { display: none; } .session-filters { grid-template-columns: 1fr auto; } .filter-reset { grid-column: 2; grid-row: 4; } }
</style>
