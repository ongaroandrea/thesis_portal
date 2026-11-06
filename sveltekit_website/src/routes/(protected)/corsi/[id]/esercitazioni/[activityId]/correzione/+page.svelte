<script>
    import { onMount, onDestroy } from "svelte";
    import { page } from "$app/stores";
	import { goto } from "$app/navigation";
    import {
        apiListRequest,
        apiRequest,
        formatDateTime,
    } from "$lib/client/api.js";
	import { modalDialog } from "$lib/client/modal-dialog.js";
    import { CORRECTION_FOCUS_OPTIONS, allowedCorrectionFocusIds } from "$lib/correction-focus.js";
    import PageHeader from "$lib/components/portal/PageHeader.svelte";
    import { _ } from 'svelte-i18n';

    let focusOptions = [...CORRECTION_FOCUS_OPTIONS];
    const correctionCategories = [
		{ key: "camera", label: 'correction.camera', icon: "ri-camera-lens-line" },
		{ key: "material", label: 'correction.material', icon: "ri-shapes-line" },
		{ key: "texture", label: 'correction.texture', icon: "ri-grid-line" },
		{ key: "light", label: 'correction.light', icon: "ri-sun-line" },
    ];
    const localRequestImages = new Map();
    let course, activity, activeSession;
    let referenceImages = [],
        sessions = [],
        attempts = [];
    let imageUrl = "",
        imageName = "",
        imageFile = null,
        selectedReferenceId = "",
		correctionFocus = focusOptions[0].id;
    let selectedRequestId = null,
        isAnonymous = false,
        loading = true,
        sending = false;
    let errorMessage = "",
        successMessage = "";
    let pendingReplacement = null,
        jobStates = {},
        correctionIndexes = {},
        pollTimer;
	let feedback = null,
		feedbackLoading = false,
		feedbackSaving = false,
		feedbackAttemptId = null,
		isUseful = null,
		studentComment = "",
		verdict = "",
		professorComment = "",
		feedbackSaved = false;

    $: courseId = $page.params.id;
	// "Saved" stays visible only while the form still matches the stored record.
	$: studentFeedbackSaved = feedbackSaved && feedback
		&& isUseful === (feedback.isUseful ?? null) && studentComment === (feedback.studentComment ?? "");
	$: professorFeedbackSaved = feedbackSaved && feedback
		&& verdict === (feedback.verdict ?? "") && professorComment === (feedback.professorComment ?? "");
    $: activityId = $page.params.activityId;
    $: selectedReference =
        referenceImages.find(
            (image) => String(image.id) === String(selectedReferenceId),
        ) ?? null;
    $: requests = buildRequests(attempts);
    $: selectedRequest =
        requests.find((request) => request.id === selectedRequestId) ??
        requests.at(-1) ??
        null;
    $: conversationLocked = Boolean(
        activeSession &&
        (activeSession.referenceImageId ||
            activeSession.analysisFocus ||
            requests.length),
    );
	$: visibleFocusOptions = conversationLocked && !focusOptions.some((option) => option.id === correctionFocus)
		? [...focusOptions, ...CORRECTION_FOCUS_OPTIONS.filter((option) => option.id === correctionFocus)]
		: focusOptions;
    $: visibleCorrectionCategories = categoriesForFocus(
        selectedRequest?.focus || correctionFocus,
    );
	$: if (selectedRequest?.response && selectedRequest.id !== feedbackAttemptId) {
		loadFeedback(selectedRequest.id);
	}

	/**
	 * Load the feedback form state for one attempt.
	 * Triggered reactively whenever a different answered request is selected.
	 * `feedbackAttemptId` doubles as a race guard: if the user switches
	 * request while this fetch is in flight, the stale result is dropped.
	 * @param {number} attemptId
	 */
	async function loadFeedback(attemptId) {
		feedbackAttemptId = attemptId;
		feedbackLoading = true;
		feedbackSaved = false;
		try {
			const record = await apiRequest(`/api/feedback-correzione?attemptId=${attemptId}`);
			if (feedbackAttemptId !== attemptId) return;
			feedback = record;
			isUseful = record?.isUseful ?? null;
			studentComment = record?.studentComment ?? "";
			verdict = record?.verdict ?? "";
			professorComment = record?.professorComment ?? "";
		} catch (error) {
			if (feedbackAttemptId === attemptId) errorMessage = error.message;
		} finally {
			if (feedbackAttemptId === attemptId) feedbackLoading = false;
		}
	}

	async function saveStudentFeedback(value) {
		isUseful = value;
		await saveFeedback({ isUseful, studentComment });
	}

	async function saveProfessorReview() {
		if (!verdict) return;
		await saveFeedback({ verdict, professorComment });
	}

	/**
	 * Upsert feedback for the selected attempt (PUT is idempotent per
	 * attempt). Students send `isUseful`/`studentComment`, professors send
	 * `verdict`/`professorComment`; the form fields are then refreshed from
	 * the saved record so they reflect what the server actually stored.
	 * @param {object} payload
	 */
	async function saveFeedback(payload) {
		if (!selectedRequest?.id) return;
		feedbackSaving = true;
		feedbackSaved = false;
		errorMessage = "";
		try {
			feedback = await apiRequest(`/api/feedback-correzione?attemptId=${selectedRequest.id}`, {
				method: "PUT",
				body: JSON.stringify(payload),
			});
			isUseful = feedback.isUseful ?? null;
			studentComment = feedback.studentComment ?? "";
			verdict = feedback.verdict ?? "";
			professorComment = feedback.professorComment ?? "";
			// Confirmed inline next to the save button (the page-level alert
			// sits far above the form, out of view).
			feedbackSaved = true;
		} catch (error) {
			errorMessage = error.message;
		} finally {
			feedbackSaving = false;
		}
	}

    // Load course, activity and reference images, redirect exams to their own
    // page, then pick the session to show: the one in ?session=, else the
    // newest non-failed one. Settings (view, focus) are locked per session.
    async function loadWorkspace() {
        try {
            [course, activity, referenceImages] = await Promise.all([
                apiRequest(`/api/corsi/${courseId}`),
                apiRequest(`/api/esercitazioni/${activityId}`),
                apiRequest(`/api/esercitazioni/${activityId}/immagini`)
            ]);
			if (activity.kind === 'EXAM') {
				await goto(`/corsi/${courseId}/esercitazioni/${activityId}`);
				return;
			}
			sessions = await apiListRequest(`/api/sessioni-correzione?activityId=${activityId}`);
            const allowedFocusIds = allowedCorrectionFocusIds(activity);
            focusOptions = CORRECTION_FOCUS_OPTIONS.filter((option) => allowedFocusIds.includes(option.id));
            correctionFocus = focusOptions[0]?.id ?? "CAMERA";
            selectedReferenceId = referenceImages[0]?.id
                ? String(referenceImages[0].id)
                : "";
            const requested = Number($page.url.searchParams.get("session"));
            activeSession =
                sessions.find((item) => item.id === requested) ??
				sessions.find((item) => item.status !== "FAILED") ??
                null;
            if (activeSession) {
                attempts = await apiListRequest(
                    `/api/tentativi-correzione?sessionId=${activeSession.id}`,
                );
                applyConversationSettings(activeSession, attempts);
            }
        } catch (error) {
            errorMessage = error.message;
        } finally {
            loading = false;
        }
    }

    // Poll every 5 s for as long as the page is open; the timer and every
    // object URL created for image previews are released in onDestroy.
    onMount(async () => {
        await loadWorkspace();
        await refreshJobs();
        pollTimer = setInterval(refreshJobs, 5000);
    });
    onDestroy(() => {
        clearInterval(pollTimer);
        if (imageUrl) URL.revokeObjectURL(imageUrl);
        for (const url of localRequestImages.values()) URL.revokeObjectURL(url);
    });

    function viewLabel(image) {
		if (!image) return $_('view.unavailable');
        if (image.viewType === "OTHER")
			return image.customViewLabel || $_('view.other');
        return (
            {
				FRONT: $_('view.front'),
				SIDE: $_('view.side'),
				TOP: $_('view.top'),
				ANGLED: $_('view.angled'),
			}[image.viewType] ?? image.viewType
        );
    }

    // File input handler. Mirrors the server limits (image, max 12 MB) to
    // fail fast, and swaps the preview object URL, revoking the old one.
    function selectImage(event) {
        const file = event.currentTarget.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
			errorMessage = $_('correction.invalidImage');
            return;
        }
        if (file.size > 12 * 1024 * 1024) {
			errorMessage = $_('correction.imageTooLarge');
            return;
        }
        if (imageUrl) URL.revokeObjectURL(imageUrl);
        imageUrl = URL.createObjectURL(file);
        imageName = file.name;
        imageFile = file;
        errorMessage = "";
    }

    function responseDetails(attempt) {
        if (!attempt)
            return { evaluation: "", error: "", score: null, result: null };
        return {
            evaluation: attempt.summary || "",
            error: attempt.detectedError || "",
            score: attempt.score ?? null,
            result: attempt.rawResponse?.result || attempt.rawResponse || null,
        };
    }

    // Display data for a request: the persisted attempt when available,
    // otherwise the latest polled job state (so results show up before the
    // attempt row is reloaded).
    function requestDetails(request) {
        if (request?.response) return responseDetails(request.response);
        const job = request?.jobId ? jobStates[request.jobId] : null;
        return {
            evaluation:
                job?.result?.evaluation ||
                job?.result?.summary ||
                job?.result?.answer ||
                "",
            error: job?.error || job?.result?.error || "",
            score: job?.result?.score ?? null,
            result: job?.result || null,
        };
    }

    function categoriesForFocus(focus) {
        if (focus === "GENERAL") return correctionCategories;
        const key = {
            CAMERA: "camera",
            MATERIAL: "material",
            TEXTURE: "texture",
            LIGHT: "light",
        }[focus];
        return correctionCategories.filter((category) => category.key === key);
    }

    function focusLabel(focusId) {
        const option = CORRECTION_FOCUS_OPTIONS.find((item) => item.id === focusId);
        return option ? $_(option.labelKey) : focusId;
    }

    // Model output comes in two shapes: `general` jobs return
    // { analyses: { camera, light, ... } }, single-topic jobs return
    // { type, analysis }. Return the analysis block for one category.
    function analysisForCategory(details, categoryKey) {
        const result = details?.result || {};
        const nested = result.analyses?.[categoryKey] ?? result[categoryKey];
        if (nested) return nested.analysis || nested;
        if (result.type === categoryKey) return result.analysis || null;
        return null;
    }

    // Current prompt schemas use `changed_parameters`; `corrections` is the
    // older field name, still found in stored results.
    function correctionsForAnalysis(analysis) {
        if (!analysis) return [];
        if (Array.isArray(analysis.changed_parameters))
            return analysis.changed_parameters;
        if (Array.isArray(analysis.corrections)) return analysis.corrections;
        return [];
    }

    function selectedCorrection(categoryKey, corrections) {
        if (!corrections.length) return null;
        const index = Math.min(
            correctionIndexes[categoryKey] || 0,
            corrections.length - 1,
        );
        return corrections[index];
    }

    function moveCorrection(categoryKey, direction, total) {
        if (total < 2) return;
        const current = correctionIndexes[categoryKey] || 0;
        correctionIndexes = {
            ...correctionIndexes,
            [categoryKey]: (current + direction + total) % total,
        };
    }

    function correctionScore(correction, analysis, details) {
        return correction?.score ?? analysis?.score ?? details?.score ?? null;
    }

    function displayValue(value) {
        if (value === undefined || value === null || value === "") return "—";
        return String(value).replaceAll("_", " ");
    }

    // Turn stored attempts into the chat-like request list. `response` is set
    // only when the attempt already has a persisted result.
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
            response:
                attempt.summary ||
                attempt.detectedError ||
                attempt.score != null ||
                attempt.rawResponse ||
                attempt.jobStatus === "completed"
                    ? attempt
                    : null,
            imageUrl: localRequestImages.get(attempt.id) || "",
        }));
    }

    // Restore the locked view and focus of a session into the form controls.
    // Falls back to the first attempt's values when the session row has
    // none; ids that are no longer available are ignored.
    function applyConversationSettings(session, sessionMessages) {
        const firstRequest = buildRequests(sessionMessages)[0];
        const referenceImageId =
            session?.referenceImageId ?? firstRequest?.referenceImageId;
        const analysisFocus = session?.analysisFocus ?? firstRequest?.focus;
        if (
            referenceImages.some(
                (image) => String(image.id) === String(referenceImageId),
            )
        ) {
            selectedReferenceId = String(referenceImageId);
        }
		if (CORRECTION_FOCUS_OPTIONS.some((option) => option.id === analysisFocus))
            correctionFocus = analysisFocus;
    }

    // Badge for a request. Precedence: cancelled (replaced) > persisted
    // result > live polled status > status stored on the attempt.
    // `label` is an i18n key.
    function requestStatus(request) {
        if (request.cancelledAt)
            return {
				label: 'correction.replaced',
                className: "status-cancelled",
                icon: "ri-close-circle-line",
            };
        if (request.response)
            return {
				label: 'correction.evaluated',
                className: "status-completed",
                icon: "ri-checkbox-circle-line",
            };
        const status =
            jobStates[request.jobId]?.status || request.initialJobStatus;
        if (status === "completed")
            return {
				label: 'correction.evaluated',
                className: "status-completed",
                icon: "ri-checkbox-circle-line",
            };
        if (status === "failed")
            return {
				label: 'status.failed',
                className: "status-failed",
                icon: "ri-error-warning-line",
            };
        if (status === "processing")
            return {
				label: 'correction.evaluating',
                className: "status-processing",
                icon: "ri-loader-4-line",
            };
        if (status === "queued")
            return {
				label: 'correction.queued',
                className: "status-queued",
                icon: "ri-time-line",
            };
        return {
			label: 'correction.waiting',
            className: "status-queued",
            icon: "ri-time-line",
        };
    }

    function isOngoing(request) {
        if (!request || request.cancelledAt || request.response) return false;
        const status =
            jobStates[request.jobId]?.status || request.initialJobStatus;
        return status === "queued" || status === "processing";
    }

    // Values sent back with PATCH /api/tentativi-correzione/:id when a job
    // finishes. The server ignores them (it persists results itself during
    // the signed job poll); the PATCH only returns the fresh attempt row.
    function completedAttemptValues(job) {
        const result = job?.result || {};
        const firstError = Array.isArray(result.errors)
            ? result.errors[0]
            : null;
        const values = {
            jobStatus: job.status,
            rawResponse: job,
            completedAt:
                job.completedAt ||
                result.completedAt ||
                new Date().toISOString(),
        };
        const summary = result.summary || result.evaluation || result.answer;
        const detectedError =
            result.error ||
            result.currentError ||
            firstError?.title ||
            firstError?.description;
        const failureReason = job.error || result.failureReason;
        if (job.provider || result.provider)
            values.provider = job.provider || result.provider;
        if (job.model || result.model) values.model = job.model || result.model;
        if (job.promptVersion || result.promptVersion)
            values.promptVersion = job.promptVersion || result.promptVersion;
        if (job.startedAt || result.startedAt)
            values.startedAt = job.startedAt || result.startedAt;
        if (summary) values.summary = summary;
        if (detectedError) values.detectedError = detectedError;
        if (failureReason) values.failureReason = failureReason;
        if (result.score != null) values.score = result.score;
        return values;
    }

    // Polling loop (every 5 s, see onMount): ask the portal for the state of
    // each unfinished job in the active session. A job unknown to Python
    // (e.g. after a worker restart) is shown as failed. Finished jobs trigger
    // a reload of the attempt so the saved result is displayed.
    async function refreshJobs() {
        if (!activeSession) return;
        const pending = requests.filter(
            (request) =>
                request.jobId &&
                !request.cancelledAt &&
                !request.response &&
                !["completed", "failed"].includes(
                    jobStates[request.jobId]?.status,
                ),
        );
        if (!pending.length) return;
        const updates = await Promise.all(
            pending.map(async (request) => {
                let job;
                try {
                    job = await apiRequest(
                        `/api/sessioni-correzione/${activeSession.id}/job?jobId=${encodeURIComponent(request.jobId)}`,
                    );
                } catch (error) {
                    if (error.code !== "CONVERSATION_JOB_NOT_FOUND")
                        return null;
                    job = {
                        status: "failed",
                        error: "Il processo non è più disponibile.",
                    };
                }
                let savedAttempt = null;
                if (["completed", "failed"].includes(job.status)) {
                    try {
                        savedAttempt = await apiRequest(
                            `/api/tentativi-correzione/${request.id}`,
                            {
                                method: "PATCH",
                                body: JSON.stringify(
                                    completedAttemptValues(job),
                                ),
                            },
                        );
                    } catch (error) {
                        errorMessage = error.message;
                    }
                }
                return [request.jobId, job, savedAttempt];
            }),
        );
        const next = { ...jobStates };
        for (const update of updates) {
            if (!update) continue;
            next[update[0]] = update[1];
            if (update[2])
                attempts = attempts.map((attempt) =>
                    attempt.id === update[2].id ? update[2] : attempt,
                );
        }
        jobStates = next;
    }

    async function chooseSession(session) {
        activeSession = session;
        attempts = [];
        selectedRequestId = null;
        errorMessage = "";
        try {
            attempts = await apiListRequest(
                `/api/tentativi-correzione?sessionId=${session.id}`,
            );
            applyConversationSettings(session, attempts);
        } catch (error) {
            errorMessage = error.message;
        }
    }

    function startNewConversation() {
        activeSession = null;
        attempts = [];
        selectedRequestId = null;
        selectedReferenceId = referenceImages[0]?.id
            ? String(referenceImages[0].id)
            : "";
		correctionFocus = focusOptions[0].id;
        errorMessage = "";
		successMessage = $_('correction.newConversationReady');
    }

    // Form submit: if a job for the same view is still running, ask the user
    // whether to replace it before submitting.
    async function sendCorrection(event) {
        event.preventDefault();
        if (!imageUrl || !imageFile) {
			errorMessage = $_('correction.uploadRequired');
            return;
        }
        if (!selectedReference) {
			errorMessage = $_('correction.referenceRequired');
            return;
        }
        const duplicate = [...requests]
            .reverse()
            .find(
                (request) =>
                    request.viewType === selectedReference.viewType &&
                    isOngoing(request),
            );
        if (duplicate) {
            pendingReplacement = duplicate;
            return;
        }
        await submitCorrection();
    }

    async function confirmReplacement() {
        const replaced = pendingReplacement;
        pendingReplacement = null;
        await submitCorrection(replaced);
    }

	function closeReplacementDialog() {
		if (!sending) pendingReplacement = null;
	}

    // Create a session if needed, cancel the job being replaced, upload the
    // image to start a new job, then register the attempt. On error, the new
    // job and any session created for this request are rolled back.
    async function submitCorrection(replaced = null) {
        sending = true;
        errorMessage = "";
        successMessage = "";
        let createdSessionForRequest = false;
        let startedJob = null;
        try {
            if (
                !activeSession ||
				activeSession.status === "FAILED"
            ) {
                activeSession = await apiRequest("/api/sessioni-correzione", {
                    method: "POST",
                    body: JSON.stringify({
                        activityId: Number(activityId),
                        referenceImageId: selectedReference.id,
                        analysisFocus: correctionFocus,
                        isAnonymous,
                    }),
                });
                createdSessionForRequest = true;
                sessions = [activeSession, ...sessions];
            }
            if (replaced?.jobId) {
                try {
                    await apiRequest(
                        `/api/sessioni-correzione/${activeSession.id}/job`,
                        {
                            method: "DELETE",
                            body: JSON.stringify({ jobId: replaced.jobId }),
                        },
                    );
                } catch (error) {
                    if (error.code !== "CONVERSATION_JOB_NOT_FOUND")
                        throw error;
                }
                const cancelledAt = new Date().toISOString();
                const updated = await apiRequest(
                    `/api/tentativi-correzione/${replaced.id}`,
                    { method: "PATCH", body: JSON.stringify({ cancelledAt }) },
                );
                attempts = attempts.map((attempt) =>
                    attempt.id === updated.id ? updated : attempt,
                );
            }

            const form = new FormData();
            form.append("image", imageFile);
            form.append("focus", correctionFocus);
            form.append("referenceImageId", String(selectedReference.id));
            const job = await apiRequest(
                `/api/sessioni-correzione/${activeSession.id}/job`,
                { method: "POST", body: form },
            );
            startedJob = job;
            const attempt = await apiRequest("/api/tentativi-correzione", {
                method: "POST",
                body: JSON.stringify({
                    sessionId: activeSession.id,
                    imageName,
                    focus: correctionFocus,
                    viewType: selectedReference.viewType,
                    viewLabel: viewLabel(selectedReference),
                    referenceImageId: selectedReference.id,
                    jobId: job.id,
                    jobStatus: job.status,
                }),
            });
            localRequestImages.set(attempt.id, imageUrl);
            if (job.id) jobStates = { ...jobStates, [job.id]: job };
            attempts = [...attempts, attempt];
            selectedRequestId = attempt.id;
            correctionIndexes = {};
            imageUrl = "";
            imageName = "";
            imageFile = null;
			successMessage = $_(replaced ? 'correction.processReplaced' : 'correction.requestAdded');
            setTimeout(refreshJobs, 1500);
        } catch (error) {
            if (startedJob?.id && activeSession) {
                try {
                    await apiRequest(
                        `/api/sessioni-correzione/${activeSession.id}/job`,
                        {
                            method: "DELETE",
                            body: JSON.stringify({ jobId: startedJob.id }),
                        },
                    );
                } catch {
                    // Preserve the original submission error.
                }
            }
            if (createdSessionForRequest && activeSession) {
                const failedSessionId = activeSession.id;
                try {
                    await apiRequest(
                        `/api/sessioni-correzione/${failedSessionId}`,
                        { method: "DELETE" },
                    );
                    sessions = sessions.filter(
                        (session) => session.id !== failedSessionId,
                    );
                    activeSession = null;
                } catch {
                    // Preserve the original submission error.
                }
            }
            errorMessage = error.message;
        } finally {
            sending = false;
        }
    }
