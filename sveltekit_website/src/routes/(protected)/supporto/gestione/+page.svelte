<script>
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { apiListRequest, apiRequest, formatDateTime } from '$lib/client/api.js';
	import PageHeader from '$lib/components/portal/PageHeader.svelte';

	const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
	const STATUS_CLASS = { OPEN: 'is-open', IN_PROGRESS: 'is-progress', RESOLVED: 'is-resolved' };

	let tickets = [];
	let statusFilter = 'OPEN';
	let loading = true;
	let errorMessage = '';
	let successMessage = '';
	let expandedId = null;
	let draft = { status: 'OPEN', adminNote: '' };
	let saving = false;

	async function loadTickets() {
		loading = true;
		errorMessage = '';
		try {
			const query = statusFilter ? `?status=${statusFilter}` : '';
			tickets = await apiListRequest(`/api/supporto${query}`);
		} catch (error) {
			errorMessage = error.message;
		} finally {
			loading = false;
		}
	}

	function setFilter(value) {
		statusFilter = value;
		expandedId = null;
		loadTickets();
	}

	function toggle(ticket) {
		successMessage = '';
		if (expandedId === ticket.id) {
			expandedId = null;
			return;
		}
		expandedId = ticket.id;
		draft = { status: ticket.status, adminNote: ticket.adminNote ?? '' };
	}

	async function save(ticket) {
		saving = true;
		errorMessage = '';
		try {
			const updated = await apiRequest(`/api/supporto/${ticket.id}`, {
				method: 'PATCH',
				body: JSON.stringify(draft)
			});
			tickets = statusFilter && updated.status !== statusFilter
				? tickets.filter((item) => item.id !== updated.id)
				: tickets.map((item) => item.id === updated.id ? updated : item);
			expandedId = null;
			successMessage = $_('support.updated');
		} catch (error) {
			errorMessage = error.message;
		} finally {
			saving = false;
		}
	}

	onMount(loadTickets);
</script>

<svelte:head><title>{$_('support.manageTitle')} | {$_('site.name')}</title></svelte:head>

