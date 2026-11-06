<script>
	import { browser } from '$app/environment';
	import FullScreenDropdown from '$lib/components/common/FullScreenDropdown.svelte';
	import ProfileDropdown from '$lib/components/common/ProfileDropdown.svelte';
	import LightDark from '$lib/components/common/LightDark.svelte';
	import LanguageSwitcher from '$lib/components/common/LanguageSwitcher.svelte';
	import { _ } from 'svelte-i18n';

	export let headerClass;

	function toggleMenu() {
		if (!browser) return;

		if (document.documentElement.clientWidth > 767) {
			document.querySelector('.hamburger-icon')?.classList.toggle('open');
		}

		if (document.documentElement.getAttribute('data-layout') === 'horizontal') {
			document.body.classList.toggle('menu');
		}
	}
</script>

<header id="page-topbar" class={headerClass}>
	<div class="layout-width">
		<div class="navbar-header">
			<div class="d-flex">
				<div class="navbar-brand-box horizontal-logo">
					<a href="/corsi" class="logo logo-dark">
						<span class="logo-sm">
							<img src="/images/favicon.ico" alt={$_('home.eyebrow')} height="22" />
						</span>
						<span class="logo-lg">
							<img src="/images/polito_logo_desktop.svg" alt="Politecnico di Torino" height="42" />
						</span>
					</a>

					<a href="/corsi" class="logo logo-light">
						<span class="logo-sm">
							<img src="/images/favicon.ico" alt={$_('home.eyebrow')} height="22" />
						</span>
						<span class="logo-lg">
							<img src="/images/polito_logo_desktop_bianco.png" alt="Politecnico di Torino" height="42" />
						</span>
					</a>
				</div>

				<button
					type="button"
					class="btn btn-sm px-3 fs-16 header-item vertical-menu-btn topnav-hamburger"
					id="topnav-hamburger-icon"
					on:click={toggleMenu}
					aria-label={$_('header.menu')}
				>
					<span class="hamburger-icon" aria-hidden="true">
						<span></span>
						<span></span>
						<span></span>
					</span>
				</button>
			</div>

			<div class="d-flex align-items-center">
				<LanguageSwitcher />
				<FullScreenDropdown />
				<LightDark />
				<ProfileDropdown />
			</div>
		</div>
	</div>
</header>

<div class="vertical-overlay"></div>
