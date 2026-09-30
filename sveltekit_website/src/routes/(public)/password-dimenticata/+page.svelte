<script>
  import Link from "svelte-link";
  import {
    Alert,
    Card,
    CardBody,
    Col,
    Container,
    Row,
    Label,
  } from "@sveltestrap/sveltestrap";
  import ParticlesAuth from '$lib/components/layouts/ParticlesAuth.svelte';
  import { authClient } from "$lib/client/auth/auth-client";
  import { PUBLIC_URL } from "$env/static/public";
  import { _ } from 'svelte-i18n';
  let email = $state("");
  let loading = $state(false);
  let message = $state("");
  let errorMessage = $state("");

  async function sendResetLink() {
    loading = true;
    errorMessage = "";
    message = "";

    const { data, error } = await authClient.requestPasswordReset({
      email: email,
      redirectTo: `${PUBLIC_URL}/reset-password`,
    });

    console.log("Reset password response:", { data, error });

    loading = false;

    if (error) {
      errorMessage = error.message;
    } else {
		message = $_('auth.resetEmailSent');
    }
  }
</script>

<svelte:head>
  <title>{$_('auth.forgotPassword')} | {$_('home.eyebrow')}</title>
</svelte:head>

<ParticlesAuth>
  <div class="auth-page-content pt-5">
    <Container>
      <Row>
        <Col lg={12}>
          <div class="text-center mt-sm-5 mb-4 text-white-50">
            <div>
              <Link href="/" class="d-inline-block auth-logo">
                <img src="/images/polito_logo_desktop.svg" alt="Politecnico di Torino" height="76" />
              </Link>
            </div>
			<p class="mt-3 fs-15 fw-medium">{$_('home.eyebrow')}</p>
          </div>
        </Col>
      </Row>

      <Row class="justify-content-center">
        <Col md={8} lg={6} xl={5}>
          <Card class="mt-4">
            <CardBody class="p-4">
              <div class="text-center mt-2">
				<h5 class="text-primary">{$_('auth.forgotPassword')}</h5>
				<p class="text-muted">{$_('auth.forgotHelp')}</p>

                <lord-icon
                  src="//cdn.lordicon.com/rhvddzym.json"
                  trigger="loop"
                  colors="primary:#0ab39c"
                  class="avatar-xl"
                  style="width: 120px; height: 125px"
                ></lord-icon>
              </div>

              <Alert
                class="border-0 alert-warning text-center mb-2 mx-2"
                role="alert"
              >
				{$_('auth.forgotAlert')}
              </Alert>
              <div class="p-2">
                <form onsubmit={(event) => { event.preventDefault(); sendResetLink(); }}>
                  <div class="mb-4">
                    <Label class="form-label" for="email">Email</Label>
                    <input
                      type="email"
                      class="form-control"
                      id="email"
					  placeholder={$_('auth.emailPlaceholder')}
                      bind:value={email}
                    />
                  </div>

                  <div class="text-center mt-4">
                    <button
                      class="btn btn-primary w-100"
                      type="submit"
                      disabled={loading}
                    >
                      {#if loading}
						{$_('auth.sending')}
                      {:else}
						{$_('auth.sendReset')}
                      {/if}
                    </button>
                  </div>

                  {#if message}
                    <Alert
                      class="border-0 alert-success text-center mb-2 mx-2 mt-3"
                      role="alert"
                    >
                      {message}
                    </Alert>
                  {/if}

                  {#if errorMessage}
                    <Alert
                      class="border-0 alert-danger text-center mb-2 mx-2 mt-3"
                      role="alert"
                    >
                      {errorMessage}
                    </Alert>
                  {/if}
                </form>
              </div>
            </CardBody>
          </Card>

          <div class="mt-4 text-center">
            <p class="mb-0">
			  {$_('auth.backToLoginPrompt')}
              <Link
                href="/login"
                class="fw-semibold text-primary text-decoration-underline"
              >
				{$_('auth.clickHere')}
              </Link>
            </p>
          </div>
        </Col>
      </Row>
    </Container>
  </div>
</ParticlesAuth>

<style>
  :global(.auth-logo img) { width: 148px; height: auto; padding: 0.55rem; border-radius: 6px; background: #ffffff; }
  .alpha-label { margin-left: 0.35rem; padding: 0.2rem 0.45rem; border: 1px solid rgba(255,255,255,.4); border-radius: 999px; font-size: .65rem; letter-spacing: .08em; text-transform: uppercase; }
</style>
