<script>
  import Link from "svelte-link";
  import { Alert, Label } from "@sveltestrap/sveltestrap";
  import ParticlesAuth from '$lib/components/layouts/ParticlesAuth.svelte';
  import { authClient } from "$lib/client/auth/auth-client";
  import { authErrorMessage } from "$lib/client/auth/auth-errors.js";
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

    try {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${PUBLIC_URL}/reset-password`,
      });

      if (error) {
        errorMessage = authErrorMessage(error, 'auth.errors.resetFailed');
      } else {
		message = $_('auth.resetEmailSent');
      }
    } catch {
      errorMessage = $_('auth.errors.resetFailed');
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{$_('auth.forgotPassword')} | {$_('site.name')}</title>
</svelte:head>

<ParticlesAuth>
  <h1>{$_('auth.forgotPassword')}</h1>
  <p class="auth-lead">{$_('auth.forgotHelp')}</p>

  <form onsubmit={(event) => { event.preventDefault(); sendResetLink(); }}>
    <div class="mb-4">
      <Label class="form-label" for="email">Email</Label>
      <input
        type="email"
        class="form-control"
        id="email"
        name="email"
        autocomplete="email"
        required
        placeholder={$_('auth.emailPlaceholder')}
        bind:value={email}
      />
    </div>

    <button class="btn btn-primary w-100" type="submit" disabled={loading}>
      {#if loading}
        {$_('auth.sending')}
      {:else}
        {$_('auth.sendReset')}
      {/if}
    </button>

    {#if message}
      <Alert class="alert-success mt-3 mb-0" role="status">{message}</Alert>
    {/if}

    {#if errorMessage}
      <Alert class="alert-danger mt-3 mb-0" role="alert">{errorMessage}</Alert>
    {/if}
  </form>

  <p class="auth-secondary"><Link href="/login">{$_('auth.backToLogin')}</Link></p>
</ParticlesAuth>
