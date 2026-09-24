<script>
	import {
		Container,
		Row,
		Col,
		Card,
		CardBody,
		Label,
	} from "@sveltestrap/sveltestrap";
	import Link from "svelte-link";
	import ParticlesAuth from '$lib/components/layouts/ParticlesAuth.svelte';
	import { authClient } from "$lib/client/auth/auth-client";
	import { goto } from "$app/navigation";
	let email = $state("");
	let password = $state("");
	let displayPassword = $state(false);
	let loading = $state(false);
	let errorMessage = $state("");

	function getLandingPath(user) {
		return user?.role ? "/corsi" : "/login";
	}

	async function redirectToLanding(user) {
		if (user?.role) {
			goto(getLandingPath(user));
			return;
		}

		const { data } = await authClient.getSession();
		goto(getLandingPath(data?.user));
	}

	async function onSubmit() {
		try {
			loading = true;
			errorMessage = "";

			await authClient.signIn.email(
				{
					email,
					password,
					//callbackURL: "/dashboard", // Redirect after success
				},
				{
					onError: (ctx) => {
						// show error message
						errorMessage = ctx.error.message;
						console.error("Login error:", ctx.error);
					},
					onSuccess: async (ctx) => {
						await redirectToLanding(ctx.data?.user);
					},
				}
			);
		} catch (error) {
			console.error("Authentication error:", error);
			errorMessage = "Impossibile accedere. Riprova tra qualche istante.";
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Login | Portale correzione automatica</title>
</svelte:head>
<ParticlesAuth>
	<div class="auth-page-content">
		<Container>
			<Row>
				<Col lg={12}>
					<div class="text-center mt-sm-5 mb-4 text-white-50">
						<a href="/" class="d-inline-block auth-logo">
							<img src="/images/polito_logo_desktop.svg" alt="Politecnico di Torino" height="76" />
						</a>
					</div>
				</Col>
			</Row>
			<!-- end row -->

			<Row class="justify-content-center">
				<Col md={8} lg={6} xl={5}>
					<Card class="mt-4">
						<CardBody class="p-4">
							<div class="text-center mt-2">
								<h5 class="text-primary">Benvenuto!</h5>
								<p class="text-muted">
									Accedi al tuo account per continuare.
								</p>
							</div>
							<div class="p-2 mt-4">
								{#if errorMessage}
									<div
										class="alert alert-danger"
										role="alert"
									>
										{errorMessage}
									</div>
								{/if}
									<form class="form" onsubmit={(event) => { event.preventDefault(); onSubmit(); }}>
									<div class="mb-3">
										<Label for="email" class="form-label"
											>Email</Label
										>
										<input
											type="email"
											class="form-control"
											id="email"
											placeholder="Inserisci la tua email"
											bind:value={email}
										/>
									</div>

									<div class="mb-3">
										<div class="float-end">
											<Link
												href="/password-dimenticata"
												class="text-muted"
												>Password dimenticata?</Link
											>
										</div>
										<Label
											class="form-label"
											for="password-input">Password</Label
										>
										<div
											class="position-relative auth-pass-inputgroup mb-3"
										>
											{#if displayPassword}
												<input
													type="text"
													class="form-control pe-5"
													placeholder="Inserisci la tua password"
													id="password-input"
													bind:value={password}
												/>
											{:else}
												<input
													type="password"
													class="form-control pe-5"
													placeholder="Inserisci la tua password"
													id="password-input"
													bind:value={password}
												/>
											{/if}
											<button
												class="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted"
												type="button"
												id="password-addon"
												onclick={() => (displayPassword = !displayPassword)}
												aria-label={displayPassword ? "Nascondi password" : "Mostra password"}
												><i class="ri-eye-fill align-middle"></i></button
											>
										</div>
									</div>

									<div class="form-check">
										<input
											class="form-check-input"
											type="checkbox"
											value=""
											id="auth-remember-check"
										/>
										<Label
											class="form-check-label"
											for="auth-remember-check"
											>Ricordami</Label
										>
									</div>

									<div class="mt-4">
										<button
												class="btn btn-primary w-100"
											type="submit"
											disabled={loading}
										>
											{loading ? "Accesso in corso…" : "Accedi"}
										</button>
									</div>
								</form>
							</div>
						</CardBody>
						<!-- end card body -->
					</Card>
					<!-- end card -->

				</Col>
			</Row>
			<!-- end row -->
		</Container>
		<!-- end container -->
	</div>
</ParticlesAuth>

<style>
	.auth-logo img { width: 148px; height: auto; padding: 0.55rem; border-radius: 6px; background: #ffffff; }
	.alpha-label { margin-left: 0.35rem; padding: 0.2rem 0.45rem; border: 1px solid rgba(255,255,255,.4); border-radius: 999px; font-size: .65rem; letter-spacing: .08em; text-transform: uppercase; }
</style>
