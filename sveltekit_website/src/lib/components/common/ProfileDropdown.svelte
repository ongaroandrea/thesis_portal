<script>
    import {
        Dropdown,
        DropdownToggle,
        DropdownMenu,
        DropdownItem,
        Spinner,
    } from "@sveltestrap/sveltestrap";
    import { goto } from "$app/navigation";
    import { invalidateAll } from "$app/navigation";
    import { authClient } from "$lib/client/auth/auth-client";
    import { formatNameForDisplay } from "$lib/utils/text.js";
    import { _ } from 'svelte-i18n';

    const session = authClient.useSession();
    let isLoggingOut = false; // State variable

    const logout = async function () {
        isLoggingOut = true; // 1. Start loading
        try {
            await goto("/login"); // 3. Navigate away
            await authClient.signOut();
            await invalidateAll(); // 2. Clear SvelteKit data
        } catch (error) {
            console.error("Logout failed:", error);
            isLoggingOut = false; // Reset if error occurs
        }
    };
</script>

<Dropdown class="ms-sm-3 header-item topbar-user">
    <DropdownToggle
        type="button"
        color=""
        class="btn"
        id="page-header-user-dropdown p-0"
    >
        <span class="d-flex align-items-center">
            <img
                class="rounded-circle header-profile-user"
                src="/images/favicon.ico"
				alt={$_('users.profile')}
            />
            <span class="text-start ms-xl-2">
                <span
                    class="d-none d-xl-inline-block ms-1 fw-medium user-name-text"
                >
                    {#if $session.data}
                        {formatNameForDisplay($session.data.user.name)}
                    {:else}
						{$_('common.loading')}
                    {/if}
                    <span
                        class="d-none d-xl-block ms-1 fs-12 user-name-sub-text"
                        >{#if $session.data}
							{#if $session.data.user.role === "sviluppatore" || $session.data.user.role === 'developer'}
								{$_('role.developer')}
							{:else if $session.data.user.role === "professore" || $session.data.user.role === 'professor'}
								{$_('role.professor')}
							{:else if $session.data.user.role === "studente" || $session.data.user.role === 'student'}
								{$_('role.student')}
                            {/if}
                        {/if}</span
                    >
                </span>
            </span>
        </span></DropdownToggle
    >
    <DropdownMenu class="dropdown-menu-end" end>
        <!-- item-->
        <h6 class="dropdown-header">
            {$_('profile.welcome', { values: { name: $session.data
                ? formatNameForDisplay($session.data.user.name)
                : '…' } })}
        </h6>
        <DropdownItem href="/profilo"
            ><i class="mdi mdi-cog-outline text-muted fs-16 align-middle me-1"
            ></i> <span class="align-middle">{$_('profile.settings')}</span></DropdownItem
        >
        <DropdownItem href={null} on:click={logout}
            ><i class="mdi mdi-logout text-muted fs-16 align-middle me-1"></i>
            <span class="align-middle" data-key="t-logout">{$_('profile.logout')}</span>
            {#if isLoggingOut}
                <Spinner size="sm" class="ms-2" />
            {/if}
        </DropdownItem>
    </DropdownMenu>
</Dropdown>
