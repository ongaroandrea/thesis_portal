<script>
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import BreadCrumb from "$lib/components/common/BreadCrumb.svelte";
    import { _, locale } from 'svelte-i18n';

    let user = null;
    let loading = true;
    let errorMessage = "";

    const roleNames = {
        developer: 'role.developer',
        professor: 'role.professor',
        student: 'role.student',
    };

    const formatDate = (date) => date
        ? new Intl.DateTimeFormat($locale === 'en' ? 'en-GB' : 'it-IT', { dateStyle: "long" }).format(new Date(date))
        : "N/A";

    onMount(async () => {
        try {
            const response = await fetch(`/api/utenti/${$page.params.id}`);
            const payload = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(payload.message || payload.error || $_('users.loadError'));
            user = payload.data;
        } catch (error) {
            errorMessage = error.message;
        } finally {
            loading = false;
        }
    });
</script>

<svelte:head><title>{$_('users.detail')}</title></svelte:head>

<div class="page-content"><div class="container-fluid py-4">
    <BreadCrumb title={$_('users.detail')} pageTitle={$_('nav.students')} pageHref="/studenti" />
    {#if loading}
        <div class="text-center py-5"><span class="spinner-border text-primary"></span></div>
    {:else if errorMessage}
        <div class="alert alert-danger">{errorMessage}</div>
    {:else if user}
        <div class="row justify-content-center"><div class="col-xl-8"><div class="card border-0 shadow-sm">
            <div class="card-header d-flex justify-content-between align-items-center">
				<h5 class="mb-0">{$_('users.profile')}</h5><a class="btn btn-sm btn-light" href="/studenti">{$_('users.backToList')}</a>
            </div>
            <div class="card-body">
                <div class="d-flex align-items-center gap-3 mb-4">
                    {#if user.image}<img class="rounded-circle object-fit-cover" width="72" height="72" src={user.image} alt={user.name} />{:else}<div class="avatar-placeholder rounded-circle d-flex align-items-center justify-content-center">{user.name?.slice(0, 1)?.toUpperCase()}</div>{/if}
                    <div><h3 class="mb-1">{user.name} {user.surname || ""}</h3><p class="text-muted mb-0">{user.email}</p></div>
                </div>
                <dl class="row mb-0">
					<dt class="col-sm-4">{$_('common.role')}</dt><dd class="col-sm-8">{roleNames[user.role] ? $_(roleNames[user.role]) : user.role}</dd>
					<dt class="col-sm-4">{$_('users.emailVerified')}</dt><dd class="col-sm-8">{$_(user.emailVerified ? 'common.yes' : 'common.no')}</dd>
					<dt class="col-sm-4">{$_('common.status')}</dt><dd class="col-sm-8">{$_(user.banned ? 'status.blocked' : 'status.active')}</dd>
					<dt class="col-sm-4">{$_('users.createdAt')}</dt><dd class="col-sm-8">{formatDate(user.createdAt)}</dd>
					<dt class="col-sm-4">{$_('users.updatedAt')}</dt><dd class="col-sm-8">{formatDate(user.updatedAt)}</dd>
                </dl>
            </div>
        </div></div></div>
    {/if}
</div></div>

<style>
    .avatar-placeholder { width: 72px; height: 72px; background: var(--vz-primary); color: white; font-size: 1.75rem; font-weight: 600; }
</style>
