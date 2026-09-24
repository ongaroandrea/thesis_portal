<script>
	import { page, navigating } from "$app/stores"; // 👈 import from $app/stores
	export let data;

	import { browser } from "$app/environment";
	// import fakeBackend from '../helpers/AuthType/fakeBackend';
	import { onMount } from "svelte";

	let user = browser && localStorage.authUser;

	import { addMessages, init, getLocaleFromNavigator } from "svelte-i18n";

	init({
		fallbackLocale: "en",
		initialLocale: getLocaleFromNavigator(),
	});

	import Sidebar from '$lib/components/layouts/Sidebar.svelte';
	import Header from '$lib/components/layouts/Header.svelte';
	import Footer from '$lib/components/layouts/Footer.svelte';
	import Rightbar from '$lib/components/common/RightSidebar.svelte';

	let open = false;
	$: isPublic = false;
	let headerClass = "";
	let layoutType = "horizontal";
	let preloaderTimeout;

	$: showPreloader($navigating);

	function showPreloader(isNavigating) {
		if (!browser) return;
		const preloader = document.getElementById("preloader");
		if (!preloader) return;
		clearTimeout(preloaderTimeout);

		if (isNavigating) {
			preloader.style.visibility = "visible";
			preloader.style.opacity = "1";
		} else {
			preloaderTimeout = setTimeout(() => {
				preloader.style.visibility = "hidden";
				preloader.style.opacity = "0";
			}, 350);
		}
	}

	onMount(() => {
		window.addEventListener("scroll", scrollNavigation, true);
		showPreloader(null);

		return () => {
			clearTimeout(preloaderTimeout);
			window.removeEventListener("scroll", scrollNavigation, true);
		};
	});

	function scrollNavigation() {
		var scrollup = document.documentElement.scrollTop;
		if (scrollup > 50) {
			headerClass = "topbar-shadow";
		} else {
			headerClass = "";
		}
	}
</script>

<div id="preloader">
	<div id="status">
		<div class="spinner-border text-primary avatar-sm" role="status">
			<span class="visually-hidden">Caricamento...</span>
		</div>
	</div>
</div>

<div id="layout-wrapper">
	<Header {headerClass} />
	<Sidebar {layoutType} user={data.user} />
	<div class="main-content" id="maincontent">
		<slot />
		<Footer />
	</div>
	<Rightbar bind:open {layoutType} />
</div>
