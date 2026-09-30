<script>
    import { onMount, onDestroy } from "svelte";
    import { page } from "$app/stores";
	import { goto } from "$app/navigation";
    import {
        apiListRequest,
        apiRequest,
        formatDateTime,
    } from "$lib/client/api.js";
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

    $: courseId = $page.params.id;
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

    function analysisForCategory(details, categoryKey) {
        const result = details?.result || {};
        const nested = result.analyses?.[categoryKey] ?? result[categoryKey];
        if (nested) return nested.analysis || nested;
        if (result.type === categoryKey) return result.analysis || null;
        return null;
    }

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

<svelte:head><title>{$_('correction.imageCorrection')}</title></svelte:head>
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
                                                    <div class="upload-icon">
                                                        <i
                                                            class="ri-image-add-line"
                                                        ></i>
                                                    </div>
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
							<span class="eyebrow">{$_('correction.currentAnalysis')}</span>
							<h5 class="mb-1">{$_('correction.byCategory')}</h5>
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
                                                    <span class="category-icon"><i class={category.icon}></i></span>
                                                    <div>
												<small>{$_('correction.category')}</small>
												<h6 id={`category-${category.key}`}>{$_(category.label)}</h6>
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
            <div class="submit-card">
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
            </div>
            {#if requests.length > 0}<div class="card border-0 shadow-sm mt-4">
                    <div
                        class="card-header bg-transparent p-4 d-flex flex-wrap justify-content-between align-items-center gap-2"
                    >
                        <div>
							<span class="eyebrow">{$_('correction.progress')}</span>
							<h5 class="mb-1">{$_('correction.requestsHere')}</h5>
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
    <div class="dialog-backdrop" role="presentation">
        <dialog
            class="replace-dialog"
            open
            aria-labelledby="replace-dialog-title"
        >
            <div class="replace-dialog-icon">
                <i class="ri-error-warning-line"></i>
            </div>
			<h3 id="replace-dialog-title">{$_('correction.replaceProcess')}</h3>
			<p>{$_('correction.replaceProcessBody', { values: { view: pendingReplacement.viewLabel } })}</p>
            <div class="replacement-job">
				<span>{$_('correction.selectedProcess')}</span><code
                    >{pendingReplacement.jobId}</code
                >
            </div>
            <div class="dialog-actions">
                <button
                    class="btn btn-light"
                    type="button"
                    on:click={() => (pendingReplacement = null)}
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
    </div>
{/if}

<style>
    .activity-context {
        display: grid;
        grid-template-columns: minmax(0, 0.8fr) auto minmax(0, 1.2fr) auto;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
        padding: 1rem 1.15rem;
        border: 1px solid
            color-mix(in srgb, #405189 24%, var(--bs-border-color));
        border-radius: 17px;
        background: linear-gradient(
            105deg,
            color-mix(in srgb, #405189 8%, var(--bs-body-bg)),
            var(--bs-body-bg)
        );
        box-shadow: 0 8px 24px rgba(31, 43, 79, 0.07);
    }
    .context-course,
    .context-activity {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: var(--bs-body-color);
    }
    .context-course:hover,
    .context-activity:hover {
        color: #405189;
    }
    .context-course > span:last-child,
    .context-activity > span:last-child {
        min-width: 0;
        display: grid;
    }
    .activity-context small {
        color: var(--bs-secondary-color);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }
    .activity-context strong {
        overflow: hidden;
        font-size: 1rem;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .context-icon {
        width: 43px;
        height: 43px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border-radius: 13px;
        font-size: 1.15rem;
    }
    .course-icon {
        color: #405189;
        background: rgba(64, 81, 137, 0.12);
    }
    .activity-icon {
        color: #087f70;
        background: rgba(10, 179, 156, 0.12);
    }
    .context-divider {
        color: var(--bs-secondary-color);
        font-size: 1.35rem;
    }
    .context-current {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.5rem 0.7rem;
        color: #fff;
        border-radius: 999px;
        background: #405189;
        font-size: 0.76rem;
        font-weight: 700;
        white-space: nowrap;
    }
    .workflow-heading {
        display: flex;
        justify-content: space-between;
        align-items: end;
        gap: 1rem;
        margin-bottom: 1.25rem;
    }
    .workflow-heading h4 {
        margin: 0.2rem 0 0.25rem;
    }
    .workflow-heading p {
        margin: 0;
        color: var(--bs-secondary-color);
    }
    .eyebrow {
        color: #405189;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.09em;
        text-transform: uppercase;
    }
    .session-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.55rem 0.8rem;
        color: #0a806f;
        border: 1px solid rgba(10, 179, 156, 0.2);
        border-radius: 999px;
        background: rgba(10, 179, 156, 0.08);
        font-size: 0.83rem;
        font-weight: 700;
        white-space: nowrap;
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
    .comparison-toolbar,
    .comparison-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
    }
    .comparison-toolbar {
        margin-bottom: 1rem;
    }
    .image-panel {
        min-width: 0;
        overflow: hidden;
        border: 1px solid var(--bs-border-color);
        border-radius: 16px;
        background: var(--bs-tertiary-bg);
    }
    .image-panel-title {
        min-height: 55px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        background: var(--bs-body-bg);
        border-bottom: 1px solid var(--bs-border-color);
    }
    .image-panel-title span {
        font-weight: 700;
    }
    .image-panel-title i {
        color: #405189;
        margin-right: 0.25rem;
    }
    .image-panel-title small {
        max-width: 45%;
        overflow: hidden;
        color: var(--bs-secondary-color);
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .image-stage {
        height: 420px;
        display: grid;
        place-items: center;
        cursor: pointer;
        overflow: hidden;
        background: linear-gradient(
            135deg,
            var(--bs-tertiary-bg),
            var(--bs-body-bg)
        );
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
        color: var(--bs-secondary-color);
        font-size: 0.82rem;
    }
    .upload-icon {
        width: 66px;
        height: 66px;
        display: grid;
        place-items: center;
        margin-bottom: 0.8rem;
        color: #405189;
        border-radius: 18px;
        background: rgba(64, 81, 137, 0.1);
        font-size: 1.8rem;
    }
    .empty-reference {
        min-height: 260px;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        color: var(--bs-secondary-color);
        border: 2px dashed var(--bs-border-color);
        border-radius: 16px;
    }
    .empty-reference > i {
        font-size: 2rem;
    }
    .empty-reference div {
        display: grid;
    }
    .empty-reference strong {
        color: var(--bs-body-color);
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
        color: var(--bs-secondary-color);
        border: 1px solid var(--bs-border-color);
        border-radius: 11px;
        background: var(--bs-tertiary-bg);
        font-size: 0.68rem;
        font-weight: 700;
        opacity: 0.45;
    }
    .category-strip span.active {
        color: #405189;
        border-color: rgba(64, 81, 137, 0.28);
        background: rgba(64, 81, 137, 0.09);
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
        border: 1px solid var(--bs-border-color);
        border-radius: 15px;
        background: var(--bs-body-bg);
    }
    .category-heading {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.85rem 1rem;
        border-bottom: 1px solid var(--bs-border-color);
        background: var(--bs-tertiary-bg);
    }
    .category-heading > div {
        min-width: 0;
        display: grid;
    }
    .category-heading small,
    .parameter-title small {
        color: var(--bs-secondary-color);
        font-size: 0.64rem;
        font-weight: 800;
        letter-spacing: 0.07em;
        text-transform: uppercase;
    }
    .category-heading h6 {
        margin: 0;
    }
    .category-icon {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        color: #405189;
        border-radius: 10px;
        background: rgba(64, 81, 137, 0.11);
        font-size: 1rem;
    }
    .confidence-badge {
        margin-left: auto;
        padding: 0.3rem 0.48rem;
        color: #087b6b;
        border-radius: 999px;
        background: rgba(10, 179, 156, 0.12);
        font-size: 0.65rem;
        font-weight: 800;
        text-transform: uppercase;
    }
    .general-description {
        margin: 0;
        padding: 1rem;
        color: var(--bs-secondary-color);
        font-size: 0.82rem;
        line-height: 1.55;
    }
    .correction-navigation {
        display: grid;
        grid-template-columns: 34px 1fr 34px;
        align-items: center;
        gap: 0.5rem;
        padding: 0 1rem 0.7rem;
    }
    .correction-navigation span {
        text-align: center;
        color: var(--bs-secondary-color);
        font-size: 0.72rem;
        font-weight: 700;
    }
    .correction-navigation button {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        padding: 0;
        color: #405189;
        border: 1px solid rgba(64, 81, 137, 0.2);
        border-radius: 10px;
        background: rgba(64, 81, 137, 0.07);
        font-size: 1.1rem;
    }
    .correction-navigation button:disabled {
        cursor: default;
        opacity: 0.35;
    }
    .parameter-card {
        margin: 0 1rem 1rem;
        padding: 1rem;
        border: 1px solid rgba(64, 81, 137, 0.16);
        border-radius: 13px;
        background: color-mix(in srgb, #405189 4%, var(--bs-body-bg));
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
        color: #405189;
        font-size: 1.08rem;
        text-transform: capitalize;
    }
    .confidence {
        padding: 0.25rem 0.45rem;
        border-radius: 999px;
        background: var(--bs-tertiary-bg);
        font-size: 0.64rem;
        font-weight: 800;
        text-transform: uppercase;
    }
    .confidence-high {
        color: #087b6b;
        background: rgba(10, 179, 156, 0.12);
    }
    .confidence-medium {
        color: #9a6500;
        background: rgba(247, 184, 75, 0.16);
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
        border-radius: 9px;
        background: var(--bs-body-bg);
    }
    .parameter-facts .wide {
        grid-column: 1 / -1;
    }
    .parameter-facts dt {
        margin-bottom: 0.2rem;
        color: var(--bs-secondary-color);
        font-size: 0.62rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
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
        color: var(--bs-secondary-color);
        border-top: 1px solid var(--bs-border-color);
        font-size: 0.75rem;
    }
    .correction-score strong {
        color: #405189;
        font-size: 1rem;
    }
    .analysis-summary {
        display: grid;
        gap: 0.7rem;
        margin: 0 1rem 1rem;
        padding-top: 0.85rem;
        border-top: 1px solid var(--bs-border-color);
    }
    .analysis-summary > strong {
        font-size: 0.78rem;
    }
    .analysis-summary div span {
        display: block;
        margin-bottom: 0.15rem;
        color: var(--bs-secondary-color);
        font-size: 0.62rem;
        font-weight: 800;
        letter-spacing: 0.04em;
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
        color: var(--bs-secondary-color);
        text-align: center;
        font-size: 0.78rem;
    }
    .category-empty i,
    .analysis-state > i {
        color: #405189;
        font-size: 1.35rem;
    }
    .analysis-state {
        padding: 2.25rem 1rem;
        border: 1px dashed var(--bs-border-color);
        border-radius: 14px;
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
        color: var(--bs-secondary-color);
        font-size: 0.72rem;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    .empty-evaluation {
        display: grid;
        justify-items: center;
        padding: 3rem 1rem;
        text-align: center;
        color: var(--bs-secondary-color);
    }
    .empty-evaluation > i {
        margin-bottom: 0.8rem;
        color: #405189;
        font-size: 2.4rem;
    }
    .empty-evaluation strong {
        color: var(--bs-body-color);
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
        border: 1px solid var(--bs-border-color);
        border-radius: 16px;
        background: var(--bs-body-bg);
        box-shadow: 0 8px 24px rgba(31, 43, 79, 0.06);
    }
    .submit-card > div {
        display: grid;
    }
    .submit-card > div span {
        color: var(--bs-secondary-color);
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
        color: #405189;
        border-radius: 10px;
        background: rgba(64, 81, 137, 0.1);
        font-weight: 800;
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
        color: var(--bs-body-color);
        border: 1px solid var(--bs-border-color);
        border-radius: 14px;
        background: var(--bs-body-bg);
        text-align: left;
        transition: 0.18s ease;
    }
    .request-row:hover,
    .request-row.selected {
        border-color: rgba(64, 81, 137, 0.42);
        background: rgba(64, 81, 137, 0.035);
        transform: translateY(-1px);
    }
    .request-index {
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        color: #405189;
        border-radius: 9px;
        background: rgba(64, 81, 137, 0.1);
        font-size: 0.8rem;
        font-weight: 800;
    }
    .request-thumbnail {
        width: 54px;
        height: 54px;
        display: grid;
        place-items: center;
        overflow: hidden;
        color: var(--bs-secondary-color);
        border-radius: 10px;
        background: var(--bs-tertiary-bg);
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
        color: var(--bs-secondary-color);
        font-size: 0.76rem;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .request-status {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.35rem 0.55rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
        white-space: nowrap;
    }
    .status-completed {
        color: #087b6b;
        background: rgba(10, 179, 156, 0.12);
    }
    .status-processing {
        color: #9a6500;
        background: rgba(247, 184, 75, 0.15);
    }
    .status-queued {
        color: #405189;
        background: rgba(64, 81, 137, 0.1);
    }
    .status-failed {
        color: #c13a3a;
        background: rgba(220, 53, 69, 0.1);
    }
    .status-cancelled {
        color: var(--bs-secondary-color);
        background: var(--bs-tertiary-bg);
    }
    .request-arrow {
        color: var(--bs-secondary-color);
        font-size: 1.2rem;
    }
    .dialog-backdrop {
        position: fixed;
        z-index: 1080;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 1.25rem;
        background: rgba(17, 24, 39, 0.6);
        backdrop-filter: blur(4px);
    }
    .replace-dialog {
        position: static;
        width: min(100%, 520px);
        margin: 0;
        padding: 1.6rem;
        color: var(--bs-body-color);
        border: 1px solid var(--bs-border-color);
        border-radius: 20px;
        background: var(--bs-body-bg);
        box-shadow: 0 28px 80px rgba(0, 0, 0, 0.3);
    }
    .replace-dialog-icon {
        width: 56px;
        height: 56px;
        display: grid;
        place-items: center;
        margin-bottom: 1rem;
        color: #d99000;
        border-radius: 17px;
        background: rgba(247, 184, 75, 0.15);
        font-size: 1.5rem;
    }
    .replace-dialog h3 {
        margin-bottom: 0.65rem;
        font-size: 1.35rem;
    }
    .replace-dialog > p {
        color: var(--bs-secondary-color);
        line-height: 1.6;
    }
    .replacement-job {
        display: grid;
        gap: 0.25rem;
        padding: 0.8rem 0.9rem;
        border: 1px solid var(--bs-border-color);
        border-radius: 11px;
        background: var(--bs-tertiary-bg);
    }
    .replacement-job span {
        color: var(--bs-secondary-color);
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
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
        .context-current {
            grid-column: 1/-1;
            justify-self: start;
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
        .context-current {
            grid-column: auto;
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
    }
</style>
