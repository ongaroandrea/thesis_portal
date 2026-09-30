<script>
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import Link from "svelte-link";
  import {
    Alert,
    Card,
    CardBody,
    Col,
    Container,
    Row,
    Label,
    Button,
  } from "@sveltestrap/sveltestrap";
  import ParticlesAuth from '$lib/components/layouts/ParticlesAuth.svelte';
  import { authClient } from "$lib/client/auth/auth-client";
  import { _ } from 'svelte-i18n';

  let password = "";
  let confirmPassword = "";
  let loading = false;
  let error = "";
  let success = false;
  let showPassword = false;
  let showConfirmPassword = false;

  // 1. Extract the token explicitly from the URL
  // BetterAuth usually looks for the token automatically, but passing it explicitly is safer.
  $: token = $page.url.searchParams.get("token") || "";
  $: errorParam = $page.url.searchParams.get("error"); // Capture auto-redirect errors
  $: hasMinLength = password.length >= 8;
  $: hasLower = /[a-z]/.test(password);
  $: hasUpper = /[A-Z]/.test(password);
  $: hasNumber = /[0-9]/.test(password);
  $: passwordStrength = (() => {
    if (!password) return { score: 0, label: "", color: "", hex: "#dee2e6" };
    let score = 0;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) {
	  return { score, label: 'password.weak', color: "danger", hex: "#dc3545" };
    }
    if (score <= 4) {
	  return { score, label: 'password.fair', color: "warning", hex: "#ffc107" };
    }
	return { score, label: 'password.strong', color: "success", hex: "#198754" };
  })();

  async function handleReset() {
    error = "";

    // 2. Validation
    if (password !== confirmPassword) {
	  error = $_('password.mismatch');
      return;
    }
    if (password.length < 8) {
	  error = $_('password.minLengthError');
      return;
    }
    if (!token) {
	  error = $_('password.invalidToken');
      return;
    }

    loading = true;

    try {
      // 3. Call the reset function
      const { data, error: err } = await authClient.resetPassword({
        newPassword: password,
        token: token,
      });

      if (err) {
        throw new Error(err.message);
      }

      success = true;

      // Optional: Redirect automatically after a few seconds
      setTimeout(() => {
        goto("/login");
      }, 3000);
    } catch (err) {
      console.error("Reset error:", err);
	  error = err.message || $_('common.unexpectedError');
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{$_('password.reset')} | {$_('home.eyebrow')}</title>
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
			<p class="mt-3 fs-15 fw-medium">{$_('home.eyebrow')} <span class="alpha-label">Alpha</span></p>
          </div>
        </Col>
      </Row>

      <Row class="justify-content-center">
        <Col md={8} lg={6} xl={5}>
          <Card class="mt-4">
            <CardBody class="p-4">
              <div class="text-center mt-2">
				<h5 class="text-primary">{$_('password.createNew')}</h5>
				<p class="text-muted">{$_('password.mustDiffer')}</p>
              </div>

              <div class="p-2">
                {#if success}
                  <Alert color="success" class="text-center">
					<h5 class="message">{$_('password.updated')}</h5>
					<p>{$_('password.redirecting')}</p>
                  </Alert>
                  <div class="mt-4 text-center">
                    <Button
                      color="primary"
                      class="w-100"
					  on:click={() => goto("/login")}>{$_('password.goLogin')}</Button
                    >
                  </div>
                {:else}
                  <form on:submit|preventDefault={handleReset}>
                    {#if error || errorParam}
                      <Alert color="danger" class="text-center">
                        {error || errorParam}
                      </Alert>
                    {/if}

                    <div class="mb-3">
                      <Label class="form-label" for="password"
						>{$_('password.new')}</Label
                      >
                      <div class="input-group">
                        {#if showPassword}
                          <input
                            type="text"
                            class="form-control"
                            id="password"
							placeholder={$_('password.newPlaceholder')}
                            bind:value={password}
                            autocomplete="new-password"
                            required
                          />
                        {:else}
                          <input
                            type="password"
                            class="form-control"
                            id="password"
							placeholder={$_('password.newPlaceholder')}
                            bind:value={password}
                            autocomplete="new-password"
                            required
                          />
                        {/if}
                        <button
                          type="button"
                          class="btn btn-outline-secondary"
                          on:click={() => (showPassword = !showPassword)}
						  title={$_(showPassword ? 'common.hide' : 'common.show')}
                        >
                          <i
							class={showPassword
							  ? "ri-eye-off-line"
							  : "ri-eye-line"}
						  ></i>
                        </button>
                      </div>
                    </div>

                    {#if password}
                      <div class="mb-3">
                        <div class="d-flex gap-1 mb-1">
                          {#each [0, 1, 2, 3, 4, 5] as i}
                            <div
                              class="flex-fill rounded"
							  style="height: 4px; background-color: {i <
							  passwordStrength.score
								? passwordStrength.hex
								: '#dee2e6'};"
							></div>
                          {/each}
                        </div>
                        <small class="text-{passwordStrength.color} fw-semibold"
						  >{$_(passwordStrength.label)}</small
                        >
                        <small class="text-muted ms-2"
						  >{$_('password.characters', { values: { count: password.length } })}</small
                        >
                      </div>
                    {/if}

                    <div class="p-3 bg-light mb-3 rounded">
					  <h5 class="fs-13">{$_('password.requirements')}</h5>
                      <p
                        class="fs-12 mb-2"
                        class:valid={hasMinLength}
                        class:invalid={!hasMinLength}
                      >
						{$_('password.minEight')}
                      </p>
                      <p
                        class="fs-12 mb-2"
                        class:valid={hasLower}
                        class:invalid={!hasLower}
                      >
						{$_('password.lowercase')}
                      </p>
                      <p
                        class="fs-12 mb-2"
                        class:valid={hasUpper}
                        class:invalid={!hasUpper}
                      >
						{$_('password.uppercase')}
                      </p>
                      <p
                        class="fs-12 mb-0"
                        class:valid={hasNumber}
                        class:invalid={!hasNumber}
                      >
						{$_('password.number')}
                      </p>
                    </div>

                    <div class="mb-3">
                      <Label class="form-label" for="confirm-password"
						>{$_('password.confirm')}</Label
                      >
                      <div class="input-group">
                        {#if showConfirmPassword}
                          <input
                            type="text"
                            class="form-control"
                            id="confirm-password"
							placeholder={$_('password.confirmPlaceholder')}
                            bind:value={confirmPassword}
                            required
                          />
                        {:else}
                          <input
                            type="password"
                            class="form-control"
                            id="confirm-password"
							placeholder={$_('password.confirmPlaceholder')}
                            bind:value={confirmPassword}
                            required
                          />
                        {/if}
                        <button
                          type="button"
                          class="btn btn-outline-secondary"
                          on:click={() =>
                            (showConfirmPassword = !showConfirmPassword)}
						  title={$_(showConfirmPassword ? 'common.hide' : 'common.show')}
                        >
                          <i
							class={showConfirmPassword
							  ? "ri-eye-off-line"
							  : "ri-eye-line"}
						  ></i>
                        </button>
                      </div>
                      {#if password !== "" && confirmPassword !== "" && password !== confirmPassword}
                        <div class="text-danger small mt-1">
						  {$_('password.mismatch')}
                        </div>
                      {/if}
                    </div>

                    <div class="mt-4">
                      <Button
                        color="primary"
                        class="w-100"
                        type="submit"
                        disabled={loading}
                      >
                        {#if loading}
						  {$_('password.updating')}
                        {:else}
						  {$_('password.reset')}
                        {/if}
                      </Button>
                    </div>
                  </form>
                {/if}
              </div>
            </CardBody>
          </Card>

          <div class="mt-4 text-center">
            <p class="mb-0">
			  {$_('password.remember')}
              <Link
                href="/login"
                class="fw-semibold text-primary text-decoration-underline"
              >
				{$_('auth.backToLogin')}
              </Link>
            </p>
          </div>
        </Col>
      </Row>
    </Container>
  </div>
</ParticlesAuth>

<style lang="scss">
  :global(.auth-logo img) { width: 148px; height: auto; padding: 0.55rem; border-radius: 6px; background: #ffffff; }
  .alpha-label { margin-left: 0.35rem; padding: 0.2rem 0.45rem; border: 1px solid rgba(255,255,255,.4); border-radius: 999px; font-size: .65rem; letter-spacing: .08em; text-transform: uppercase; }

  :global(.valid) {
    color: #0ab39c !important;
    &::before {
      content: "✓ ";
    }
  }

  :global(.invalid) {
    color: #f06548 !important;
    &::before {
      content: "✗ ";
    }
  }
</style>
