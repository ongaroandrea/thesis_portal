<script>
	import { page } from '$app/state';
	import { Card, CardBody, Col, Container, Row } from '@sveltestrap/sveltestrap';
	import ParticlesAuth from '$lib/components/layouts/ParticlesAuth.svelte';
	import { _ } from 'svelte-i18n';

	const messages = {
		400: ['error.badRequest', 'error.badRequestBody'],
		403: ['error.forbidden', 'error.forbiddenBody'],
		404: ['error.notFound', 'error.notFoundBody'],
		500: ['error.server', 'error.serverBody']
	};

	let content = $derived(messages[page.status] ?? ['error.generic', 'error.genericBody']);
</script>

<svelte:head>
	<title>{page.status} | {$_('home.eyebrow')}</title>
</svelte:head>

<ParticlesAuth>
	<div class="auth-page-content">
		<Container>
			<Row>
				<Col lg={12}>
					<div class="text-center mt-sm-5 mb-4">
						<a href="/" aria-label={$_('common.backHome')}>
							<img src="/images/polito_logo_desktop.svg" alt="Politecnico di Torino" height="76" />
						</a>
					</div>
				</Col>
			</Row>
			<Row class="justify-content-center">
				<Col md={8} lg={6} xl={5}>
					<Card class="mt-4">
						<CardBody class="p-4 p-sm-5 text-center">
							<p class="display-1 fw-semibold text-primary mb-2">{page.status}</p>
							<h1 class="h3 mb-3">{$_(content[0])}</h1>
							<p class="text-muted mb-4">{$_(content[1])}</p>
							<a href="/" class="btn btn-primary">
								<i class="mdi mdi-home me-1" aria-hidden="true"></i>{$_('common.backHome')}
							</a>
						</CardBody>
					</Card>
				</Col>
			</Row>
		</Container>
	</div>
</ParticlesAuth>
