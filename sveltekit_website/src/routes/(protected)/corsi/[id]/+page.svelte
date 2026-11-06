<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { apiListRequest, apiRequest, formatDate, formatDateTime } from '$lib/client/api.js';
	import { spreadsheetRows } from '$lib/client/spreadsheet-import.js';
	import ActivityForm from '$lib/components/portal/ActivityForm.svelte';
	import { _ } from 'svelte-i18n';
	import { tableScrollHint } from '$lib/client/table-scroll-hint.js';

	let course;
	let activities = [];
	let members = [];
	let students = [];
	let loading = true;
	let errorMessage = '';
	let successMessage = '';
	let memberEmail = '';
	let importFile;
	let importFileInput;
	let importDetails = [];
	let importPreviewEmails = [];
	let showImportPreview = false;
	let busy = false;
	let activityBusy = false;
	let showActivityForm = false;
	let showMemberModal = false;
	let activityFilter = 'ALL';
	let activeTab = 'activities';
	let statisticsRows = [];
	let statisticsLoading = false;
	let statisticsLoaded = false;
	$: courseId = $page.params.id;
	$: filteredActivities = activities.filter((activity) => activityFilter === 'ALL' || activity.status === activityFilter);
	$: memberEmails = new Set(members.map((member) => member.email.toLowerCase()));
	$: availableStudents = students.filter((student) =>
		student.role === 'student' && !student.banned && !memberEmails.has(student.email.toLowerCase())
	);
	$: totalSessions = statisticsRows.reduce((sum, row) => sum + row.sessions.length, 0);
	$: completedSessions = statisticsRows.reduce((sum, row) =>
		sum + row.sessions.filter((session) => session.status === 'ANSWERED').length, 0
	);
	$: completion = totalSessions ? Math.round((completedSessions / totalSessions) * 100) : 0;

	async function loadPage() {
		loading = true; errorMessage = '';
		try {
			course = await apiRequest(`/api/corsi/${courseId}`);
			activities = await apiListRequest(`/api/esercitazioni?courseId=${courseId}`);
			if (course.canManage) {
				[members, students] = await Promise.all([
					apiListRequest(`/api/membri?courseId=${courseId}`),
					apiListRequest('/api/utenti')
				]);
			}
		} catch (error) { errorMessage = error.message; }
		finally { loading = false; }
	}

	onMount(loadPage);

	async function selectTab(tab) {
		activeTab = tab;
		showActivityForm = false;
		showMemberModal = false;
		if (tab === 'statistics' && !statisticsLoaded) await loadStatistics();
	}

	function openMemberModal() {
		memberEmail = '';
		showMemberModal = true;
	}

	function closeMemberModal() {
		if (busy) return;
		showMemberModal = false;
		memberEmail = '';
	}

	function handleMemberModalKeydown(event) {
		if (event.key !== 'Escape') return;
		if (showImportPreview) closeImportPreview();
		else if (showMemberModal) closeMemberModal();
	}

	async function loadStatistics() {
		statisticsLoading = true;
		errorMessage = '';
		try {
			statisticsRows = await Promise.all(activities.map(async (activity) => ({
				activity,
				sessions: await apiListRequest(`/api/sessioni-correzione?activityId=${activity.id}`)
			})));
			statisticsLoaded = true;
		} catch (error) {
			errorMessage = error.message;
		} finally {
			statisticsLoading = false;
		}
	}

	async function createActivity(values) {
		activityBusy = true;
		errorMessage = '';
		successMessage = '';
		try {
			const { referenceImages, ...activityValues } = values;
			const created = await apiRequest('/api/esercitazioni', {
				method: 'POST',
				body: JSON.stringify({ ...activityValues, courseId: Number(courseId) })
			});
			activities = [...activities, created].sort((a, b) => a.displayOrder - b.displayOrder);
			statisticsLoaded = false;
			showActivityForm = false;
			let uploadedImages = 0;
			for (const image of referenceImages) {
				try {
					await apiRequest(`/api/esercitazioni/${created.id}/immagini`, {
						method: 'POST',
						body: JSON.stringify(image)
					});
					uploadedImages += 1;
				} catch (error) {
					errorMessage = $_('course.activityPartialError', { values: { count: referenceImages.length - uploadedImages, error: error.message } });
					break;
				}
			}
			successMessage = uploadedImages
				? $_('course.activityCreatedImages', { values: { count: uploadedImages } })
				: $_('course.activityCreated');
		} catch (error) {
			errorMessage = error.message;
		} finally {
			activityBusy = false;
		}
	}

	async function addMember(event) {
		event.preventDefault(); busy = true; errorMessage = ''; successMessage = '';
		try {
			await apiRequest('/api/membri', { method: 'POST', body: JSON.stringify({ courseId: Number(courseId), email: memberEmail, role: 'STUDENT' }) });
			memberEmail = ''; showMemberModal = false; successMessage = $_('course.studentAuthorized'); await loadPage();
		} catch (error) { errorMessage = error.message; }
		finally { busy = false; }
	}

	function normalizeHeader(value) {
		return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
			.toLowerCase().replace(/[^a-z0-9]/g, '');
	}

	// read-excel-file may return rich-text, formula ({ result }) or hyperlink
	// ({ text }) objects instead of strings; flatten them to plain text.
	function cellText(value) {
		if (value === null || value === undefined) return '';
		if (typeof value !== 'object') return String(value);
		if (Array.isArray(value.richText)) return value.richText.map((part) => part.text ?? '').join('');
		if ('result' in value) return cellText(value.result);
		if ('text' in value) return String(value.text ?? '');
		return String(value);
	}

	// Guess the CSV delimiter from the header line: the most frequent of
	// , ; or tab outside quotes. Italian Excel exports use ';'.
	function detectDelimiter(text) {
		const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
		const delimiters = [',', ';', '\t'];
		let quoted = false;
		const counts = new Map(delimiters.map((delimiter) => [delimiter, 0]));
		for (let index = 0; index < firstLine.length; index += 1) {
			if (firstLine[index] === '"') quoted = !quoted;
			else if (!quoted && counts.has(firstLine[index])) counts.set(firstLine[index], counts.get(firstLine[index]) + 1);
		}
		return delimiters.sort((a, b) => counts.get(b) - counts.get(a))[0];
	}

	/**
	 * Minimal RFC 4180-style CSV parser: handles quoted fields, escaped
	 * quotes ("") and delimiters/newlines inside quotes, and accepts LF or
	 * CRLF line endings.
	 * @param {string} text - File contents (BOM already stripped).
	 * @returns {string[][]} Rows of raw cell strings.
	 */
	function parseCsv(text) {
		const delimiter = detectDelimiter(text);
		const rows = [];
		let row = [];
		let value = '';
		let quoted = false;
		for (let index = 0; index < text.length; index += 1) {
			const character = text[index];
			if (character === '"') {
				if (quoted && text[index + 1] === '"') { value += '"'; index += 1; }
				else quoted = !quoted;
			} else if (character === delimiter && !quoted) {
				row.push(value); value = '';
			} else if ((character === '\n' || character === '\r') && !quoted) {
				if (character === '\r' && text[index + 1] === '\n') index += 1;
				row.push(value); rows.push(row); row = []; value = '';
			} else value += character;
		}
		if (value || row.length) { row.push(value); rows.push(row); }
		return rows;
	}

	/**
	 * Find the email column and return its non-empty values.
	 * The header row is searched in the first 10 rows (exports often start
	 * with a title block); header names are compared accent- and
	 * punctuation-insensitively, so "Email istituzionale" matches.
	 * Domain checks are left to the server.
	 * @param {unknown[][]} rows
	 * @returns {string[]} At most 2000 emails.
	 * @throws {Error} Localized message if no column, no emails or too many rows.
	 */
	function emailsFromRows(rows) {
		const acceptedHeaders = new Set(['email', 'emailistituzionale', 'indirizzoemail', 'mail']);
		let headerRow = -1;
		let emailColumn = -1;
		for (let rowIndex = 0; rowIndex < Math.min(rows.length, 10); rowIndex += 1) {
			if (!Array.isArray(rows[rowIndex])) continue;
			emailColumn = rows[rowIndex].findIndex((value) => acceptedHeaders.has(normalizeHeader(value)));
			if (emailColumn >= 0) { headerRow = rowIndex; break; }
		}
		if (headerRow < 0) throw new Error($_('course.importEmailColumn'));
		const emails = rows.slice(headerRow + 1)
			.map((row) => Array.isArray(row) ? cellText(row[emailColumn]).trim() : '')
			.filter(Boolean);
		if (emails.length === 0) throw new Error($_('course.importEmptyEmail'));
		if (emails.length > 2000) throw new Error($_('course.importRowLimit'));
		return emails;
	}

	// Parse an uploaded CSV or XLSX (max 5 MB) entirely in the browser; only
	// the extracted email list is sent to the server. The XLSX reader is
	// imported lazily so it is not part of the page bundle.
	async function parseImportFile(file) {
		if (!file) throw new Error($_('course.importSelectFile'));
		if (file.size > 5 * 1024 * 1024) throw new Error($_('course.importFileLimit'));
		const extension = file.name.split('.').pop()?.toLowerCase();
		if (extension === 'csv') return emailsFromRows(parseCsv((await file.text()).replace(/^\uFEFF/, '')));
		if (extension === 'xlsx') {
			const readXlsxFile = (await import('read-excel-file/browser')).default;
			return emailsFromRows(spreadsheetRows(await readXlsxFile(file)));
		}
		throw new Error($_('course.importUnsupported'));
	}

	function selectImportFile(event) {
		importFile = event.currentTarget.files?.[0];
		importDetails = [];
		importPreviewEmails = [];
		showImportPreview = false;
		errorMessage = '';
		successMessage = '';
	}

	async function previewImport(event) {
		event.preventDefault(); busy = true; errorMessage = ''; successMessage = ''; importDetails = [];
		try {
			importPreviewEmails = await parseImportFile(importFile);
			showImportPreview = true;
		} catch (error) { errorMessage = error.message; }
		finally { busy = false; }
	}

	function closeImportPreview() {
		if (busy) return;
		showImportPreview = false;
		importPreviewEmails = [];
	}

	async function confirmImport() {
		busy = true; errorMessage = ''; successMessage = ''; importDetails = [];
		try {
			const result = await apiRequest('/api/corsi/import', { method: 'POST', body: JSON.stringify({ courseId: Number(courseId), originalFilename: importFile.name, emails: importPreviewEmails }) });
			importDetails = result.errors ?? [];
			successMessage = $_('course.importComplete', { values: { created: result.createdUsers, existing: result.existingUsers, rejected: result.rejectedRows } });
			showImportPreview = false;
			importPreviewEmails = [];
			importFile = undefined;
			if (importFileInput) importFileInput.value = '';
			await loadPage();
		} catch (error) { errorMessage = error.message; }
		finally { busy = false; }
	}

	async function deleteCourse() {
		if (!confirm($_('course.confirmDelete'))) return;
		try { await apiRequest(`/api/corsi/${courseId}`, { method: 'DELETE' }); goto('/corsi'); }
		catch (error) { errorMessage = error.message; }
	}
