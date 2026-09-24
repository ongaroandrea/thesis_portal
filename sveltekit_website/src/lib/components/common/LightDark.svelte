<script>
    import { browser } from '$app/environment';
    import { onMount } from "svelte";

    let isDark = false;

    // Apply mode to <html> and persist it
    function applyMode(dark) {
        const html = document.documentElement;
        html.setAttribute("data-layout-mode", dark ? "dark" : "light");
        html.setAttribute("data-bs-theme", dark ? "dark" : "light");
        // Trigger any existing listeners your theme uses
        const triggerId = dark ? "layout-mode-dark" : "layout-mode-light";
        document.getElementById(triggerId)?.click();
        // Persist preference
        localStorage.setItem("layout-mode", dark ? "dark" : "light");
    }

    onMount(() => {
        // 1. Check saved preference, fallback to OS preference
        const saved = localStorage.getItem("layout-mode");
        if (saved) {
            isDark = saved === "dark";
        } else {
            isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        }
        applyMode(isDark);
    });

    function toggle() {
        if (!browser) return;
        isDark = !isDark;
        applyMode(isDark);
    }
</script>

<div class="ms-1 header-item d-none d-sm-flex">
    <button
        type="button"
        class="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle light-dark-mode"
        on:click={toggle}
        aria-label={isDark ? "Passa alla modalità chiara" : "Passa alla modalità scura"}
        title={isDark ? "Modalità chiara" : "Modalità scura"}
    >
        <!-- Icon swaps reactively -->
		<i class="{isDark ? 'bx bx-sun' : 'bx bx-moon'} fs-22"></i>
    </button>
</div>
