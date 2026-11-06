import { A as escape_html, g as unsubscribe_stores, m as store_get, s as head } from "../../../../../../../../chunks/server.js";
import { r as onDestroy } from "../../../../../../../../chunks/index-server2.js";
import { n as page } from "../../../../../../../../chunks/stores.js";
import "../../../../../../../../chunks/navigation.js";
import "../../../../../../../../chunks/client.js";
import { n as apiRequest } from "../../../../../../../../chunks/api.js";
import "../../../../../../../../chunks/modal-dialog.js";
import { n as CORRECTION_FOCUS_OPTIONS } from "../../../../../../../../chunks/correction-focus.js";
import { t as PageHeader } from "../../../../../../../../chunks/PageHeader.js";
import { t as $format } from "../../../../../../../../chunks/runtime.js";
// src/routes/(protected)/corsi/[id]/esercitazioni/[activityId]/correzione/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let courseId, activityId, requests, selectedRequest, conversationLocked;
		let focusOptions = [...CORRECTION_FOCUS_OPTIONS];
		const correctionCategories = [
			{
				key: "camera",
				label: "correction.camera",
				icon: "ri-camera-lens-line"
			},
			{
				key: "material",
				label: "correction.material",
				icon: "ri-shapes-line"
			},
			{
				key: "texture",
				label: "correction.texture",
				icon: "ri-grid-line"
			},
			{
				key: "light",
				label: "correction.light",
				icon: "ri-sun-line"
			}
		];
		const localRequestImages = /* @__PURE__ */ new Map();
		let activeSession;
		let referenceImages = [];
		let attempts = [];
		let selectedReferenceId = "";
		let correctionFocus = focusOptions[0].id;
		let selectedRequestId = null;
		let errorMessage = "";
		let pollTimer;
		let feedbackAttemptId = null;
		async function loadFeedback(attemptId) {
			feedbackAttemptId = attemptId;
			try {
				const record = await apiRequest(`/api/feedback-correzione?attemptId=${attemptId}`);
				if (feedbackAttemptId !== attemptId) return;
				record?.isUseful;
				record?.studentComment;
				record?.verdict;
				record?.professorComment;
			} catch (error) {
				if (feedbackAttemptId === attemptId) errorMessage = error.message;
			} finally {
				if (feedbackAttemptId === attemptId);
			}
		}
		onDestroy(() => {
			clearInterval(pollTimer);
			for (const url of localRequestImages.values()) URL.revokeObjectURL(url);
		});
		function categoriesForFocus(focus) {
			if (focus === "GENERAL") return correctionCategories;
			const key = {
				CAMERA: "camera",
				MATERIAL: "material",
				TEXTURE: "texture",
				LIGHT: "light"
			}[focus];
			return correctionCategories.filter((category) => category.key === key);
		}
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
				response: attempt.summary || attempt.detectedError || attempt.score != null || attempt.rawResponse || attempt.jobStatus === "completed" ? attempt : null,
				imageUrl: localRequestImages.get(attempt.id) || ""
			}));
		}
		$: courseId = store_get($$store_subs ??= {}, "$page", page).params.id;
		$: activityId = store_get($$store_subs ??= {}, "$page", page).params.activityId;
		$: referenceImages.find((image) => String(image.id) === String(selectedReferenceId));
		$: requests = buildRequests(attempts);
		$: selectedRequest = requests.find((request) => request.id === selectedRequestId) ?? requests.at(-1) ?? null;
		$: conversationLocked = Boolean(activeSession);
		$: conversationLocked && !focusOptions.some((option) => option.id === correctionFocus) && [...focusOptions, ...CORRECTION_FOCUS_OPTIONS.filter((option) => option.id === correctionFocus)];
		$: categoriesForFocus(selectedRequest?.focus || correctionFocus);
		$: if (selectedRequest?.response && selectedRequest.id !== feedbackAttemptId) loadFeedback(selectedRequest.id);
		head("q88v8j", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$_", $format)("correction.imageCorrection"))}</title>`);
			});
		});
		$$renderer.push(`<div class="page-content"><div class="container-fluid py-4">`);
		PageHeader($$renderer, {
			title: store_get($$store_subs ??= {}, "$_", $format)("correction.newRequest"),
			subtitle: store_get($$store_subs ??= {}, "$_", $format)("correction.compareSameView"),
			parentHref: `/corsi/${courseId}/esercitazioni/${activityId}`,
			parentLabel: store_get($$store_subs ??= {}, "$_", $format)("activity.activity")
		});
		$$renderer.push(`<!----> `);
		if (errorMessage) $$renderer.push(`<!--[0--><div class="alert alert-danger"><i class="ri-error-warning-line me-2"></i>${escape_html(errorMessage)}</div>`);
		else $$renderer.push("<!--[-1-->");
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
export { _page as default };
