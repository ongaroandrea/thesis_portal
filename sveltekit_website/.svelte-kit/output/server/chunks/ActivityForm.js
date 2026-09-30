import { A as escape_html, O as attr, Rt as fallback, g as unsubscribe_stores, i as bind_props, k as clsx, m as store_get, o as ensure_array_like, t as attr_class } from "./server.js";
import { n as CORRECTION_FOCUS_OPTIONS, r as DEFAULT_CORRECTION_FOCUS_IDS } from "./correction-focus.js";
import { t as $format } from "./runtime.js";
import { o as toDateTimeLocal } from "./api.js";
//#region src/lib/components/portal/ActivityForm.svelte
function ActivityForm($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let allTopicsSelected;
		let initial = fallback($$props["initial"], () => ({}), true);
		let submitLabel = fallback($$props["submitLabel"], "");
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
		let resultsReleasedAt = toDateTimeLocal(initial.resultsReleasedAt);
		let durationMinutes = initial.durationMinutes ?? "";
		let maxCorrectionsPerStudent = initial.maxCorrectionsPerStudent ?? "";
		let displayOrder = initial.displayOrder ?? 0;
		let allowedCorrectionFocuses = Array.isArray(initial.allowedCorrectionFocuses) && initial.allowedCorrectionFocuses.length ? [...initial.allowedCorrectionFocuses] : [...DEFAULT_CORRECTION_FOCUS_IDS];
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
				key: "view.front"
			},
			{
				value: "SIDE",
				key: "view.side"
			},
			{
				value: "TOP",
				key: "view.top"
			},
			{
				value: "ANGLED",
				key: "view.angled"
			},
			{
				value: "OTHER",
				key: "view.other"
			}
		];
		const topicIcons = {
			LIGHT: "ri-sun-line",
			CAMERA: "ri-camera-lens-line",
			MATERIAL: "ri-shapes-line",
			TEXTURE: "ri-grid-line",
			GENERAL: "ri-focus-3-line"
		};
		$: allTopicsSelected = allowedCorrectionFocuses.length === CORRECTION_FOCUS_OPTIONS.length;
		$$renderer.push(`<form><div class="form-section-heading svelte-hhdbb8"><span class="svelte-hhdbb8">1</span><div><h5 class="svelte-hhdbb8">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.details"))}</h5><p class="svelte-hhdbb8">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.detailsHelp"))}</p></div></div> <div class="row g-3"><div class="col-md-8"><label class="form-label fw-semibold" for="activity-title">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("common.title"))}</label> <input id="activity-title" class="form-control form-control-lg"${attr("value", title)} maxlength="200" required=""/></div> <div class="col-md-4"><label class="form-label fw-semibold" for="activity-kind">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.kind"))}</label> `);
		$$renderer.select({
			id: "activity-kind",
			class: "form-select form-select-lg",
			value: kind
		}, ($$renderer) => {
			$$renderer.option({ value: "LESSON" }, ($$renderer) => {
				$$renderer.push(`${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.lesson"))}`);
			});
			$$renderer.option({ value: "EXAM" }, ($$renderer) => {
				$$renderer.push(`${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.exam"))}`);
			});
		});
		$$renderer.push(`</div> <div class="col-12"><label class="form-label fw-semibold" for="activity-objective">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.objective"))}</label> <textarea id="activity-objective" class="form-control" rows="3" required=""${attr("placeholder", store_get($$store_subs ??= {}, "$_", $format)("activity.objectivePlaceholder"))}>`);
		const $$body = escape_html(objective);
		if ($$body) $$renderer.push(`${$$body}`);
		$$renderer.push(`</textarea></div> <div class="col-12"><label class="form-label fw-semibold" for="activity-description">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.instructions"))}</label> <textarea id="activity-description" class="form-control" rows="5"${attr("placeholder", store_get($$store_subs ??= {}, "$_", $format)("activity.instructionsPlaceholder"))}>`);
		const $$body_1 = escape_html(description);
		if ($$body_1) $$renderer.push(`${$$body_1}`);
		$$renderer.push(`</textarea></div> <div class="col-md-6"><label class="form-label fw-semibold" for="activity-from">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.availableFrom"))}</label> <input id="activity-from" type="datetime-local" class="form-control"${attr("value", availableFrom)}/></div> <div class="col-md-6"><label class="form-label fw-semibold" for="activity-until">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.availableUntil"))}</label> <input id="activity-until" type="datetime-local" class="form-control"${attr("value", availableUntil)}${attr("required", kind === "EXAM", true)}/></div> `);
		if (kind === "EXAM") $$renderer.push(`<!--[0--><div class="col-12"><label class="form-label fw-semibold" for="activity-results-release">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("exam.resultsRelease"))}</label> <input id="activity-results-release" type="datetime-local" class="form-control"${attr("value", resultsReleasedAt)}/> <div class="form-text">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("exam.resultsReleaseHelp"))}</div></div>`);
		else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="col-md-3"><label class="form-label fw-semibold" for="activity-duration">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.durationMinutes"))}</label> <input id="activity-duration" type="number" min="1" class="form-control"${attr("value", durationMinutes)}/></div> `);
		if (kind !== "EXAM") $$renderer.push(`<!--[0--><div class="col-md-3"><label class="form-label fw-semibold" for="activity-limit">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.maxCorrections"))}</label> <input id="activity-limit" type="number" min="1" class="form-control"${attr("value", maxCorrectionsPerStudent)}/></div>`);
		else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="col-md-3"><label class="form-label fw-semibold" for="activity-order">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("common.order"))}</label> <input id="activity-order" type="number" class="form-control"${attr("value", displayOrder)}/></div> <div class="col-md-3"><label class="form-label fw-semibold" for="activity-status">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("common.status"))}</label> `);
		$$renderer.select({
			id: "activity-status",
			class: "form-select",
			value: status
		}, ($$renderer) => {
			$$renderer.option({ value: "DRAFT" }, ($$renderer) => {
				$$renderer.push(`${escape_html(store_get($$store_subs ??= {}, "$_", $format)("status.draft"))}`);
			});
			$$renderer.option({ value: "PUBLISHED" }, ($$renderer) => {
				$$renderer.push(`${escape_html(store_get($$store_subs ??= {}, "$_", $format)("status.published"))}`);
			});
			$$renderer.option({ value: "ARCHIVED" }, ($$renderer) => {
				$$renderer.push(`${escape_html(store_get($$store_subs ??= {}, "$_", $format)("status.archived"))}`);
			});
		});
		$$renderer.push(`</div></div> `);
		if (kind !== "EXAM") {
			$$renderer.push(`<!--[0--><div class="form-section-heading mt-5 svelte-hhdbb8"><span class="svelte-hhdbb8">2</span><div><h5 class="svelte-hhdbb8">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.correctionTopics"))}</h5><p class="svelte-hhdbb8">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.correctionTopicsHelp"))}</p></div></div> <div${attr_class("topic-selector svelte-hhdbb8", void 0, { "invalid": allowedCorrectionFocuses.length === 0 })}><label${attr_class("topic-option topic-all svelte-hhdbb8", void 0, { "selected": allTopicsSelected })}><input type="checkbox"${attr("checked", allTopicsSelected, true)} class="svelte-hhdbb8"/> <span class="topic-icon svelte-hhdbb8"><i class="ri-apps-2-line"></i></span> <span class="svelte-hhdbb8"><strong>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.allTopics"))}</strong><small class="svelte-hhdbb8">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.allTopicsHelp"))}</small></span></label> <div class="topic-grid svelte-hhdbb8"><!--[-->`);
			const each_array = ensure_array_like(CORRECTION_FOCUS_OPTIONS);
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let option = each_array[$$index];
				$$renderer.push(`<label${attr_class("topic-option svelte-hhdbb8", void 0, { "selected": allowedCorrectionFocuses.includes(option.id) })}><input type="checkbox"${attr("checked", allowedCorrectionFocuses.includes(option.id), true)} class="svelte-hhdbb8"/> <span class="topic-icon svelte-hhdbb8"><i${attr_class(clsx(topicIcons[option.id]), "svelte-hhdbb8")}></i></span> <span class="svelte-hhdbb8"><strong>${escape_html(store_get($$store_subs ??= {}, "$_", $format)(option.labelKey))}</strong><small class="svelte-hhdbb8">${escape_html(store_get($$store_subs ??= {}, "$_", $format)(`activity.topicHelp.${option.id.toLowerCase()}`))}</small></span></label>`);
			}
			$$renderer.push(`<!--]--></div> `);
			if (allowedCorrectionFocuses.length === 0) $$renderer.push(`<!--[0--><p class="topic-error mb-0 svelte-hhdbb8"><i class="ri-error-warning-line"></i>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.selectTopicError"))}</p>`);
			else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (enableReferenceImages) {
			$$renderer.push(`<!--[0--><div class="form-section-heading mt-5 svelte-hhdbb8"><span class="svelte-hhdbb8">${escape_html(kind === "EXAM" ? 2 : 3)}</span><div><h5 class="svelte-hhdbb8">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.referenceImages"))}</h5><p class="svelte-hhdbb8">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.referenceImagesHelp"))}</p></div></div> <div class="reference-upload svelte-hhdbb8"><input class="visually-hidden" id="activity-reference-images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple=""/> <button class="upload-button svelte-hhdbb8" type="button"${attr("disabled", referenceImages.length >= 6, true)}><span class="upload-button-icon svelte-hhdbb8"><i class="ri-image-add-line"></i></span> <span class="svelte-hhdbb8"><strong>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.chooseImages"))}</strong><small class="svelte-hhdbb8">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.imageFormats"))}</small></span></button> `);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div> `);
			if (referenceImages.length > 0) {
				$$renderer.push(`<!--[0--><div class="reference-grid mt-3 svelte-hhdbb8"><!--[-->`);
				const each_array_1 = ensure_array_like(referenceImages);
				for (let index = 0, $$length = each_array_1.length; index < $$length; index++) {
					let image = each_array_1[index];
					$$renderer.push(`<article class="reference-card svelte-hhdbb8"><div class="reference-preview svelte-hhdbb8"><img${attr("src", image.dataUrl)}${attr("alt", image.altText || image.originalFilename)} class="svelte-hhdbb8"/> <span class="svelte-hhdbb8">${escape_html(index + 1)}</span> <button type="button"${attr("aria-label", store_get($$store_subs ??= {}, "$_", $format)("activity.removeImage", { values: { name: image.originalFilename } }))} class="svelte-hhdbb8"><i class="ri-close-line"></i></button></div> <div class="p-3"><div class="filename svelte-hhdbb8"${attr("title", image.originalFilename)}>${escape_html(image.originalFilename)}</div> <label class="form-label small fw-semibold mt-3"${attr("for", `image-view-${image.key}`)}>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.viewType"))}</label> `);
					$$renderer.select({
						class: "form-select",
						id: `image-view-${image.key}`,
						value: image.viewType
					}, ($$renderer) => {
						$$renderer.push(`<!--[-->`);
						const each_array_2 = ensure_array_like(viewTypes);
						for (let $$index_1 = 0, $$length = each_array_2.length; $$index_1 < $$length; $$index_1++) {
							let type = each_array_2[$$index_1];
							$$renderer.option({ value: type.value }, ($$renderer) => {
								$$renderer.push(`${escape_html(store_get($$store_subs ??= {}, "$_", $format)(type.key))}`);
							});
						}
						$$renderer.push(`<!--]-->`);
					});
					$$renderer.push(` `);
					if (image.viewType === "OTHER") $$renderer.push(`<!--[0--><label class="form-label small fw-semibold mt-3"${attr("for", `image-custom-${image.key}`)}>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.viewName"))}</label> <input class="form-control"${attr("id", `image-custom-${image.key}`)} maxlength="100" required=""${attr("value", image.customViewLabel)}${attr("placeholder", store_get($$store_subs ??= {}, "$_", $format)("activity.viewNamePlaceholder"))}/>`);
					else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> <label class="form-label small fw-semibold mt-3"${attr("for", `image-alt-${image.key}`)}>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("activity.altText"))}</label> <input class="form-control"${attr("id", `image-alt-${image.key}`)} maxlength="500"${attr("value", image.altText)}${attr("placeholder", store_get($$store_subs ??= {}, "$_", $format)("activity.altTextPlaceholder"))}/></div></article>`);
				}
				$$renderer.push(`<!--]--></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="d-flex justify-content-end gap-2 mt-4">`);
		if (onCancel) $$renderer.push(`<!--[0--><button class="btn btn-light" type="button">${escape_html(store_get($$store_subs ??= {}, "$_", $format)("common.cancel"))}</button>`);
		else $$renderer.push(`<!--[-1--><a class="btn btn-light"${attr("href", cancelHref)}>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("common.cancel"))}</a>`);
		$$renderer.push(`<!--]--> <button class="btn btn-success px-4" type="submit"${attr("disabled", busy || !title.trim() || !objective.trim() || kind !== "EXAM" && allowedCorrectionFocuses.length === 0, true)}>`);
		if (busy) $$renderer.push(`<!--[0--><span class="spinner-border spinner-border-sm me-2"></span>`);
		else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->${escape_html(submitLabel || store_get($$store_subs ??= {}, "$_", $format)("activity.save"))}</button></div></form>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
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
