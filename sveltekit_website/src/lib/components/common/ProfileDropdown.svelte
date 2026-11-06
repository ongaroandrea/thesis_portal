<script>
    import {
        Dropdown,
        DropdownToggle,
        DropdownMenu,
        DropdownItem,
        Spinner,
    } from "@sveltestrap/sveltestrap";
    import { goto, invalidateAll } from "$app/navigation";
    import { authClient } from "$lib/client/auth/auth-client";
    import { formatNameForDisplay } from "$lib/utils/text.js";
    import { _ } from 'svelte-i18n';

    const session = authClient.useSession();
    let isLoggingOut = false;

    const logout = async function () {
        if (isLoggingOut) return;
        isLoggingOut = true;
        try {
            await authClient.signOut();
            await invalidateAll();
            await goto("/login");
        } catch (error) {
            console.error("Logout failed:", error);
            isLoggingOut = false;
        }
    };
</script>

<Dropdown class="ms-sm-3 header-item topbar-user">
    <DropdownToggle
        type="button"
        color=""
        class="btn p-0"
        id="page-header-user-dropdown"
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
							{#if $session.data.user.role === 'admin'}
								{$_('role.admin')}
							{:else if $session.data.user.role === 'professor'}
								{$_('role.professor')}
							{:else if $session.data.user.role === 'student'}
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
            ><i class="ri-settings-3-line text-muted fs-16 align-middle me-1"
            ></i> <span class="align-middle">{$_('profile.settings')}</span></DropdownItem
        >
        <DropdownItem href={null} on:click={logout} disabled={isLoggingOut}
            ><i class="ri-logout-box-r-line text-muted fs-16 align-middle me-1"></i>
            <span class="align-middle" data-key="t-logout">{$_('profile.logout')}</span>
            {#if isLoggingOut}
                <Spinner size="sm" class="ms-2" />
            {/if}
        </DropdownItem>
    </DropdownMenu>
</Dropdown>
