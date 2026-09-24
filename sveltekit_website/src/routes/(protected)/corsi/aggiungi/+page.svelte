<script>
	import { goto } from '$app/navigation';
	import { apiRequest } from '$lib/client/api.js';
	import CourseForm from '$lib/components/portal/CourseForm.svelte';
	import PageHeader from '$lib/components/portal/PageHeader.svelte';

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

<svelte:head><title>Nuovo corso</title></svelte:head>
<div class="page-content"><div class="container-fluid py-4">
	<PageHeader title="Nuovo corso" subtitle="Configura il corso e il periodo di riferimento" />
	<div class="row justify-content-center"><div class="col-xl-9">
		{#if errorMessage}<div class="alert alert-danger">{errorMessage}</div>{/if}
		<div class="card border-0 shadow-sm"><div class="card-header bg-transparent p-4">
			<h5 class="mb-1 text-primary">Informazioni del corso</h5><p class="text-muted mb-0">Potrai aggiungere membri e attività dopo la creazione.</p>
		</div><div class="card-body p-4"><CourseForm onSubmit={createCourse} {busy} submitLabel="Crea corso" /></div></div>
	</div></div>
</div></div>
