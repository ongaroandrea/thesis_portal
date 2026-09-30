<script>
	import { onDestroy, onMount } from 'svelte';
	import { apiListRequest, apiRequest, formatDateTime } from '$lib/client/api.js';
	import { _ } from 'svelte-i18n';

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

	onDestroy(() => clearInterval(clock));

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

	function selectFiles(event) {
		errorMessage = '';
		const files = Array.from(event.currentTarget.files ?? []);
		const firstViewIndex = pendingFiles.length;
		for (const [offset, file] of files.entries()) {
			if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
				errorMessage = $_('exam.invalidFile', { values: { name: file.name } });
				continue;
			}
			if (file.size > 4 * 1024 * 1024) {
				errorMessage = $_('exam.fileTooLarge', { values: { name: file.name } });
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

{#if errorMessage}<div class="alert alert-danger">{errorMessage}</div>{/if}
{#if successMessage}<div class="alert alert-success">{successMessage}</div>{/if}

<section class="exam-hero">
	<div class="exam-hero-copy"><span class="exam-label"><i class="ri-graduation-cap-line"></i>{$_('exam.examMode')}</span><h2>{activity.title}</h2><p>{activity.objective}</p></div>
	<div class="exam-state state-{examState.toLowerCase()}"><span><i class={examState === 'OPEN' ? 'ri-timer-line' : examState === 'UPCOMING' ? 'ri-calendar-event-line' : 'ri-lock-2-line'}></i></span><div><small>{$_(`exam.state.${examState.toLowerCase()}`)}</small><strong>{examState === 'UPCOMING' ? formatDateTime(activity.availableFrom) : formatDateTime(activity.availableUntil)}</strong></div></div>
</section>

<div class="exam-layout">
	<main>
		<section class="exam-card instructions-card"><div class="exam-card-heading"><span><i class="ri-file-list-3-line"></i></span><div><h4>{$_('activity.instructions')}</h4><p>{$_('exam.instructionsHelp')}</p></div></div><div class="instructions-copy">{activity.description || $_('activity.noInstructions')}</div></section>

		{#if loading}
			<div class="exam-card text-center py-5"><div class="spinner-border text-primary"></div></div>
		{:else if isManager}
			<section class="exam-card">
				<div class="exam-card-heading"><span><i class="ri-inbox-archive-line"></i></span><div><h4>{$_('exam.submissions')}</h4><p>{$_('exam.submissionsHelp')}</p></div><b>{submissions.length}</b></div>
				{#if submissions.length === 0}<div class="exam-empty"><i class="ri-inbox-line"></i><p>{$_('exam.noSubmissions')}</p></div>{:else}
					<div class="table-responsive"><table class="table align-middle mb-0"><thead><tr><th>{$_('correction.student')}</th><th>{$_('exam.currentFiles')}</th><th>{$_('exam.revisions')}</th><th>{$_('exam.lastChange')}</th></tr></thead><tbody>{#each submissions as submission}<tr><td><strong>{submission.studentName} {submission.studentSurname}</strong><small>{submission.studentEmail}</small></td><td><div class="manager-files">{#each submission.files.filter((file) => file.isCurrent) as file}<a href={file.storageKey} download={file.originalFilename} title={file.originalFilename}><i class="ri-download-2-line"></i>{viewLabel(file)}</a>{/each}</div></td><td>{submission.files.length}</td><td>{formatDateTime(submission.updatedAt)}</td></tr>{/each}</tbody></table></div>
				{/if}
			</section>
			<section class="exam-card">
				<div class="exam-card-heading"><span><i class="ri-award-line"></i></span><div><h4>{$_('exam.results')}</h4><p>{$_('exam.resultsManagerHelp')}</p></div><b>{results.length}</b></div>
				{#if results.length === 0}<div class="exam-empty"><i class="ri-award-line"></i><p>{$_('exam.noResults')}</p></div>{:else}<div class="table-responsive"><table class="table align-middle mb-0"><thead><tr><th>{$_('correction.student')}</th><th>{$_('correction.score')}</th><th>{$_('common.status')}</th><th>{$_('exam.publication')}</th></tr></thead><tbody>{#each results as result}<tr><td><strong>{result.studentName} {result.studentSurname}</strong></td><td>{result.score ?? '—'}{#if result.score != null}<small>/30</small>{/if}</td><td><span class="result-status status-{result.status.toLowerCase()}">{$_(`status.${result.status.toLowerCase()}`)}</span></td><td>{formatDateTime(result.publishedAt)}</td></tr>{/each}</tbody></table></div>{/if}
			</section>
		{:else}
			<section class="exam-card upload-card" class:locked={examState !== 'OPEN'}>
				<div class="exam-card-heading"><span><i class={examState === 'OPEN' ? 'ri-upload-cloud-2-line' : 'ri-lock-2-line'}></i></span><div><h4>{examState === 'OPEN' ? $_('exam.yourSubmission') : $_('exam.submissionLocked')}</h4><p>{$_(`exam.uploadHelp.${examState.toLowerCase()}`)}</p></div></div>
				{#if examState === 'OPEN'}
					<input bind:this={fileInput} class="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onchange={selectFiles} />
					<button class="exam-dropzone" type="button" onclick={() => fileInput?.click()} disabled={referenceImages.length === 0}><i class="ri-image-add-line"></i><strong>{$_('exam.chooseFiles')}</strong><small>{$_('exam.fileFormats')}</small></button>
					{#if referenceImages.length === 0}<div class="alert alert-warning mt-3 mb-0">{$_('exam.noViews')}</div>{/if}
					{#if pendingFiles.length > 0}<div class="pending-files">{#each pendingFiles as item (item.key)}<article><img src={item.preview} alt={item.file.name} /><div><strong>{item.file.name}</strong><small>{Math.ceil(item.file.size / 1024)} KB</small><label for={`exam-view-${item.key}`}>{$_('exam.selectView')}</label><select id={`exam-view-${item.key}`} class="form-select" bind:value={item.referenceImageId}>{#each referenceImages as image}<option value={String(image.id)}>{viewLabel(image)}</option>{/each}</select></div><button type="button" onclick={() => removePending(item.key)} aria-label={$_('activity.removeImage', { values: { name: item.file.name } })}><i class="ri-close-line"></i></button></article>{/each}</div><div class="upload-actions"><button class="btn btn-success" type="button" onclick={uploadFiles} disabled={uploading}>{#if uploading}<span class="spinner-border spinner-border-sm me-2"></span>{/if}{$_('exam.saveFiles')}</button></div>{/if}
				{/if}
			</section>

			<section class="exam-card">
				<div class="exam-card-heading"><span><i class="ri-folder-check-line"></i></span><div><h4>{$_('exam.submittedFiles')}</h4><p>{$_('exam.submittedFilesHelp')}</p></div><b>{currentFiles.length}</b></div>
				{#if currentFiles.length === 0}<div class="exam-empty"><i class="ri-folder-open-line"></i><p>{$_('exam.noFiles')}</p></div>{:else}<div class="submitted-grid">{#each currentFiles as file}<article><div class="submitted-preview"><img src={file.storageKey} alt={file.originalFilename} /><span>{viewLabel(file)}</span></div><div class="submitted-copy"><strong>{file.originalFilename}</strong><small>{$_('exam.revisionNumber', { values: { revision: file.revision } })} · {formatDateTime(file.uploadedAt)}</small></div>{#if examState === 'OPEN'}<button type="button" onclick={() => removeCurrentFile(file)} aria-label={$_('activity.removeImage', { values: { name: file.originalFilename } })}><i class="ri-delete-bin-line"></i></button>{/if}</article>{/each}</div>{/if}
				{#if historicalFiles.length > 0}<details class="revision-history"><summary>{$_('exam.showHistory', { values: { count: historicalFiles.length } })}</summary><div>{#each historicalFiles as file}<p><span>{viewLabel(file)} · {file.originalFilename}</span><small>{$_('exam.revisionNumber', { values: { revision: file.revision } })} · {formatDateTime(file.uploadedAt)}</small></p>{/each}</div></details>{/if}
			</section>
		{/if}
	</main>

	<aside>
		<section class="exam-card schedule-card"><h4>{$_('exam.schedule')}</h4><div><span>{$_('activity.availableFrom')}</span><strong>{formatDateTime(activity.availableFrom)}</strong></div><div><span>{$_('exam.submissionDeadline')}</span><strong>{formatDateTime(activity.availableUntil)}</strong></div><div><span>{$_('exam.resultsRelease')}</span><strong>{formatDateTime(activity.resultsReleasedAt)}</strong></div></section>
		{#if isManager}<section class="exam-card manager-actions"><h4>{$_('activity.management')}</h4><a href={`/corsi/${courseId}/esercitazioni/${activity.id}/modifica`}><i class="ri-edit-line"></i>{$_('activity.edit')}</a><button type="button" onclick={onDelete}><i class="ri-delete-bin-line"></i>{$_('activity.delete')}</button></section>{:else}<section class="exam-card result-card"><div class="exam-card-heading"><span><i class="ri-award-line"></i></span><div><h4>{$_('exam.yourResult')}</h4><p>{$_('exam.resultVisibility')}</p></div></div>{#if ownResult}<div class="score-display"><strong>{ownResult.score ?? '—'}</strong><span>/30</span></div><p>{ownResult.feedback || $_('exam.noFeedback')}</p>{:else}<div class="result-pending"><i class="ri-eye-off-line"></i><span>{$_('exam.resultNotPublished')}</span></div>{/if}</section>{/if}
	</aside>
</div>

<style>
	.exam-hero { display: flex; align-items: end; justify-content: space-between; gap: 2rem; margin-bottom: 1.5rem; padding: 2rem; color: #fff; border-radius: 20px; background: radial-gradient(circle at 92% 12%, rgba(247,184,75,.34), transparent 30%), linear-gradient(135deg,#2d3c6b,#18233f); box-shadow: 0 16px 38px rgba(31,43,79,.18); }
	.exam-hero-copy { max-width: 720px; }
	.exam-label { display: inline-flex; align-items: center; gap: .4rem; padding: .35rem .6rem; border-radius: 9px; background: rgba(255,255,255,.12); font-size: .72rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
	.exam-hero h2 { margin: .7rem 0 .35rem; color: #fff; }
	.exam-hero p { margin: 0; color: rgba(255,255,255,.72); font-size: 1rem; }
	.exam-state { min-width: 230px; display: flex; align-items: center; gap: .8rem; padding: .8rem; border: 1px solid rgba(255,255,255,.13); border-radius: 14px; background: rgba(255,255,255,.08); }
	.exam-state > span { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 12px; background: rgba(255,255,255,.12); font-size: 1.15rem; }
	.exam-state > div { display: grid; }
	.exam-state small { color: rgba(255,255,255,.62); text-transform: uppercase; font-size: .65rem; font-weight: 800; letter-spacing: .04em; }
	.exam-layout { display: grid; grid-template-columns: minmax(0, 1fr) 330px; align-items: start; gap: 1.5rem; }
	.exam-layout main, .exam-layout aside { display: grid; gap: 1.5rem; }
	.exam-card { overflow: hidden; border: 1px solid var(--bs-border-color); border-radius: 18px; background: var(--bs-body-bg); box-shadow: 0 9px 26px rgba(31,43,79,.06); }
	.exam-card-heading { display: flex; align-items: center; gap: .8rem; padding: 1.2rem 1.3rem; border-bottom: 1px solid var(--bs-border-color); }
	.exam-card-heading > span { width: 42px; height: 42px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 12px; color: #405189; background: rgba(64,81,137,.1); font-size: 1.1rem; }
	.exam-card-heading > div { min-width: 0; flex: 1; }
	.exam-card-heading h4 { margin: 0 0 .12rem; font-size: 1rem; }
	.exam-card-heading p { margin: 0; color: var(--bs-secondary-color); font-size: .78rem; }
	.exam-card-heading b { min-width: 30px; padding: .25rem .45rem; border-radius: 99px; background: var(--bs-tertiary-bg); text-align: center; font-size: .75rem; }
	.instructions-copy { padding: 1.3rem; white-space: pre-wrap; line-height: 1.65; }
	.exam-dropzone { width: calc(100% - 2.6rem); display: grid; justify-items: center; gap: .25rem; margin: 1.3rem; padding: 2rem; color: var(--bs-body-color); border: 1px dashed rgba(64,81,137,.38); border-radius: 15px; background: rgba(64,81,137,.035); }
	.exam-dropzone i { color: #405189; font-size: 2rem; }
	.exam-dropzone small { color: var(--bs-secondary-color); }
	.pending-files { display: grid; gap: .7rem; padding: 0 1.3rem 1rem; }
	.pending-files article { position: relative; display: grid; grid-template-columns: 86px minmax(0,1fr) auto; gap: .9rem; padding: .8rem; border: 1px solid var(--bs-border-color); border-radius: 13px; }
	.pending-files img { width: 86px; height: 86px; object-fit: contain; border-radius: 9px; background: #111827; }
	.pending-files article > div { min-width: 0; display: grid; align-content: center; }
	.pending-files strong, .submitted-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.pending-files small, .submitted-copy small { color: var(--bs-secondary-color); font-size: .72rem; }
	.pending-files label { margin: .45rem 0 .25rem; font-size: .7rem; font-weight: 700; }
	.pending-files article > button, .submitted-grid article > button { width: 32px; height: 32px; display: grid; place-items: center; padding: 0; color: #dc3545; border: 0; border-radius: 9px; background: rgba(220,53,69,.09); }
	.upload-actions { display: flex; justify-content: end; padding: 0 1.3rem 1.3rem; }
	.submitted-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(230px,1fr)); gap: 1rem; padding: 1.3rem; }
	.submitted-grid article { position: relative; overflow: hidden; border: 1px solid var(--bs-border-color); border-radius: 14px; }
	.submitted-preview { position: relative; height: 170px; background: #111827; }
	.submitted-preview img { width: 100%; height: 100%; object-fit: contain; }
	.submitted-preview span { position: absolute; left: .65rem; bottom: .65rem; padding: .25rem .45rem; color: #fff; border-radius: 8px; background: rgba(17,24,39,.76); font-size: .7rem; font-weight: 700; }
	.submitted-copy { display: grid; padding: .8rem; }
	.submitted-grid article > button { position: absolute; right: .6rem; top: .6rem; color: #fff; background: rgba(220,53,69,.88); }
	.revision-history { margin: 0 1.3rem 1.3rem; border-top: 1px solid var(--bs-border-color); }
	.revision-history summary { padding: 1rem 0; color: #405189; cursor: pointer; font-weight: 700; }
	.revision-history p { display: flex; justify-content: space-between; gap: 1rem; margin: 0; padding: .65rem 0; border-top: 1px solid var(--bs-border-color); }
	.revision-history small { color: var(--bs-secondary-color); }
	.schedule-card, .manager-actions { padding: 1.3rem; }
	.schedule-card h4, .manager-actions h4 { margin-bottom: 1rem; font-size: 1rem; }
	.schedule-card > div { display: grid; gap: .2rem; padding: .8rem 0; border-bottom: 1px solid var(--bs-border-color); }
	.schedule-card > div:last-child { border-bottom: 0; }
	.schedule-card span { color: var(--bs-secondary-color); font-size: .72rem; text-transform: uppercase; }
	.manager-actions a, .manager-actions button { width: 100%; display: flex; align-items: center; gap: .55rem; padding: .7rem; color: var(--bs-body-color); border: 0; border-radius: 10px; background: transparent; }
	.manager-actions a:hover, .manager-actions button:hover { color: #405189; background: var(--bs-tertiary-bg); }
	.manager-actions button { color: #dc3545; }
	.result-card .score-display { display: flex; align-items: baseline; justify-content: center; padding: 1.5rem 1rem .5rem; color: #405189; }
	.score-display strong { font-size: 3rem; line-height: 1; }
	.result-card > p { padding: 0 1.3rem 1.3rem; color: var(--bs-secondary-color); text-align: center; }
	.result-pending, .exam-empty { display: grid; justify-items: center; gap: .45rem; padding: 2.2rem 1rem; color: var(--bs-secondary-color); text-align: center; }
	.result-pending i, .exam-empty i { color: #405189; font-size: 1.65rem; }
	.exam-card table th { padding: .75rem 1.1rem; color: var(--bs-secondary-color); background: var(--bs-tertiary-bg); font-size: .7rem; text-transform: uppercase; }
	.exam-card table td { padding: .9rem 1.1rem; }
	.exam-card table td:first-child { display: grid; }
	.exam-card table td small { color: var(--bs-secondary-color); font-size: .72rem; }
	.result-status { padding: .25rem .45rem; border-radius: 99px; background: var(--bs-tertiary-bg); font-size: .7rem; font-weight: 700; }
	.result-status.status-published { color: #087b6b; background: rgba(10,179,156,.12); }
	.manager-files { display: flex; flex-wrap: wrap; gap: .35rem; }
	.manager-files a { display: inline-flex; align-items: center; gap: .25rem; padding: .3rem .48rem; color: #405189; border-radius: 8px; background: rgba(64,81,137,.09); font-size: .72rem; font-weight: 700; }
	@media (max-width: 991.98px) { .exam-layout { grid-template-columns: 1fr; } .exam-layout aside { grid-template-columns: repeat(2,minmax(0,1fr)); grid-row: 1; } }
	@media (max-width: 767.98px) { .exam-hero { display: grid; padding: 1.4rem; } .exam-state { min-width: 0; } .exam-layout aside { grid-template-columns: 1fr; } .pending-files article { grid-template-columns: 70px minmax(0,1fr) auto; } .pending-files img { width: 70px; height: 70px; } }
</style>
