<script>
	import { apiRequest } from "$lib/client/api.js";
	import PageHeader from "$lib/components/portal/PageHeader.svelte";
    import { _ } from 'svelte-i18n';

    let userData = { name: "", surname: "", email: "", role: "student" };
    let saving = false;
    let errorMessage = "";
    let createdAccount = null;
    let passwordCopied = false;

    async function submit() {
        saving = true;
        errorMessage = "";
        try {
			createdAccount = await apiRequest("/api/utenti", { method: "POST", body: JSON.stringify(userData) });
        } catch (error) {
            errorMessage = error.message;
        } finally {
            saving = false;
        }
    }

	async function copyTemporaryPassword() {
		if (!createdAccount?.temporaryPassword) return;
		passwordCopied = await navigator.clipboard.writeText(createdAccount.temporaryPassword)
			.then(() => true).catch(() => false);
		if (passwordCopied) setTimeout(() => passwordCopied = false, 2000);
	}
</script>

<svelte:head><title>{$_('users.new')} | {$_('site.name')}</title></svelte:head>

<div class="page-content"><div class="container-fluid py-4">
	<PageHeader title={$_('users.new')} subtitle={$_('users.newSubtitle')} parentLabel={$_('nav.students')} parentHref="/studenti" />
    <div class="row justify-content-center"><div class="col-xl-8"><div class="card border-0 shadow-sm">
        <div class="card-header"><h2 class="h5 mb-0">{$_('users.createAccount')}</h2></div>
        <form class="card-body" on:submit|preventDefault={submit}>
            {#if errorMessage}<div class="alert alert-danger">{errorMessage}</div>{/if}
			{#if createdAccount}
				<div class="py-2"><h2 class="h5">{$_('users.accountCreated')}</h2><p class="text-muted">{$_('users.passwordOnce')}</p></div>
				<div class="temporary-password"><div><small>{$_('users.temporaryPassword')}</small><code>{createdAccount.temporaryPassword}</code></div><button class="btn btn-primary" type="button" on:click={copyTemporaryPassword}><i class={passwordCopied ? 'ri-check-line' : 'ri-file-copy-line'}></i> {$_(passwordCopied ? 'common.copied' : 'common.copy')}</button></div>
				<div class="d-flex justify-content-end gap-2 mt-4"><a class="btn btn-light" href="/studenti">{$_('users.back')}</a><button class="btn btn-outline-primary" type="button" on:click={() => { createdAccount = null; userData = { name: '', surname: '', email: '', role: 'student' }; }}>{$_('users.createAnother')}</button></div>
			{:else}
			<div class="alert alert-info"><i class="ri-key-2-line me-2"></i>{$_('users.passwordGenerated')}</div>
			<div class="row g-3">
				<div class="col-md-6"><label for="name" class="form-label">{$_('common.name')}</label><input id="name" class="form-control" required bind:value={userData.name} /></div>
				<div class="col-md-6"><label for="surname" class="form-label">{$_('common.surname')}</label><input id="surname" class="form-control" bind:value={userData.surname} /></div>
                <div class="col-md-6"><label for="email" class="form-label">Email</label><input id="email" class="form-control" type="email" required bind:value={userData.email} /></div>
				<div class="col-md-6"><label for="role" class="form-label">{$_('common.role')}</label><select id="role" class="form-select" bind:value={userData.role}><option value="student">{$_('role.student')}</option><option value="professor">{$_('role.professor')}</option><option value="admin">{$_('role.admin')}</option></select></div>
            </div>
			<div class="d-flex justify-content-end gap-2 mt-4"><a class="btn btn-light" href="/studenti">{$_('common.cancel')}</a><button class="btn btn-primary" type="submit" disabled={saving}>{$_(saving ? 'users.creating' : 'users.create')}</button></div>
			{/if}
        </form>
    </div></div></div>
</div></div>

<style>
	.temporary-password { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.15rem; border: 1px solid rgba(var(--portal-brand-primary-rgb),.18); border-radius: var(--portal-radius); background: rgba(var(--portal-brand-primary-rgb),.06); }
	.temporary-password > div { min-width: 0; display: grid; gap: .25rem; }
	.temporary-password small { color: var(--portal-muted); }
	.temporary-password code { overflow-wrap: anywhere; color: var(--portal-ink); font-size: 1.05rem; font-weight: 600; }
</style>
