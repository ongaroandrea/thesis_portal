<script>
	import { Form, Input, Dropdown, DropdownMenu, Button } from '@sveltestrap/sveltestrap';
	import { browser } from "$app/environment";

	import FullScreenDropdown from '$lib/components/common/FullScreenDropdown.svelte';
	import ProfileDropdown from '$lib/components/common/ProfileDropdown.svelte';
	import LightDark from '$lib/components/common/LightDark.svelte';
	import LanguageSwitcher from '$lib/components/common/LanguageSwitcher.svelte';
	import { _ } from 'svelte-i18n';

	export let headerClass;
	function toogleMenuBtn() {
		if (browser) {
			var windowSize = document.documentElement.clientWidth;

			if (windowSize > 767)
				document.querySelector(".hamburger-icon").classList.toggle('open');

			//For collapse horizontal menu
			if (document.documentElement.getAttribute('data-layout') === "horizontal") {
				document.body.classList.contains("menu") ? document.body.classList.remove("menu") : document.body.classList.add("menu");
			}
		}
	}
</script>

<header id="page-topbar" class={headerClass}>
	<div class="layout-width">
		<div class="navbar-header">
			<div class="d-flex">
				<!-- LOGO -->
				<div class="navbar-brand-box horizontal-logo">
					<a href="/corsi" class="logo logo-dark">
						<span class="logo-sm">
							<img
								src="/images/favicon.ico"
								alt={$_('home.eyebrow')}
								height="22"
							/>
						</span>
						<span class="logo-lg">
							<img
								src="/images/polito_logo_desktop.svg"
								alt="Politecnico di Torino"
								height="42"
							/>
						</span>
					</a>

					<a href="/corsi" class="logo logo-light">
						<span class="logo-sm">
							<img
								src="/images/favicon.ico"
								alt={$_('home.eyebrow')}
								height="22"
							/>
						</span>
						<span class="logo-lg">
							<img
								src="/images/polito_logo_desktop_bianco.png"
								alt="Politecnico di Torino"
								height="42"
							/>
						</span>
					</a>
				</div>

				<button
					type="button"
					class="btn btn-sm px-3 fs-16 header-item vertical-menu-btn topnav-hamburger"
					id="topnav-hamburger-icon"
					on:click={toogleMenuBtn}
					aria-label={$_('header.menu')}
				>
					<span class="hamburger-icon">
						<span></span>
						<span></span>
						<span></span>
					</span>
				</button>

			</div>

			<div class="d-flex align-items-center">
				<LanguageSwitcher />
				<Dropdown class="d-md-none topbar-head-dropdown header-item">
					<button
						type="button"
						class="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle"
						id="page-header-search-dropdown"
						aria-label={$_('common.search')}>
						<i class="bx bx-search fs-22"></i>
					</button>
					<DropdownMenu
						class="dropdown-menu-lg dropdown-menu-end p-0">
						<Form class="p-3">
							<div class="form-group m-0">
								<div class="input-group">
									<Input
										type="text"
										class="form-control"
										placeholder={$_('common.searchPlaceholder')}
									/>
									<Button color="primary" type="submit"
									><i class="mdi mdi-magnify"></i></Button
									>
								</div>
							</div>
						</Form>
					</DropdownMenu>
				</Dropdown>

				<FullScreenDropdown />

				<LightDark />

				<ProfileDropdown />
			</div>
		</div>
	</div>
</header>

<div class="vertical-overlay"></div>
