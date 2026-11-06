<script>
	import { goto } from '$app/navigation';
	import { apiRequest } from '$lib/client/api.js';
	import CourseForm from '$lib/components/portal/CourseForm.svelte';
	import PageHeader from '$lib/components/portal/PageHeader.svelte';
	import { _ } from 'svelte-i18n';

	let busy = false;
	let errorMessage = '';

	async function createCourse(values) {
		busy = true;
		errorMessage = '';
		try {
			const course = await apiRequest('/api/corsi', { method: 'POST', body: JSON.stringify(values) });
			goto(`/corsi/${course.id}`);
		} catch (error) {
			errorMessage = error.message;
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>{$_('course.new')} | {$_('site.name')}</title></svelte:head>
<div class="page-content"><div class="container-fluid py-4">
	<PageHeader title={$_('course.new')} subtitle={$_('course.newSubtitle')} />
	<div class="row justify-content-center"><div class="col-xl-9">
		{#if errorMessage}<div class="alert alert-danger">{errorMessage}</div>{/if}
		<div class="card border-0 shadow-sm"><div class="card-header bg-transparent p-4">
			<h2 class="h5 mb-1 text-primary">{$_('course.information')}</h2><p class="text-muted mb-0">{$_('course.informationHelp')}</p>
		</div><div class="card-body p-4"><CourseForm onSubmit={createCourse} {busy} submitLabel={$_('course.create')} /></div></div>
	</div></div>
</div></div>
