<script>
    import { onMount } from "svelte";
    import { authClient } from "$lib/client/auth/auth-client";
	import { apiListRequest, apiRequest } from "$lib/client/api.js";
	import PageHeader from "$lib/components/portal/PageHeader.svelte";
    import { _ } from 'svelte-i18n';
    import { tableScrollHint } from '$lib/client/table-scroll-hint.js';

    const session = authClient.useSession();
    $: currentUser = $session?.data?.user;
    $: isAdmin = currentUser?.role === "admin";

    let users = [];
    let searchTerm = "";
    let loading = true;
    let errorMessage = "";
    let successMessage = "";
    let selectedUser = null;
    let saving = false;

    const roleNames = {
        admin: 'role.admin',
        professor: 'role.professor',
        student: 'role.student',
    };

    $: filteredUsers = users.filter((item) => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return true;
		return [item.name, item.surname, item.email, roleNames[item.role] ? $_(roleNames[item.role]) : item.role]
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
			successMessage = $_('users.updated');
        } catch (error) {
            errorMessage = error.message;
        } finally {
            saving = false;
        }
    }

    async function deleteUser(user) {
		if (!confirm($_('users.confirmDelete', { values: { email: user.email } }))) return;
        errorMessage = "";
        try {
            await apiRequest(`/api/utenti/${user.id}`, { method: "DELETE" });
            users = users.filter((item) => item.id !== user.id);
			successMessage = $_('users.deleted');
        } catch (error) {
            errorMessage = error.message;
        }
    }

    onMount(loadUsers);
</script>

<svelte:head><title>{$_('nav.students')} | {$_('site.name')}</title></svelte:head>

<div class="page-content">
    <div class="container-fluid py-4">
		<PageHeader title={$_('nav.students')} subtitle={$_('users.listSubtitle')} parentLabel={$_('common.portal')} parentHref="/corsi" />
        {#if errorMessage}<div class="alert alert-danger">{errorMessage}</div>{/if}
        {#if successMessage}<div class="alert alert-success">{successMessage}</div>{/if}

        <div class="card border-0 shadow-sm">
            <div class="card-header d-flex flex-wrap gap-3 justify-content-between align-items-center">
				<h2 class="h5 mb-0">{$_('users.users')}</h2>
				{#if isAdmin}<a class="btn btn-primary" href="/studenti/aggiungi"><i class="ri-user-add-line me-1"></i> {$_('users.new')}</a>{/if}
            </div>
            <div class="card-body">
				<label class="visually-hidden" for="user-search">{$_('users.searchLabel')}</label>
				<input id="user-search" class="form-control mb-3" type="search" placeholder={$_('users.search')} bind:value={searchTerm} />
                {#if loading}
                    <div class="text-center py-5"><span class="spinner-border text-primary"></span></div>
                {:else}
                    <div class="table-responsive" use:tableScrollHint={$_('common.scrollTable')}>
                        <table class="table table-hover align-middle">
							<thead><tr><th>{$_('common.name')}</th><th>Email</th><th>{$_('common.role')}</th><th>{$_('common.status')}</th><th class="text-end">{$_('common.actions')}</th></tr></thead>
                            <tbody>
                                {#each filteredUsers as user (user.id)}
                                    <tr>
										<td>{user.name} {user.surname || ""}</td><td>{user.email}</td><td>{roleNames[user.role] ? $_(roleNames[user.role]) : user.role}</td>
										<td><span class:badge={true} class:bg-danger={user.banned} class:bg-success={!user.banned}>{$_(user.banned ? 'status.blocked' : 'status.active')}</span></td>
                                        <td class="text-end">
											<a class="btn btn-sm btn-light me-1" href={`/studenti/${user.id}`}>{$_('common.details')}</a>
                                            {#if isAdmin}
												<button class="btn btn-sm btn-outline-primary me-1" on:click={() => editUser(user)}>{$_('common.edit')}</button>
												<button class="btn btn-sm btn-outline-danger" disabled={String(user.id) === String(currentUser?.id)} on:click={() => deleteUser(user)}>{$_('common.delete')}</button>
                                            {/if}
                                        </td>
                                    </tr>
                                {:else}
									<tr><td colspan="5" class="text-muted py-4">{#if searchTerm.trim()}{$_('users.noMatch', { values: { query: searchTerm.trim() } })} <button class="btn btn-sm btn-light ms-2" type="button" on:click={() => searchTerm = ''}>{$_('correction.resetFilters')}</button>{:else}{$_('users.empty')}{/if}</td></tr>
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
			<div class="modal-header"><h2 class="h5 modal-title">{$_('users.edit')}</h2><button class="btn-close" aria-label={$_('common.close')} on:click={() => selectedUser = null}></button></div>
            <div class="modal-body">
				<label class="form-label" for="edit-name">{$_('common.name')}</label><input id="edit-name" class="form-control mb-3" bind:value={selectedUser.name} />
				<label class="form-label" for="edit-surname">{$_('common.surname')}</label><input id="edit-surname" class="form-control mb-3" bind:value={selectedUser.surname} />
				<label class="form-label" for="edit-role">{$_('common.role')}</label><select id="edit-role" class="form-select" bind:value={selectedUser.role}><option value="student">{$_('role.student')}</option><option value="professor">{$_('role.professor')}</option><option value="admin">{$_('role.admin')}</option></select>
            </div>
			<div class="modal-footer"><button class="btn btn-light" on:click={() => selectedUser = null}>{$_('common.cancel')}</button><button class="btn btn-primary" disabled={saving} on:click={saveUser}>{$_(saving ? 'common.saving' : 'common.save')}</button></div>
        </div></div>
    </div>
{/if}

<style>
	@media (max-width: 767.98px) { .table-responsive table { min-width: 720px; } }
</style>
