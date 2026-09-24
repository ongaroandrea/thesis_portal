<script>
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import BreadCrumb from "$lib/components/common/BreadCrumb.svelte";

    let user = null;
    let loading = true;
    let errorMessage = "";

    const roleNames = {
        developer: "Sviluppatore",
        professor: "Professore",
        student: "Studente",
    };

    const formatDate = (date) => date
        ? new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(new Date(date))
        : "N/A";

    onMount(async () => {
        try {
            const response = await fetch(`/api/utenti/${$page.params.id}`);
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.message || payload.error || "Impossibile caricare l'utente.");
            user = payload.data;
        } catch (error) {
            errorMessage = error.message;
        } finally {
            loading = false;
        }
    });
</script>

<svelte:head><title>Dettaglio utente</title></svelte:head>

<div class="page-content"><div class="container-fluid py-4">
    <BreadCrumb title="Dettaglio utente" pageTitle="Studenti" pageHref="/studenti" />
    {#if loading}
        <div class="text-center py-5"><span class="spinner-border text-primary"></span></div>
    {:else if errorMessage}
        <div class="alert alert-danger">{errorMessage}</div>
    {:else if user}
        <div class="row justify-content-center"><div class="col-xl-8"><div class="card border-0 shadow-sm">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">Profilo utente</h5><a class="btn btn-sm btn-light" href="/studenti">Torna alla lista</a>
            </div>
            <div class="card-body">
                <div class="d-flex align-items-center gap-3 mb-4">
                    {#if user.image}<img class="rounded-circle object-fit-cover" width="72" height="72" src={user.image} alt={user.name} />{:else}<div class="avatar-placeholder rounded-circle d-flex align-items-center justify-content-center">{user.name?.slice(0, 1)?.toUpperCase()}</div>{/if}
                    <div><h3 class="mb-1">{user.name} {user.surname || ""}</h3><p class="text-muted mb-0">{user.email}</p></div>
                </div>
                <dl class="row mb-0">
                    <dt class="col-sm-4">Ruolo</dt><dd class="col-sm-8">{roleNames[user.role] || user.role}</dd>
                    <dt class="col-sm-4">Email verificata</dt><dd class="col-sm-8">{user.emailVerified ? "Sì" : "No"}</dd>
                    <dt class="col-sm-4">Stato</dt><dd class="col-sm-8">{user.banned ? "Bloccato" : "Attivo"}</dd>
                    <dt class="col-sm-4">Creato il</dt><dd class="col-sm-8">{formatDate(user.createdAt)}</dd>
                    <dt class="col-sm-4">Ultimo aggiornamento</dt><dd class="col-sm-8">{formatDate(user.updatedAt)}</dd>
                </dl>
            </div>
        </div></div></div>
    {/if}
</div></div>

<style>
    .avatar-placeholder { width: 72px; height: 72px; background: var(--vz-primary); color: white; font-size: 1.75rem; font-weight: 600; }
</style>
