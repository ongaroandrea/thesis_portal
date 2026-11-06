<script>
	import { onMount } from 'svelte';
	import { apiRequest } from '$lib/client/api.js';
	import { _ } from 'svelte-i18n';

	export let courseId = null;
	export let title = '';
	export let subtitle = '';

	// i18n keys for each analysis type, in tab order.
	const labels = {
		camera: 'correction.camera',
		light: 'correction.lighting',
		material: 'correction.materials',
		texture: 'correction.texture',
		general: 'correction.general'
	};

	let templates = [];
	let selectedType = 'camera';
	let loading = true;
	let saving = false;
	let errorMessage = '';
	let successMessage = '';
	let model = '';
	let systemPrompt = '';
	let userPrompt = '';
	let schemaText = '';
	let loadedRevision = '';

	$: selected = templates.find((template) => template.analysisType === selectedType);
	$: if (selected) loadEditor(selected);

	// Copy a template's active revision into the editor fields. Runs from a
	// reactive statement, so the `loadedRevision` marker stops it from
	// overwriting the user's unsaved edits on every re-render.
	function loadEditor(template) {
		const marker = `${template.id}:${template.revision.id}`;
		if (loadedRevision === marker) return;
		loadedRevision = marker;
		model = template.revision.model;
		systemPrompt = template.revision.systemPrompt;
		userPrompt = template.revision.userPrompt;
		schemaText = JSON.stringify(template.revision.outputSchema, null, 2);
	}

	async function loadTemplates() {
		loading = true;
		errorMessage = '';
		try {
			const query = courseId == null ? '' : `?courseId=${encodeURIComponent(courseId)}`;
			templates = await apiRequest(`/api/prompt-template${query}`);
			if (!templates.some((template) => template.analysisType === selectedType)) {
				selectedType = templates[0]?.analysisType ?? 'camera';
			}
		} catch (error) {
			errorMessage = error.message;
		} finally {
			loading = false;
		}
	}

	// Saving always creates a new active revision (revisions are immutable).
	// For an inherited global prompt this creates the course override.
	// Resetting `loadedRevision` makes the editor reload the saved revision.
	async function save(event) {
		event.preventDefault();
		saving = true;
		errorMessage = '';
		successMessage = '';
		try {
			let outputSchema;
			try { outputSchema = JSON.parse(schemaText); }
			catch { throw new Error($_('prompt.invalidSchema')); }
			await apiRequest('/api/prompt-template', {
				method: 'POST',
				body: JSON.stringify({
					courseId: courseId == null ? null : Number(courseId),
					analysisType: selectedType,
					model,
					systemPrompt,
					userPrompt,
					outputSchema
				})
			});
			successMessage = $_('prompt.saved');
			loadedRevision = '';
			await loadTemplates();
		} catch (error) {
			errorMessage = error.message;
		} finally {
			saving = false;
		}
	}

	onMount(loadTemplates);
</script>

<section class="prompt-manager">
	<header class="mb-4">
		<h1 class="page-title mb-1">{title}</h1>
		{#if subtitle}<p class="text-muted mb-0">{subtitle}</p>{/if}
	</header>
	{#if errorMessage}<div class="alert alert-danger">{errorMessage}</div>{/if}
	{#if successMessage}<div class="alert alert-success">{successMessage}</div>{/if}
	{#if loading}
		<div class="text-center py-5" role="status"><div class="spinner-border text-primary"></div><span class="visually-hidden">{$_('common.loading')}</span></div>
	{:else}
		<ul class="nav nav-tabs prompt-tabs mb-3" role="tablist" aria-label={$_('prompt.typeLabel')}>
			{#each Object.entries(labels) as [type, label]}
				<li class="nav-item" role="presentation">
					<button id={`prompt-tab-${type}`} type="button" role="tab" aria-selected={selectedType === type} aria-controls={`prompt-panel-${type}`} class="nav-link" class:active={selectedType === type} onclick={() => selectedType = type}>
						{$_(label)}
						<small>{$_(templates.find((template) => template.analysisType === type)?.inherited ? 'prompt.global' : 'prompt.custom')}</small>
					</button>
				</li>
			{/each}
		</ul>
		{#if selected}
			<div id={`prompt-panel-${selectedType}`} role="tabpanel" aria-labelledby={`prompt-tab-${selectedType}`}>
			<form class="card" onsubmit={save}>
				<div class="card-header bg-transparent p-4 d-flex flex-wrap justify-content-between gap-3">
					<div><h2 class="h5 mb-1">{$_(labels[selectedType])}</h2><p class="text-muted mb-0">{$_('prompt.activeRevision', { values: { version: selected.revision.version } })}</p></div>
					{#if selected.inherited}<span class="badge bg-info-subtle text-info align-self-start">{$_('prompt.inherited')}</span>{:else}<span class="badge bg-primary-subtle text-primary align-self-start">{$_(selected.scope === 'GLOBAL' ? 'prompt.global' : 'activity.course')}</span>{/if}
				</div>
				<div class="card-body p-4">
					<div class="mb-3"><label class="form-label fw-semibold" for="prompt-model">{$_('prompt.model')}</label><input id="prompt-model" class="form-control" maxlength="200" required bind:value={model} /></div>
					<div class="mb-3"><label class="form-label fw-semibold" for="system-prompt">{$_('prompt.system')}</label><textarea id="system-prompt" class="form-control font-monospace" rows="9" maxlength="50000" required bind:value={systemPrompt}></textarea></div>
					<div class="mb-3"><label class="form-label fw-semibold" for="user-prompt">{$_('prompt.user')}</label><textarea id="user-prompt" class="form-control font-monospace" rows="8" maxlength="50000" required bind:value={userPrompt}></textarea></div>
					<div><label class="form-label fw-semibold" for="output-schema">{$_('prompt.schema')}</label><textarea id="output-schema" class="form-control font-monospace" rows="12" maxlength="50000" required bind:value={schemaText}></textarea><div class="form-text">{$_('prompt.schemaHelp')}</div></div>
				</div>
				<div class="card-footer bg-transparent p-4 d-flex justify-content-between align-items-center gap-3"><small class="text-muted">{$_('prompt.immutableHelp')}</small><button class="btn btn-primary px-4" type="submit" disabled={saving}>{#if saving}<span class="spinner-border spinner-border-sm me-2"></span>{/if}{$_('prompt.saveRevision')}</button></div>
			</form>
			</div>
		{/if}
	{/if}
</section>

<style>
	.prompt-tabs { flex-wrap: nowrap; overflow-x: auto; overflow-y: hidden; }
	.prompt-tabs .nav-link { white-space: nowrap; }
	.prompt-tabs small { margin-left: .35rem; color: var(--portal-muted); font-weight: 400; }
</style>