</script>

<svelte:head><title>{course?.name ?? $_('activity.course')} | {$_('site.name')}</title></svelte:head>
<div class="page-content"><div class="container-fluid py-4">
	{#if errorMessage}<div class="alert alert-danger">{errorMessage}</div>{/if}
	{#if successMessage}<div class="alert alert-success">{successMessage}</div>{/if}
	{#if loading}<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
	{:else if course}
		<a class="course-back" href="/corsi"><i class="ri-arrow-left-line" aria-hidden="true"></i>{$_('course.back')}</a>
		<header class="course-header">
			<div class="course-header-main">
				<h1 class="page-title">{course.name}</h1>
				<p class="course-description">{course.description || $_('common.noDescription')}</p>
				<dl class="course-meta">
					<div><dt>{$_('common.status')}</dt><dd><span class="badge {course.isActive ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}">{$_(course.isActive ? 'status.active' : 'status.inactive')}</span></dd></div>
					<div><dt>{$_('course.startDate')}</dt><dd>{formatDate(course.startsAt)}</dd></div>
					<div><dt>{$_('course.endDate')}</dt><dd>{formatDate(course.endsAt)}</dd></div>
				</dl>
			</div>
			{#if course.canManage}<div class="course-actions"><a class="btn btn-light" href={`/corsi/${courseId}/prompt`}><i class="ri-terminal-box-line" aria-hidden="true"></i><span>{$_('prompt.courseTitle')}</span></a><a class="btn btn-light" href={`/corsi/${courseId}/modifica`}><i class="ri-edit-line" aria-hidden="true"></i><span>{$_('common.edit')}</span></a><button class="btn btn-outline-danger" type="button" onclick={deleteCourse}><i class="ri-delete-bin-line" aria-hidden="true"></i><span>{$_('common.delete')}</span></button></div>{/if}
		</header>

		<div class="course-workspace">
			<ul class="nav nav-tabs course-tabs" role="tablist" aria-label={$_('course.management')}>
				<li class="nav-item" role="presentation">
					<button class="nav-link" class:active={activeTab === 'activities'} type="button" role="tab" aria-selected={activeTab === 'activities'} onclick={() => selectTab('activities')}>{$_('activity.activities')} <span class="tab-count">{activities.length}</span></button>
				</li>
				{#if course.canManage}
					<li class="nav-item" role="presentation">
						<button class="nav-link" class:active={activeTab === 'members'} type="button" role="tab" aria-selected={activeTab === 'members'} onclick={() => selectTab('members')}>{$_('course.members')} <span class="tab-count">{members.length}</span></button>
					</li>
					<li class="nav-item" role="presentation">
						<button class="nav-link" class:active={activeTab === 'statistics'} type="button" role="tab" aria-selected={activeTab === 'statistics'} onclick={() => selectTab('statistics')}>{$_('stats.title')}</button>
					</li>
				{/if}
			</ul>

			<div class="course-panel card"><div class="card-body p-4">
				{#if activeTab === 'activities'}
					{#if showActivityForm}
						<div class="d-flex justify-content-between align-items-start mb-4">
							<div><h2 class="h4 mb-1">{$_('activity.new')}</h2><p class="text-muted mb-0">{$_('activity.newSubtitle')}</p></div>
						</div>
						<ActivityForm onSubmit={createActivity} busy={activityBusy} submitLabel={$_('activity.create')} onCancel={() => showActivityForm = false} enableReferenceImages />
					{:else}
						<div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
							<div class="btn-group" role="group" aria-label={$_('activity.filter')}>
								<button class="btn {activityFilter === 'ALL' ? 'btn-primary' : 'btn-light'}" onclick={() => activityFilter = 'ALL'}>{$_('common.allFeminine')}</button>
								<button class="btn {activityFilter === 'PUBLISHED' ? 'btn-primary' : 'btn-light'}" onclick={() => activityFilter = 'PUBLISHED'}>{$_('status.publishedPlural')}</button>
								<button class="btn {activityFilter === 'DRAFT' ? 'btn-primary' : 'btn-light'}" onclick={() => activityFilter = 'DRAFT'}>{$_('status.draftPlural')}</button>
							</div>
							{#if course.canManage}<button class="btn btn-success" onclick={() => showActivityForm = true}><i class="ri-add-line me-1"></i>{$_('activity.new')}</button>{/if}
						</div>
						{#if filteredActivities.length === 0}
							<div class="empty-state">
								{#if activities.length > 0}<p class="text-muted mb-0">{$_('activity.noneForFilter')}</p>
								{:else if course.canManage}<p class="mb-1 fw-semibold">{$_('activity.noneYetStaff')}</p><p class="text-muted mb-0">{$_('activity.noneYetStaffHelp')}</p>
								{:else}<p class="mb-1 fw-semibold">{$_('activity.noneYetStudent')}</p><p class="text-muted mb-0">{$_('activity.noneYetStudentHelp')}</p>{/if}
							</div>
						{:else}
							<div class="table-responsive" use:tableScrollHint={$_('common.scrollTable')}>
								<table class="table table-hover align-middle mb-0">
									<thead class="table-light"><tr><th>{$_('activity.activity')}</th><th>{$_('activity.kind')}</th><th>{$_('activity.availability')}</th><th>{$_('common.status')}</th><th class="text-end">{$_('common.actions')}</th></tr></thead>
									<tbody>{#each filteredActivities as activity}<tr>
										<td><div class="fw-semibold">{activity.title}</div><small class="text-muted">{activity.objective}</small></td>
										<td>{$_(activity.kind === 'EXAM' ? 'activity.exam' : 'activity.exercise')}</td>
										<td><small>{formatDateTime(activity.availableFrom)}<br />{formatDateTime(activity.availableUntil)}</small></td>
										<td><span class="badge {activity.status === 'PUBLISHED' ? 'bg-success-subtle text-success' : activity.status === 'DRAFT' ? 'bg-warning-subtle text-warning' : 'bg-secondary-subtle text-secondary'}">{$_(`status.${activity.status.toLowerCase()}`)}</span></td>
										<td class="text-end"><a class="btn btn-sm btn-primary" href={`/corsi/${courseId}/esercitazioni/${activity.id}`}>{$_('common.open')}</a>{#if course.canManage}<a class="btn btn-sm btn-light ms-1" href={`/corsi/${courseId}/esercitazioni/${activity.id}/modifica`} aria-label={$_('activity.editNamed', { values: { title: activity.title } })}><i class="ri-edit-line"></i></a>{/if}</td>
									</tr>{/each}</tbody>
								</table>
							</div>
						{/if}
					{/if}
				{:else if activeTab === 'members' && course.canManage}
					<div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
						<div><h2 class="h4 mb-1">{$_('course.authorizedMembers')}</h2><p class="text-muted mb-0">{$_('course.membersInCourse', { values: { count: members.length } })}</p></div>
						<button class="btn btn-primary" type="button" onclick={openMemberModal}><i class="ri-user-add-line me-1"></i>{$_('course.addStudent')}</button>
					</div>
					<div class="member-list table-responsive border rounded-3" use:tableScrollHint={$_('common.scrollTable')}>
						<table class="table table-hover align-middle mb-0">
							<thead class="table-light"><tr><th class="ps-4">{$_('course.member')}</th><th>Email</th><th>{$_('common.role')}</th><th>{$_('common.status')}</th><th class="pe-4">{$_('course.authorizedSince')}</th></tr></thead>
							<tbody>{#each members as member}<tr class:pending-member={member.status === 'PENDING'}><td class="ps-4"><div class="d-flex align-items-center gap-3"><div class="avatar" class:pending={member.status === 'PENDING'}>{#if member.status === 'PENDING'}<i class="ri-mail-send-line"></i>{:else}{member.name?.[0]}{member.surname?.[0]}{/if}</div><div><div class="fw-semibold">{[member.name, member.surname].filter(Boolean).join(' ') || $_('course.accountPending')}</div>{#if member.status === 'PENDING'}<small class="text-muted">{$_('course.accountPendingHelp')}</small>{/if}</div></div></td><td>{member.email}</td><td><span class="badge bg-primary-subtle text-primary">{$_(member.role === 'PROFESSOR' ? 'role.professor' : 'role.student')}</span></td><td><span class="badge {member.status === 'ACTIVE' ? 'bg-success-subtle text-success' : member.status === 'PENDING' ? 'bg-warning-subtle text-warning' : 'bg-secondary-subtle text-secondary'}">{$_(`status.${member.status.toLowerCase()}`)}</span></td><td class="pe-4"><small>{formatDateTime(member.joinedAt ?? member.createdAt)}</small></td></tr>{:else}<tr><td colspan="5" class="text-center text-muted py-5">{$_('course.noMembers')}</td></tr>{/each}</tbody>
						</table>
					</div>
					<hr class="my-4" />
					<div><h2 class="h4 mb-1">{$_('course.importStudents')}</h2><p class="text-muted">{$_('course.importStudentsHelp')}</p>
						<form onsubmit={previewImport}><div class="row g-3 align-items-start"><div class="col-lg-8"><label class="form-label" for="members-file">{$_('course.studentFile')}</label><input bind:this={importFileInput} id="members-file" class="form-control" type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" onchange={selectImportFile} /><div class="form-text">{$_('course.studentFileHelp')}</div></div><div class="col-lg-4"><span class="form-label d-none d-lg-block" aria-hidden="true">&nbsp;</span><button class="btn btn-outline-primary w-100" disabled={busy || !importFile}>{$_(busy ? 'course.readingFile' : 'course.previewImport')}</button></div></div></form>
						{#if importDetails.length > 0}<div class="alert alert-warning mt-3 mb-0"><div class="fw-semibold mb-1">{$_('course.rowsNotImported')}</div>{#each importDetails.slice(0, 5) as detail}<div class="small">{$_('course.rowError', { values: { row: detail.row, email: detail.email || $_('common.emptyValue'), error: detail.message } })}</div>{/each}{#if importDetails.length > 5}<div class="small mt-1">{$_('course.moreErrors', { values: { count: importDetails.length - 5 } })}</div>{/if}</div>{/if}
					</div>
				{:else if activeTab === 'statistics' && course.canManage}
					{#if statisticsLoading}<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>{:else}
						<dl class="stats-summary">
							<div><dt>{$_('activity.activities')}</dt><dd>{statisticsRows.length}</dd></div>
							<div><dt>{$_('stats.sessions')}</dt><dd>{totalSessions}</dd></div>
							<div><dt>{$_('stats.completedSessions')}</dt><dd>{completion}%</dd></div>
						</dl>
						{#if statisticsRows.length === 0}<p class="empty-state text-muted mb-0">{$_('stats.noActivitiesYet')}</p>{:else}<div class="table-responsive" use:tableScrollHint={$_('common.scrollTable')}><table class="table align-middle mb-0"><thead class="table-light"><tr><th>{$_('activity.activity')}</th><th>{$_('stats.sessionCount')}</th><th>{$_('stats.answers')}</th><th>{$_('stats.processing')}</th><th>{$_('stats.completion')}</th></tr></thead><tbody>{#each statisticsRows as row}{@const completed = row.sessions.filter((session) => session.status === 'ANSWERED').length}{@const pending = row.sessions.filter((session) => ['OPEN', 'PROCESSING'].includes(session.status)).length}{@const rate = row.sessions.length ? Math.round(completed / row.sessions.length * 100) : 0}<tr><td><a class="fw-semibold" href={`/corsi/${courseId}/esercitazioni/${row.activity.id}`}>{row.activity.title}</a><small class="d-block text-muted">{$_(`status.${row.activity.status.toLowerCase()}`)}</small></td><td>{row.sessions.length}</td><td>{completed}</td><td>{pending}</td><td><div class="d-flex align-items-center gap-2"><div class="progress flex-grow-1" style="height:7px"><div class="progress-bar bg-success" style={`width:${rate}%`}></div></div><small>{rate}%</small></div></td></tr>{/each}</tbody></table></div>{/if}
					{/if}
				{/if}
			</div></div>
		</div>
	{/if}
</div></div>

<svelte:window onkeydown={handleMemberModalKeydown} />

{#if showMemberModal}
	<div class="member-modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && closeMemberModal()}>
		<div class="member-modal" role="dialog" aria-modal="true" aria-labelledby="member-modal-title">
			<div class="member-modal-header">
				<div><h2 id="member-modal-title" class="h5 mb-1">{$_('course.addStudent')}</h2><p class="text-muted mb-0">{$_('course.selectAccount')}</p></div>
				<button class="btn-close" type="button" aria-label={$_('common.close')} onclick={closeMemberModal} disabled={busy}></button>
			</div>
			<form onsubmit={addMember}>
				<div class="member-modal-body">
					<label class="form-label" for="member-email">{$_('role.student')}</label>
					<select id="member-email" required class="form-select" bind:value={memberEmail} disabled={availableStudents.length === 0}>
						<option value="" disabled>{$_('course.selectStudent')}</option>
						{#each availableStudents as student}<option value={student.email}>{student.name} {student.surname} — {student.email}</option>{/each}
					</select>
					{#if availableStudents.length === 0}<p class="small text-muted mt-2 mb-0">{$_('course.allStudentsAuthorized')}</p>{/if}
				</div>
				<div class="member-modal-footer">
					<button class="btn btn-light" type="button" onclick={closeMemberModal} disabled={busy}>{$_('common.cancel')}</button>
					<button class="btn btn-primary" disabled={busy || !memberEmail}>{$_(busy ? 'course.authorizing' : 'course.authorizeStudent')}</button>
				</div>
			</form>
		</div>
	</div>
{/if}

{#if showImportPreview}
	<div class="member-modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && closeImportPreview()}>
		<div class="member-modal import-preview-modal" role="dialog" aria-modal="true" aria-labelledby="import-preview-title">
			<div class="member-modal-header">
				<div><h2 id="import-preview-title" class="h5 mb-1">{$_('course.importPreviewTitle')}</h2><p class="text-muted mb-0">{$_('course.importPreviewHelp')}</p></div>
				<button class="btn-close" type="button" aria-label={$_('common.close')} onclick={closeImportPreview} disabled={busy}></button>
			</div>
			<div class="member-modal-body">
				<div class="import-preview-summary"><span><i class="ri-file-excel-2-line"></i>{importFile?.name}</span><strong>{$_('course.importPreviewCount', { values: { count: importPreviewEmails.length } })}</strong></div>
				<ol class="import-preview-list">
					{#each importPreviewEmails as email, index}
						<li><span>{index + 1}</span><strong>{email}</strong></li>
					{/each}
				</ol>
			</div>
			<div class="member-modal-footer">
				<button class="btn btn-light" type="button" onclick={closeImportPreview} disabled={busy}>{$_('common.cancel')}</button>
				<button class="btn btn-primary" type="button" onclick={confirmImport} disabled={busy || importPreviewEmails.length === 0}>{#if busy}<span class="spinner-border spinner-border-sm me-2"></span>{/if}{$_(busy ? 'course.importing' : 'course.confirmImport')}</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.course-back { display: inline-flex; align-items: center; gap: .45rem; margin-bottom: 1rem; color: var(--portal-muted); font-weight: 600; }
	.course-back:hover { color: var(--portal-info-text); }
	.course-header { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 1rem 2rem; margin-bottom: 1.75rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--portal-border); }
	.course-header-main { min-width: 0; flex: 1 1 32rem; }
	.course-header .page-title { max-width: 40ch; margin-bottom: .5rem; }
	.course-description { max-width: 72ch; margin: 0 0 1rem; color: var(--portal-muted); line-height: 1.6; }
	.course-meta { display: flex; flex-wrap: wrap; gap: .5rem 2rem; margin: 0; }
	.course-meta > div { display: grid; gap: .1rem; }
	.course-meta dt { color: var(--portal-muted); font-size: .8rem; font-weight: 500; }
	.course-meta dd { margin: 0; color: var(--portal-ink); font-weight: 600; font-variant-numeric: tabular-nums; }
	.course-actions { display: flex; flex-wrap: wrap; gap: .5rem; }
	.course-actions .btn { display: inline-flex; align-items: center; gap: .4rem; }
	.course-tabs { flex-wrap: nowrap; overflow-x: auto; overflow-y: hidden; border-bottom: 0; }
	.course-tabs .nav-link { white-space: nowrap; }
	.tab-count { margin-left: .3rem; padding: .05rem .4rem; border-radius: var(--portal-radius-sm); color: var(--portal-muted); background: var(--portal-surface-muted); font-size: .75rem; font-variant-numeric: tabular-nums; }
	.course-panel { border-top-left-radius: 0; }
	.empty-state { padding: 2.5rem 0; max-width: 60ch; }
	.stats-summary { display: flex; flex-wrap: wrap; gap: .75rem 2.5rem; margin: 0 0 1.5rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--portal-border); }
	.stats-summary > div { display: grid; gap: .1rem; }
	.stats-summary dt { color: var(--portal-muted); font-size: .85rem; font-weight: 500; }
	.stats-summary dd { margin: 0; color: var(--portal-ink); font-size: 1.5rem; font-weight: 600; font-variant-numeric: tabular-nums; }
	.avatar { width: 36px; height: 36px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 50%; background: var(--portal-polito-blue); color: #fff; font-size: .85rem; font-weight: 600; }
	.avatar.pending { color: var(--portal-warning-text); background: rgba(var(--portal-warning-rgb),.18); }
	.pending-member { background: color-mix(in srgb, var(--portal-warning) 4%, transparent); }
	.member-list { max-height: 520px; overflow: auto; }
	.member-modal-backdrop { position: fixed; z-index: 1055; inset: 0; display: grid; place-items: center; padding: 1rem; background: rgba(15, 23, 42, .56); }
	.member-modal { width: min(100%, 560px); overflow: hidden; color: var(--portal-ink); border: 1px solid var(--portal-border); border-radius: var(--portal-radius); background: var(--portal-surface); box-shadow: var(--portal-shadow-md); }
	.member-modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: 1.5rem; border-bottom: 1px solid var(--portal-border); }
	.member-modal-body { padding: 1.5rem; }
	.member-modal-footer { display: flex; justify-content: flex-end; gap: .75rem; padding: 1rem 1.5rem; border-top: 1px solid var(--portal-border); background: var(--portal-surface-muted); }
	.import-preview-modal { width: min(100%, 680px); }
	.import-preview-summary { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .9rem; }
	.import-preview-summary span { min-width: 0; display: flex; align-items: center; gap: .45rem; overflow: hidden; color: var(--portal-muted); text-overflow: ellipsis; white-space: nowrap; }
	.import-preview-summary i { color: var(--portal-positive-text); font-size: 1.15rem; }
	.import-preview-summary strong { flex: 0 0 auto; color: var(--portal-ink); font-size: .85rem; font-weight: 600; }
	.import-preview-list { max-height: min(52vh, 430px); overflow-y: auto; margin: 0; padding: 0; border: 1px solid var(--portal-border); border-radius: var(--portal-radius-sm); list-style: none; }
	.import-preview-list li { display: flex; align-items: center; gap: .75rem; padding: .55rem .75rem; border-bottom: 1px solid var(--portal-border); background: var(--portal-surface); }
	.import-preview-list li:last-child { border-bottom: 0; }
	.import-preview-list li span { min-width: 2.25rem; color: var(--portal-muted); font-size: .8rem; font-variant-numeric: tabular-nums; text-align: right; }
	.import-preview-list li strong { overflow-wrap: anywhere; font-size: .88rem; font-weight: 500; }
	@media (max-width: 767px) {
		/* Icon-only on phones: label stays readable by screen readers, target stays 44px. */
		.course-actions span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
		.course-actions .btn { min-width: 44px; min-height: 44px; justify-content: center; }
		.course-panel .card-body { padding: 1.25rem !important; }
	}
</style>
