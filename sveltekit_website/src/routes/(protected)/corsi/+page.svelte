<script>
	import { onMount } from 'svelte';
	import { authClient } from '$lib/client/auth/auth-client.js';
	import { apiListRequest, formatDate } from '$lib/client/api.js';
	import PageHeader from '$lib/components/portal/PageHeader.svelte';
	import { tableScrollHint } from '$lib/client/table-scroll-hint.js';
	import { _ } from 'svelte-i18n';

	const session = authClient.useSession();
	let courses = [];
	let loading = true;
	let errorMessage = '';
	let search = '';
	let statusFilter = 'all';

	$: currentUser = $session?.data?.user;
	$: canCreate = ['professor', 'admin'].includes(currentUser?.role);
	$: filteredCourses = courses.filter((course) => {
		const matchesText = `${course.name} ${course.description}`.toLowerCase().includes(search.toLowerCase());
		const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? course.isActive : !course.isActive);
		return matchesText && matchesStatus;
	});

	onMount(async () => {
		try {
			courses = await apiListRequest('/api/corsi');
		} catch (error) {
			errorMessage = error.message;
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head><title>{$_('nav.courses')} | {$_('site.name')}</title></svelte:head>

<div class="page-content">
	<div class="container-fluid py-4">
		<PageHeader title={$_('nav.courses')} subtitle={$_('courses.subtitle')} parentLabel={$_('common.portal')} parentHref="/" />

		<div class="card mb-4">
			<div class="card-body course-filters">
				<div class="input-group search-box flex-grow-1">
					<label class="visually-hidden" for="course-search">{$_('courses.searchLabel')}</label>
					<span class="input-group-text bg-transparent"><i class="ri-search-line" aria-hidden="true"></i></span>
					<input id="course-search" class="form-control" type="search" bind:value={search} placeholder={$_('courses.search')} />
				</div>
				<label class="visually-hidden" for="course-status-filter">{$_('courses.statusFilterLabel')}</label>
				<select id="course-status-filter" class="form-select status-filter" bind:value={statusFilter}>
					<option value="all">{$_('courses.allStatuses')}</option>
					<option value="active">{$_('status.activePlural')}</option>
					<option value="inactive">{$_('status.inactivePlural')}</option>
				</select>
				{#if canCreate}
					<a class="btn btn-primary" href="/corsi/aggiungi"><i class="ri-add-line me-1"></i>{$_('course.new')}</a>
				{/if}
			</div>
		</div>

		{#if errorMessage}<div class="alert alert-danger">{errorMessage}</div>{/if}
		{#if loading}
			<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="text-muted mt-3">{$_('courses.loading')}</p></div>
		{:else if filteredCourses.length === 0}
			<div class="card"><div class="card-body py-5 px-4">
				{#if courses.length > 0}
					<h2 class="h5">{$_('courses.empty')}</h2>
					<p class="text-muted">{$_('courses.emptyHelp')}</p>
					<button class="btn btn-light" type="button" onclick={() => { search = ''; statusFilter = 'all'; }}>{$_('correction.resetFilters')}</button>
				{:else if canCreate}
					<h2 class="h5">{$_('courses.noneYetStaff')}</h2>
					<p class="text-muted">{$_('courses.noneYetStaffHelp')}</p>
					<a class="btn btn-primary" href="/corsi/aggiungi"><i class="ri-add-line me-1" aria-hidden="true"></i>{$_('course.new')}</a>
				{:else}
					<h2 class="h5">{$_('courses.noneYetStudent')}</h2>
					<p class="text-muted">{$_('courses.noneYetStudentHelp')}</p>
					<a class="btn btn-light" href="/supporto">{$_('support.reportProblem')}</a>
				{/if}
			</div></div>
		{:else}
			<div class="card">
				<div class="table-responsive" use:tableScrollHint={$_('common.scrollTable')}>
					<table class="table table-hover align-middle mb-0">
						<thead><tr><th>{$_('course.name')}</th><th>{$_('course.startDate')}</th><th>{$_('course.endDate')}</th><th>{$_('common.status')}</th><th class="text-end">{$_('common.actions')}</th></tr></thead>
						<tbody>
							{#each filteredCourses as course}
								<tr>
									<td class="course-cell">
										<a class="course-name" href={`/corsi/${course.id}`}>{course.name}</a>
										<span class="course-description">{course.description || $_('common.noDescription')}</span>
									</td>
									<td class="text-nowrap">{formatDate(course.startsAt)}</td>
									<td class="text-nowrap">{formatDate(course.endsAt)}</td>
									<td><span class="badge {course.isActive ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}">{$_(course.isActive ? 'status.active' : 'status.inactive')}</span></td>
									<td class="text-end text-nowrap">
										<a class="btn btn-sm btn-primary" href={`/corsi/${course.id}`}>{$_('course.open')}</a>
										{#if course.canManage}<a class="btn btn-sm btn-light ms-1" href={`/corsi/${course.id}/modifica`} aria-label={`${$_('common.edit')}: ${course.name}`}><i class="ri-edit-line" aria-hidden="true"></i></a>{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.course-filters { display: grid; grid-template-columns: minmax(240px, 1fr) 190px max-content; align-items: center; gap: 1rem; }
	.search-box { min-width: 0; }
	.status-filter { width: 100%; }
	.course-cell { min-width: 260px; max-width: 560px; }
	.course-name { display: block; color: var(--portal-ink); font-weight: 600; }
	.course-name:hover { color: var(--portal-info-text); }
	.course-description { display: -webkit-box; overflow: hidden; color: var(--portal-muted); font-size: .85rem; line-clamp: 1; -webkit-line-clamp: 1; -webkit-box-orient: vertical; }
	@media (max-width: 767.98px) {
		.course-filters { grid-template-columns: 1fr; }
	}
</style>
