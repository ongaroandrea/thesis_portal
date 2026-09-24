<script>
	import { toDateTimeLocal } from '$lib/client/api.js';

	export let initial = {};
	export let submitLabel = 'Salva attività';
	export let busy = false;
	export let cancelHref = '/corsi';
	export let onSubmit;
	export let onCancel = null;
	export let enableReferenceImages = false;
	export let initialReferenceImages = [];

	let title = initial.title ?? '';
	let description = initial.description ?? '';
	let objective = initial.objective ?? '';
	let kind = initial.kind ?? 'LESSON';
	let status = initial.status ?? 'DRAFT';
	let availableFrom = toDateTimeLocal(initial.availableFrom);
	let availableUntil = toDateTimeLocal(initial.availableUntil);
	let durationMinutes = initial.durationMinutes ?? '';
	let maxCorrectionsPerStudent = initial.maxCorrectionsPerStudent ?? '';
	let displayOrder = initial.displayOrder ?? 0;
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
		{ value: 'FRONT', label: 'Vista frontale' },
		{ value: 'SIDE', label: 'Vista laterale' },
		{ value: 'TOP', label: 'Vista dall’alto' },
		{ value: 'ANGLED', label: 'Vista angolata' },
		{ value: 'OTHER', label: 'Altra vista' }
	];

	function dataUrlBytes(dataUrl) {
		return Math.floor((dataUrl.split(',')[1]?.length ?? 0) * 3 / 4);
	}

	async function optimizeImage(file) {
		if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
			throw new Error(`${file.name}: usa un file JPG, PNG, WEBP o AVIF.`);
		}
		if (file.size > 12 * 1024 * 1024) throw new Error(`${file.name}: il file supera 12 MB.`);
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
		if (dataUrlBytes(dataUrl) > 350 * 1024) throw new Error(`${file.name}: non è stato possibile ottimizzare l’immagine.`);
		return dataUrl;
	}

	async function selectReferenceImages(event) {
		imageError = '';
		const files = Array.from(event.currentTarget.files ?? []);
		if (referenceImages.length + files.length > 6) {
			imageError = 'Puoi aggiungere al massimo 6 immagini di riferimento.';
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
			imageError = 'Specifica il nome per ogni vista impostata come “Altra vista”.';
			return;
		}
		await onSubmit({
			title,
			description,
			objective,
			kind,
			status,
			availableFrom: availableFrom ? new Date(availableFrom).toISOString() : null,
			availableUntil: availableUntil ? new Date(availableUntil).toISOString() : null,
			durationMinutes: durationMinutes === '' ? null : Number(durationMinutes),
			maxCorrectionsPerStudent: maxCorrectionsPerStudent === '' ? null : Number(maxCorrectionsPerStudent),
			displayOrder: Number(displayOrder),
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
		<span>1</span><div><h5>Dettagli dell’attività</h5><p>Consegna, obiettivo e disponibilità.</p></div>
	</div>
	<div class="row g-3">
		<div class="col-md-8">
			<label class="form-label fw-semibold" for="activity-title">Titolo</label>
			<input id="activity-title" class="form-control form-control-lg" bind:value={title} maxlength="200" required />
		</div>
		<div class="col-md-4">
			<label class="form-label fw-semibold" for="activity-kind">Tipologia</label>
			<select id="activity-kind" class="form-select form-select-lg" bind:value={kind}>
				<option value="LESSON">Lezione / esercitazione</option>
				<option value="EXAM">Esame</option>
			</select>
		</div>
		<div class="col-12">
			<label class="form-label fw-semibold" for="activity-objective">Obiettivo</label>
			<textarea id="activity-objective" class="form-control" rows="3" bind:value={objective} required placeholder="Cosa deve imparare o consegnare lo studente?"></textarea>
		</div>
		<div class="col-12">
			<label class="form-label fw-semibold" for="activity-description">Istruzioni</label>
			<textarea id="activity-description" class="form-control" rows="5" bind:value={description} placeholder="Descrivi il lavoro richiesto"></textarea>
		</div>
		<div class="col-md-6">
			<label class="form-label fw-semibold" for="activity-from">Disponibile dal</label>
			<input id="activity-from" type="datetime-local" class="form-control" bind:value={availableFrom} />
		</div>
		<div class="col-md-6">
			<label class="form-label fw-semibold" for="activity-until">Disponibile fino al</label>
			<input id="activity-until" type="datetime-local" class="form-control" bind:value={availableUntil} />
		</div>
		<div class="col-md-3">
			<label class="form-label fw-semibold" for="activity-duration">Durata (minuti)</label>
			<input id="activity-duration" type="number" min="1" class="form-control" bind:value={durationMinutes} />
		</div>
		<div class="col-md-3">
			<label class="form-label fw-semibold" for="activity-limit">Correzioni massime</label>
			<input id="activity-limit" type="number" min="1" class="form-control" bind:value={maxCorrectionsPerStudent} />
		</div>
		<div class="col-md-3">
			<label class="form-label fw-semibold" for="activity-order">Ordine</label>
			<input id="activity-order" type="number" class="form-control" bind:value={displayOrder} />
		</div>
		<div class="col-md-3">
			<label class="form-label fw-semibold" for="activity-status">Stato</label>
			<select id="activity-status" class="form-select" bind:value={status}>
				<option value="DRAFT">Bozza</option>
				<option value="PUBLISHED">Pubblicata</option>
				<option value="ARCHIVED">Archiviata</option>
			</select>
		</div>
	</div>
	{#if enableReferenceImages}
		<div class="form-section-heading mt-5">
			<span>2</span><div><h5>Immagini di riferimento</h5><p>Aggiungi le immagini e indica il tipo di vista per ciascuna.</p></div>
		</div>
		<div class="reference-upload">
			<input bind:this={imageInput} class="visually-hidden" id="activity-reference-images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple on:change={selectReferenceImages} />
			<button class="upload-button" type="button" on:click={() => imageInput?.click()} disabled={referenceImages.length >= 6}>
				<span class="upload-button-icon"><i class="ri-image-add-line"></i></span>
				<span><strong>Scegli le immagini</strong><small>JPG, PNG, WEBP o AVIF · fino a 6 file</small></span>
			</button>
			{#if imageError}<div class="alert alert-danger mt-3 mb-0">{imageError}</div>{/if}
		</div>
		{#if referenceImages.length > 0}
			<div class="reference-grid mt-3">
				{#each referenceImages as image, index (image.key)}
					<article class="reference-card">
						<div class="reference-preview">
							<img src={image.dataUrl} alt={image.altText || image.originalFilename} />
							<span>{index + 1}</span>
							<button type="button" on:click={() => removeReferenceImage(image.key)} aria-label={`Rimuovi ${image.originalFilename}`}><i class="ri-close-line"></i></button>
						</div>
						<div class="p-3">
							<div class="filename" title={image.originalFilename}>{image.originalFilename}</div>
							<label class="form-label small fw-semibold mt-3" for={`image-view-${image.key}`}>Tipo di vista</label>
							<select class="form-select" id={`image-view-${image.key}`} bind:value={image.viewType}>
								{#each viewTypes as type}<option value={type.value}>{type.label}</option>{/each}
							</select>
							{#if image.viewType === 'OTHER'}
								<label class="form-label small fw-semibold mt-3" for={`image-custom-${image.key}`}>Nome della vista</label>
								<input class="form-control" id={`image-custom-${image.key}`} maxlength="100" required bind:value={image.customViewLabel} placeholder="Es. dettaglio materiali" />
							{/if}
							<label class="form-label small fw-semibold mt-3" for={`image-alt-${image.key}`}>Descrizione accessibile</label>
							<input class="form-control" id={`image-alt-${image.key}`} maxlength="500" bind:value={image.altText} placeholder="Descrivi brevemente l’immagine" />
						</div>
					</article>
				{/each}
			</div>
		{/if}
	{/if}
	<div class="d-flex justify-content-end gap-2 mt-4">
		{#if onCancel}
			<button class="btn btn-light" type="button" on:click={onCancel}>Annulla</button>
		{:else}
			<a class="btn btn-light" href={cancelHref}>Annulla</a>
		{/if}
		<button class="btn btn-success px-4" type="submit" disabled={busy || !title.trim() || !objective.trim()}>
			{#if busy}<span class="spinner-border spinner-border-sm me-2"></span>{/if}{submitLabel}
		</button>
	</div>
</form>

<style>
	.form-section-heading { display: flex; align-items: center; gap: .85rem; padding-bottom: 1rem; margin-bottom: 1.25rem; border-bottom: 1px solid var(--bs-border-color); }
	.form-section-heading > span { width: 34px; height: 34px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 11px; color: #fff; background: #405189; font-weight: 700; }
	.form-section-heading h5 { margin: 0 0 .15rem; }
	.form-section-heading p { margin: 0; color: var(--bs-secondary-color); }
	.reference-upload { padding: 1rem; border: 1px dashed color-mix(in srgb, #405189 45%, var(--bs-border-color)); border-radius: 16px; background: color-mix(in srgb, #405189 4%, var(--bs-body-bg)); }
	.upload-button { width: 100%; display: flex; align-items: center; justify-content: center; gap: .9rem; border: 0; color: var(--bs-body-color); background: transparent; padding: .65rem; }
	.upload-button:disabled { opacity: .55; }
	.upload-button span:last-child { display: grid; text-align: left; }
	.upload-button small { color: var(--bs-secondary-color); margin-top: .15rem; }
	.upload-button-icon { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 14px; color: #405189; background: rgba(64,81,137,.12); font-size: 1.35rem; }
	.reference-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 280px)); justify-content: start; gap: 1rem; }
	.reference-card { overflow: hidden; border: 1px solid var(--bs-border-color); border-radius: 16px; background: var(--bs-body-bg); }
	.reference-preview { position: relative; aspect-ratio: 1; background: #111827; }
	.reference-preview img { width: 100%; height: 100%; object-fit: contain; }
	.reference-preview > span { position: absolute; left: .7rem; top: .7rem; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 9px; color: #fff; background: rgba(17,24,39,.78); font-weight: 700; }
	.reference-preview button { position: absolute; right: .7rem; top: .7rem; width: 32px; height: 32px; display: grid; place-items: center; border: 0; border-radius: 10px; color: #fff; background: rgba(220,53,69,.9); font-size: 1.1rem; }
	.filename { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
	@media (max-width: 575.98px) {
		.reference-grid { grid-template-columns: minmax(0, 1fr); }
	}
</style>
