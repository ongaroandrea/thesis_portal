<script>
	import { onMount } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
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
	// One draft per analysis type, so switching tabs never discards edits.
	// Each draft remembers the revision it was started from (`marker`).
	let drafts = {};

	$: selected = templates.find((template) => template.analysisType === selectedType);
	$: if (selected) ensureDraft(selected);
	$: draft = drafts[selectedType];
	// Model and output schema are read-only: the server keeps them locked.
	$: model = selected?.revision.model ?? '';
	$: schemaText = selected ? JSON.stringify(selected.revision.outputSchema, null, 2) : '';
	$: dirtyTypes = new Set(templates.filter((template) => isDirty(template, drafts[template.analysisType])).map((template) => template.analysisType));

	function markerFor(template) {
		return `${template.id}:${template.revision.id}`;
	}

	// Start a draft from the active revision, unless the user already has one
	// for that same revision. A new revision (after saving) starts a new draft.
	function ensureDraft(template) {
		const marker = markerFor(template);
		if (drafts[template.analysisType]?.marker === marker) return;
		resetDraft(template);
	}

	function resetDraft(template) {
		drafts = {
			...drafts,
			[template.analysisType]: {
				marker: markerFor(template),
				systemPrompt: template.revision.systemPrompt,
				userPrompt: template.revision.userPrompt
			}
		};
	}

	function isDirty(template, entry) {
		return Boolean(entry) && entry.marker === markerFor(template) && (
			entry.systemPrompt !== template.revision.systemPrompt ||
			entry.userPrompt !== template.revision.userPrompt
		);
	}

	function selectType(type) {
		selectedType = type;
		successMessage = '';
	}

	function discardDraft() {
		if (selected) resetDraft(selected);
	}

	// Warn before leaving the page (in-app navigation or closing the tab)
	// while any tab still has unsaved edits.
	beforeNavigate(({ cancel, type }) => {
		if (saving || dirtyTypes.size === 0) return;
		if (type === 'leave') { cancel(); return; }
		if (!confirm($_('prompt.unsavedConfirm'))) cancel();
	});

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
	// The saved revision gets a new marker, so its tab starts a fresh draft;
	// drafts on the other tabs are kept.
	async function save(event) {
		event.preventDefault();
		saving = true;
		errorMessage = '';
		successMessage = '';
		try {
			await apiRequest('/api/prompt-template', {
				method: 'POST',
				body: JSON.stringify({
					courseId: courseId == null ? null : Number(courseId),
					analysisType: selectedType,
					systemPrompt: draft.systemPrompt,
					userPrompt: draft.userPrompt
				})
			});
			successMessage = $_('prompt.saved');
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
					<button id={`prompt-tab-${type}`} type="button" role="tab" aria-selected={selectedType === type} aria-controls={`prompt-panel-${type}`} class="nav-link" class:active={selectedType === type} onclick={() => selectType(type)}>
						{$_(label)}{#if dirtyTypes.has(type)}<span class="unsaved-dot" aria-hidden="true"></span><span class="visually-hidden">({$_('prompt.unsaved')})</span>{/if}
						<small>{$_(templates.find((template) => template.analysisType === type)?.inherited ? 'prompt.global' : 'prompt.custom')}</small>
					</button>
				</li>
			{/each}
		</ul>
		{#if selected && draft}
			<div id={`prompt-panel-${selectedType}`} role="tabpanel" aria-labelledby={`prompt-tab-${selectedType}`}>
			<form class="card" onsubmit={save}>
				<div class="card-header bg-transparent p-4 d-flex flex-wrap justify-content-between gap-3">
					<div><h2 class="h5 mb-1">{$_(labels[selectedType])}</h2><p class="text-muted mb-0">{$_('prompt.activeRevision', { values: { version: selected.revision.version } })}</p></div>
					{#if selected.inherited}<span class="badge bg-info-subtle text-info align-self-start">{$_('prompt.inherited')}</span>{:else}<span class="badge bg-primary-subtle text-primary align-self-start">{$_(selected.scope === 'GLOBAL' ? 'prompt.global' : 'activity.course')}</span>{/if}
				</div>
				<div class="card-body p-4">
					<div class="mb-3">
						<label class="form-label fw-semibold" for="prompt-model">{$_('prompt.model')}</label>
						<div class="locked-field">
							<input id="prompt-model" class="form-control font-monospace" value={model} readonly aria-describedby="prompt-locked-help" />
							<i class="ri-lock-line" aria-hidden="true"></i>
						</div>
					</div>
					<div class="mb-3"><label class="form-label fw-semibold" for="system-prompt">{$_('prompt.system')}</label><textarea id="system-prompt" class="form-control font-monospace" rows="9" maxlength="50000" required bind:value={drafts[selectedType].systemPrompt}></textarea></div>
					<div class="mb-3"><label class="form-label fw-semibold" for="user-prompt">{$_('prompt.user')}</label><textarea id="user-prompt" class="form-control font-monospace" rows="8" maxlength="50000" required bind:value={drafts[selectedType].userPrompt}></textarea></div>
					<div>
						<label class="form-label fw-semibold" for="output-schema">{$_('prompt.schema')}</label>
						<div class="locked-field">
							<textarea id="output-schema" class="form-control font-monospace" rows="12" value={schemaText} readonly aria-describedby="prompt-locked-help prompt-schema-help"></textarea>
							<i class="ri-lock-line" aria-hidden="true"></i>
						</div>
						<div id="prompt-schema-help" class="form-text">{$_('prompt.schemaHelp')}</div>
					</div>
					<p id="prompt-locked-help" class="locked-note mt-3 mb-0"><i class="ri-lock-line" aria-hidden="true"></i>{$_('prompt.lockedHelp')}</p>
				</div>
				<div class="card-footer bg-transparent p-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
					<small class="text-muted">{$_('prompt.immutableHelp')}</small>
					<div class="d-flex flex-wrap align-items-center gap-2 ms-auto">
						{#if dirtyTypes.has(selectedType)}
							<span class="unsaved-label" role="status"><span class="unsaved-dot" aria-hidden="true"></span>{$_('prompt.unsaved')}</span>
							<button class="btn btn-light" type="button" onclick={discardDraft} disabled={saving}>{$_('prompt.discard')}</button>
						{/if}
						<button class="btn btn-primary px-4" type="submit" disabled={saving || !dirtyTypes.has(selectedType)}>{#if saving}<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>{/if}{$_('prompt.saveRevision')}</button>
					</div>
				</div>
			</form>
			</div>
		{/if}
	{/if}
</section>

<style>
	.prompt-tabs { flex-wrap: nowrap; overflow-x: auto; overflow-y: hidden; }
	.prompt-tabs .nav-link { white-space: nowrap; }
	.prompt-tabs small { margin-left: .35rem; color: var(--portal-muted); font-weight: 400; }
	/* Unsaved-edits marker, shared by the tab and the footer. */
	.unsaved-dot { display: inline-block; width: .5rem; height: .5rem; margin-left: .4rem; border-radius: 50%; background: var(--portal-warning); vertical-align: middle; }
	.unsaved-label { display: inline-flex; align-items: center; font-size: .875rem; color: var(--portal-warning-text); }
	.unsaved-label .unsaved-dot { margin: 0 .4rem 0 0; }
	/* Read-only fields: visible and selectable, but clearly not editable. */
	.locked-field { position: relative; }
	.locked-field .form-control[readonly] {
		background-color: var(--portal-surface-muted);
		color: var(--portal-muted);
		border-style: dashed;
		padding-right: 2.5rem;
		cursor: default;
		resize: vertical;
	}
	.locked-field .form-control[readonly]:focus { color: var(--bs-body-color); }
	.locked-field > i { position: absolute; top: .55rem; right: .85rem; color: var(--portal-muted); pointer-events: none; }
	.locked-note { display: flex; align-items: center; gap: .4rem; font-size: .875rem; color: var(--portal-muted); }
</style>
