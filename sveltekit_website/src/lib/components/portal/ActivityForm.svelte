<script>
	import { toDateTimeLocal } from '$lib/client/api.js';
	import { CORRECTION_FOCUS_OPTIONS, DEFAULT_CORRECTION_FOCUS_IDS } from '$lib/correction-focus.js';
	import { _ } from 'svelte-i18n';

	export let initial = {};
	export let submitLabel = '';
	export let busy = false;
	export let cancelHref = '/corsi';
	export let onSubmit;
	export let onCancel = null;
	export let enableReferenceImages = false;
	export let initialReferenceImages = [];

	let title = initial.title ?? '';
	let description = initial.description ?? '';
	let objective = initial.objective ?? '';
	let promptAddendum = initial.promptAddendum ?? '';
	let kind = initial.kind ?? 'LESSON';
	let status = initial.status ?? 'DRAFT';
	let availableFrom = toDateTimeLocal(initial.availableFrom);
	let availableUntil = toDateTimeLocal(initial.availableUntil);
	let resultsReleasedAt = toDateTimeLocal(initial.resultsReleasedAt);
	let durationMinutes = initial.durationMinutes ?? '';
	let maxCorrectionsPerStudent = initial.maxCorrectionsPerStudent ?? '';
	let displayOrder = initial.displayOrder ?? 0;
	let allowedCorrectionFocuses = Array.isArray(initial.allowedCorrectionFocuses) && initial.allowedCorrectionFocuses.length
		? [...initial.allowedCorrectionFocuses]
		: [...DEFAULT_CORRECTION_FOCUS_IDS];
	let referenceImages = initialReferenceImages.map((image) => ({
		...image,
		key: `existing-${image.id}`,
		existingId: image.id,
		dataUrl: image.storageKey,
		customViewLabel: image.customViewLabel ?? '',
		altText: image.altText ?? ''
	}));
	let imageError = '';
	let imageInput;

	const viewTypes = [
		{ value: 'FRONT', key: 'view.front' },
		{ value: 'SIDE', key: 'view.side' },
		{ value: 'TOP', key: 'view.top' },
		{ value: 'ANGLED', key: 'view.angled' },
		{ value: 'OTHER', key: 'view.other' }
	];
	$: allTopicsSelected = allowedCorrectionFocuses.length === CORRECTION_FOCUS_OPTIONS.length;

	function toggleAllTopics() {
		allowedCorrectionFocuses = allTopicsSelected ? [] : [...DEFAULT_CORRECTION_FOCUS_IDS];
	}

	function toggleTopic(id) {
		allowedCorrectionFocuses = allowedCorrectionFocuses.includes(id)
			? allowedCorrectionFocuses.filter((focus) => focus !== id)
			: [...allowedCorrectionFocuses, id];
	}

	function dataUrlBytes(dataUrl) {
		return Math.floor((dataUrl.split(',')[1]?.length ?? 0) * 3 / 4);
	}

	/**
	 * Re-encode a reference image in the browser so it fits the server's
	 * 350 KB limit for reference images.
	 * Downscales to at most 1600 px on the long side, then tries up to five
	 * WEBP encodes, lowering quality (0.84 -> 0.5) and shrinking the size by
	 * 22% after each attempt that is still too big.
	 * @param {File} file - JPEG, PNG or WEBP, max 12 MB.
	 * @returns {Promise<string>} A `data:image/webp;base64,...` URL.
	 * @throws {Error} Localized message when the type, size or final result
	 *   is not acceptable.
	 */
	async function optimizeImage(file) {
		if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
			throw new Error($_('activity.imageTypeError', { values: { name: file.name } }));
		}
		if (file.size > 12 * 1024 * 1024) throw new Error($_('activity.imageSizeError', { values: { name: file.name } }));
		const bitmap = await createImageBitmap(file);
		let scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
		let dataUrl = '';
		for (let attempt = 0; attempt < 5; attempt += 1) {
			const canvas = document.createElement('canvas');
			canvas.width = Math.max(1, Math.round(bitmap.width * scale));
			canvas.height = Math.max(1, Math.round(bitmap.height * scale));
			canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
			dataUrl = canvas.toDataURL('image/webp', Math.max(.5, .84 - attempt * .08));
			if (dataUrlBytes(dataUrl) <= 350 * 1024) break;
			scale *= .78;
		}
		bitmap.close();
		if (dataUrlBytes(dataUrl) > 350 * 1024) throw new Error($_('activity.imageOptimizeError', { values: { name: file.name } }));
		return dataUrl;
	}

	// Add picked files to the reference set (max 6 in total). Files are only
	// optimized here; they are uploaded with the form on submit. The first
	// image defaults to the FRONT view, later ones to SIDE. The input is
	// cleared so the same file can be picked again.
	async function selectReferenceImages(event) {
		imageError = '';
		const files = Array.from(event.currentTarget.files ?? []);
		if (referenceImages.length + files.length > 6) {
			imageError = $_('activity.imageLimitError');
			event.currentTarget.value = '';
			return;
		}
		try {
			const prepared = [];
			for (const [offset, file] of files.entries()) {
				prepared.push({
					key: `${Date.now()}-${offset}-${file.name}`,
					dataUrl: await optimizeImage(file),
					originalFilename: file.name,
					mimeType: 'image/webp',
					viewType: referenceImages.length + offset === 0 ? 'FRONT' : 'SIDE',
					customViewLabel: '',
					altText: ''
				});
			}
			referenceImages = [...referenceImages, ...prepared];
		} catch (error) {
			imageError = error.message;
		} finally {
			event.currentTarget.value = '';
		}
	}

	function removeReferenceImage(key) {
		referenceImages = referenceImages.filter((image) => image.key !== key);
		imageError = '';
	}

	async function submit(event) {
		event.preventDefault();
		if (referenceImages.some((image) => image.viewType === 'OTHER' && !image.customViewLabel.trim())) {
			imageError = $_('activity.otherViewError');
			return;
		}
		await onSubmit({
			title,
			description,
			objective,
			promptAddendum,
			kind,
			status,
			availableFrom: availableFrom ? new Date(availableFrom).toISOString() : null,
			availableUntil: availableUntil ? new Date(availableUntil).toISOString() : null,
			resultsReleasedAt: kind === 'EXAM' && resultsReleasedAt ? new Date(resultsReleasedAt).toISOString() : null,
			durationMinutes: durationMinutes === '' ? null : Number(durationMinutes),
			maxCorrectionsPerStudent: kind === 'EXAM' || maxCorrectionsPerStudent === '' ? null : Number(maxCorrectionsPerStudent),
			displayOrder: Number(displayOrder),
			allowedCorrectionFocuses,
			referenceImages: referenceImages.map((image, index) => ({
				id: image.existingId,
				dataUrl: image.dataUrl,
				originalFilename: image.originalFilename,
				mimeType: image.mimeType,
				viewType: image.viewType,
				customViewLabel: image.viewType === 'OTHER' ? image.customViewLabel : null,
				altText: image.altText,
				displayOrder: index
			}))
		});
	}
