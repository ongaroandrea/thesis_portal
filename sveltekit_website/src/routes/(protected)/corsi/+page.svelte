<script>
	import { onMount } from 'svelte';
	import { authClient } from '$lib/client/auth/auth-client.js';
	import { apiListRequest, formatDate } from '$lib/client/api.js';
	import PageHeader from '$lib/components/portal/PageHeader.svelte';
	import { _ } from 'svelte-i18n';

	const session = authClient.useSession();
	let courses = [];
	let loading = true;
	let errorMessage = '';
	let search = '';
	let statusFilter = 'all';

	$: currentUser = $session?.data?.user;
	$: canCreate = ['professor', 'developer'].includes(currentUser?.role);
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

<svelte:head><title>{$_('nav.courses')}</title></svelte:head>

<div class="page-content">
	<div class="container-fluid py-4">
		<PageHeader title={$_('nav.courses')} subtitle={$_('courses.subtitle')} parentLabel={$_('common.portal')} parentHref="/" />

		<div class="card border-0 shadow-sm mb-4">
			<div class="card-body course-filters">
				<div class="input-group search-box flex-grow-1">
					<span class="input-group-text bg-transparent"><i class="ri-search-line"></i></span>
					<input class="form-control" type="search" bind:value={search} placeholder={$_('courses.search')} />
				</div>
				<select class="form-select status-filter" bind:value={statusFilter}>
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
			<div class="card border-0 shadow-sm"><div class="card-body text-center py-5">
				<div class="empty-icon mx-auto mb-3"><i class="ri-book-open-line"></i></div>
				<h5>{$_('courses.empty')}</h5><p class="text-muted mb-0">{$_('courses.emptyHelp')}</p>
			</div></div>
		{:else}
			<div class="row g-4">
				{#each filteredCourses as course}
					<div class="col-xl-4 col-md-6">
						<div class="card course-card border-0 shadow-sm h-100">
							<div class="course-accent" class:inactive={!course.isActive}></div>
							<div class="card-body p-4">
								<div class="d-flex justify-content-between gap-3 mb-3">
									<span class="badge rounded-pill {course.isActive ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}">{$_(course.isActive ? 'status.active' : 'status.inactive')}</span>
								</div>
								<h5 class="mb-2">{course.name}</h5>
								<p class="text-muted course-description">{course.description || $_('common.noDescription')}</p>
								<div class="small text-muted d-grid gap-2 mb-4">
									<span><i class="ri-calendar-event-line me-2 text-primary"></i>{formatDate(course.startsAt)}</span>
									<span><i class="ri-calendar-check-line me-2 text-primary"></i>{formatDate(course.endsAt)}</span>
								</div>
								<div class="d-flex gap-2">
									<a class="btn btn-primary flex-grow-1" href={`/corsi/${course.id}`}>{$_('course.open')}</a>
									{#if course.canManage}<a class="btn btn-light" href={`/corsi/${course.id}/modifica`} aria-label={$_('common.edit')}><i class="ri-edit-line"></i></a>{/if}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.course-filters { display: grid; grid-template-columns: minmax(240px, 1fr) 190px max-content; align-items: center; gap: 1rem; }
	.search-box { min-width: 0; }
	.status-filter { width: 100%; }
	.course-card { overflow: hidden; transition: transform .2s ease, box-shadow .2s ease; }
	.course-card:hover { transform: translateY(-3px); box-shadow: 0 .7rem 1.5rem rgba(30, 64, 175, .12) !important; }
	.course-accent { height: 5px; background: linear-gradient(90deg, #405189, #0ab39c); }
	.course-accent.inactive { background: #adb5bd; }
	.course-icon, .empty-icon { width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center; background: rgba(64, 81, 137, .1); color: #405189; font-size: 1.5rem; }
	.empty-icon { width: 68px; height: 68px; font-size: 2rem; }
	.course-description { min-height: 48px; display: -webkit-box; line-clamp: 2; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
	@media (max-width: 767.98px) {
		.course-filters { grid-template-columns: 1fr; }
	}
</style>
