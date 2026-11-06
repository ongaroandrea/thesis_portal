<script>
	import { maxImageBytes, maxImageMb } from '$lib/upload-limits.js';
	import { onDestroy, onMount } from 'svelte';
	import { apiListRequest, apiRequest, formatDateTime } from '$lib/client/api.js';
	import { _ } from 'svelte-i18n';
	import { openLightbox, zoomable } from '$lib/client/lightbox.js';
	import { tableScrollHint } from '$lib/client/table-scroll-hint.js';
	import { page } from '$app/stores';

	export let activity;
	export let course;
	export let referenceImages = [];
	export let courseId;
	export let onDelete;

	let submissions = [];
	let results = [];
	let pendingFiles = [];
	let loading = true;
	let uploading = false;
	let errorMessage = '';
	let successMessage = '';
	let now = Date.now();
	let clock;
	let fileInput;

	$: isManager = Boolean(course?.canManage);
	$: startsAt = activity?.availableFrom ? new Date(activity.availableFrom).getTime() : null;
	$: deadline = activity?.availableUntil ? new Date(activity.availableUntil).getTime() : null;
	$: examState = startsAt && now < startsAt ? 'UPCOMING' : deadline && now > deadline ? 'CLOSED' : 'OPEN';
	$: ownSubmission = isManager ? null : submissions[0] ?? null;
	$: currentFiles = (ownSubmission?.files ?? []).filter((file) => file.isCurrent);
	$: historicalFiles = (ownSubmission?.files ?? []).filter((file) => !file.isCurrent);
	$: ownResult = isManager ? null : results[0] ?? null;

	onMount(async () => {
		clock = setInterval(() => now = Date.now(), 30000);
		await loadExam();
	});

	onDestroy(() => {
		clearInterval(clock);
		for (const item of pendingFiles) URL.revokeObjectURL(item.preview);
	});

	async function loadExam() {
		loading = true;
		errorMessage = '';
		try {
			[submissions, results] = await Promise.all([
				apiListRequest(`/api/consegne-esame?activityId=${activity.id}`),
				apiListRequest(`/api/risultati?activityId=${activity.id}`)
			]);
		} catch (error) {
			errorMessage = error.message;
		} finally {
			loading = false;
		}
	}

	function viewLabel(image) {
		if (image.viewType === 'OTHER') return image.customViewLabel || $_('view.other');
		return $_({ FRONT: 'view.front', SIDE: 'view.side', TOP: 'view.top', ANGLED: 'view.angled' }[image.viewType] ?? 'view.unavailable');
	}

	// Queue picked files for upload, skipping (with an error) anything that is
	// not JPEG/PNG/WEBP or is over the shared MAX_IMAGE_MB limit. Each new file is
	// pre-assigned to the next reference view in round-robin order; the
	// student can change it before uploading.
	function selectFiles(event) {
		errorMessage = '';
		const files = Array.from(event.currentTarget.files ?? []);
		const firstViewIndex = pendingFiles.length;
		for (const [offset, file] of files.entries()) {
			if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
				errorMessage = $_('exam.invalidFile', { values: { name: file.name } });
				continue;
			}
			if (file.size > maxImageBytes()) {
				errorMessage = $_('exam.fileTooLarge', { values: { name: file.name, max: maxImageMb() } });
				continue;
			}
			pendingFiles = [...pendingFiles, {
				key: `${Date.now()}-${file.name}-${Math.random()}`,
				file,
				preview: URL.createObjectURL(file),
				referenceImageId: referenceImages.length > 0
					? String(referenceImages[(firstViewIndex + offset) % referenceImages.length].id)
					: ''
			}];
		}
		event.currentTarget.value = '';
	}

	function removePending(key) {
		const item = pendingFiles.find((file) => file.key === key);
		if (item) URL.revokeObjectURL(item.preview);
		pendingFiles = pendingFiles.filter((file) => file.key !== key);
	}

	function readDataUrl(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result);
			reader.onerror = () => reject(new Error($_('exam.readError', { values: { name: file.name } })));
			reader.readAsDataURL(file);
		});
	}

	/**
	 * Send all pending files in one request as data URLs. Every file needs a
	 * distinct view (the server accepts one image per view per request).
	 * Each upload becomes a new revision server-side, replacing the current
	 * file for that view. On success previews are released and the
	 * submissions/results are reloaded.
	 */
	async function uploadFiles() {
		const selectedViews = pendingFiles.map((file) => file.referenceImageId);
		if (pendingFiles.length === 0 || selectedViews.some((view) => !view)) return;
		if (new Set(selectedViews).size !== selectedViews.length) {
			errorMessage = $_('exam.duplicateView');
			return;
		}
		uploading = true;
		errorMessage = '';
		successMessage = '';
		try {
			const files = [];
			for (const item of pendingFiles) {
				files.push({
					referenceImageId: Number(item.referenceImageId),
					originalFilename: item.file.name,
					mimeType: item.file.type,
					dataUrl: await readDataUrl(item.file)
				});
			}
			await apiRequest('/api/consegne-esame', {
				method: 'POST',
				body: JSON.stringify({ activityId: Number(activity.id), files })
			});
			for (const item of pendingFiles) URL.revokeObjectURL(item.preview);
			pendingFiles = [];
			successMessage = $_('exam.uploadSuccess', { values: { count: files.length } });
			await loadExam();
		} catch (error) {
			errorMessage = error.message;
		} finally {
			uploading = false;
		}
	}

	/**
	 * Show one student's current exam files in the image viewer, starting
	 * from the view that was clicked; the arrows step through their other views.
	 */
	function viewSubmission(submission, startIndex) {
		const student = `${submission.studentName} ${submission.studentSurname}`;
		openLightbox(
			submission.files.filter((file) => file.isCurrent).map((file) => ({
				src: file.storageKey,
				alt: file.originalFilename,
				caption: `${student} · ${viewLabel(file)} · ${file.originalFilename}`
			})),
			startIndex
		);
	}

	async function removeCurrentFile(file) {
		if (!confirm($_('exam.confirmRemove', { values: { name: file.originalFilename } }))) return;
		errorMessage = '';
		try {
			await apiRequest(`/api/consegne-esame/${file.id}`, { method: 'DELETE' });
			successMessage = $_('exam.fileRemoved');
			await loadExam();
		} catch (error) {
			errorMessage = error.message;
		}
	}
