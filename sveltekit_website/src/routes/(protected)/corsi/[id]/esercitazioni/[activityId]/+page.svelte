<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { apiListRequest, apiRequest, formatDateTime } from '$lib/client/api.js';
	import PageHeader from '$lib/components/portal/PageHeader.svelte';

	let course; let activity; let referenceImages = []; let sessions = []; let loading = true; let errorMessage = '';
	let showDeleteDialog = false;
	let deleting = false;
	$: courseId = $page.params.id;
	$: activityId = $page.params.activityId;

	async function load() {
		try {
			[course, activity, referenceImages] = await Promise.all([
				apiRequest(`/api/corsi/${courseId}`),
				apiRequest(`/api/esercitazioni/${activityId}`),
				apiRequest(`/api/esercitazioni/${activityId}/immagini`)
			]);
			sessions = await apiListRequest(`/api/sessioni-correzione?activityId=${activityId}`);
		} catch (error) { errorMessage = error.message; }
		finally { loading = false; }
	}
	onMount(load);

	async function deleteActivity() {
		deleting = true;
		errorMessage = '';
		try {
			await apiRequest(`/api/esercitazioni/${activityId}`, { method: 'DELETE' });
			goto(`/corsi/${courseId}`);
		} catch (error) {
			errorMessage = error.message;
			showDeleteDialog = false;
		} finally {
			deleting = false;
		}
	}

	function handleKeydown(event) {
		if (event.key === 'Escape' && showDeleteDialog && !deleting) showDeleteDialog = false;
	}

	function viewLabel(image) {
		if (image.viewType === 'OTHER') return image.customViewLabel;
		return { FRONT: 'Vista frontale', SIDE: 'Vista laterale', TOP: 'Vista dall’alto', ANGLED: 'Vista angolata' }[image.viewType] ?? image.viewType;
	}

	function sessionViewLabel(session) {
		return viewLabel({ viewType: session.referenceViewType, customViewLabel: session.referenceCustomViewLabel }) || 'Vista non disponibile';
	}

	function sessionStatusLabel(status) {
		return { OPEN: 'Aperta', PROCESSING: 'In elaborazione', ANSWERED: 'Risposta ricevuta', CLOSED: 'Chiusa', FAILED: 'Errore' }[status] ?? status;
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head><title>{activity?.title ?? 'Attività'}</title></svelte:head>
<div class="page-content"><div class="container-fluid py-4">
	<PageHeader title={activity?.title ?? 'Attività'} subtitle="Consegna, riferimenti e sessioni di correzione" parentHref={`/corsi/${courseId}`} parentLabel={course?.name ?? 'Corso'} />
	{#if errorMessage}<div class="alert alert-danger">{errorMessage}</div>{/if}
	{#if loading}<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
	{:else if activity}
		<a class="course-context" href={`/corsi/${courseId}`}>
			<span class="course-context-icon"><i class="ri-book-open-line"></i></span>
			<span class="flex-grow-1"><small>Questa attività appartiene al corso</small><strong>{course?.name ?? 'Corso'}</strong></span>
			<span class="course-context-link">Apri il corso <i class="ri-arrow-right-line"></i></span>
		</a>
		<div class="row g-4">
			<div class="col-xl-8">
				<div class="card border-0 shadow-sm mb-4"><div class="card-body p-4 p-lg-5">
					<div class="d-flex flex-wrap justify-content-between gap-3 mb-4"><div><span class="badge bg-primary-subtle text-primary mb-2">{activity.kind === 'EXAM' ? 'Esame' : 'Esercitazione'}</span><h3 class="mb-0">{activity.title}</h3></div><span class="badge align-self-start {activity.status === 'PUBLISHED' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}">{activity.status}</span></div>
					<h6 class="text-uppercase text-muted small">Obiettivo</h6><p class="fs-5">{activity.objective}</p>
					<hr class="my-4" /><h6 class="text-uppercase text-muted small">Istruzioni</h6><p class="text-muted preserve-lines">{activity.description || 'Nessuna istruzione aggiuntiva.'}</p>
					{#if referenceImages.length > 0}
						<hr class="my-4" />
						<div class="d-flex justify-content-between align-items-end gap-3 mb-3"><div><h5 class="mb-1">Immagini di riferimento</h5><p class="text-muted mb-0">Viste associate alla consegna</p></div><span class="badge bg-light text-dark">{referenceImages.length} {referenceImages.length === 1 ? 'immagine' : 'immagini'}</span></div>
						<div class="reference-gallery">
							{#each referenceImages as image}
								<figure><div><img src={image.storageKey} alt={image.altText || image.originalFilename} /></div><figcaption><strong>{viewLabel(image)}</strong><small>{image.originalFilename}</small></figcaption></figure>
							{/each}
						</div>
					{/if}
				</div></div>
			</div>
			<div class="col-xl-4">
				<div class="activity-actions mb-4">
					<div class="action-heading"><span>Azioni</span><small>Scegli come continuare</small></div>
					<a class="correction-action" href={`/corsi/${courseId}/esercitazioni/${activityId}/correzione`}>
						<span class="action-icon"><i class="ri-camera-lens-line"></i></span>
						<span class="action-copy"><strong>Chiedi una correzione</strong><small>Carica un’immagine e ricevi feedback</small></span>
						<i class="ri-arrow-right-line action-arrow"></i>
					</a>
					{#if course?.canManage}
						<div class="management-actions">
							<span class="management-label">Gestione attività</span>
							<a class="management-action" href={`/corsi/${courseId}/esercitazioni/${activityId}/modifica`}><span class="management-icon edit"><i class="ri-edit-line"></i></span><span><strong>Modifica attività</strong><small>Aggiorna consegna e disponibilità</small></span><i class="ri-arrow-right-s-line ms-auto"></i></a>
							<button class="management-action danger" type="button" on:click={() => showDeleteDialog = true}><span class="management-icon"><i class="ri-delete-bin-line"></i></span><span><strong>Elimina attività</strong><small>Rimuovi attività e dati collegati</small></span><i class="ri-arrow-right-s-line ms-auto"></i></button>
						</div>
					{/if}
				</div>
				<div class="card border-0 shadow-sm mb-4"><div class="card-body p-4"><h5 class="mb-3">Disponibilità</h5><div class="timeline-info"><div><span>Dal</span><strong>{formatDateTime(activity.availableFrom)}</strong></div><div><span>Fino al</span><strong>{formatDateTime(activity.availableUntil)}</strong></div><div><span>Durata</span><strong>{activity.durationMinutes ? `${activity.durationMinutes} minuti` : 'Libera'}</strong></div><div><span>Correzioni</span><strong>{activity.maxCorrectionsPerStudent ?? 'Senza limite'}</strong></div></div></div></div>
			</div>
		</div>
		<div class="card border-0 shadow-sm mt-4 correction-sessions"><div class="card-header bg-transparent p-4 d-flex flex-wrap justify-content-between align-items-center gap-2"><div><h5 class="mb-1">Sessioni di correzione</h5><p class="text-muted mb-0">Richieste e conversazioni collegate a questa attività</p></div><span class="badge bg-primary-subtle text-primary">{sessions.length} {sessions.length === 1 ? 'sessione' : 'sessioni'}</span></div><div class="card-body p-0">
			{#if sessions.length === 0}<div class="text-center py-5 text-muted"><div class="empty-session-icon"><i class="ri-chat-3-line"></i></div><p class="mb-0 mt-3">Non ci sono ancora sessioni di correzione.</p></div>{:else}<div class="session-list">{#each sessions as correction}<a class="session-row" href={`/corsi/${courseId}/esercitazioni/${activityId}/correzione?session=${correction.id}`}><div class="session-icon"><i class="ri-message-3-line"></i></div><div class="session-main"><div class="session-title"><strong>Sessione #{correction.id}</strong><span class="badge bg-light text-dark">{sessionStatusLabel(correction.status)}</span></div><small class="text-muted">Avviata {formatDateTime(correction.openedAt)}</small></div><div class="session-detail"><small>Avviata da</small><strong>{correction.studentDisplayName}</strong>{#if correction.isAnonymous}<span class="anonymous-label"><i class="ri-user-unfollow-line"></i> Anonima</span>{/if}</div><div class="session-detail"><small>Analisi</small><strong>{correction.analysisFocus || 'Generale'}</strong></div><div class="session-detail"><small>Vista</small><strong>{sessionViewLabel(correction)}</strong></div><i class="ri-arrow-right-s-line session-arrow"></i></a>{/each}</div>{/if}
		</div></div>
	{/if}
</div></div>

{#if showDeleteDialog}
	<div class="dialog-backdrop" role="presentation">
		<dialog class="delete-dialog" open aria-labelledby="delete-dialog-title">
			<div class="delete-dialog-icon"><i class="ri-delete-bin-6-line"></i></div>
			<h3 id="delete-dialog-title">Eliminare questa attività?</h3>
			<p>L’attività <strong>“{activity?.title}”</strong>, le immagini di riferimento e tutte le sessioni collegate verranno eliminate definitivamente.</p>
			<div class="delete-warning"><i class="ri-error-warning-line"></i><span>Questa operazione non può essere annullata.</span></div>
			<div class="dialog-actions"><button class="btn btn-light" type="button" on:click={() => showDeleteDialog = false} disabled={deleting}>Annulla</button><button class="btn btn-danger" type="button" on:click={deleteActivity} disabled={deleting}>{#if deleting}<span class="spinner-border spinner-border-sm me-2"></span>{/if}Elimina definitivamente</button></div>
		</dialog>
	</div>
{/if}

<style>
	.preserve-lines { white-space: pre-wrap; }
	.course-context { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding: 1rem 1.15rem; color: var(--bs-body-color); border: 1px solid color-mix(in srgb, #405189 20%, var(--bs-border-color)); border-radius: 16px; background: linear-gradient(100deg, color-mix(in srgb, #405189 7%, var(--bs-body-bg)), var(--bs-body-bg)); box-shadow: 0 8px 22px rgba(31,43,79,.06); }
	.course-context:hover { color: var(--bs-body-color); border-color: color-mix(in srgb, #405189 45%, var(--bs-border-color)); transform: translateY(-1px); }
	.course-context-icon { width: 46px; height: 46px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 14px; color: #fff; background: #405189; font-size: 1.25rem; }
	.course-context > span:nth-child(2) { display: grid; }
	.course-context small { color: var(--bs-secondary-color); }
	.course-context strong { font-size: 1.02rem; }
	.course-context-link { display: inline-flex; align-items: center; gap: .4rem; color: #405189; font-weight: 600; }
	.reference-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 260px)); justify-content: start; gap: 1rem; }
	.reference-gallery figure { overflow: hidden; margin: 0; border: 1px solid var(--bs-border-color); border-radius: 15px; background: var(--bs-body-bg); }
	.reference-gallery figure > div { aspect-ratio: 1; background: #111827; }
	.reference-gallery img { width: 100%; height: 100%; object-fit: contain; }
	.reference-gallery figcaption { display: grid; padding: .85rem 1rem; }
	.reference-gallery figcaption small { overflow: hidden; color: var(--bs-secondary-color); text-overflow: ellipsis; white-space: nowrap; }
	@media (max-width: 575.98px) {
		.reference-gallery { grid-template-columns: minmax(0, 1fr); }
	}
	.activity-actions { overflow: hidden; border: 1px solid var(--bs-border-color); border-radius: 18px; background: var(--bs-body-bg); box-shadow: 0 10px 28px rgba(31,43,79,.09); }
	.action-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; padding: 1.1rem 1.2rem .8rem; }
	.action-heading span { font-size: 1rem; font-weight: 700; }
	.action-heading small { color: var(--bs-secondary-color); }
	.correction-action { display: flex; align-items: center; gap: .85rem; margin: 0 .8rem .8rem; padding: 1rem; color: #fff; border-radius: 14px; background: linear-gradient(135deg,#0ab39c,#078c7b); box-shadow: 0 9px 22px rgba(10,179,156,.2); }
	.correction-action:hover { color: #fff; transform: translateY(-2px); box-shadow: 0 12px 26px rgba(10,179,156,.26); }
	.action-icon { width: 46px; height: 46px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 13px; background: rgba(255,255,255,.17); font-size: 1.35rem; }
	.action-copy { min-width: 0; display: grid; }
	.action-copy strong { font-size: .96rem; }
	.action-copy small { color: rgba(255,255,255,.74); line-height: 1.35; }
	.action-arrow { margin-left: auto; font-size: 1.15rem; }
	.management-actions { padding: .85rem .8rem .8rem; border-top: 1px solid var(--bs-border-color); background: var(--bs-tertiary-bg); }
	.management-label { display: block; padding: 0 .35rem .55rem; color: var(--bs-secondary-color); font-size: .72rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
	.management-action { width: 100%; display: flex; align-items: center; gap: .75rem; padding: .75rem; color: var(--bs-body-color); border: 0; border-radius: 12px; background: transparent; text-align: left; }
	.management-action:hover { color: #405189; background: var(--bs-body-bg); }
	.management-action > span:nth-child(2) { display: grid; }
	.management-action small { color: var(--bs-secondary-color); font-size: .76rem; }
	.management-action.danger { color: #dc3545; }
	.management-action.danger:hover { color: #dc3545; background: rgba(220,53,69,.07); }
	.management-icon { width: 38px; height: 38px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 11px; color: #dc3545; background: rgba(220,53,69,.09); font-size: 1.05rem; }
	.management-icon.edit { color: #405189; background: rgba(64,81,137,.1); }
	.session-icon { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 12px; background: rgba(10,179,156,.12); color: #0ab39c; font-size: 1.25rem; }
	.correction-sessions { width: 100%; }
	.session-list { display: grid; }
	.session-row { display: grid; grid-template-columns: auto minmax(170px, 1.2fr) repeat(3, minmax(130px, 1fr)) auto; align-items: center; gap: 1.25rem; padding: 1.15rem 1.5rem; color: var(--bs-body-color); border-bottom: 1px solid var(--bs-border-color); }
	.session-row:last-child { border-bottom: 0; }
	.session-row:hover { color: var(--bs-body-color); background: var(--bs-tertiary-bg); }
	.session-main { min-width: 0; }
	.session-title { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; margin-bottom: .15rem; }
	.session-detail { min-width: 0; display: grid; gap: .2rem; }
	.session-detail small { color: var(--bs-secondary-color); font-size: .72rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
	.session-detail strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .88rem; font-weight: 600; }
	.anonymous-label { width: max-content; color: var(--bs-secondary-color); font-size: .7rem; }
	.session-arrow { color: var(--bs-secondary-color); font-size: 1.2rem; }
	.empty-session-icon { width: 58px; height: 58px; display: grid; place-items: center; margin: 0 auto; border-radius: 18px; color: #405189; background: rgba(64,81,137,.1); font-size: 1.5rem; }
	.timeline-info { display: grid; gap: 1rem; }
	.timeline-info > div { display: flex; justify-content: space-between; gap: 1rem; padding-bottom: .75rem; border-bottom: 1px solid var(--bs-border-color); }
	.timeline-info span { color: var(--bs-secondary-color); }
	.timeline-info strong { text-align: right; }
	.dialog-backdrop { position: fixed; z-index: 1080; inset: 0; display: grid; place-items: center; padding: 1.25rem; background: rgba(17,24,39,.58); backdrop-filter: blur(4px); }
	.delete-dialog { position: static; width: min(100%, 480px); margin: 0; padding: 1.6rem; color: var(--bs-body-color); border: 1px solid var(--bs-border-color); border-radius: 20px; background: var(--bs-body-bg); box-shadow: 0 28px 80px rgba(0,0,0,.28); }
	.delete-dialog-icon { width: 56px; height: 56px; display: grid; place-items: center; margin-bottom: 1rem; border-radius: 17px; color: #dc3545; background: rgba(220,53,69,.1); font-size: 1.5rem; }
	.delete-dialog h3 { margin-bottom: .65rem; font-size: 1.35rem; }
	.delete-dialog > p { color: var(--bs-secondary-color); line-height: 1.6; }
	.delete-warning { display: flex; align-items: center; gap: .6rem; padding: .75rem .85rem; color: #9b2430; border: 1px solid rgba(220,53,69,.15); border-radius: 11px; background: rgba(220,53,69,.07); font-size: .88rem; }
	.dialog-actions { display: flex; justify-content: flex-end; gap: .65rem; margin-top: 1.35rem; }
	@media (max-width: 991px) { .session-row { grid-template-columns: auto minmax(0, 1fr) auto; gap: .8rem 1rem; } .session-detail { grid-column: 2; } .session-arrow { grid-column: 3; grid-row: 1 / span 4; } }
	@media (max-width: 575px) { .course-context-link { display: none; } .session-row { padding: 1rem; } }
</style>
