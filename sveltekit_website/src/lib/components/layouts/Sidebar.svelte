<script>
	import HorizontalLayout from "./HorizontalLayout.svelte";
	import { _ } from 'svelte-i18n';
	export let user = null;

	const verticalSidebarClass = () => {
		if (
			document.documentElement.getAttribute("data-sidebar-size") ===
			"sm-hover"
		) {
			document.documentElement.setAttribute(
				"data-sidebar-size",
				"sm-hover-active"
			);
		} else if (
			document.documentElement.getAttribute("data-sidebar-size") ===
			"sm-hover-active"
		) {
			document.documentElement.setAttribute(
				"data-sidebar-size",
				"sm-hover"
			);
		} else {
			document.documentElement.setAttribute(
				"data-sidebar-size",
				"sm-hover"
			);
		}
	};
</script>

<div class="app-menu navbar-menu">
	<!-- LOGO -->
	<div class="navbar-brand-box">
		<!-- Dark Logo-->
		<a href="/#" class="logo logo-dark">
			<span class="logo-sm">
				<img src="/images/favicon.ico" alt={$_('home.eyebrow')} height="22" />
			</span>
			<span class="logo-lg">
				<img src="/images/polito_logo_desktop.svg" alt="Politecnico di Torino" height="42" />
			</span>
		</a>
		<!-- Light Logo-->
		<a href="/#" class="logo logo-light">
			<span class="logo-sm">
				<img src="/images/favicon.ico" alt={$_('home.eyebrow')} height="22" />
			</span>
			<span class="logo-lg">
				<img src="/images/polito_logo_desktop_bianco.png" alt="Politecnico di Torino" height="42" />
			</span>
		</a>
		<button
			type="button"
			class="btn btn-sm p-0 fs-20 header-item float-end btn-vertical-sm-hover"
			id="vertical-hover"
			on:click={verticalSidebarClass}
			aria-label={$_('common.resizeSidebar')}
		>
			<i class="ri-record-circle-line"></i>
		</button>
	</div>

	<div id="scrollbar">
		<div class="container-fluid">
			<div id="two-column-menu"></div>
			<ul class="navbar-nav" id="navbar-nav">
				<HorizontalLayout {user} />
			</ul>
		</div>
		<!-- Sidebar -->
	</div>

	<div class="sidebar-background"></div>
</div>