</script>

<svelte:head><title>{$_('correction.imageCorrection')} | {$_('site.name')}</title></svelte:head>
<div class="page-content">
    <div class="container-fluid py-4">
        <PageHeader
            title={$_('correction.newRequest')}
            subtitle={$_('correction.compareSameView')}
            parentHref={`/corsi/${courseId}/esercitazioni/${activityId}`}
			parentLabel={$_('activity.activity')}
        />
        {#if errorMessage}<div class="alert alert-danger">
                <i class="ri-error-warning-line me-2"></i>{errorMessage}
            </div>{/if}
        {#if successMessage}<div class="alert alert-success">
                <i class="ri-checkbox-circle-line me-2"></i>{successMessage}
            </div>{/if}
        {#if loading}<div class="text-center py-5">
                <div class="spinner-border text-primary"></div>
            </div>
        {:else}
            <div
                class="activity-context"
				aria-label={$_('correction.context')}
            >
                <a class="context-course" href={`/corsi/${courseId}`}>

                    <span
						><small>{$_('activity.course')}</small><strong
                            >{course?.name ?? $_('activity.course')}</strong
                        ></span
                    >
                </a>
                <i class="ri-arrow-right-s-line context-divider"></i>
                <a
                    class="context-activity"
                    href={`/corsi/${courseId}/esercitazioni/${activityId}`}
                >

                    <span
                        ><small
							>{$_('correction.currentActivity')} · {$_(activity?.kind === "EXAM"
                                ? 'activity.exam'
                                : 'activity.exercise')}</small
                        ><strong>{activity?.title ?? $_('activity.activity')}</strong></span
                    >
                </a>
            </div>
            {#if conversationLocked}<div
                    class="alert alert-warning conversation-lock-alert"
                    role="alert"
                >
                    <div>
                        <i class="ri-lock-2-line"></i><span
							><strong>{$_('correction.locked')}</strong>
							 {$_('correction.lockedHelp')}</span
                        >
                    </div>
                    <button
                        class="btn btn-warning btn-sm"
                        type="button"
                        on:click={startNewConversation}
						>{$_('correction.newConversation')}</button
                    >
                </div>{/if}
            <div class="row g-4 align-items-stretch">
                <div class="col-xxl-8">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body p-4">
                            <div class="comparison-toolbar">
                                <div>
                                    <label
                                        class="form-label fw-semibold"
                                        for="reference-view"
										>{$_('activity.viewType')} {#if conversationLocked}<i
                                                class="ri-lock-2-line text-warning"
												title={$_('correction.lockedTitle')}
                                            ></i>{/if}</label
                                    ><select
                                        id="reference-view"
                                        class="form-select"
                                        bind:value={selectedReferenceId}
                                        disabled={referenceImages.length ===
                                            0 || conversationLocked}
                                        >{#each referenceImages as image}<option
                                                value={String(image.id)}
                                                >{viewLabel(image)}</option
                                            >{/each}</select
                                    >
                                </div>
                                <div>
                                    <label
                                        class="form-label fw-semibold"
                                        for="focus"
										>{$_('correction.evaluationScope')} {#if conversationLocked}<i
                                                class="ri-lock-2-line text-warning"
												title={$_('correction.lockedTitle')}
                                            ></i>{/if}</label
                                    ><select
                                        id="focus"
                                        class="form-select"
                                        bind:value={correctionFocus}
                                        disabled={conversationLocked}
										>{#each visibleFocusOptions as option}<option value={option.id}
												>{$_(option.labelKey)}</option
                                            >{/each}</select
                                    >
                                </div>
                            </div>
                            {#if referenceImages.length === 0}<div
                                    class="empty-reference"
                                >
                                    <i class="ri-image-line"></i>
                                    <div>
                                        <strong
											>{$_('correction.noReference')}</strong
										><span>{$_('correction.noReferenceHelp')}</span
                                        >
                                    </div>
                                </div>
                            {:else}<div class="comparison-grid">
                                    <div class="image-panel">
                                        <div class="image-panel-title">
                                            <span
											>{$_('correction.yourImage')}</span
                                            >{#if imageName}<small
                                                    >{imageName}</small
                                                >{/if}
                                        </div>
                                        <label
                                            class="image-stage"
                                            class:has-image={imageUrl}
                                            for="correction-image"
                                            >{#if imageUrl}<img
                                                    src={imageUrl}
											alt={$_('correction.selectedImageAlt')}
                                                />{:else}<div
                                                    class="upload-placeholder"
                                                >
                                                    <i class="ri-image-add-line upload-icon" aria-hidden="true"></i>
                                                    <strong
												>{$_('correction.uploadView')}</strong
											><span>{$_('correction.imageFormats')}</span
                                                    ><span
                                                        class="btn btn-primary btn-sm mt-3"
												>{$_('correction.chooseImage')}</span
                                                    >
                                                </div>{/if}</label
                                        ><input
                                            id="correction-image"
                                            class="visually-hidden"
                                            type="file"
                                            accept="image/*"
                                            on:change={selectImage}
                                        />
                                    </div>
                                    <div class="image-panel reference-panel">
                                        <div class="image-panel-title">
                                            <span
                                                >
												{$_('correction.reference')} · {viewLabel(
                                                    selectedReference,
                                                )}</span
                                            >
                                        </div>
                                        <div class="image-stage has-image">
                                            <img
                                                src={selectedReference?.storageKey}
                                                decoding="async"
                                                alt={selectedReference?.altText ||
                                                    selectedReference?.originalFilename ||
													$_('correction.referenceImageAlt')}
                                            />
                                        </div>
                                    </div>
                                </div>{/if}
                        </div>
                    </div>
                </div>
                <div class="col-xxl-4">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-header bg-transparent p-4">
							<h2 class="h5 mb-1">{$_('correction.byCategory')}</h2>
							<p class="text-muted mb-0">{$_('correction.detectedParameters')}</p>
                        </div>
                        <div class="card-body p-4 pt-0 correction-panel">
                            {#if selectedRequest}{@const details =
                                    requestDetails(
                                        selectedRequest,
                                    )}{@const state =
                                    requestStatus(selectedRequest)}
								<div class="category-strip" aria-label={$_('correction.categories')}>
                                    {#each correctionCategories as category}
                                        {@const enabled = visibleCorrectionCategories.some((item) => item.key === category.key)}
                                        <span class:active={enabled} aria-current={enabled ? "true" : undefined}>
											<i class={category.icon}></i>{$_(category.label)}
                                        </span>
                                    {/each}
                                </div>

                                {#if ["status-queued", "status-processing"].includes(state.className)}
                                    <div class="analysis-state">
                                        <i class="ri-loader-4-line"></i>
										<strong>{$_(state.label)}</strong>
										<p>{$_('correction.analysisPending')}</p>
                                    </div>
                                {:else if details.error}
                                    <div class="analysis-state error-state">
                                        <i class="ri-error-warning-line"></i>
										<strong>{$_('correction.analysisUnavailable')}</strong>
                                        <p>{details.error}</p>
                                    </div>
                                {:else}
                                    <div class="category-results">
                                        {#each visibleCorrectionCategories as category}
                                            {@const analysis = analysisForCategory(details, category.key)}
                                            {@const corrections = correctionsForAnalysis(analysis)}
                                            {@const correction = selectedCorrection(category.key, corrections)}
                                            {@const correctionIndex = Math.min(correctionIndexes[category.key] || 0, Math.max(corrections.length - 1, 0))}
                                            <section class="category-result" aria-labelledby={`category-${category.key}`}>
                                                <div class="category-heading">
                                                    <div>
												<h3 class="h6" id={`category-${category.key}`}>{$_(category.label)}</h3>
                                                    </div>
                                                    {#if analysis?.summary?.overall_confidence}
                                                        <span class="confidence-badge">{displayValue(analysis.summary.overall_confidence)}</span>
                                                    {/if}
                                                </div>

                                                {#if analysis}
                                                    {#if analysis.general_description}
                                                        <p class="general-description">{analysis.general_description}</p>
                                                    {/if}

                                                    {#if correction}
                                                        {@const score = correctionScore(correction, analysis, details)}
                                                        <div class="correction-navigation">
													<button type="button" on:click={() => moveCorrection(category.key, -1, corrections.length)} disabled={corrections.length < 2} aria-label={$_('correction.previous')}>
                                                                <i class="ri-arrow-left-s-line"></i>
                                                            </button>
													<span>{$_('correction.position', { values: { current: correctionIndex + 1, total: corrections.length } })}</span>
													<button type="button" on:click={() => moveCorrection(category.key, 1, corrections.length)} disabled={corrections.length < 2} aria-label={$_('correction.next')}>
                                                                <i class="ri-arrow-right-s-line"></i>
                                                            </button>
                                                        </div>
                                                        <article class="parameter-card">
                                                            <div class="parameter-title">
                                                                <div>
															<small>{$_('correction.parameter')}</small>
                                                                    <strong>{displayValue(correction.parameter || correction.name)}</strong>
                                                                </div>
                                                                <span class={`confidence confidence-${String(correction.confidence || "").toLowerCase()}`}>
                                                                    {displayValue(correction.confidence)}
                                                                </span>
                                                            </div>
                                                            <dl class="parameter-facts">
														<div><dt>{$_('correction.operation')}</dt><dd>{displayValue(correction.operation)}</dd></div>
														<div><dt>{$_('correction.intensity')}</dt><dd>{displayValue(correction.magnitude)}</dd></div>
														<div class="wide"><dt>{$_('correction.detectedRegion')}</dt><dd>{displayValue(correction.detected_region)}</dd></div>
														<div class="wide"><dt>{$_('correction.observableEvidence')}</dt><dd>{displayValue(correction.observable_evidence)}</dd></div>
                                                            </dl>
                                                            {#if score !== null}
														<div class="correction-score"><span>{$_('correction.score')}</span><strong>{score}/30</strong></div>
                                                            {/if}
                                                        </article>
                                                    {:else}
													<div class="category-empty">{$_('correction.noParametric')}</div>
                                                    {/if}

                                                    {#if analysis.summary}
                                                        <div class="analysis-summary">
													<strong>{$_('correction.summary')}</strong>
                                                            {#each Object.entries(analysis.summary) as [key, value]}
                                                                {#if key !== "overall_confidence"}
                                                                    <div><span>{displayValue(key)}</span><p>{displayValue(value)}</p></div>
                                                                {/if}
                                                            {/each}
                                                        </div>
                                                    {/if}
                                                {:else}
                                                    <div class="category-empty">
                                                        <i class="ri-tools-line"></i>
												<span>{$_('correction.futureAnalysis', { values: { category: $_(category.label).toLowerCase() } })}</span>
                                                    </div>
                                                {/if}
                                            </section>
                                        {/each}
                                    </div>
                                {/if}
                                {#if selectedRequest.response}<small class="response-time">
									<i class="ri-time-line"></i> {$_('correction.updatedAt', { values: { date: formatDateTime(selectedRequest.response.completedAt || selectedRequest.response.updatedAt || selectedRequest.response.createdAt) } })}
                                </small>{/if}
                            {:else}<div class="empty-evaluation">
                                    <i class="ri-radar-line"></i><strong
										>{$_('correction.noActiveEvaluation')}</strong
                                    >
                                    <p>
										{$_('correction.noActiveEvaluationHelp')}
                                    </p>
                                </div>{/if}
                        </div>
                    </div>
                </div>
            </div>
            {#if selectedRequest?.response}
				<section class="feedback-card" aria-labelledby="feedback-title">
					<div class="feedback-heading">
						<div><h2 class="h4" id="feedback-title">{$_(course?.canManage ? 'feedback.professorTitle' : 'feedback.studentTitle')}</h2><p>{$_(course?.canManage ? 'feedback.professorHelp' : 'feedback.studentHelp')}</p></div>
						{#if feedbackLoading}<span class="spinner-border spinner-border-sm text-primary" aria-label={$_('common.loading')}></span>{/if}
					</div>
					{#if !feedbackLoading}
						{#if course?.canManage}
							<div class="review-layout">
								<div>
									<span class="feedback-label">{$_('feedback.correctnessQuestion')}</span>
									<div class="verdict-options" role="radiogroup" aria-label={$_('feedback.correctnessQuestion')}>
										{#each [{ value: 'CORRECT', label: 'feedback.correct', icon: 'ri-checkbox-circle-line' }, { value: 'PARTIAL', label: 'feedback.partial', icon: 'ri-error-warning-line' }, { value: 'INCORRECT', label: 'feedback.incorrect', icon: 'ri-close-circle-line' }] as option}
											<label class:checked={verdict === option.value} class={`verdict-${option.value.toLowerCase()}`}><input type="radio" name="verdict" value={option.value} bind:group={verdict} /><i class={option.icon}></i><span>{$_(option.label)}</span></label>
										{/each}
									</div>
								</div>
								<div class="student-signal">
									<span>{$_('feedback.studentSignal')}</span>
									<strong class:positive={feedback?.isUseful === true} class:negative={feedback?.isUseful === false}>{feedback?.isUseful == null ? $_('feedback.notProvided') : $_(feedback.isUseful ? 'feedback.useful' : 'feedback.notUseful')}</strong>
									{#if feedback?.studentComment}<p>“{feedback.studentComment}”</p>{/if}
								</div>
							</div>
							<label class="form-label" for="professor-comment">{$_('feedback.professorComment')}</label>
							<textarea id="professor-comment" class="form-control" rows="3" maxlength="2000" bind:value={professorComment} placeholder={$_('feedback.professorPlaceholder')}></textarea>
							<div class="feedback-actions">{#if professorFeedbackSaved}<span class="feedback-saved" role="status"><i class="ri-check-line"></i>{$_('feedback.saved')}</span>{/if}<button class="btn btn-primary" type="button" disabled={!verdict || feedbackSaving} on:click={saveProfessorReview}>{#if feedbackSaving}<span class="spinner-border spinner-border-sm me-2"></span>{/if}{$_(feedback?.reviewedAt ? 'feedback.updateReview' : 'feedback.saveReview')}</button></div>
						{:else}
							<span class="feedback-label">{$_('feedback.usefulnessQuestion')}</span>
							<div class="usefulness-options">
								<button class:active={isUseful === true} type="button" disabled={feedbackSaving} aria-pressed={isUseful === true} on:click={() => saveStudentFeedback(true)}><i class="ri-thumb-up-line"></i>{$_('feedback.yesUseful')}</button>
								<button class:active={isUseful === false} type="button" disabled={feedbackSaving} aria-pressed={isUseful === false} on:click={() => saveStudentFeedback(false)}><i class="ri-thumb-down-line"></i>{$_('feedback.noUseful')}</button>
							</div>
							<label class="form-label" for="student-comment">{$_('feedback.studentComment')}</label>
							<textarea id="student-comment" class="form-control" rows="3" maxlength="2000" bind:value={studentComment} placeholder={$_('feedback.studentPlaceholder')}></textarea>
							<div class="feedback-actions">{#if studentFeedbackSaved}<span class="feedback-saved" role="status"><i class="ri-check-line"></i>{$_('feedback.saved')}</span>{/if}<span>{studentComment.length}/2000</span><button class="btn btn-outline-primary" type="button" disabled={isUseful === null || feedbackSaving} on:click={() => saveStudentFeedback(isUseful)}>{#if feedbackSaving}<span class="spinner-border spinner-border-sm me-2"></span>{/if}{$_('feedback.saveComment')}</button></div>
						{/if}
					{/if}
				</section>
			{/if}
            {#if !course?.canManage}<div class="submit-card">
                <div>
					<strong>{$_('correction.ready')}</strong><span
						>{$_('correction.readyHelp')}</span
                    >
                </div>
                <form on:submit={sendCorrection} class="submit-actions">
                    {#if !activeSession}<div class="form-check form-switch">
                            <input
                                id="anonymous"
                                class="form-check-input"
                                type="checkbox"
                                bind:checked={isAnonymous}
                            /><label class="form-check-label" for="anonymous"
								>{$_('correction.anonymous')}</label
                            >
                        </div>{/if}<button
                        class="btn btn-success btn-lg"
                        type="submit"
                        disabled={sending || !imageUrl || !selectedReference}
                        >{#if sending}<span
                                class="spinner-border spinner-border-sm me-2"
                            ></span>{:else}{/if}{activeSession
							? $_('correction.addRequest')
							: $_('correction.start')}</button
                    >
                </form>
            </div>{/if}
            {#if requests.length > 0}<div class="card border-0 shadow-sm mt-4">
                    <div
                        class="card-header bg-transparent p-4 d-flex flex-wrap justify-content-between align-items-center gap-2"
                    >
                        <div>
							<h2 class="h5 mb-1">{$_('correction.requestsHere')}</h2>
							<p class="text-muted mb-0">{$_('correction.requestsHelp')}</p>
                        </div>
                        <span class="request-count">{requests.length}</span>
                    </div>
                    <div class="card-body p-4 pt-0">
                        <div class="request-list">
                            {#each requests as request, index}{@const state =
                                    requestStatus(request)}<button
                                    type="button"
                                    class="request-row"
                                    class:selected={selectedRequest?.id ===
                                        request.id}
                                    on:click={() =>
                                        (selectedRequestId = request.id)}
                                    ><span class="request-index"
                                        >{index + 1}</span
                                    ><span class="request-thumbnail"
                                        >{#if request.imageUrl}<img
                                                src={request.imageUrl}
                                                alt={request.imageName}
                                                loading="lazy"
                                                decoding="async"
                                            />{:else}<i class="ri-image-line"
                                            ></i>{/if}</span
                                    ><span class="request-copy"
                                        ><strong>{request.viewLabel}</strong
                                        ><small
                                            >{request.imageName} · {focusLabel(request.focus)}</small
                                        ><small
                                            >{formatDateTime(
                                                request.createdAt,
                                            )}</small
                                        ></span
                                    ><span
                                        class={`request-status ${state.className}`}
                                        ><i class={state.icon}
										></i>{$_(state.label)}</span
                                    ><i
                                        class="ri-arrow-right-s-line request-arrow"
                                    ></i></button
                                >{/each}
                        </div>
                    </div>
                </div>{/if}

        {/if}
    </div>
</div>

{#if pendingReplacement}
	<dialog
            class="replace-dialog"
			use:modalDialog={{ onCancel: closeReplacementDialog }}
			aria-modal="true"
            aria-labelledby="replace-dialog-title"
        >
			<h2 class="h3" id="replace-dialog-title">{$_('correction.replaceProcess')}</h2>
			<p>{$_('correction.replaceProcessBody', { values: { view: pendingReplacement.viewLabel } })}</p>
            <div class="replacement-job">
				<span>{$_('correction.selectedProcess')}</span><code
                    >{pendingReplacement.jobId}</code
                >
            </div>
            <div class="dialog-actions">
                <button
                    class="btn btn-light"
					data-dialog-initial
                    type="button"
					on:click={closeReplacementDialog}
					disabled={sending}>{$_('common.cancel')}</button
                ><button
                    class="btn btn-danger"
                    type="button"
                    on:click={confirmReplacement}
                    disabled={sending}
                    >{#if sending}<span
                            class="spinner-border spinner-border-sm me-2"
						></span>{/if}{$_('correction.interruptReplace')}</button
                >
            </div>
	</dialog>
{/if}

<style>
    .activity-context {
        display: grid;
        grid-template-columns: minmax(0, 0.8fr) auto minmax(0, 1.2fr) auto;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
        padding: 1rem 1.15rem;
        border: 1px solid var(--portal-border);
        border-radius: var(--portal-radius);
        background: var(--portal-surface);
    }
    .context-course,
    .context-activity {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: var(--portal-ink);
    }
    .context-course:hover,
    .context-activity:hover {
        color: var(--portal-brand-primary);
    }
    .context-course > span:last-child,
    .context-activity > span:last-child {
        min-width: 0;
        display: grid;
    }
    .activity-context small {
        color: var(--portal-muted);
        font-size: .75rem;
        font-weight: 700;
    }
    .activity-context strong {
        overflow: hidden;
        font-size: 1rem;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .context-divider {
        color: var(--portal-muted);
        font-size: 1.35rem;
    }
    .conversation-lock-alert {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
    }
    .conversation-lock-alert > div {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    .conversation-lock-alert > div > i {
        font-size: 1.35rem;
    }
    .conversation-lock-alert span {
        line-height: 1.45;
    }
    .conversation-lock-alert strong {
        display: block;
    }
	.conversation-lock-alert .btn { min-height: 44px; }
    .comparison-toolbar,
    .comparison-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
    }
    .comparison-toolbar {
        margin-bottom: 1rem;
    }
	.comparison-toolbar .form-select { min-height: 44px; }
    .image-panel {
        min-width: 0;
        overflow: hidden;
        border: 1px solid var(--portal-border);
        border-radius: var(--portal-radius);
        background: var(--portal-surface-muted);
    }
    .image-panel-title {
        min-height: 55px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        background: var(--portal-surface);
        border-bottom: 1px solid var(--portal-border);
    }
    .image-panel-title span {
        font-weight: 700;
    }
    .image-panel-title i {
        color: var(--portal-brand-primary);
        margin-right: 0.25rem;
    }
    .image-panel-title small {
        max-width: 45%;
        overflow: hidden;
        color: var(--portal-muted);
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .image-stage {
        height: 420px;
        display: grid;
        place-items: center;
        cursor: pointer;
        overflow: hidden;
        background: var(--portal-surface-muted);
    }
    .image-stage.has-image {
        background: #10131a;
    }
    .image-stage img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
    .reference-panel .image-stage {
        cursor: default;
    }
    .upload-placeholder {
        display: grid;
        justify-items: center;
        padding: 2rem;
        text-align: center;
    }
    .upload-placeholder > span:not(.btn) {
        margin-top: 0.3rem;
        color: var(--portal-muted);
        font-size: 0.82rem;
    }
    .upload-icon {
        margin-bottom: 0.6rem;
        color: var(--portal-info-text);
        font-size: 1.75rem;
    }
    .empty-reference {
        min-height: 260px;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        color: var(--portal-muted);
        border: 2px dashed var(--portal-border);
        border-radius: var(--portal-radius);
    }
    .empty-reference > i {
        font-size: 2rem;
    }
    .empty-reference div {
        display: grid;
    }
    .empty-reference strong {
        color: var(--portal-ink);
    }
    .correction-panel {
        display: grid;
        align-content: start;
        gap: 1rem;
    }
    .category-strip {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.45rem;
    }
    .category-strip span {
        min-width: 0;
        display: grid;
        justify-items: center;
        gap: 0.25rem;
        padding: 0.65rem 0.25rem;
        color: var(--portal-muted);
        border: 1px solid var(--portal-border);
        border-radius: var(--portal-radius-sm);
        background: var(--portal-surface-muted);
        font-size: .75rem;
        font-weight: 700;
        opacity: 0.45;
    }
    .category-strip span.active {
        color: var(--portal-brand-primary);
        border-color: rgba(var(--portal-brand-primary-rgb), 0.28);
        background: rgba(var(--portal-brand-primary-rgb), 0.09);
        opacity: 1;
    }
    .category-strip i {
        font-size: 1.05rem;
    }
    .category-results {
        display: grid;
        gap: 1rem;
    }
    .category-result {
        overflow: hidden;
        border: 1px solid var(--portal-border);
        border-radius: var(--portal-radius);
        background: var(--portal-surface);
    }
    .category-heading {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.85rem 1rem;
        border-bottom: 1px solid var(--portal-border);
        background: var(--portal-surface-muted);
    }
    .category-heading > div {
        min-width: 0;
        display: grid;
    }
    .parameter-title small {
        color: var(--portal-muted);
        font-size: .75rem;
        font-weight: 600;
    }
    .category-heading h3 {
        margin: 0;
    }
    .confidence-badge {
        margin-left: auto;
        padding: 0.3rem 0.48rem;
        color: var(--portal-positive-text);
        border-radius: var(--portal-radius);
        background: rgba(var(--portal-positive-rgb), 0.12);
        font-size: .75rem;
        font-weight: 600;
    }
    .general-description {
        margin: 0;
        padding: 1rem;
        color: var(--portal-muted);
        font-size: 0.82rem;
        line-height: 1.55;
    }
    .correction-navigation {
        display: grid;
		grid-template-columns: 44px 1fr 44px;
        align-items: center;
        gap: 0.5rem;
        padding: 0 1rem 0.7rem;
    }
    .correction-navigation span {
        text-align: center;
        color: var(--portal-muted);
        font-size: .75rem;
        font-weight: 700;
    }
    .correction-navigation button {
		width: 44px;
		height: 44px;
        display: grid;
        place-items: center;
        padding: 0;
        color: var(--portal-brand-primary);
        border: 1px solid rgba(var(--portal-brand-primary-rgb), 0.2);
        border-radius: var(--portal-radius-sm);
        background: rgba(var(--portal-brand-primary-rgb), 0.07);
        font-size: 1.1rem;
    }
    .correction-navigation button:disabled {
        cursor: default;
        opacity: 0.35;
    }
    .parameter-card {
        margin: 0 1rem 1rem;
        padding: 1rem;
        border: 1px solid rgba(var(--portal-brand-primary-rgb), 0.16);
        border-radius: var(--portal-radius);
        background: color-mix(in srgb, var(--portal-brand-primary) 4%, var(--portal-surface));
    }
    .parameter-title {
        display: flex;
        justify-content: space-between;
        align-items: start;
        gap: 0.75rem;
        margin-bottom: 0.85rem;
    }
    .parameter-title > div {
        display: grid;
    }
    .parameter-title strong {
        color: var(--portal-brand-primary);
        font-size: 1.08rem;
        text-transform: capitalize;
    }
    .confidence {
        padding: 0.25rem 0.45rem;
        border-radius: var(--portal-radius);
        background: var(--portal-surface-muted);
        font-size: .75rem;
        font-weight: 600;
    }
    .confidence-high {
        color: var(--portal-positive-text);
        background: rgba(var(--portal-positive-rgb), 0.12);
    }
    .confidence-medium {
        color: var(--portal-warning-text);
        background: rgba(var(--portal-warning-rgb), 0.16);
    }
    .parameter-facts {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.7rem;
        margin: 0;
    }
    .parameter-facts > div {
        min-width: 0;
        padding: 0.65rem;
        border-radius: var(--portal-radius-sm);
        background: var(--portal-surface);
    }
    .parameter-facts .wide {
        grid-column: 1 / -1;
    }
    .parameter-facts dt {
        margin-bottom: 0.2rem;
        color: var(--portal-muted);
        font-size: .75rem;
    }
    .parameter-facts dd {
        margin: 0;
        font-size: 0.78rem;
        line-height: 1.45;
    }
    .parameter-facts > div:not(.wide) dd {
        font-weight: 700;
        text-transform: capitalize;
    }
    .correction-score {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        color: var(--portal-muted);
        border-top: 1px solid var(--portal-border);
        font-size: 0.75rem;
    }
    .correction-score strong {
        color: var(--portal-brand-primary);
        font-size: 1rem;
    }
    .analysis-summary {
        display: grid;
        gap: 0.7rem;
        margin: 0 1rem 1rem;
        padding-top: 0.85rem;
        border-top: 1px solid var(--portal-border);
    }
    .analysis-summary > strong {
        font-size: 0.78rem;
    }
    .analysis-summary div span {
        display: block;
        margin-bottom: 0.15rem;
        color: var(--portal-muted);
        font-size: .75rem;
        font-weight: 600;
        text-transform: capitalize;
    }
    .analysis-summary p {
        margin: 0;
        font-size: 0.75rem;
        line-height: 1.45;
    }
    .category-empty,
    .analysis-state {
        display: grid;
        justify-items: center;
        gap: 0.35rem;
        padding: 1.25rem 1rem;
        color: var(--portal-muted);
        text-align: center;
        font-size: 0.78rem;
    }
    .category-empty i,
    .analysis-state > i {
        color: var(--portal-brand-primary);
        font-size: 1.35rem;
    }
    .analysis-state {
        padding: 2.25rem 1rem;
        border: 1px dashed var(--portal-border);
        border-radius: var(--portal-radius);
    }
    .analysis-state p {
        margin: 0;
    }
    .analysis-state > i {
        animation: spin 1.1s linear infinite;
    }
    .analysis-state.error-state > i {
        color: #d65339;
        animation: none;
    }
    .response-time {
        color: var(--portal-muted);
        font-size: .75rem;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    .empty-evaluation {
        display: grid;
        justify-items: center;
        padding: 3rem 1rem;
        text-align: center;
        color: var(--portal-muted);
    }
    .empty-evaluation > i {
        margin-bottom: 0.8rem;
        color: var(--portal-brand-primary);
        font-size: 2.4rem;
    }
    .empty-evaluation strong {
        color: var(--portal-ink);
    }
    .empty-evaluation p {
        margin: 0.35rem 0 0;
    }
    .submit-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-top: 1.5rem;
        padding: 1rem 1.15rem;
        border: 1px solid var(--portal-border);
        border-radius: var(--portal-radius);
        background: var(--portal-surface);
    }
    .submit-card > div {
        display: grid;
    }
    .submit-card > div span {
        color: var(--portal-muted);
    }
    .submit-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .request-count {
        min-width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        color: var(--portal-brand-primary);
        border-radius: var(--portal-radius-sm);
        background: rgba(var(--portal-brand-primary-rgb), 0.1);
        font-weight: 600;
    }
    .request-list {
        display: grid;
        gap: 0.7rem;
    }
    .request-row {
        width: 100%;
        display: grid;
        grid-template-columns: auto 54px minmax(0, 1fr) auto auto;
        align-items: center;
        gap: 0.8rem;
        padding: 0.75rem;
        color: var(--portal-ink);
        border: 1px solid var(--portal-border);
        border-radius: var(--portal-radius);
        background: var(--portal-surface);
        text-align: left;
        transition: 0.18s ease;
    }
    .request-row:hover,
    .request-row.selected {
        border-color: rgba(var(--portal-brand-primary-rgb), 0.42);
        background: rgba(var(--portal-brand-primary-rgb), 0.035);
    }
    .request-index {
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        color: var(--portal-brand-primary);
        border-radius: var(--portal-radius-sm);
        background: rgba(var(--portal-brand-primary-rgb), 0.1);
        font-size: 0.8rem;
        font-weight: 600;
    }
    .request-thumbnail {
        width: 54px;
        height: 54px;
        display: grid;
        place-items: center;
        overflow: hidden;
        color: var(--portal-muted);
        border-radius: var(--portal-radius-sm);
        background: var(--portal-surface-muted);
        font-size: 1.25rem;
    }
    .request-thumbnail img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .request-copy {
        min-width: 0;
        display: grid;
    }
    .request-copy small {
        overflow: hidden;
        color: var(--portal-muted);
        font-size: 0.76rem;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .request-status {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.35rem 0.55rem;
        border-radius: var(--portal-radius);
        font-size: .75rem;
        font-weight: 700;
        white-space: nowrap;
    }
    .status-completed {
        color: var(--portal-positive-text);
        background: rgba(var(--portal-positive-rgb), 0.12);
    }
    .status-processing {
        color: var(--portal-warning-text);
        background: rgba(var(--portal-warning-rgb), 0.15);
    }
    .status-queued {
        color: var(--portal-brand-primary);
        background: rgba(var(--portal-brand-primary-rgb), 0.1);
    }
    .status-failed {
        color: #c13a3a;
        background: rgba(var(--portal-danger-rgb), 0.1);
    }
    .status-cancelled {
        color: var(--portal-muted);
        background: var(--portal-surface-muted);
    }
    .request-arrow {
        color: var(--portal-muted);
        font-size: 1.2rem;
    }
    .replace-dialog {
		position: fixed;
		inset: 0;
		width: min(calc(100% - 2.5rem), 520px);
		max-height: min(90vh, 720px);
		margin: auto;
        padding: 1.6rem;
        color: var(--portal-ink);
        border: 1px solid var(--portal-border);
        border-radius: var(--portal-radius);
        background: var(--portal-surface);
    }
	.replace-dialog::backdrop { background: rgba(17, 24, 39, 0.6); }
    .replace-dialog h2 {
        margin-bottom: 0.65rem;
        font-size: 1.35rem;
    }
    .replace-dialog > p {
        color: var(--portal-muted);
        line-height: 1.6;
    }
    .replacement-job {
        display: grid;
        gap: 0.25rem;
        padding: 0.8rem 0.9rem;
        border: 1px solid var(--portal-border);
        border-radius: var(--portal-radius-sm);
        background: var(--portal-surface-muted);
    }
    .replacement-job span {
        color: var(--portal-muted);
        font-size: .75rem;
        font-weight: 700;
    }
    .replacement-job code {
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.65rem;
        margin-top: 1.35rem;
    }
	.dialog-actions .btn { min-height: 44px; }
	.feedback-card { margin-top: 1.5rem; padding: 1.35rem; border: 1px solid var(--portal-border); border-radius: var(--portal-radius); background: var(--portal-surface); }
	.feedback-heading { display: flex; align-items: flex-start; gap: .85rem; margin-bottom: 1.2rem; }
	.feedback-heading > div { flex: 1; }
	.feedback-heading h2 { margin: 0 0 .2rem; font-size: 1.08rem; }
	.feedback-heading p { margin: 0; color: var(--portal-muted); }
	.feedback-label { display: block; margin-bottom: .65rem; font-weight: 650; }
	.usefulness-options, .verdict-options { display: flex; flex-wrap: wrap; gap: .65rem; margin-bottom: 1rem; }
	.usefulness-options button, .verdict-options label { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: .45rem; padding: .65rem .9rem; color: var(--portal-ink); border: 1px solid var(--portal-border); border-radius: var(--portal-radius-sm); background: var(--portal-surface); font-weight: 600; cursor: pointer; }
	.usefulness-options button:hover, .verdict-options label:hover { border-color: color-mix(in srgb, var(--portal-brand-primary) 48%, var(--portal-border)); }
	.usefulness-options button.active { color: #fff; border-color: var(--portal-polito-blue); background: var(--portal-polito-blue); }
	.verdict-options input { position: absolute; opacity: 0; pointer-events: none; }
	.verdict-options label:focus-within { outline: 3px solid color-mix(in srgb, var(--portal-brand-primary) 28%, transparent); outline-offset: 2px; }
	.verdict-options label.checked.verdict-correct { color: var(--portal-positive-text); border-color: rgba(var(--portal-positive-rgb),.42); background: rgba(var(--portal-positive-rgb),.1); }
	.verdict-options label.checked.verdict-partial { color: var(--portal-warning-text); border-color: rgba(var(--portal-warning-rgb),.55); background: rgba(var(--portal-warning-rgb),.13); }
	.verdict-options label.checked.verdict-incorrect { color: var(--portal-danger-text); border-color: rgba(var(--portal-danger-rgb),.45); background: rgba(var(--portal-danger-rgb),.1); }
	.feedback-actions { display: flex; align-items: center; justify-content: flex-end; gap: 1rem; margin-top: .85rem; }
	.feedback-actions > span { color: var(--portal-muted); font-size: .78rem; }
	.feedback-actions > .feedback-saved { display: inline-flex; align-items: center; gap: .3rem; margin-right: auto; color: var(--portal-positive-text); font-weight: 600; }
	.review-layout { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(220px, .6fr); gap: 1rem; }
	.student-signal { align-self: start; padding: .9rem 1rem; border-radius: var(--portal-radius-sm); background: var(--portal-surface-muted); }
	.student-signal span { display: block; margin-bottom: .25rem; color: var(--portal-muted); font-size: .76rem; }
	.student-signal strong.positive { color: var(--portal-positive-text); }
	.student-signal strong.negative { color: var(--portal-danger-text); }
	.student-signal p { margin: .55rem 0 0; color: var(--portal-muted); font-size: .85rem; }
	@media (prefers-reduced-motion: reduce) {
		.analysis-state > i { animation: none; }
		.request-row { transition: none; }
		.request-row:hover, .request-row.selected { transform: none; }
	}
    @media (max-width: 991px) {
        .comparison-grid {
            grid-template-columns: 1fr;
        }
        .image-stage {
            height: 360px;
        }
        .activity-context {
            grid-template-columns: 1fr auto 1.2fr;
        }
        .context-divider {
            display: block;
        }
    }
    @media (max-width: 767px) {
        .workflow-heading,
        .submit-card,
        .conversation-lock-alert {
            align-items: stretch;
            flex-direction: column;
        }
        .conversation-lock-alert > div {
            align-items: flex-start;
        }
        .comparison-toolbar {
            grid-template-columns: 1fr;
        }
        .activity-context {
            grid-template-columns: 1fr;
        }
        .context-divider {
            display: none;
        }
        .request-row {
            grid-template-columns: auto 46px minmax(0, 1fr) auto;
        }
        .request-thumbnail {
            width: 46px;
            height: 46px;
        }
        .request-status {
            grid-column: 3;
            justify-self: start;
        }
        .request-arrow {
            grid-column: 4;
            grid-row: 1 / span 2;
        }
		.review-layout { grid-template-columns: 1fr; }
		.feedback-actions { align-items: stretch; flex-direction: column; }
		.feedback-actions .btn { width: 100%; }
    }
</style>
