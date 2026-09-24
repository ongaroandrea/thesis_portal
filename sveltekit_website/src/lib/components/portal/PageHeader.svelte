<script>
	export let title;
	export let subtitle = '';
	export let parentLabel = 'Corsi';
	export let parentHref = '/corsi';
</script>

<div class="page-title-box d-flex flex-wrap align-items-center justify-content-between gap-3">
	<div>
		<h4 class="mb-1">{title}</h4>
		{#if subtitle}<p class="text-muted mb-0">{subtitle}</p>{/if}
	</div>
	<nav aria-label="breadcrumb">
		<ol class="breadcrumb m-0">
			<li class="breadcrumb-item"><a href={parentHref}>{parentLabel}</a></li>
			<li class="breadcrumb-item active" aria-current="page">{title}</li>
		</ol>
	</nav>
</div>
