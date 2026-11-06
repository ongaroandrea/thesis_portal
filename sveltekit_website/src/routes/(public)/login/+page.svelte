<script>
	import { Label } from "@sveltestrap/sveltestrap";
	import Link from "svelte-link";
	import ParticlesAuth from '$lib/components/layouts/ParticlesAuth.svelte';
	import { authClient } from "$lib/client/auth/auth-client";
	import { authErrorMessage } from "$lib/client/auth/auth-errors.js";
	import { goto } from "$app/navigation";
	import { _ } from 'svelte-i18n';
	let email = $state("");
	let password = $state("");
	let displayPassword = $state(false);
	// Better Auth keeps the session after the browser closes unless rememberMe is false.
	let rememberMe = $state(true);
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
					rememberMe,
				},
				{
					onError: (ctx) => {
						errorMessage = authErrorMessage(ctx.error);
						console.error("Login error:", ctx.error);
					},
					onSuccess: async (ctx) => {
						await redirectToLanding(ctx.data?.user);
					},
				}
			);
		} catch (error) {
			console.error("Authentication error:", error);
			errorMessage = $_('auth.error');
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{$_('login')} | {$_('site.name')}</title>
</svelte:head>
<ParticlesAuth>
	<h1>{$_('auth.title')}</h1>
	<p class="auth-lead">{$_('auth.subtitle')}</p>

	{#if errorMessage}
		<div class="alert alert-danger" role="alert" aria-live="polite">{errorMessage}</div>
	{/if}

	<form class="form" onsubmit={(event) => { event.preventDefault(); onSubmit(); }}>
		<div class="mb-3">
			<Label for="email" class="form-label">Email</Label>
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

		<div class="mb-3">
			<div class="d-flex justify-content-between align-items-baseline gap-2">
				<Label class="form-label" for="password-input">Password</Label>
				<Link href="/password-dimenticata" class="small">{$_('auth.forgotPassword')}</Link>
			</div>
			<div class="position-relative auth-pass-inputgroup">
				{#if displayPassword}
					<input
						type="text"
						class="form-control pe-5"
						placeholder={$_('auth.passwordPlaceholder')}
						id="password-input"
						name="password"
						autocomplete="current-password"
						required
						bind:value={password}
					/>
				{:else}
					<input
						type="password"
						class="form-control pe-5"
						placeholder={$_('auth.passwordPlaceholder')}
						id="password-input"
						name="password"
						autocomplete="current-password"
						required
						bind:value={password}
					/>
				{/if}
				<button
					class="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted"
					type="button"
					id="password-addon"
					onclick={() => (displayPassword = !displayPassword)}
					aria-label={$_(displayPassword ? 'auth.hidePassword' : 'auth.showPassword')}
					><i class="ri-eye-fill align-middle" aria-hidden="true"></i></button
				>
			</div>
		</div>

		<div class="form-check">
			<input class="form-check-input" type="checkbox" id="auth-remember-check" bind:checked={rememberMe} />
			<Label class="form-check-label" for="auth-remember-check">{$_('auth.remember')}</Label>
			<div class="form-text mt-0">{$_('auth.rememberHelp')}</div>
		</div>

		<button class="btn btn-primary w-100 mt-4" type="submit" disabled={loading}>
			{loading ? $_('auth.loading') : $_('login')}
		</button>
	</form>

	<p class="auth-secondary">{$_('auth.accountHelp')}</p>
</ParticlesAuth>
