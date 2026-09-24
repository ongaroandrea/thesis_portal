import { g as unsubscribe_stores, m as store_get, s as head } from "../../../../../../../../chunks/server.js";
import { r as onDestroy } from "../../../../../../../../chunks/index-server2.js";
import { n as page } from "../../../../../../../../chunks/stores.js";
import "../../../../../../../../chunks/api.js";
import { t as PageHeader } from "../../../../../../../../chunks/PageHeader.js";
//#region src/routes/(protected)/corsi/[id]/esercitazioni/[activityId]/correzione/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let courseId, activityId, requests;
		const focusOptions = [
			"Illuminazione",
			"Camera",
			"Materiali",
			"Texture",
			"Qualità generale"
		];
		const localRequestImages = /* @__PURE__ */ new Map();
		let referenceImages = [];
		let attempts = [];
		let selectedReferenceId = "";
		focusOptions[0];
		let selectedRequestId = null;
		let pollTimer;
		onDestroy(() => {
			clearInterval(pollTimer);
			for (const url of localRequestImages.values()) URL.revokeObjectURL(url);
		});
		function buildRequests(allAttempts) {
			return allAttempts.map((attempt) => ({
				id: attempt.id,
				attemptNumber: attempt.attemptNumber,
				createdAt: attempt.createdAt,
				imageName: attempt.imageName,
				viewType: attempt.viewType,
				viewLabel: attempt.viewLabel,
				referenceImageId: attempt.referenceImageId,
				focus: attempt.focus,
				jobId: attempt.jobId || null,
				initialJobStatus: attempt.jobStatus || null,
				cancelledAt: attempt.cancelledAt || null,
				response: attempt.summary || attempt.detectedError || attempt.score != null ? attempt : null,
				imageUrl: localRequestImages.get(attempt.id) || ""
			}));
		}
		$: courseId = store_get($$store_subs ??= {}, "$page", page).params.id;
		$: activityId = store_get($$store_subs ??= {}, "$page", page).params.activityId;
		$: referenceImages.find((image) => String(image.id) === String(selectedReferenceId));
		$: requests = buildRequests(attempts);
		$: requests.find((request) => request.id === selectedRequestId) ?? requests.at(-1);
		head("q88v8j", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>Correzione immagine</title>`);
			});
		});
		$$renderer.push(`<div class="page-content"><div class="container-fluid py-4">`);
		PageHeader($$renderer, {
			title: "Nuova richiesta",
			subtitle: "Confronta la stessa vista",
			parentHref: `/corsi/${courseId}/esercitazioni/${activityId}`,
			parentLabel: "Attività"
		});
		$$renderer.push(`<!----> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push(`<!--[0--><div class="text-center py-5"><div class="spinner-border text-primary"></div></div>`);
		$$renderer.push(`<!--]--></div></div> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { _page as default };
