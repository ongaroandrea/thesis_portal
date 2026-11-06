<script>
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';

	let isDark = false;

	function applyMode(dark) {
		const mode = dark ? 'dark' : 'light';
		document.documentElement.setAttribute('data-layout-mode', mode);
		document.documentElement.setAttribute('data-bs-theme', mode);
		localStorage.setItem('layout-mode', mode);
	}

	onMount(() => {
		const saved = localStorage.getItem('layout-mode');
		isDark = saved === 'dark' || (saved !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
		applyMode(isDark);
	});

	function toggle() {
		isDark = !isDark;
		applyMode(isDark);
	}
</script>

<div class="ms-1 header-item d-none d-sm-flex">
	<button
		type="button"
		class="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle light-dark-mode"
		on:click={toggle}
		aria-label={$_(isDark ? 'common.switchLight' : 'common.switchDark')}
		title={$_(isDark ? 'common.lightMode' : 'common.darkMode')}
	>
		<i class="{isDark ? 'ri-sun-line' : 'ri-moon-line'} fs-22" aria-hidden="true"></i>
	</button>
</div>
