<script>
	import { onMount } from 'svelte';

	export let layoutType;

	onMount(() => {
		const savedMode = localStorage.getItem('layout-mode');
		const colorMode = savedMode === 'dark' || savedMode === 'light'
			? savedMode
			: window.matchMedia('(prefers-color-scheme: dark)').matches
				? 'dark'
				: 'light';

		const attributes = {
			'data-layout': layoutType,
			'data-bs-theme': colorMode,
			'data-layout-mode': colorMode,
			'data-layout-width': 'lg',
			'data-layout-position': 'fixed',
			'data-topbar': 'dark',
			'data-layout-style': 'default',
			'data-sidebar': 'light',
			'data-sidebar-size': 'lg'
		};

		for (const [name, value] of Object.entries(attributes)) {
			document.documentElement.setAttribute(name, value);
		}
	});
</script>
