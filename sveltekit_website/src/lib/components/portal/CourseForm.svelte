<script>
	import { toDateInput } from '$lib/client/api.js';

	export let initial = {};
	export let submitLabel = 'Salva corso';
	export let busy = false;
	export let onSubmit;

	let name = initial.name ?? '';
	let description = initial.description ?? '';
	let startsAt = toDateInput(initial.startsAt);
	let endsAt = toDateInput(initial.endsAt);
	let isActive = initial.isActive ?? true;

	async function submit(event) {
		event.preventDefault();
		await onSubmit({
			name,
			description,
			startsAt: startsAt ? `${startsAt}T00:00:00.000Z` : null,
			endsAt: endsAt ? `${endsAt}T00:00:00.000Z` : null,
			isActive
		});
	}
</script>

<form on:submit={submit}>
	<div class="mb-4">
		<label class="form-label fw-semibold" for="course-name">Nome del corso</label>
		<input id="course-name" class="form-control form-control-lg" bind:value={name} maxlength="200" required placeholder="es. Fotografia digitale" />
	</div>
	<div class="mb-4">
		<label class="form-label fw-semibold" for="course-description">Descrizione</label>
		<textarea id="course-description" class="form-control" rows="5" bind:value={description} maxlength="20000" placeholder="Obiettivi, programma e informazioni utili"></textarea>
	</div>
	<div class="row g-3 mb-4">
		<div class="col-md-6">
			<label class="form-label fw-semibold" for="course-start">Inizio</label>
			<input id="course-start" type="date" class="form-control" bind:value={startsAt} />
		</div>
		<div class="col-md-6">
			<label class="form-label fw-semibold" for="course-end">Fine</label>
			<input id="course-end" type="date" class="form-control" bind:value={endsAt} />
		</div>
	</div>
	<div class="form-check form-switch mb-4">
		<input id="course-active" class="form-check-input" type="checkbox" bind:checked={isActive} />
		<label class="form-check-label" for="course-active">Corso attivo e visibile ai membri autorizzati</label>
	</div>
	<div class="d-flex justify-content-end gap-2">
		<a class="btn btn-light" href="/corsi">Annulla</a>
		<button class="btn btn-success px-4" type="submit" disabled={busy || !name.trim()}>
			{#if busy}<span class="spinner-border spinner-border-sm me-2"></span>{/if}{submitLabel}
		</button>
	</div>
</form>
