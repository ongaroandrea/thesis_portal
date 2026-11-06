<script>
	export let title;
	export let subtitle = '';
	export let parentLabel = '';
	export let parentHref = '/corsi';
	import { _ } from 'svelte-i18n';
</script>

<div class="page-title-box d-flex flex-wrap align-items-center justify-content-between gap-3">
	<div class="page-title-text">
		<h1 class="page-title mb-1">{title}</h1>
		{#if subtitle}<p class="text-muted mb-0">{subtitle}</p>{/if}
	</div>
	<nav aria-label={$_('common.breadcrumb')}>
		<ol class="breadcrumb m-0">
			<li class="breadcrumb-item"><a href={parentHref}>{parentLabel || $_('nav.courses')}</a></li>
			<li class="breadcrumb-item active" aria-current="page">{title}</li>
		</ol>
	</nav>
</div>

<style>
	/* The title takes the free space first; the breadcrumb shrinks and truncates
	   the current page (already shown in full as the H1) instead of squeezing
	   the title onto two lines. */
	.page-title-text { flex: 1 1 24rem; min-width: 0; }
	nav { flex: 0 1 auto; min-width: 0; max-width: 100%; }
	.breadcrumb { flex-wrap: nowrap; }
	.breadcrumb-item { white-space: nowrap; }
	.breadcrumb-item.active { min-width: 0; max-width: 18rem; overflow: hidden; text-overflow: ellipsis; }
</style>
