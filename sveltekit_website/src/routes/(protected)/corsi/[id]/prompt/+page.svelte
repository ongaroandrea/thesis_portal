<script>
	import { page } from '$app/stores';
	import PromptManager from '$lib/components/portal/PromptManager.svelte';
	import { _ } from 'svelte-i18n';
	$: courseId = $page.params.id;
</script>

<svelte:head><title>{$_('prompt.courseTitle')} | {$_('site.name')}</title></svelte:head>
<div class="page-content"><div class="container-fluid py-4">
	<a class="btn btn-sm btn-light mb-3" href={`/corsi/${courseId}`}><i class="ri-arrow-left-line me-1" aria-hidden="true"></i>{$_('prompt.backToCourse')}</a>
	<PromptManager {courseId} title={$_('prompt.courseTitle')} subtitle={$_('prompt.courseSubtitle')} />
</div></div>
