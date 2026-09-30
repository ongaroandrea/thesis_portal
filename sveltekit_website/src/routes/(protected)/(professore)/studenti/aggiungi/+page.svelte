<script>
	import { apiRequest } from "$lib/client/api.js";
    import BreadCrumb from "$lib/components/common/BreadCrumb.svelte";
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

<svelte:head><title>{$_('users.new')}</title></svelte:head>

<div class="page-content"><div class="container-fluid py-4">
    <BreadCrumb title={$_('users.new')} pageTitle={$_('nav.students')} pageHref="/studenti" />
    <div class="row justify-content-center"><div class="col-xl-8"><div class="card border-0 shadow-sm">
        <div class="card-header"><h5 class="mb-0">{$_('users.createAccount')}</h5></div>
        <form class="card-body" on:submit|preventDefault={submit}>
            {#if errorMessage}<div class="alert alert-danger">{errorMessage}</div>{/if}
			{#if createdAccount}
				<div class="text-center py-3"><div class="success-icon"><i class="ri-user-follow-line"></i></div><h4 class="mt-3">{$_('users.accountCreated')}</h4><p class="text-muted">{$_('users.passwordOnce')}</p></div>
				<div class="temporary-password"><div><small>{$_('users.temporaryPassword')}</small><code>{createdAccount.temporaryPassword}</code></div><button class="btn btn-primary" type="button" on:click={copyTemporaryPassword}><i class={passwordCopied ? 'ri-check-line' : 'ri-file-copy-line'}></i> {$_(passwordCopied ? 'common.copied' : 'common.copy')}</button></div>
				<div class="d-flex justify-content-end gap-2 mt-4"><a class="btn btn-light" href="/studenti">{$_('users.back')}</a><button class="btn btn-outline-primary" type="button" on:click={() => { createdAccount = null; userData = { name: '', surname: '', email: '', role: 'student' }; }}>{$_('users.createAnother')}</button></div>
			{:else}
			<div class="alert alert-info"><i class="ri-key-2-line me-2"></i>{$_('users.passwordGenerated')}</div>
			<div class="row g-3">
				<div class="col-md-6"><label for="name" class="form-label">{$_('common.name')}</label><input id="name" class="form-control" required bind:value={userData.name} /></div>
				<div class="col-md-6"><label for="surname" class="form-label">{$_('common.surname')}</label><input id="surname" class="form-control" bind:value={userData.surname} /></div>
                <div class="col-md-6"><label for="email" class="form-label">Email</label><input id="email" class="form-control" type="email" required bind:value={userData.email} /></div>
				<div class="col-md-6"><label for="role" class="form-label">{$_('common.role')}</label><select id="role" class="form-select" bind:value={userData.role}><option value="student">{$_('role.student')}</option><option value="professor">{$_('role.professor')}</option><option value="developer">{$_('role.developer')}</option></select></div>
            </div>
			<div class="d-flex justify-content-end gap-2 mt-4"><a class="btn btn-light" href="/studenti">{$_('common.cancel')}</a><button class="btn btn-primary" type="submit" disabled={saving}>{$_(saving ? 'users.creating' : 'users.create')}</button></div>
			{/if}
        </form>
    </div></div></div>
</div></div>

<style>
	.success-icon { width: 64px; height: 64px; display: grid; place-items: center; margin: 0 auto; border-radius: 20px; color: #0ab39c; background: rgba(10,179,156,.12); font-size: 1.8rem; }
	.temporary-password { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.15rem; border: 1px solid rgba(64,81,137,.18); border-radius: 14px; background: rgba(64,81,137,.06); }
	.temporary-password > div { min-width: 0; display: grid; gap: .25rem; }
	.temporary-password small { color: var(--bs-secondary-color); }
	.temporary-password code { overflow-wrap: anywhere; color: #405189; font-size: 1.05rem; font-weight: 700; }
</style>
