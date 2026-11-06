<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';
	import { apiListRequest, apiRequest, formatDateTime } from '$lib/client/api.js';
	import PageHeader from '$lib/components/portal/PageHeader.svelte';

	const CATEGORIES = [
		{ value: 'EXAM_DELIVERY', icon: 'ri-upload-cloud-2-line' },
		{ value: 'CORRECTION', icon: 'ri-robot-2-line' },
		{ value: 'ACCOUNT', icon: 'ri-user-settings-line' },
		{ value: 'WEBSITE', icon: 'ri-window-line' }
	];
	const STATUS_CLASS = { OPEN: 'is-open', IN_PROGRESS: 'is-progress', RESOLVED: 'is-resolved' };

	// Other pages can deep-link here with ?category=EXAM_DELIVERY&from=/corsi/1/esercitazioni/2
	const initialCategory = $page.url.searchParams.get('category');
	const initialFrom = $page.url.searchParams.get('from') ?? '';

	let form = {
		category: CATEGORIES.some((item) => item.value === initialCategory) ? initialCategory : 'EXAM_DELIVERY',
		subject: '',
		description: '',
		pageUrl: initialFrom.startsWith('/') && !initialFrom.startsWith('//') ? initialFrom : ''
	};
	let tickets = [];
	let loading = true;
	let submitting = false;
	let errorMessage = '';
	let successMessage = '';
	let listError = '';

	async function loadTickets() {
		loading = true;
		listError = '';
		try {
			tickets = await apiListRequest('/api/supporto?scope=mine');
		} catch (error) {
			listError = error.message;
		} finally {
			loading = false;
		}
	}

	async function submit() {
		submitting = true;
		errorMessage = '';
		successMessage = '';
		try {
			const created = await apiRequest('/api/supporto', {
				method: 'POST',
				body: JSON.stringify({ ...form, pageUrl: form.pageUrl.trim() || undefined })
			});
			tickets = [created, ...tickets];
			form = { ...form, subject: '', description: '', pageUrl: '' };
			successMessage = $_('support.created');
		} catch (error) {
			errorMessage = error.message;
		} finally {
			submitting = false;
		}
	}

	onMount(loadTickets);
</script>

<svelte:head><title>{$_('support.title')} | {$_('site.name')}</title></svelte:head>

