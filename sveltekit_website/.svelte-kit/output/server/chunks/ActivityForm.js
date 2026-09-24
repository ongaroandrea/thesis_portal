import { A as escape_html, Lt as fallback, O as attr, i as bind_props, o as ensure_array_like } from "./server.js";
import { o as toDateTimeLocal } from "./api.js";
//#region src/lib/components/portal/ActivityForm.svelte
function ActivityForm($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let initial = fallback($$props["initial"], () => ({}), true);
		let submitLabel = fallback($$props["submitLabel"], "Salva attività");
		let busy = fallback($$props["busy"], false);
		let cancelHref = fallback($$props["cancelHref"], "/corsi");
		let onSubmit = $$props["onSubmit"];
		let onCancel = fallback($$props["onCancel"], null);
		let enableReferenceImages = fallback($$props["enableReferenceImages"], false);
		let initialReferenceImages = fallback($$props["initialReferenceImages"], () => [], true);
		let title = initial.title ?? "";
		let description = initial.description ?? "";
		let objective = initial.objective ?? "";
		let kind = initial.kind ?? "LESSON";
		let status = initial.status ?? "DRAFT";
		let availableFrom = toDateTimeLocal(initial.availableFrom);
		let availableUntil = toDateTimeLocal(initial.availableUntil);
		let durationMinutes = initial.durationMinutes ?? "";
		let maxCorrectionsPerStudent = initial.maxCorrectionsPerStudent ?? "";
		let displayOrder = initial.displayOrder ?? 0;
		let referenceImages = initialReferenceImages.map((image) => ({
			...image,
			key: `existing-${image.id}`,
			existingId: image.id,
			dataUrl: image.storageKey,
			customViewLabel: image.customViewLabel ?? "",
			altText: image.altText ?? ""
		}));
		const viewTypes = [
			{
				value: "FRONT",
				label: "Vista frontale"
			},
			{
				value: "SIDE",
				label: "Vista laterale"
			},
			{
				value: "TOP",
				label: "Vista dall’alto"
			},
			{
				value: "ANGLED",
				label: "Vista angolata"
			},
			{
				value: "OTHER",
				label: "Altra vista"
			}
		];
		$$renderer.push(`<form><div class="form-section-heading svelte-hhdbb8"><span class="svelte-hhdbb8">1</span><div><h5 class="svelte-hhdbb8">Dettagli dell’attività</h5><p class="svelte-hhdbb8">Consegna, obiettivo e disponibilità.</p></div></div> <div class="row g-3"><div class="col-md-8"><label class="form-label fw-semibold" for="activity-title">Titolo</label> <input id="activity-title" class="form-control form-control-lg"${attr("value", title)} maxlength="200" required=""/></div> <div class="col-md-4"><label class="form-label fw-semibold" for="activity-kind">Tipologia</label> `);
		$$renderer.select({
			id: "activity-kind",
			class: "form-select form-select-lg",
			value: kind
		}, ($$renderer) => {
			$$renderer.option({ value: "LESSON" }, ($$renderer) => {
				$$renderer.push(`Lezione / esercitazione`);
			});
			$$renderer.option({ value: "EXAM" }, ($$renderer) => {
				$$renderer.push(`Esame`);
			});
		});
		$$renderer.push(`</div> <div class="col-12"><label class="form-label fw-semibold" for="activity-objective">Obiettivo</label> <textarea id="activity-objective" class="form-control" rows="3" required="" placeholder="Cosa deve imparare o consegnare lo studente?">`);
		const $$body = escape_html(objective);
		if ($$body) $$renderer.push(`${$$body}`);
		$$renderer.push(`</textarea></div> <div class="col-12"><label class="form-label fw-semibold" for="activity-description">Istruzioni</label> <textarea id="activity-description" class="form-control" rows="5" placeholder="Descrivi il lavoro richiesto">`);
		const $$body_1 = escape_html(description);
		if ($$body_1) $$renderer.push(`${$$body_1}`);
		$$renderer.push(`</textarea></div> <div class="col-md-6"><label class="form-label fw-semibold" for="activity-from">Disponibile dal</label> <input id="activity-from" type="datetime-local" class="form-control"${attr("value", availableFrom)}/></div> <div class="col-md-6"><label class="form-label fw-semibold" for="activity-until">Disponibile fino al</label> <input id="activity-until" type="datetime-local" class="form-control"${attr("value", availableUntil)}/></div> <div class="col-md-3"><label class="form-label fw-semibold" for="activity-duration">Durata (minuti)</label> <input id="activity-duration" type="number" min="1" class="form-control"${attr("value", durationMinutes)}/></div> <div class="col-md-3"><label class="form-label fw-semibold" for="activity-limit">Correzioni massime</label> <input id="activity-limit" type="number" min="1" class="form-control"${attr("value", maxCorrectionsPerStudent)}/></div> <div class="col-md-3"><label class="form-label fw-semibold" for="activity-order">Ordine</label> <input id="activity-order" type="number" class="form-control"${attr("value", displayOrder)}/></div> <div class="col-md-3"><label class="form-label fw-semibold" for="activity-status">Stato</label> `);
		$$renderer.select({
			id: "activity-status",
			class: "form-select",
			value: status
		}, ($$renderer) => {
			$$renderer.option({ value: "DRAFT" }, ($$renderer) => {
				$$renderer.push(`Bozza`);
			});
			$$renderer.option({ value: "PUBLISHED" }, ($$renderer) => {
				$$renderer.push(`Pubblicata`);
			});
			$$renderer.option({ value: "ARCHIVED" }, ($$renderer) => {
				$$renderer.push(`Archiviata`);
			});
		});
		$$renderer.push(`</div></div> `);
		if (enableReferenceImages) {
			$$renderer.push(`<!--[0--><div class="form-section-heading mt-5 svelte-hhdbb8"><span class="svelte-hhdbb8">2</span><div><h5 class="svelte-hhdbb8">Immagini di riferimento</h5><p class="svelte-hhdbb8">Aggiungi le immagini e indica il tipo di vista per ciascuna.</p></div></div> <div class="reference-upload svelte-hhdbb8"><input class="visually-hidden" id="activity-reference-images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple=""/> <button class="upload-button svelte-hhdbb8" type="button"${attr("disabled", referenceImages.length >= 6, true)}><span class="upload-button-icon svelte-hhdbb8"><i class="ri-image-add-line"></i></span> <span class="svelte-hhdbb8"><strong>Scegli le immagini</strong><small class="svelte-hhdbb8">JPG, PNG, WEBP o AVIF · fino a 6 file</small></span></button> `);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div> `);
			if (referenceImages.length > 0) {
				$$renderer.push(`<!--[0--><div class="reference-grid mt-3 svelte-hhdbb8"><!--[-->`);
				const each_array = ensure_array_like(referenceImages);
				for (let index = 0, $$length = each_array.length; index < $$length; index++) {
					let image = each_array[index];
					$$renderer.push(`<article class="reference-card svelte-hhdbb8"><div class="reference-preview svelte-hhdbb8"><img${attr("src", image.dataUrl)}${attr("alt", image.altText || image.originalFilename)} class="svelte-hhdbb8"/> <span class="svelte-hhdbb8">${escape_html(index + 1)}</span> <button type="button"${attr("aria-label", `Rimuovi ${image.originalFilename}`)} class="svelte-hhdbb8"><i class="ri-close-line"></i></button></div> <div class="p-3"><div class="filename svelte-hhdbb8"${attr("title", image.originalFilename)}>${escape_html(image.originalFilename)}</div> <label class="form-label small fw-semibold mt-3"${attr("for", `image-view-${image.key}`)}>Tipo di vista</label> `);
					$$renderer.select({
						class: "form-select",
						id: `image-view-${image.key}`,
						value: image.viewType
					}, ($$renderer) => {
						$$renderer.push(`<!--[-->`);
						const each_array_1 = ensure_array_like(viewTypes);
						for (let $$index = 0, $$length = each_array_1.length; $$index < $$length; $$index++) {
							let type = each_array_1[$$index];
							$$renderer.option({ value: type.value }, ($$renderer) => {
								$$renderer.push(`${escape_html(type.label)}`);
							});
						}
						$$renderer.push(`<!--]-->`);
					});
					$$renderer.push(` `);
					if (image.viewType === "OTHER") $$renderer.push(`<!--[0--><label class="form-label small fw-semibold mt-3"${attr("for", `image-custom-${image.key}`)}>Nome della vista</label> <input class="form-control"${attr("id", `image-custom-${image.key}`)} maxlength="100" required=""${attr("value", image.customViewLabel)} placeholder="Es. dettaglio materiali"/>`);
					else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> <label class="form-label small fw-semibold mt-3"${attr("for", `image-alt-${image.key}`)}>Descrizione accessibile</label> <input class="form-control"${attr("id", `image-alt-${image.key}`)} maxlength="500"${attr("value", image.altText)} placeholder="Descrivi brevemente l’immagine"/></div></article>`);
				}
				$$renderer.push(`<!--]--></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="d-flex justify-content-end gap-2 mt-4">`);
		if (onCancel) $$renderer.push(`<!--[0--><button class="btn btn-light" type="button">Annulla</button>`);
		else $$renderer.push(`<!--[-1--><a class="btn btn-light"${attr("href", cancelHref)}>Annulla</a>`);
		$$renderer.push(`<!--]--> <button class="btn btn-success px-4" type="submit"${attr("disabled", busy || !title.trim() || !objective.trim(), true)}>`);
		if (busy) $$renderer.push(`<!--[0--><span class="spinner-border spinner-border-sm me-2"></span>`);
		else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->${escape_html(submitLabel)}</button></div></form>`);
		bind_props($$props, {
			initial,
			submitLabel,
			busy,
			cancelHref,
			onSubmit,
			onCancel,
			enableReferenceImages,
			initialReferenceImages
		});
	});
}
//#endregion
export { ActivityForm as t };
