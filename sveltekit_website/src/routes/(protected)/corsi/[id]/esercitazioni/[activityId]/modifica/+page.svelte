<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { apiRequest } from '$lib/client/api.js';
	import ActivityForm from '$lib/components/portal/ActivityForm.svelte';
	import PageHeader from '$lib/components/portal/PageHeader.svelte';

	let activity;
	let referenceImages = [];
	let loading = true;
	let busy = false;
	let errorMessage = '';
	$: courseId = $page.params.id;
	$: activityId = $page.params.activityId;

	onMount(async () => {
		try {
			[activity, referenceImages] = await Promise.all([
				apiRequest(`/api/esercitazioni/${activityId}`),
				apiRequest(`/api/esercitazioni/${activityId}/immagini`)
			]);
		}
		catch (error) { errorMessage = error.message; }
		finally { loading = false; }
	});

	async function updateActivity(values) {
		busy = true; errorMessage = '';
		try {
			const { referenceImages: nextImages, ...activityValues } = values;
			await apiRequest(`/api/esercitazioni/${activityId}`, { method: 'PATCH', body: JSON.stringify(activityValues) });
			await apiRequest(`/api/esercitazioni/${activityId}/immagini`, {
				method: 'PUT', body: JSON.stringify({ images: nextImages })
			});
			goto(`/corsi/${courseId}/esercitazioni/${activityId}`);
		} catch (error) { errorMessage = error.message; }
		finally { busy = false; }
	}
</script>

<svelte:head><title>Modifica attività</title></svelte:head>
<div class="page-content"><div class="container-fluid py-4">
	<PageHeader title="Modifica attività" subtitle="Aggiorna consegna e disponibilità" parentHref={`/corsi/${courseId}/esercitazioni/${activityId}`} parentLabel="Attività" />
	{#if errorMessage}<div class="alert alert-danger">{errorMessage}</div>{/if}
	{#if loading}<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
	{:else if activity}<div class="row justify-content-center"><div class="col-xl-10"><div class="card border-0 shadow-sm"><div class="card-body p-4">
		<ActivityForm initial={activity} initialReferenceImages={referenceImages} onSubmit={updateActivity} {busy} submitLabel="Salva modifiche" cancelHref={`/corsi/${courseId}/esercitazioni/${activityId}`} enableReferenceImages />
	</div></div></div></div>{/if}
</div></div>