<div class="page-content">
	<div class="container-fluid py-4">
		<PageHeader title={$_('support.title')} subtitle={$_('support.subtitle')} parentLabel={$_('common.portal')} parentHref="/corsi" />

		<div class="row g-4 align-items-start">
			<div class="col-xl-7">
				<form class="card border-0 shadow-sm" on:submit|preventDefault={submit}>
					<div class="card-header">
						<h2 class="h5 mb-1">{$_('support.newTicket')}</h2>
						<p class="text-muted mb-0 small">{$_('support.newTicketHelp')}</p>
					</div>
					<div class="card-body">
						{#if errorMessage}<div class="alert alert-danger" role="alert">{errorMessage}</div>{/if}
						{#if successMessage}<div class="alert alert-success" role="status">{successMessage}</div>{/if}

						<fieldset class="mb-4">
							<legend class="form-label">{$_('support.category')}</legend>
							<div class="category-grid">
								{#each CATEGORIES as category (category.value)}
									<label class="category-option" class:is-selected={form.category === category.value}>
										<input class="visually-hidden" type="radio" name="category" value={category.value} bind:group={form.category} />
										<i class={category.icon} aria-hidden="true"></i>
										<span>
											<strong>{$_(`support.cat.${category.value}`)}</strong>
											<small>{$_(`support.catHelp.${category.value}`)}</small>
										</span>
									</label>
								{/each}
							</div>
						</fieldset>

						<div class="mb-3">
							<label class="form-label" for="support-subject">{$_('support.subject')}</label>
							<input id="support-subject" class="form-control" maxlength="160" required bind:value={form.subject} placeholder={$_('support.subjectPlaceholder')} />
						</div>
						<div class="mb-3">
							<label class="form-label" for="support-description">{$_('support.description')}</label>
							<textarea id="support-description" class="form-control" rows="6" maxlength="4000" required bind:value={form.description} placeholder={$_('support.descriptionPlaceholder')}></textarea>
						</div>
						<div class="mb-4">
							<label class="form-label" for="support-page">{$_('support.pageUrl')}</label>
							<input id="support-page" class="form-control" maxlength="500" bind:value={form.pageUrl} aria-describedby="support-page-help" placeholder="/corsi" />
							<div id="support-page-help" class="form-text">{$_('support.pageUrlHelp')}</div>
						</div>
						<button class="btn btn-primary" type="submit" disabled={submitting}>
							<i class="ri-send-plane-line me-1" aria-hidden="true"></i>{$_(submitting ? 'support.submitting' : 'support.submit')}
						</button>
					</div>
				</form>
			</div>

			<div class="col-xl-5">
				<section class="card border-0 shadow-sm" aria-labelledby="my-tickets-title">
					<div class="card-header"><h2 id="my-tickets-title" class="h5 mb-0">{$_('support.myTickets')}</h2></div>
					<div class="card-body">
						{#if listError}<div class="alert alert-danger" role="alert">{listError}</div>{/if}
						{#if loading}
							<div class="text-center py-4"><span class="spinner-border text-primary" role="status"><span class="visually-hidden">{$_('common.loading')}</span></span></div>
						{:else if tickets.length === 0}
							<p class="text-muted mb-0">{$_('support.myTicketsEmpty')}</p>
						{:else}
							<ol class="ticket-list">
								{#each tickets as ticket (ticket.id)}
									<li>
										<div class="d-flex justify-content-between gap-2 align-items-start">
											<strong class="ticket-subject">{ticket.subject}</strong>
											<span class="ticket-status {STATUS_CLASS[ticket.status]}">{$_(`support.status.${ticket.status}`)}</span>
										</div>
										<p class="ticket-meta">{$_(`support.cat.${ticket.category}`)} · {$_('support.openedOn', { values: { date: formatDateTime(ticket.createdAt) } })}</p>
										{#if ticket.adminNote}
											<div class="ticket-reply">
												<span>{$_('support.reply')}</span>
												<p>{ticket.adminNote}</p>
											</div>
										{/if}
									</li>
								{/each}
							</ol>
						{/if}
					</div>
				</section>
			</div>
		</div>
	</div>
</div>

<style>
	legend.form-label { font-size: inherit; }
	.category-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem; }
	@media (max-width: 575.98px) { .category-grid { grid-template-columns: 1fr; } }
	.category-option {
		display: flex; gap: .8rem; align-items: flex-start; margin: 0; padding: .85rem 1rem; cursor: pointer;
		border: 1px solid var(--portal-border); border-radius: calc(var(--portal-radius) - 4px);
		background: var(--portal-surface); transition: border-color .18s ease-out, background-color .18s ease-out;
	}
	.category-option:hover { border-color: rgba(var(--portal-polito-blue-rgb), .5); }
	.category-option:focus-within { outline: 2px solid var(--portal-focus); outline-offset: 2px; }
	.category-option.is-selected { border-color: var(--portal-polito-blue); background: rgba(var(--portal-polito-blue-rgb), .07); }
	.category-option i { font-size: 1.35rem; line-height: 1.2; color: var(--portal-polito-blue); }
	.category-option strong { display: block; color: var(--portal-ink); font-weight: 600; }
	.category-option small { display: block; margin-top: .15rem; color: var(--portal-muted); line-height: 1.4; }

	.ticket-list { list-style: none; margin: 0; padding: 0; }
	.ticket-list li { padding: .9rem 0; border-top: 1px solid var(--portal-border); }
	.ticket-list li:first-child { padding-top: 0; border-top: 0; }
	.ticket-subject { color: var(--portal-ink); overflow-wrap: anywhere; }
	.ticket-meta { margin: .25rem 0 0; color: var(--portal-muted); font-size: .82rem; }
	.ticket-reply { margin-top: .65rem; padding: .65rem .8rem; border-radius: var(--portal-radius-sm); background: var(--portal-surface-muted); }
	.ticket-reply span { display: block; font-size: .75rem; font-weight: 600; color: var(--portal-muted); }
	.ticket-reply p { margin: .2rem 0 0; white-space: pre-line; color: var(--portal-ink); }

</style>
