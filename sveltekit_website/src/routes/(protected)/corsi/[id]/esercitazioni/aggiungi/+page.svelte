<script>
	import { page } from '$app/stores'; import { goto } from '$app/navigation';
	import { apiRequest } from '$lib/client/api.js'; import ActivityForm from '$lib/components/portal/ActivityForm.svelte'; import PageHeader from '$lib/components/portal/PageHeader.svelte';
	import { _ } from 'svelte-i18n';
	let busy = false; let errorMessage = ''; $: courseId = $page.params.id;
	async function createActivity(values) { busy = true; errorMessage = ''; try { const activity = await apiRequest('/api/esercitazioni', { method: 'POST', body: JSON.stringify({ ...values, courseId: Number(courseId) }) }); goto(`/corsi/${courseId}/esercitazioni/${activity.id}`); } catch (error) { errorMessage = error.message; } finally { busy = false; } }
</script>
<svelte:head><title>{$_('activity.new')} | {$_('site.name')}</title></svelte:head>
<div class="page-content"><div class="container-fluid py-4"><PageHeader title={$_('activity.new')} subtitle={$_('activity.newSubtitle')} parentHref={`/corsi/${courseId}/esercitazioni`} parentLabel={$_('activity.activities')} />{#if errorMessage}<div class="alert alert-danger">{errorMessage}</div>{/if}<div class="row justify-content-center"><div class="col-xl-10"><div class="card border-0 shadow-sm"><div class="card-body p-4"><ActivityForm onSubmit={createActivity} {busy} submitLabel={$_('activity.create')} cancelHref={`/corsi/${courseId}/esercitazioni`} /></div></div></div></div></div></div>
