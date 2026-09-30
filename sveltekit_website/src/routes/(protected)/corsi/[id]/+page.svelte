<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { apiListRequest, apiRequest, formatDate, formatDateTime } from '$lib/client/api.js';
	import { spreadsheetRows } from '$lib/client/spreadsheet-import.js';
	import ActivityForm from '$lib/components/portal/ActivityForm.svelte';
	import { _ } from 'svelte-i18n';

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

	function cellText(value) {
		if (value === null || value === undefined) return '';
		if (typeof value !== 'object') return String(value);
		if (Array.isArray(value.richText)) return value.richText.map((part) => part.text ?? '').join('');
		if ('result' in value) return cellText(value.result);
		if ('text' in value) return String(value.text ?? '');
		return String(value);
	}

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

<svelte:head><title>{course?.name ?? $_('activity.course')}</title></svelte:head>
<div class="page-content"><div class="container-fluid py-4">
	{#if errorMessage}<div class="alert alert-danger">{errorMessage}</div>{/if}
	{#if successMessage}<div class="alert alert-success">{successMessage}</div>{/if}
	{#if loading}<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
	{:else if course}
		<a class="course-back" href="/corsi"><i class="ri-arrow-left-line"></i>{$_('course.back')}</a>
		<header class="course-hero rounded-4 p-4 p-lg-5 mb-4 text-white">
			<div class="course-hero-top">
				<div class="course-kicker"><span class:inactive={!course.isActive}></span>{$_(course.isActive ? 'course.active' : 'course.inactive')}</div>
				{#if course.canManage}<div class="course-actions"><a href={`/corsi/${courseId}/modifica`}><i class="ri-edit-line"></i><span>{$_('common.edit')}</span></a><button type="button" onclick={deleteCourse}><i class="ri-delete-bin-line"></i><span>{$_('common.delete')}</span></button></div>{/if}
			</div>
			<div class="row align-items-end g-4 mt-1"><div class="col-xl-8">
				<h1 class="text-white mt-3 mb-2">{course.name}</h1>
				<p class="course-description mb-0">{course.description || $_('common.noDescription')}</p>
			</div><div class="col-xl-4"><div class="course-dates">
				<div><i class="ri-calendar-event-line"></i><span><small>{$_('course.startDate')}</small><strong>{formatDate(course.startsAt)}</strong></span></div>
				<div><i class="ri-calendar-check-line"></i><span><small>{$_('course.endDate')}</small><strong>{formatDate(course.endsAt)}</strong></span></div>
			</div></div></div>
		</header>

		<div class="course-workspace">
			<div class="course-tabbar" class:single={!course.canManage} role="tablist" aria-label={$_('course.management')}>
					<button class:active={activeTab === 'activities'} class="course-tab" type="button" role="tab" aria-selected={activeTab === 'activities'} onclick={() => selectTab('activities')}>
						<span class="tab-icon"><i class="ri-list-check-2"></i></span><span><strong>{$_('activity.activities')}</strong><small>{$_('common.totalCount', { values: { count: activities.length } })}</small></span>
					</button>
					{#if course.canManage}
						<button class:active={activeTab === 'members'} class="course-tab" type="button" role="tab" aria-selected={activeTab === 'members'} onclick={() => selectTab('members')}>
							<span class="tab-icon"><i class="ri-group-line"></i></span><span><strong>{$_('course.members')}</strong><small>{$_('course.authorizedCount', { values: { count: members.length } })}</small></span>
						</button>
						<button class:active={activeTab === 'statistics'} class="course-tab" type="button" role="tab" aria-selected={activeTab === 'statistics'} onclick={() => selectTab('statistics')}>
							<span class="tab-icon"><i class="ri-bar-chart-line"></i></span><span><strong>{$_('stats.title')}</strong><small>{$_('stats.resultsAndSessions')}</small></span>
						</button>
					{/if}
			</div>

			<div class="course-panel p-4 p-lg-5">
				{#if activeTab === 'activities'}
					{#if showActivityForm}
						<div class="d-flex justify-content-between align-items-start mb-4">
							<div><h4 class="mb-1">{$_('activity.new')}</h4><p class="text-muted mb-0">{$_('activity.newSubtitle')}</p></div>
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
							<div class="text-center text-muted py-5">{$_('activity.noneAvailable')}</div>
						{:else}
							<div class="table-responsive">
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
						<div><h4 class="mb-1">{$_('course.authorizedMembers')}</h4><p class="text-muted mb-0">{$_('course.membersInCourse', { values: { count: members.length } })}</p></div>
						<button class="btn btn-primary" type="button" onclick={openMemberModal}><i class="ri-user-add-line me-1"></i>{$_('course.addStudent')}</button>
					</div>
					<div class="member-list table-responsive border rounded-3">
						<table class="table table-hover align-middle mb-0">
							<thead class="table-light"><tr><th class="ps-4">{$_('course.member')}</th><th>Email</th><th>{$_('common.role')}</th><th>{$_('common.status')}</th><th class="pe-4">{$_('course.authorizedSince')}</th></tr></thead>
							<tbody>{#each members as member}<tr class:pending-member={member.status === 'PENDING'}><td class="ps-4"><div class="d-flex align-items-center gap-3"><div class="avatar" class:pending={member.status === 'PENDING'}>{#if member.status === 'PENDING'}<i class="ri-mail-send-line"></i>{:else}{member.name?.[0]}{member.surname?.[0]}{/if}</div><div><div class="fw-semibold">{[member.name, member.surname].filter(Boolean).join(' ') || $_('course.accountPending')}</div>{#if member.status === 'PENDING'}<small class="text-muted">{$_('course.accountPendingHelp')}</small>{/if}</div></div></td><td>{member.email}</td><td><span class="badge bg-primary-subtle text-primary">{$_(member.role === 'PROFESSOR' ? 'role.professor' : 'role.student')}</span></td><td><span class="badge {member.status === 'ACTIVE' ? 'bg-success-subtle text-success' : member.status === 'PENDING' ? 'bg-warning-subtle text-warning' : 'bg-secondary-subtle text-secondary'}">{$_(`status.${member.status.toLowerCase()}`)}</span></td><td class="pe-4"><small>{formatDateTime(member.joinedAt ?? member.createdAt)}</small></td></tr>{:else}<tr><td colspan="5" class="text-center text-muted py-5">{$_('course.noMembers')}</td></tr>{/each}</tbody>
						</table>
					</div>
					<hr class="my-4" />
					<div><h4 class="mb-1">{$_('course.importStudents')}</h4><p class="text-muted">{$_('course.importStudentsHelp')}</p>
						<form onsubmit={previewImport}><div class="row g-3 align-items-start"><div class="col-lg-8"><label class="form-label" for="members-file">{$_('course.studentFile')}</label><input bind:this={importFileInput} id="members-file" class="form-control" type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" onchange={selectImportFile} /><div class="form-text">{$_('course.studentFileHelp')}</div></div><div class="col-lg-4"><span class="form-label d-none d-lg-block" aria-hidden="true">&nbsp;</span><button class="btn btn-outline-primary w-100" disabled={busy || !importFile}>{$_(busy ? 'course.readingFile' : 'course.previewImport')}</button></div></div></form>
						{#if importDetails.length > 0}<div class="alert alert-warning mt-3 mb-0"><div class="fw-semibold mb-1">{$_('course.rowsNotImported')}</div>{#each importDetails.slice(0, 5) as detail}<div class="small">{$_('course.rowError', { values: { row: detail.row, email: detail.email || $_('common.emptyValue'), error: detail.message } })}</div>{/each}{#if importDetails.length > 5}<div class="small mt-1">{$_('course.moreErrors', { values: { count: importDetails.length - 5 } })}</div>{/if}</div>{/if}
					</div>
				{:else if activeTab === 'statistics' && course.canManage}
					{#if statisticsLoading}<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>{:else}
						<div class="row g-4 mb-4"><div class="col-md-4"><div class="metric-card border rounded-3 p-4 d-flex align-items-center gap-3"><div class="metric-icon primary"><i class="ri-list-check-2"></i></div><div><div class="display-6 fw-semibold">{statisticsRows.length}</div><span class="text-muted">{$_('activity.activities')}</span></div></div></div><div class="col-md-4"><div class="metric-card border rounded-3 p-4 d-flex align-items-center gap-3"><div class="metric-icon success"><i class="ri-message-3-line"></i></div><div><div class="display-6 fw-semibold">{totalSessions}</div><span class="text-muted">{$_('stats.sessions')}</span></div></div></div><div class="col-md-4"><div class="metric-card border rounded-3 p-4 d-flex align-items-center gap-3"><div class="metric-icon warning"><i class="ri-check-double-line"></i></div><div><div class="display-6 fw-semibold">{completion}%</div><span class="text-muted">{$_('stats.completedSessions')}</span></div></div></div></div>
						{#if statisticsRows.length === 0}<div class="text-center text-muted py-5">{$_('common.noData')}</div>{:else}<div class="table-responsive"><table class="table align-middle mb-0"><thead class="table-light"><tr><th>{$_('activity.activity')}</th><th>{$_('stats.sessionCount')}</th><th>{$_('stats.answers')}</th><th>{$_('stats.processing')}</th><th>{$_('stats.completion')}</th></tr></thead><tbody>{#each statisticsRows as row}{@const completed = row.sessions.filter((session) => session.status === 'ANSWERED').length}{@const pending = row.sessions.filter((session) => ['OPEN', 'PROCESSING'].includes(session.status)).length}{@const rate = row.sessions.length ? Math.round(completed / row.sessions.length * 100) : 0}<tr><td><a class="fw-semibold" href={`/corsi/${courseId}/esercitazioni/${row.activity.id}`}>{row.activity.title}</a><small class="d-block text-muted">{$_(`status.${row.activity.status.toLowerCase()}`)}</small></td><td>{row.sessions.length}</td><td>{completed}</td><td>{pending}</td><td><div class="d-flex align-items-center gap-2"><div class="progress flex-grow-1" style="height:7px"><div class="progress-bar bg-success" style={`width:${rate}%`}></div></div><small>{rate}%</small></div></td></tr>{/each}</tbody></table></div>{/if}
					{/if}
				{/if}
			</div>
		</div>
	{/if}
</div></div>

<svelte:window onkeydown={handleMemberModalKeydown} />

{#if showMemberModal}
	<div class="member-modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && closeMemberModal()}>
		<div class="member-modal" role="dialog" aria-modal="true" aria-labelledby="member-modal-title">
			<div class="member-modal-header">
				<div><h5 id="member-modal-title" class="mb-1">{$_('course.addStudent')}</h5><p class="text-muted mb-0">{$_('course.selectAccount')}</p></div>
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
				<div><h5 id="import-preview-title" class="mb-1">{$_('course.importPreviewTitle')}</h5><p class="text-muted mb-0">{$_('course.importPreviewHelp')}</p></div>
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
	.course-back { display: inline-flex; align-items: center; gap: .45rem; margin-bottom: 1rem; color: var(--bs-secondary-color); font-weight: 600; }
	.course-back:hover { color: #405189; }
	.course-hero { position: relative; overflow: hidden; background: radial-gradient(circle at 92% 5%, rgba(10,179,156,.55), transparent 30%), radial-gradient(circle at 5% 100%, rgba(41,156,219,.22), transparent 32%), linear-gradient(135deg,#3c4d83,#202c50); box-shadow: 0 20px 45px rgba(31,43,79,.18); }
	.course-hero::after { content: ''; position: absolute; width: 260px; height: 260px; right: -100px; bottom: -170px; border: 42px solid rgba(255,255,255,.06); border-radius: 50%; }
	.course-hero-top { position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
	.course-kicker { display: inline-flex; align-items: center; gap: .5rem; padding: .42rem .75rem; border: 1px solid rgba(255,255,255,.18); border-radius: 999px; background: rgba(255,255,255,.1); font-size: .78rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
	.course-kicker > span { width: 8px; height: 8px; border-radius: 50%; background: #45e0bf; box-shadow: 0 0 0 4px rgba(69,224,191,.14); }
	.course-kicker > span.inactive { background: #ffcf70; box-shadow: 0 0 0 4px rgba(255,207,112,.14); }
	.course-actions { display: flex; gap: .5rem; }
	.course-actions a, .course-actions button { display: inline-flex; align-items: center; gap: .4rem; padding: .55rem .75rem; color: #fff; border: 1px solid rgba(255,255,255,.2); border-radius: 10px; background: rgba(255,255,255,.09); font-weight: 600; }
	.course-actions a:hover, .course-actions button:hover { background: rgba(255,255,255,.17); }
	.course-icon { width: 54px; height: 54px; display: grid; place-items: center; border-radius: 16px; color: #fff; background: rgba(255,255,255,.13); font-size: 1.55rem; }
	.course-hero h1 { position: relative; z-index: 1; font-size: clamp(2rem, 3.5vw, 3.15rem); letter-spacing: -.035em; }
	.course-description { position: relative; z-index: 1; max-width: 760px; color: rgba(255,255,255,.73); font-size: 1.05rem; line-height: 1.65; }
	.course-dates { position: relative; z-index: 1; display: grid; gap: .65rem; padding: .75rem; border: 1px solid rgba(255,255,255,.13); border-radius: 16px; background: rgba(255,255,255,.08); backdrop-filter: blur(10px); }
	.course-dates > div { display: flex; align-items: center; gap: .8rem; padding: .65rem; }
	.course-dates i { width: 38px; height: 38px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 11px; background: rgba(255,255,255,.12); font-size: 1.1rem; }
	.course-dates span { display: grid; }
	.course-dates small { color: rgba(255,255,255,.6); }
	.course-dates strong { color: #fff; font-weight: 600; }
	.course-workspace { border: 1px solid var(--bs-border-color); border-radius: 20px; background: var(--bs-body-bg); box-shadow: 0 12px 35px rgba(31,43,79,.08); }
	.course-tabbar { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .65rem; margin: .75rem; padding: .45rem; border-radius: 16px; background: var(--bs-tertiary-bg); }
	.course-tabbar.single { grid-template-columns: 1fr; }
	.course-tab { display: flex; align-items: center; justify-content: center; gap: .7rem; min-width: 0; padding: .8rem 1rem; border: 1px solid transparent; border-radius: 12px; color: var(--bs-secondary-color); background: transparent; text-align: left; transition: .18s ease; }
	.course-tab:hover { color: #405189; background: color-mix(in srgb, var(--bs-body-bg) 65%, transparent); }
	.course-tab.active { color: #405189; border-color: color-mix(in srgb, #405189 14%, var(--bs-border-color)); background: var(--bs-body-bg); box-shadow: 0 5px 14px rgba(31,43,79,.09); }
	.course-tab > span:last-child { min-width: 0; display: grid; }
	.course-tab strong { font-size: .95rem; }
	.course-tab small { overflow: hidden; color: var(--bs-secondary-color); text-overflow: ellipsis; white-space: nowrap; font-size: .74rem; }
	.tab-icon { width: 38px; height: 38px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 11px; background: color-mix(in srgb, #405189 9%, transparent); font-size: 1.1rem; }
	.course-tab.active .tab-icon { color: #fff; background: #405189; }
	.course-panel { border-top: 1px solid var(--bs-border-color); }
	.avatar { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 50%; background: #405189; color: white; font-weight: 700; }
	.avatar.pending { color: #8b6d1f; background: rgba(247,184,75,.18); }
	.pending-member { background: color-mix(in srgb, #f7b84b 4%, transparent); }
	.member-list { max-height: 520px; overflow: auto; }
	.member-modal-backdrop { position: fixed; z-index: 1055; inset: 0; display: grid; place-items: center; padding: 1rem; background: rgba(15, 23, 42, .56); backdrop-filter: blur(3px); }
	.member-modal { width: min(100%, 560px); overflow: hidden; color: #212529; border: 1px solid #dee2e6; border-radius: 18px; background: #fff; box-shadow: 0 24px 70px rgba(15, 23, 42, .28); }
	.member-modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: 1.5rem; border-bottom: 1px solid var(--bs-border-color); }
	.member-modal-body { padding: 1.5rem; }
	.member-modal-footer { display: flex; justify-content: flex-end; gap: .75rem; padding: 1rem 1.5rem; border-top: 1px solid var(--bs-border-color); background: var(--bs-tertiary-bg); }
	.import-preview-modal { width: min(100%, 680px); }
	.import-preview-summary { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .9rem; }
	.import-preview-summary span { min-width: 0; display: flex; align-items: center; gap: .45rem; overflow: hidden; color: var(--bs-secondary-color); text-overflow: ellipsis; white-space: nowrap; }
	.import-preview-summary i { color: #0ab39c; font-size: 1.15rem; }
	.import-preview-summary strong { flex: 0 0 auto; padding: .3rem .55rem; border-radius: 99px; color: #405189; background: rgba(64,81,137,.1); font-size: .75rem; }
	.import-preview-list { max-height: min(52vh, 430px); overflow-y: auto; margin: 0; padding: .25rem; border: 1px solid var(--bs-border-color); border-radius: 12px; background: var(--bs-tertiary-bg); list-style: none; }
	.import-preview-list li { display: flex; align-items: center; gap: .75rem; padding: .65rem .75rem; border-bottom: 1px solid var(--bs-border-color); background: var(--bs-body-bg); }
	.import-preview-list li:first-child { border-radius: 9px 9px 0 0; }
	.import-preview-list li:last-child { border-bottom: 0; border-radius: 0 0 9px 9px; }
	.import-preview-list li:only-child { border-radius: 9px; }
	.import-preview-list li span { width: 28px; height: 28px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 8px; color: var(--bs-secondary-color); background: var(--bs-tertiary-bg); font-size: .7rem; font-weight: 700; }
	.import-preview-list li strong { overflow-wrap: anywhere; font-size: .88rem; }
	:global([data-bs-theme="dark"]) .member-modal { color: var(--bs-body-color); border-color: var(--bs-border-color); background: var(--bs-body-bg); }
	.metric-card { height: 100%; }
	.metric-icon { width: 60px; height: 60px; display: grid; place-items: center; border-radius: 16px; font-size: 1.65rem; flex: 0 0 auto; }
	.metric-icon.primary { color: #405189; background: rgba(64,81,137,.12); }
	.metric-icon.success { color: #0ab39c; background: rgba(10,179,156,.12); }
	.metric-icon.warning { color: #f7b84b; background: rgba(247,184,75,.15); }
	@media (max-width: 767px) {
		.course-tabbar { grid-template-columns: 1fr; }
		.course-tab { justify-content: flex-start; }
		.course-actions span { display: none; }
		.course-panel { padding: 1.25rem !important; }
	}
</style>
