<script>
	import { page } from '$app/state';
	import { Col, Container, Row } from '@sveltestrap/sveltestrap';
	import ParticlesAuth from '$lib/components/layouts/ParticlesAuth.svelte';

	const messages = {
		403: {
			title: 'Accesso negato',
			body: "Non hai i permessi necessari per visualizzare questa pagina."
		},
		404: {
			title: 'Pagina non trovata',
			body: 'La pagina che stai cercando non esiste o è stata spostata.'
		},
		500: {
			title: 'Errore interno del server',
			body: 'Si è verificato un problema inatteso. Riprova tra poco.'
		}
	};

	let content = $derived(messages[page.status] ?? {
		title: 'Qualcosa è andato storto',
		body: page.error?.message ?? 'Si è verificato un errore inatteso.'
	});
</script>

<svelte:head>
	<title>{page.status} | Portale correzione automatica</title>
</svelte:head>

<ParticlesAuth>
	<div class="auth-page-content d-flex align-items-center">
		<Container>
			<Row class="justify-content-center">
				<Col lg={8} class="text-center text-white">
					<img src="/images/polito_logo_desktop.svg" alt="Politecnico di Torino" height="80" class="mb-4 bg-white p-2 rounded" />
					<h1 class="display-1 fw-semibold">{page.status}</h1>
					<h2>{content.title}</h2>
					<p class="mb-4">{content.body}</p>
					<a href="/" class="btn btn-success">
						<i class="mdi mdi-home me-1"></i>Torna alla home
					</a>
				</Col>
			</Row>
		</Container>
	</div>
</ParticlesAuth>