</script>

{#if errorMessage}
	<div class="alert alert-danger d-flex flex-wrap gap-2 justify-content-between align-items-center" role="alert">
		<span>{errorMessage}</span>
		<a class="alert-link" href={`/supporto?category=EXAM_DELIVERY&from=${encodeURIComponent($page.url.pathname)}`}>{$_('support.reportProblem')}</a>
	</div>
{/if}
{#if successMessage}<div class="alert alert-success">{successMessage}</div>{/if}

<section class="exam-summary">
	<div class="exam-summary-copy"><span class="badge bg-warning-subtle text-warning">{$_('activity.exam')}</span><p>{activity.objective}</p></div>
	<dl class="exam-state state-{examState.toLowerCase()}"><dt>{$_(`exam.state.${examState.toLowerCase()}`)}</dt><dd>{examState === 'UPCOMING' ? formatDateTime(activity.availableFrom) : formatDateTime(activity.availableUntil)}</dd></dl>
</section>

<div class="exam-layout">
	<main>
		<section class="exam-card instructions-card"><div class="exam-card-heading"><div><h3 class="h4">{$_('activity.instructions')}</h3><p>{$_('exam.instructionsHelp')}</p></div></div><div class="instructions-copy">{activity.description || $_('activity.noInstructions')}</div></section>

		{#if loading}
			<div class="exam-card text-center py-5"><div class="spinner-border text-primary"></div></div>
		{:else if isManager}
			<section class="exam-card">
				<div class="exam-card-heading"><div><h3 class="h4">{$_('exam.submissions')}</h3><p>{$_('exam.submissionsHelp')}</p></div><b>{submissions.length}</b></div>
				{#if submissions.length === 0}<div class="exam-empty"><p>{$_('exam.noSubmissions')}</p></div>{:else}
					<div class="table-responsive" use:tableScrollHint={$_('common.scrollTable')}><table class="table align-middle mb-0"><thead><tr><th>{$_('correction.student')}</th><th>{$_('exam.currentFiles')}</th><th>{$_('exam.revisions')}</th><th>{$_('exam.lastChange')}</th></tr></thead><tbody>{#each submissions as submission}<tr><td><strong>{submission.studentName} {submission.studentSurname}</strong><small>{submission.studentEmail}</small></td><td><div class="manager-files">{#each submission.files.filter((file) => file.isCurrent) as file, fileIndex}<span class="manager-file"><button type="button" onclick={() => viewSubmission(submission, fileIndex)} title={file.originalFilename}><i class="ri-zoom-in-line" aria-hidden="true"></i>{viewLabel(file)}</button><a href={file.storageKey} download={file.originalFilename} aria-label={$_('exam.downloadFile', { values: { name: file.originalFilename } })} title={$_('exam.downloadFile', { values: { name: file.originalFilename } })}><i class="ri-download-2-line" aria-hidden="true"></i></a></span>{/each}</div></td><td>{submission.files.length}</td><td>{formatDateTime(submission.updatedAt)}</td></tr>{/each}</tbody></table></div>
				{/if}
			</section>
			<section class="exam-card">
				<div class="exam-card-heading"><div><h3 class="h4">{$_('exam.results')}</h3><p>{$_('exam.resultsManagerHelp')}</p></div><b>{results.length}</b></div>
				{#if results.length === 0}<div class="exam-empty"><p>{$_('exam.noResults')}</p></div>{:else}<div class="table-responsive" use:tableScrollHint={$_('common.scrollTable')}><table class="table align-middle mb-0"><thead><tr><th>{$_('correction.student')}</th><th>{$_('correction.score')}</th><th>{$_('common.status')}</th><th>{$_('exam.publication')}</th></tr></thead><tbody>{#each results as result}<tr><td><strong>{result.studentName} {result.studentSurname}</strong></td><td>{result.score ?? '—'}{#if result.score != null}<small>/30</small>{/if}</td><td><span class="result-status status-{result.status.toLowerCase()}">{$_(`status.${result.status.toLowerCase()}`)}</span></td><td>{formatDateTime(result.publishedAt)}</td></tr>{/each}</tbody></table></div>{/if}
			</section>
		{:else}
			<section class="exam-card upload-card" class:locked={examState !== 'OPEN'}>
				<div class="exam-card-heading"><div><h3 class="h4">{examState === 'OPEN' ? $_('exam.yourSubmission') : $_('exam.submissionLocked')}</h3><p>{$_(`exam.uploadHelp.${examState.toLowerCase()}`)}</p></div></div>
				{#if examState === 'OPEN'}
					<input bind:this={fileInput} class="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onchange={selectFiles} />
					<button class="exam-dropzone" type="button" onclick={() => fileInput?.click()} disabled={referenceImages.length === 0}><i class="ri-image-add-line" aria-hidden="true"></i><strong>{$_('exam.chooseFiles')}</strong><small>{$_('exam.fileFormats', { values: { max: maxImageMb() } })}</small></button>
					{#if referenceImages.length === 0}<div class="alert alert-warning mt-3 mb-0">{$_('exam.noViews')}</div>{/if}
					{#if pendingFiles.length > 0}<div class="pending-files">{#each pendingFiles as item (item.key)}<article><img src={item.preview} alt={item.file.name} decoding="async" /><div><strong>{item.file.name}</strong><small>{Math.ceil(item.file.size / 1024)} KB</small><label for={`exam-view-${item.key}`}>{$_('exam.selectView')}</label><select id={`exam-view-${item.key}`} class="form-select" bind:value={item.referenceImageId}>{#each referenceImages as image}<option value={String(image.id)}>{viewLabel(image)}</option>{/each}</select></div><button type="button" onclick={() => removePending(item.key)} aria-label={$_('activity.removeImage', { values: { name: item.file.name } })}><i class="ri-close-line"></i></button></article>{/each}</div><div class="upload-actions"><button class="btn btn-success" type="button" onclick={uploadFiles} disabled={uploading}>{#if uploading}<span class="spinner-border spinner-border-sm me-2"></span>{/if}{$_('exam.saveFiles')}</button></div>{/if}
				{/if}
			</section>

			<section class="exam-card">
				<div class="exam-card-heading"><div><h3 class="h4">{$_('exam.submittedFiles')}</h3><p>{$_('exam.submittedFilesHelp')}</p></div><b>{currentFiles.length}</b></div>
				{#if currentFiles.length === 0}<div class="exam-empty"><p>{$_('exam.noFiles')}</p></div>{:else}<div class="submitted-grid">{#each currentFiles as file}<article><div class="submitted-preview"><img src={file.storageKey} alt={file.originalFilename} loading="lazy" decoding="async" use:zoomable={{ group: 'exam-files', caption: `${viewLabel(file)} · ${file.originalFilename}`, label: $_('lightbox.enlarge') }} /><span>{viewLabel(file)}</span></div><div class="submitted-copy"><strong>{file.originalFilename}</strong><small>{$_('exam.revisionNumber', { values: { revision: file.revision } })} · {formatDateTime(file.uploadedAt)}</small></div>{#if examState === 'OPEN'}<button type="button" onclick={() => removeCurrentFile(file)} aria-label={$_('activity.removeImage', { values: { name: file.originalFilename } })}><i class="ri-delete-bin-line"></i></button>{/if}</article>{/each}</div>{/if}
				{#if historicalFiles.length > 0}<details class="revision-history"><summary>{$_('exam.showHistory', { values: { count: historicalFiles.length } })}</summary><div>{#each historicalFiles as file}<p><span>{viewLabel(file)} · {file.originalFilename}</span><small>{$_('exam.revisionNumber', { values: { revision: file.revision } })} · {formatDateTime(file.uploadedAt)}</small></p>{/each}</div></details>{/if}
			</section>
		{/if}
	</main>

	<aside>
		<section class="exam-card schedule-card"><h3 class="h4">{$_('exam.schedule')}</h3><div><span>{$_('activity.availableFrom')}</span><strong>{formatDateTime(activity.availableFrom)}</strong></div><div><span>{$_('exam.submissionDeadline')}</span><strong>{formatDateTime(activity.availableUntil)}</strong></div><div><span>{$_('exam.resultsRelease')}</span><strong>{formatDateTime(activity.resultsReleasedAt)}</strong></div></section>
		{#if isManager}<section class="exam-card manager-actions"><h3 class="h4">{$_('activity.management')}</h3><a href={`/corsi/${courseId}/esercitazioni/${activity.id}/modifica`}><i class="ri-edit-line"></i>{$_('activity.edit')}</a><button type="button" onclick={onDelete}><i class="ri-delete-bin-line"></i>{$_('activity.delete')}</button></section>{:else}<section class="exam-card result-card"><div class="exam-card-heading"><div><h3 class="h4">{$_('exam.yourResult')}</h3><p>{$_('exam.resultVisibility')}</p></div></div>{#if ownResult}<div class="score-display"><strong>{ownResult.score ?? '—'}</strong><span>/30</span></div><p>{ownResult.feedback || $_('exam.noFeedback')}</p>{:else}<div class="result-pending"><span>{$_('exam.resultNotPublished')}</span></div>{/if}</section>{/if}
	</aside>
</div>

<style>
	.exam-summary { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 1rem 2rem; margin-bottom: 1.5rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--portal-border); }
	.exam-summary-copy { max-width: 72ch; }
	.exam-summary-copy p { margin: .6rem 0 0; color: var(--portal-ink); font-size: 1.05rem; line-height: 1.6; }
	.exam-state { display: grid; gap: .1rem; margin: 0; padding: .6rem .9rem; border: 1px solid var(--portal-border); border-radius: var(--portal-radius-sm); background: var(--portal-surface); }
	.exam-state dt { color: var(--portal-muted); font-size: .8rem; font-weight: 600; }
	.exam-state dd { margin: 0; color: var(--portal-ink); font-weight: 600; font-variant-numeric: tabular-nums; }
	.exam-state.state-open dt { color: var(--portal-positive-text); }
	.exam-state.state-closed dt { color: var(--portal-danger-text); }
	.exam-layout { display: grid; grid-template-columns: minmax(0, 1fr) 330px; align-items: start; gap: 1.5rem; }
	.exam-layout main, .exam-layout aside { display: grid; gap: 1.5rem; }
	/* Dates in the last column stay on one line instead of wrapping into three. */
	.exam-card .table td:last-child { white-space: nowrap; }
	.exam-card { overflow: hidden; border: 1px solid var(--portal-border); border-radius: var(--portal-radius); background: var(--portal-surface); }
	.exam-card-heading { display: flex; align-items: center; gap: .8rem; padding: 1.1rem 1.25rem; border-bottom: 1px solid var(--portal-border); }
	.exam-card-heading > div { min-width: 0; flex: 1; }
	.exam-card-heading h3 { margin: 0 0 .15rem; font-size: 1rem; }
	.exam-card-heading p { margin: 0; color: var(--portal-muted); font-size: .82rem; }
	.exam-card-heading b { color: var(--portal-muted); font-size: .85rem; font-weight: 600; font-variant-numeric: tabular-nums; }
	.instructions-copy { max-width: 75ch; padding: 1.25rem; white-space: pre-wrap; line-height: 1.65; }
	.exam-dropzone { width: calc(100% - 2.5rem); display: grid; justify-items: center; gap: .25rem; margin: 1.25rem; padding: 2rem; color: var(--portal-ink); border: 1px dashed rgba(var(--portal-polito-blue-rgb),.45); border-radius: var(--portal-radius); background: transparent; }
	.exam-dropzone:hover:not(:disabled) { background: rgba(var(--portal-polito-blue-rgb),.04); }
	.exam-dropzone i { color: var(--portal-info-text); font-size: 1.75rem; }
	.exam-dropzone small { color: var(--portal-muted); }
	.pending-files { display: grid; gap: .7rem; padding: 0 1.25rem 1rem; }
	.pending-files article { position: relative; display: grid; grid-template-columns: 86px minmax(0,1fr) auto; gap: .9rem; padding: .8rem; border: 1px solid var(--portal-border); border-radius: var(--portal-radius-sm); }
	.pending-files img { width: 86px; height: 86px; object-fit: contain; border-radius: var(--portal-radius-sm); background: #111827; }
	.pending-files article > div { min-width: 0; display: grid; align-content: center; }
	.pending-files strong, .submitted-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.pending-files small, .submitted-copy small { color: var(--portal-muted); font-size: .75rem; }
	.pending-files label { margin: .45rem 0 .25rem; font-size: .8rem; font-weight: 600; }
	.pending-files article > button, .submitted-grid article > button { width: 36px; height: 36px; display: grid; place-items: center; padding: 0; color: var(--portal-danger-text); border: 0; border-radius: var(--portal-radius-sm); background: rgba(var(--portal-danger-rgb),.09); }
	.upload-actions { display: flex; justify-content: end; padding: 0 1.25rem 1.25rem; }
	.submitted-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(230px,1fr)); gap: 1rem; padding: 1.25rem; }
	.submitted-grid article { position: relative; overflow: hidden; border: 1px solid var(--portal-border); border-radius: var(--portal-radius-sm); }
	.submitted-preview { position: relative; height: 170px; background: #111827; }
	.submitted-preview img { width: 100%; height: 100%; object-fit: contain; }
	.submitted-preview span { position: absolute; left: .65rem; bottom: .65rem; padding: .2rem .45rem; color: #fff; border-radius: var(--portal-radius-sm); background: rgba(17,24,39,.85); font-size: .75rem; font-weight: 600; }
	.submitted-copy { display: grid; padding: .8rem; }
	.submitted-grid article > button { position: absolute; right: .6rem; top: .6rem; color: #fff; background: var(--portal-solid-danger); }
	.revision-history { margin: 0 1.25rem 1.25rem; border-top: 1px solid var(--portal-border); }
	.revision-history summary { padding: 1rem 0; color: var(--portal-info-text); cursor: pointer; font-weight: 600; }
	.revision-history p { display: flex; justify-content: space-between; gap: 1rem; margin: 0; padding: .65rem 0; border-top: 1px solid var(--portal-border); }
	.revision-history small { color: var(--portal-muted); }
	.schedule-card, .manager-actions { padding: 1.25rem; }
	.schedule-card h3, .manager-actions h3 { margin-bottom: .75rem; font-size: 1rem; }
	.schedule-card > div { display: grid; gap: .15rem; padding: .7rem 0; border-bottom: 1px solid var(--portal-border); }
	.schedule-card > div:last-child { border-bottom: 0; }
	.schedule-card span { color: var(--portal-muted); font-size: .8rem; }
	.schedule-card strong { font-weight: 600; font-variant-numeric: tabular-nums; }
	.manager-actions a, .manager-actions button { width: 100%; display: flex; align-items: center; gap: .55rem; padding: .65rem; color: var(--portal-ink); border: 0; border-radius: var(--portal-radius-sm); background: transparent; }
	.manager-actions a:hover, .manager-actions button:hover { color: var(--portal-info-text); background: var(--portal-surface-muted); }
	.manager-actions button { color: var(--portal-danger-text); }
	.result-card .score-display { display: flex; align-items: baseline; justify-content: center; padding: 1.5rem 1rem .5rem; color: var(--portal-ink); font-variant-numeric: tabular-nums; }
	.score-display strong { font-size: 2.5rem; font-weight: 600; line-height: 1; }
	.result-card > p { padding: 0 1.25rem 1.25rem; color: var(--portal-muted); text-align: center; }
	.result-pending, .exam-empty { padding: 1.5rem 1.25rem; color: var(--portal-muted); }
	.exam-empty p { margin: 0; }
	.exam-card table th { padding: .75rem 1.1rem; background: var(--portal-surface-muted); }
	.exam-card table td { padding: .9rem 1.1rem; }
	.exam-card table td:first-child { display: grid; }
	.exam-card table td small { color: var(--portal-muted); font-size: .75rem; }
	.result-status { padding: .2rem .45rem; border-radius: var(--portal-radius-sm); background: var(--portal-surface-muted); font-size: .75rem; font-weight: 600; }
	.result-status.status-published { color: var(--portal-positive-text); background: rgba(var(--portal-positive-rgb),.12); }
	.manager-files { display: flex; flex-wrap: wrap; gap: .35rem; }
	/* One chip per view: the label opens the viewer, the icon downloads the file. */
	.manager-file { display: inline-flex; overflow: hidden; border: 1px solid var(--portal-border); border-radius: var(--portal-radius-sm); }
	.manager-file button, .manager-file a { min-height: 36px; display: inline-flex; align-items: center; gap: .25rem; padding: 0 .55rem; color: var(--portal-info-text); border: 0; background: var(--portal-surface); font-size: .78rem; font-weight: 600; white-space: nowrap; }
	.manager-file a { border-left: 1px solid var(--portal-border); }
	.manager-file button:hover, .manager-file a:hover { background: var(--portal-surface-muted); }
	.manager-file button { cursor: zoom-in; }
	@media (pointer: coarse) { .manager-file button, .manager-file a { min-height: 44px; } }
	@media (max-width: 1399.98px) { .exam-layout { grid-template-columns: 1fr; } .exam-layout aside { grid-template-columns: repeat(2,minmax(0,1fr)); grid-row: 1; } }
	@media (max-width: 767.98px) { .exam-layout aside { grid-template-columns: 1fr; } .pending-files article { grid-template-columns: 70px minmax(0,1fr) auto; } .pending-files img { width: 70px; height: 70px; } }
	@media (pointer: coarse) { .pending-files article > button, .submitted-grid article > button { width: 44px; height: 44px; } }
</style>
