<script>
	import PromptManager from '$lib/components/portal/PromptManager.svelte';
	import { _ } from 'svelte-i18n';
</script>

<svelte:head><title>{$_('nav.prompts')} | {$_('site.name')}</title></svelte:head>
<div class="page-content"><div class="container-fluid py-4">
	<PromptManager title={$_('nav.prompts')} subtitle={$_('prompt.globalSubtitle')} />
</div></div>