<div class="page-content">
	<div class="container-fluid py-4">
		<PageHeader title={$_('support.manageTitle')} subtitle={$_('support.manageSubtitle')} parentLabel={$_('support.title')} parentHref="/supporto" />
		{#if errorMessage}<div class="alert alert-danger" role="alert">{errorMessage}</div>{/if}
		{#if successMessage}<div class="alert alert-success" role="status">{successMessage}</div>{/if}

		<div class="card border-0 shadow-sm">
			<div class="card-header d-flex flex-wrap gap-2 align-items-center justify-content-between">
				<div class="btn-group flex-wrap" role="group" aria-label={$_('support.filterLabel')}>
					{#each STATUSES as status (status)}
						<button type="button" class="btn btn-sm" class:btn-primary={statusFilter === status} class:btn-light={statusFilter !== status} aria-pressed={statusFilter === status} on:click={() => setFilter(status)}>{$_(`support.status.${status}`)}</button>
					{/each}
					<button type="button" class="btn btn-sm" class:btn-primary={!statusFilter} class:btn-light={!!statusFilter} aria-pressed={!statusFilter} on:click={() => setFilter('')}>{$_('support.filterAll')}</button>
				</div>
			</div>
			<div class="card-body">
				{#if loading}
					<div class="text-center py-5"><span class="spinner-border text-primary" role="status"><span class="visually-hidden">{$_('common.loading')}</span></span></div>
				{:else if tickets.length === 0}
					<p class="text-muted text-center py-4 mb-0">{$_('support.manageEmpty')}</p>
				{:else}
					<ul class="ticket-rows">
						{#each tickets as ticket (ticket.id)}
							<li class:is-expanded={expandedId === ticket.id}>
								<button type="button" class="ticket-row" aria-expanded={expandedId === ticket.id} aria-controls={`ticket-${ticket.id}`} on:click={() => toggle(ticket)}>
									<span class="ticket-main">
										<strong>{ticket.subject}</strong>
										<span class="ticket-meta">{$_(`support.cat.${ticket.category}`)} · {ticket.reporterName} {ticket.reporterSurname} · {formatDateTime(ticket.createdAt)}</span>
									</span>
									<span class="ticket-status {STATUS_CLASS[ticket.status]}">{$_(`support.status.${ticket.status}`)}</span>
									<i class="ri-arrow-down-s-line ticket-chevron" aria-hidden="true"></i>
								</button>
								{#if expandedId === ticket.id}
									<div class="ticket-detail" id={`ticket-${ticket.id}`}>
										<dl>
											<dt>{$_('support.reporter')}</dt><dd>{ticket.reporterName} {ticket.reporterSurname} · <a href={`mailto:${ticket.reporterEmail}`}>{ticket.reporterEmail}</a></dd>
											{#if ticket.pageUrl}<dt>{$_('support.pageUrl')}</dt><dd><a href={ticket.pageUrl}>{ticket.pageUrl}</a></dd>{/if}
											<dt>{$_('support.description')}</dt><dd class="ticket-description">{ticket.description}</dd>
										</dl>
										<form class="row g-3" on:submit|preventDefault={() => save(ticket)}>
											<div class="col-md-4">
												<label class="form-label" for={`status-${ticket.id}`}>{$_('common.status')}</label>
												<select id={`status-${ticket.id}`} class="form-select" bind:value={draft.status}>
													{#each STATUSES as status (status)}<option value={status}>{$_(`support.status.${status}`)}</option>{/each}
												</select>
											</div>
											<div class="col-md-8">
												<label class="form-label" for={`note-${ticket.id}`}>{$_('support.adminNote')}</label>
												<textarea id={`note-${ticket.id}`} class="form-control" rows="3" maxlength="2000" bind:value={draft.adminNote} placeholder={$_('support.adminNotePlaceholder')}></textarea>
											</div>
											<div class="col-12 d-flex gap-2 justify-content-end">
												<button type="button" class="btn btn-light" on:click={() => expandedId = null}>{$_('common.cancel')}</button>
												<button type="submit" class="btn btn-primary" disabled={saving}>{$_(saving ? 'common.saving' : 'common.save')}</button>
											</div>
										</form>
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.ticket-rows { list-style: none; margin: 0; padding: 0; }
	.ticket-rows li { border-top: 1px solid var(--portal-border); }
	.ticket-rows li:first-child { border-top: 0; }
	.ticket-row {
		display: flex; width: 100%; gap: .9rem; align-items: center; padding: .9rem .25rem;
		border: 0; background: none; text-align: left; color: inherit; min-height: 44px;
	}
	.ticket-row:hover .ticket-main strong { color: var(--portal-polito-blue); }
	.ticket-main { flex: 1; min-width: 0; }
	.ticket-main strong { display: block; color: var(--portal-ink); overflow-wrap: anywhere; transition: color .15s ease-out; }
	.ticket-meta { display: block; margin-top: .15rem; color: var(--portal-muted); font-size: .82rem; }
	.ticket-chevron { font-size: 1.25rem; color: var(--portal-muted); transition: transform .2s ease-out; }
	.is-expanded .ticket-chevron { transform: rotate(180deg); }
	.ticket-detail { padding: .25rem .25rem 1.25rem; }
	dl { display: grid; grid-template-columns: max-content 1fr; gap: .4rem 1.25rem; margin-bottom: 1.25rem; }
	dt { color: var(--portal-muted); font-weight: 500; }
	dd { margin: 0; overflow-wrap: anywhere; }
	.ticket-description { white-space: pre-line; max-width: 72ch; }
	@media (max-width: 575.98px) {
		dl { grid-template-columns: 1fr; }
		dd { margin-bottom: .5rem; }
		.ticket-row { flex-wrap: wrap; }
	}
</style>
