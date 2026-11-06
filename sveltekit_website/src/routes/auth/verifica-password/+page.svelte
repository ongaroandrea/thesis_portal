<script>
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onDestroy } from 'svelte';
  import Link from "svelte-link";
  import { Alert, Label, Button } from "@sveltestrap/sveltestrap";
  import ParticlesAuth from '$lib/components/layouts/ParticlesAuth.svelte';
  import { authClient } from "$lib/client/auth/auth-client";
  import { authErrorMessage } from "$lib/client/auth/auth-errors.js";
  import { _ } from 'svelte-i18n';

  let password = "";
  let confirmPassword = "";
  let loading = false;
  let error = "";
  let success = false;
  let showPassword = false;
  let showConfirmPassword = false;
  let redirectTimer;

  onDestroy(() => clearTimeout(redirectTimer));

  // 1. Extract the token explicitly from the URL
  // BetterAuth usually looks for the token automatically, but passing it explicitly is safer.
  $: token = $page.url.searchParams.get("token") || "";
  $: errorParam = $page.url.searchParams.get("error"); // Capture auto-redirect errors
  $: hasMinLength = password.length >= 8;
  $: hasLower = /[a-z]/.test(password);
  $: hasUpper = /[A-Z]/.test(password);
  $: hasNumber = /[0-9]/.test(password);
  $: passwordStrength = (() => {
    if (!password) return { score: 0, label: "", color: "", hex: "var(--portal-border)" };
    let score = 0;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) {
	  return { score, label: 'password.weak', color: "danger", hex: "var(--portal-danger)" };
    }
    if (score <= 4) {
	  return { score, label: 'password.fair', color: "warning", hex: "var(--portal-warning)" };
    }
	return { score, label: 'password.strong', color: "success", hex: "var(--portal-positive)" };
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
      const { error: err } = await authClient.resetPassword({
        newPassword: password,
        token: token,
      });

      if (err) {
        error = authErrorMessage(err, 'auth.errors.resetFailed');
        return;
      }

      success = true;

      // Optional: Redirect automatically after a few seconds
      redirectTimer = setTimeout(() => {
        goto("/login");
      }, 3000);
    } catch (err) {
	  error = $_('auth.errors.resetFailed');
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{$_('password.reset')} | {$_('site.name')}</title>
</svelte:head>

<ParticlesAuth>
              <h1>{$_('password.createNew')}</h1>
              <p class="auth-lead">{$_('password.mustDiffer')}</p>

              <div>
                {#if success}
                  <Alert color="success" role="status">
					<h2 class="h6 message">{$_('password.updated')}</h2>
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
                      <Alert color="danger" role="alert">
                        {error || authErrorMessage(errorParam, 'password.invalidToken')}
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
								: 'var(--portal-border)'};"
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

          <p class="auth-secondary">
			  {$_('password.remember')}
              <Link href="/login" class="fw-semibold">{$_('auth.backToLogin')}</Link>
          </p>
</ParticlesAuth>

<style lang="scss">
  
  :global(.valid) {
    color: var(--portal-positive-text) !important;
    &::before {
      content: "✓ ";
    }
  }

  :global(.invalid) {
    color: var(--portal-danger-text) !important;
    &::before {
      content: "✗ ";
    }
  }
</style>