</script>

<form on:submit={submit}>
	<div class="form-section-heading">
		<div><h2 class="h5">{$_('activity.details')}</h2><p>{$_('activity.detailsHelp')}</p></div>
	</div>
	<div class="row g-3">
		<div class="col-md-8">
			<label class="form-label fw-semibold" for="activity-title">{$_('common.title')}</label>
			<input id="activity-title" class="form-control form-control-lg" bind:value={title} maxlength="200" required />
		</div>
		<div class="col-md-4">
			<label class="form-label fw-semibold" for="activity-kind">{$_('activity.kind')}</label>
			<select id="activity-kind" class="form-select form-select-lg" bind:value={kind}>
				<option value="LESSON">{$_('activity.lesson')}</option>
				<option value="EXAM">{$_('activity.exam')}</option>
			</select>
		</div>
		<div class="col-12">
			<label class="form-label fw-semibold" for="activity-objective">{$_('activity.objective')}</label>
			<textarea id="activity-objective" class="form-control" rows="3" bind:value={objective} required placeholder={$_('activity.objectivePlaceholder')}></textarea>
		</div>
		<div class="col-12">
			<label class="form-label fw-semibold" for="activity-description">{$_('activity.instructions')}</label>
			<textarea id="activity-description" class="form-control" rows="5" bind:value={description} placeholder={$_('activity.instructionsPlaceholder')}></textarea>
		</div>
		<div class="col-12">
			<label class="form-label fw-semibold" for="activity-prompt-addendum">{$_('activity.promptAddendum')}</label>
			<textarea id="activity-prompt-addendum" class="form-control" rows="5" maxlength="8000" bind:value={promptAddendum} disabled={Boolean(initial.promptFrozenAt)} placeholder={$_('activity.promptAddendumPlaceholder')}></textarea>
			<div class="form-text">{$_(initial.promptFrozenAt ? 'activity.promptFrozenHelp' : 'activity.promptAddendumHelp')}</div>
		</div>
		<div class="col-md-6">
			<label class="form-label fw-semibold" for="activity-from">{$_('activity.availableFrom')}</label>
			<input id="activity-from" type="datetime-local" class="form-control" bind:value={availableFrom} />
		</div>
		<div class="col-md-6">
			<label class="form-label fw-semibold" for="activity-until">{$_('activity.availableUntil')}</label>
			<input id="activity-until" type="datetime-local" class="form-control" bind:value={availableUntil} required={kind === 'EXAM'} />
		</div>
		{#if kind === 'EXAM'}
			<div class="col-12">
				<label class="form-label fw-semibold" for="activity-results-release">{$_('exam.resultsRelease')}</label>
				<input id="activity-results-release" type="datetime-local" class="form-control" bind:value={resultsReleasedAt} />
				<div class="form-text">{$_('exam.resultsReleaseHelp')}</div>
			</div>
		{/if}
		<div class="col-md-3">
			<label class="form-label fw-semibold" for="activity-duration">{$_('activity.durationMinutes')}</label>
			<input id="activity-duration" type="number" min="1" class="form-control" bind:value={durationMinutes} />
		</div>
		{#if kind !== 'EXAM'}
			<div class="col-md-3">
				<label class="form-label fw-semibold" for="activity-limit">{$_('activity.maxCorrections')}</label>
				<input id="activity-limit" type="number" min="1" class="form-control" bind:value={maxCorrectionsPerStudent} />
			</div>
		{/if}
		<div class="col-md-3">
			<label class="form-label fw-semibold" for="activity-order">{$_('common.order')}</label>
			<input id="activity-order" type="number" class="form-control" bind:value={displayOrder} />
		</div>
		<div class="col-md-3">
			<label class="form-label fw-semibold" for="activity-status">{$_('common.status')}</label>
			<select id="activity-status" class="form-select" bind:value={status}>
				<option value="DRAFT">{$_('status.draft')}</option>
				<option value="PUBLISHED">{$_('status.published')}</option>
				<option value="ARCHIVED">{$_('status.archived')}</option>
			</select>
		</div>
	</div>
	{#if kind !== 'EXAM'}
		<div class="form-section-heading mt-5">
			<div><h2 class="h5">{$_('activity.correctionTopics')}</h2><p>{$_('activity.correctionTopicsHelp')}</p></div>
		</div>
		<div class="topic-selector" class:invalid={allowedCorrectionFocuses.length === 0}>
		<label class="topic-option topic-all" class:selected={allTopicsSelected}>
			<input type="checkbox" checked={allTopicsSelected} on:change={toggleAllTopics} />
			
			<span><strong>{$_('activity.allTopics')}</strong><small>{$_('activity.allTopicsHelp')}</small></span>
		</label>
		<div class="topic-grid">
			{#each CORRECTION_FOCUS_OPTIONS as option}
				<label class="topic-option" class:selected={allowedCorrectionFocuses.includes(option.id)}>
					<input type="checkbox" checked={allowedCorrectionFocuses.includes(option.id)} on:change={() => toggleTopic(option.id)} />
					
					<span><strong>{$_(option.labelKey)}</strong><small>{$_(`activity.topicHelp.${option.id.toLowerCase()}`)}</small></span>
				</label>
			{/each}
		</div>
		{#if allowedCorrectionFocuses.length === 0}<p class="topic-error mb-0"><i class="ri-error-warning-line"></i>{$_('activity.selectTopicError')}</p>{/if}
		</div>
	{/if}
	{#if enableReferenceImages}
		<div class="form-section-heading mt-5">
			<div><h2 class="h5">{$_('activity.referenceImages')}</h2><p>{$_('activity.referenceImagesHelp')}</p></div>
		</div>
		<div class="reference-upload">
			<input bind:this={imageInput} class="visually-hidden" id="activity-reference-images" type="file" accept="image/jpeg,image/png,image/webp" multiple on:change={selectReferenceImages} />
			<button class="upload-button" type="button" on:click={() => imageInput?.click()} disabled={referenceImages.length >= 6}>
				<i class="ri-image-add-line upload-button-icon" aria-hidden="true"></i>
				<span><strong>{$_('activity.chooseImages')}</strong><small>{$_('activity.imageFormats')}</small></span>
			</button>
			{#if imageError}<div class="alert alert-danger mt-3 mb-0">{imageError}</div>{/if}
		</div>
		{#if referenceImages.length > 0}
			<div class="reference-grid mt-3">
				{#each referenceImages as image, index (image.key)}
					<article class="reference-card">
						<div class="reference-preview">
							<img src={image.dataUrl} alt={image.altText || image.originalFilename} decoding="async" />
							<span>{index + 1}</span>
							<button type="button" on:click={() => removeReferenceImage(image.key)} aria-label={$_('activity.removeImage', { values: { name: image.originalFilename } })}><i class="ri-close-line"></i></button>
						</div>
						<div class="p-3">
							<div class="filename" title={image.originalFilename}>{image.originalFilename}</div>
							<label class="form-label small fw-semibold mt-3" for={`image-view-${image.key}`}>{$_('activity.viewType')}</label>
							<select class="form-select" id={`image-view-${image.key}`} bind:value={image.viewType}>
								{#each viewTypes as type}<option value={type.value}>{$_(type.key)}</option>{/each}
							</select>
							{#if image.viewType === 'OTHER'}
								<label class="form-label small fw-semibold mt-3" for={`image-custom-${image.key}`}>{$_('activity.viewName')}</label>
								<input class="form-control" id={`image-custom-${image.key}`} maxlength="100" required bind:value={image.customViewLabel} placeholder={$_('activity.viewNamePlaceholder')} />
							{/if}
							<label class="form-label small fw-semibold mt-3" for={`image-alt-${image.key}`}>{$_('activity.altText')}</label>
							<input class="form-control" id={`image-alt-${image.key}`} maxlength="500" bind:value={image.altText} placeholder={$_('activity.altTextPlaceholder')} />
						</div>
					</article>
				{/each}
			</div>
		{/if}
	{/if}
	<div class="d-flex justify-content-end gap-2 mt-4">
		{#if onCancel}
			<button class="btn btn-light" type="button" on:click={onCancel}>{$_('common.cancel')}</button>
		{:else}
			<a class="btn btn-light" href={cancelHref}>{$_('common.cancel')}</a>
		{/if}
		<button class="btn btn-success px-4" type="submit" disabled={busy || !title.trim() || !objective.trim() || (kind !== 'EXAM' && allowedCorrectionFocuses.length === 0)}>
			{#if busy}<span class="spinner-border spinner-border-sm me-2"></span>{/if}{submitLabel || $_('activity.save')}
		</button>
	</div>
</form>

<style>
	.form-section-heading { display: flex; align-items: center; gap: .85rem; padding-bottom: 1rem; margin-bottom: 1.25rem; border-bottom: 1px solid var(--portal-border); }
	.form-section-heading h2 { margin: 0 0 .15rem; }
	.form-section-heading p { margin: 0; color: var(--portal-muted); }
	.topic-selector { display: grid; gap: 1rem; }
	.topic-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: .8rem; }
	.topic-option { min-width: 0; display: flex; align-items: center; gap: .8rem; padding: .9rem; border: 1px solid var(--portal-border); border-radius: var(--portal-radius); background: var(--portal-surface); cursor: pointer; transition: border-color .16s ease-out, background-color .16s ease-out; }
	.topic-option:hover { border-color: color-mix(in srgb, var(--portal-brand-primary) 45%, var(--portal-border)); }
	.topic-option.selected { border-color: rgba(var(--portal-brand-primary-rgb),.5); background: color-mix(in srgb, var(--portal-brand-primary) 7%, var(--portal-surface)); box-shadow: inset 0 0 0 1px rgba(var(--portal-brand-primary-rgb),.08); }
	.topic-option input { width: 1.05rem; height: 1.05rem; flex: 0 0 auto; accent-color: var(--portal-brand-primary); }
	.topic-option > span:last-child { min-width: 0; display: grid; }
	.topic-option small { margin-top: .1rem; color: var(--portal-muted); font-size: .76rem; }
	.topic-all { border-style: dashed; }
	.topic-all.selected { border-style: solid; }
	.topic-error { display: flex; align-items: center; gap: .4rem; color: var(--portal-danger-text); font-size: .85rem; }
	.reference-upload { padding: 1rem; border: 1px dashed color-mix(in srgb, var(--portal-brand-primary) 45%, var(--portal-border)); border-radius: var(--portal-radius); background: color-mix(in srgb, var(--portal-brand-primary) 4%, var(--portal-surface)); }
	.upload-button { width: 100%; display: flex; align-items: center; justify-content: center; gap: .9rem; border: 0; color: var(--portal-ink); background: transparent; padding: .65rem; }
	.upload-button:disabled { opacity: .55; }
	.upload-button span:last-child { display: grid; text-align: left; }
	.upload-button small { color: var(--portal-muted); margin-top: .15rem; }
	.upload-button-icon { color: var(--portal-info-text); font-size: 1.5rem; }
	.reference-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 280px)); justify-content: start; gap: 1rem; }
	.reference-card { overflow: hidden; border: 1px solid var(--portal-border); border-radius: var(--portal-radius); background: var(--portal-surface); }
	.reference-preview { position: relative; aspect-ratio: 1; background: #111827; }
	.reference-preview img { width: 100%; height: 100%; object-fit: contain; }
	.reference-preview > span { position: absolute; left: .7rem; top: .7rem; width: 28px; height: 28px; display: grid; place-items: center; border-radius: var(--portal-radius-sm); color: #fff; background: rgba(17,24,39,.78); font-weight: 700; }
	.reference-preview button { position: absolute; right: .7rem; top: .7rem; width: 36px; height: 36px; display: grid; place-items: center; border: 0; border-radius: var(--portal-radius-sm); color: #fff; background: rgba(var(--portal-danger-rgb),.9); font-size: 1.1rem; }
	.filename { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
	@media (max-width: 575.98px) {
		.reference-grid { grid-template-columns: minmax(0, 1fr); }
	}
	@media (pointer: coarse) { .reference-preview button { width: 44px; height: 44px; } }
</style>
