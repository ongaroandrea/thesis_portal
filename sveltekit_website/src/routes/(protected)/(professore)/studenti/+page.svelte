<script>
    import { onMount } from "svelte";
    import { authClient } from "$lib/client/auth/auth-client";
	import { apiListRequest, apiRequest } from "$lib/client/api.js";
    import BreadCrumb from "$lib/components/common/BreadCrumb.svelte";

    const session = authClient.useSession();
    $: currentUser = $session?.data?.user;
    $: isDeveloper = currentUser?.role === "developer";

    let users = [];
    let searchTerm = "";
    let loading = true;
    let errorMessage = "";
    let successMessage = "";
    let selectedUser = null;
    let saving = false;

    const roleNames = {
        developer: "Sviluppatore",
        professor: "Professore",
        student: "Studente",
    };

    $: filteredUsers = users.filter((item) => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return true;
        return [item.name, item.surname, item.email, roleNames[item.role]]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
    });

    async function loadUsers() {
        loading = true;
        errorMessage = "";
        try {
            users = await apiListRequest("/api/utenti");
        } catch (error) {
            errorMessage = error.message;
        } finally {
            loading = false;
        }
    }

    function editUser(user) {
        selectedUser = { ...user };
        successMessage = "";
        errorMessage = "";
    }

    async function saveUser() {
        if (!selectedUser) return;
        saving = true;
        errorMessage = "";
        try {
            const updated = await apiRequest(`/api/utenti/${selectedUser.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: selectedUser.name, surname: selectedUser.surname, role: selectedUser.role }),
            });
            users = users.map((item) => item.id === updated.id ? updated : item);
            selectedUser = null;
            successMessage = "Utente aggiornato.";
        } catch (error) {
            errorMessage = error.message;
        } finally {
            saving = false;
        }
    }

    async function deleteUser(user) {
        if (!confirm(`Eliminare ${user.email}?`)) return;
        errorMessage = "";
        try {
            await apiRequest(`/api/utenti/${user.id}`, { method: "DELETE" });
            users = users.filter((item) => item.id !== user.id);
            successMessage = "Utente eliminato.";
        } catch (error) {
            errorMessage = error.message;
        }
    }

    onMount(loadUsers);
</script>

<svelte:head><title>Studenti</title></svelte:head>

<div class="page-content">
    <div class="container-fluid py-4">
        <BreadCrumb title="Studenti" pageTitle="Portale" pageHref="/corsi" />
        {#if errorMessage}<div class="alert alert-danger">{errorMessage}</div>{/if}
        {#if successMessage}<div class="alert alert-success">{successMessage}</div>{/if}

        <div class="card border-0 shadow-sm">
            <div class="card-header d-flex flex-wrap gap-3 justify-content-between align-items-center">
                <h5 class="mb-0">Utenti</h5>
                {#if isDeveloper}<a class="btn btn-primary" href="/studenti/aggiungi"><i class="ri-user-add-line me-1"></i> Nuovo utente</a>{/if}
            </div>
            <div class="card-body">
                <input class="form-control mb-3" type="search" placeholder="Cerca per nome, email o ruolo" bind:value={searchTerm} />
                {#if loading}
                    <div class="text-center py-5"><span class="spinner-border text-primary"></span></div>
                {:else}
                    <div class="table-responsive">
                        <table class="table table-hover align-middle">
                            <thead><tr><th>Nome</th><th>Email</th><th>Ruolo</th><th>Stato</th><th class="text-end">Azioni</th></tr></thead>
                            <tbody>
                                {#each filteredUsers as user (user.id)}
                                    <tr>
                                        <td>{user.name} {user.surname || ""}</td><td>{user.email}</td><td>{roleNames[user.role] || user.role}</td>
                                        <td><span class:badge={true} class:bg-danger={user.banned} class:bg-success={!user.banned}>{user.banned ? "Bloccato" : "Attivo"}</span></td>
                                        <td class="text-end">
                                            <a class="btn btn-sm btn-light me-1" href={`/studenti/${user.id}`}>Dettagli</a>
                                            {#if isDeveloper}
                                                <button class="btn btn-sm btn-outline-primary me-1" on:click={() => editUser(user)}>Modifica</button>
                                                <button class="btn btn-sm btn-outline-danger" disabled={String(user.id) === String(currentUser?.id)} on:click={() => deleteUser(user)}>Elimina</button>
                                            {/if}
                                        </td>
                                    </tr>
                                {:else}
                                    <tr><td colspan="5" class="text-center text-muted py-4">Nessun utente trovato.</td></tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>

{#if selectedUser}
    <div class="modal-backdrop fade show"></div>
    <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
        <div class="modal-dialog modal-dialog-centered"><div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Modifica utente</h5><button class="btn-close" aria-label="Chiudi" on:click={() => selectedUser = null}></button></div>
            <div class="modal-body">
                <label class="form-label" for="edit-name">Nome</label><input id="edit-name" class="form-control mb-3" bind:value={selectedUser.name} />
                <label class="form-label" for="edit-surname">Cognome</label><input id="edit-surname" class="form-control mb-3" bind:value={selectedUser.surname} />
                <label class="form-label" for="edit-role">Ruolo</label><select id="edit-role" class="form-select" bind:value={selectedUser.role}><option value="student">Studente</option><option value="professor">Professore</option><option value="developer">Sviluppatore</option></select>
            </div>
            <div class="modal-footer"><button class="btn btn-light" on:click={() => selectedUser = null}>Annulla</button><button class="btn btn-primary" disabled={saving} on:click={saveUser}>{saving ? "Salvataggio..." : "Salva"}</button></div>
        </div></div>
    </div>
{/if}
