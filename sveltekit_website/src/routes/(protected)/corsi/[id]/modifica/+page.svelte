<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { apiRequest } from '$lib/client/api.js';
	import CourseForm from '$lib/components/portal/CourseForm.svelte';
	import PageHeader from '$lib/components/portal/PageHeader.svelte';
	import { _ } from 'svelte-i18n';

	let course;
	let loading = true;
	let busy = false;
	let errorMessage = '';
	$: courseId = $page.params.id;

	onMount(async () => {
		try { course = await apiRequest(`/api/corsi/${courseId}`); }
		catch (error) { errorMessage = error.message; }
		finally { loading = false; }
	});

	async function updateCourse(values) {
		busy = true; errorMessage = '';
		try {
			await apiRequest(`/api/corsi/${courseId}`, { method: 'PATCH', body: JSON.stringify(values) });
			goto(`/corsi/${courseId}`);
		} catch (error) { errorMessage = error.message; }
		finally { busy = false; }
	}
</script>

<svelte:head><title>{$_('course.edit')} | {$_('site.name')}</title></svelte:head>
<div class="page-content"><div class="container-fluid py-4">
	<PageHeader title={$_('course.edit')} subtitle={$_('course.editSubtitle')} parentHref={`/corsi/${courseId}`} />
	{#if errorMessage}<div class="alert alert-danger">{errorMessage}</div>{/if}
	{#if loading}<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
	{:else if course}<div class="row justify-content-center"><div class="col-xl-9"><div class="card border-0 shadow-sm"><div class="card-body p-4">
		<CourseForm initial={course} onSubmit={updateCourse} {busy} submitLabel={$_('common.saveChanges')} />
	</div></div></div></div>{/if}
</div></div>
