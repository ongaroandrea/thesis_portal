<script>
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';

	let isFullscreen = false;

	onMount(() => {
		const syncFullscreenState = () => {
			isFullscreen = Boolean(document.fullscreenElement);
		};

		syncFullscreenState();
		document.addEventListener('fullscreenchange', syncFullscreenState);
		return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
	});

	async function toggleFullscreen() {
		try {
			if (document.fullscreenElement) {
				await document.exitFullscreen();
			} else {
				await document.documentElement.requestFullscreen();
			}
		} catch {
			// Fullscreen can be rejected by browser or user policy.
		}
	}
</script>

<div class="ms-1 header-item d-none d-sm-flex">
	<button
		on:click={toggleFullscreen}
		type="button"
		class="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle"
		aria-label={$_(isFullscreen ? 'common.exitFullscreen' : 'common.enterFullscreen')}
	>
		<i
			class={isFullscreen
				? 'ri-fullscreen-exit-line fs-22'
				: 'ri-fullscreen-line fs-22'}
			aria-hidden="true"
		></i>
	</button>
</div>
