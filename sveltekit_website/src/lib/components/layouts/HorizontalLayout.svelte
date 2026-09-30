<script>
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import data from './LayoutMenuData.js';
	import { _ } from 'svelte-i18n';

	export let user = null;
	const menuItems = data.Navdata;
	const translationKeys = {
		corsi: 'nav.courses',
		'lista-corsi': 'nav.courseList',
		'aggiungi-corso': 'nav.addCourse',
		studenti: 'nav.students',
		'lista-studenti': 'nav.studentList',
		'aggiungi-studente': 'nav.addStudent',
		support: 'nav.support',
		'apri-ticket-supporto': 'nav.openTicket',
		'gestione-ticket-supporto': 'nav.manageTickets'
	};
	let openMenuId = '';

	$: currentPath = normalizePath($page.url.pathname);
	$: if (browser && currentPath) {
		const activeGroup = menuItems.find((item) => item.subItems?.some((subItem) => isWithinPath(currentPath, subItem.link)));
		if (activeGroup) openMenuId = activeGroup.id;
	}

	function normalizePath(path) {
		if (!path || path === '/') return '/';
		return path.replace(/\/+$/, '');
	}

	function isWithinPath(path, link) {
		if (!link) return false;
		const normalizedLink = normalizePath(link);
		return path === normalizedLink || path.startsWith(`${normalizedLink}/`);
	}

	function isGroupActive(item) {
		return item.subItems?.some((subItem) => isWithinPath(currentPath, subItem.link)) ?? false;
	}

	function canShow(item) {
		if (item.roles && !item.roles.includes(user?.role)) return false;
		return !item.adminOnly || user?.role === 'developer';
	}

	function toggleMenu(event, id) {
		event.preventDefault();
		openMenuId = openMenuId === id ? '' : id;
	}
</script>

{#each menuItems as item}
	{#if canShow(item)}
		{#if item.isHeader}
			<li class="menu-title"><span>{item.label}</span></li>
		{:else if item.subItems}
			<li class="nav-item">
				<a
					class="nav-link menu-link"
					class:active={isGroupActive(item)}
					href={item.link ?? '/'}
					onclick={(event) => toggleMenu(event, item.id)}
					aria-expanded={openMenuId === item.id}
					aria-controls={`menu-${item.id}`}
				>
					<i class={item.icon}></i>
					<span>{translationKeys[item.id] ? $_(translationKeys[item.id]) : item.label}</span>
				</a>
				<div
					id={`menu-${item.id}`}
					class="collapse menu-dropdown"
					class:show={openMenuId === item.id}
				>
					<ul class="nav nav-sm flex-column">
						{#each item.subItems as subItem}
							{#if canShow(subItem)}
								<li class="nav-item">
									<a
										href={subItem.link ?? '/'}
										class="nav-link"
										class:active={normalizePath(subItem.link) === currentPath}
									>
										{translationKeys[subItem.id] ? $_(translationKeys[subItem.id]) : subItem.label}
									</a>
								</li>
							{/if}
						{/each}
					</ul>
				</div>
			</li>
		{:else}
			<li class="nav-item">
				<a
					class="nav-link menu-link"
					class:active={isWithinPath(currentPath, item.link)}
					href={item.link ?? '/'}
				>
					<i class={item.icon}></i>
					<span>{translationKeys[item.id] ? $_(translationKeys[item.id]) : item.label}</span>
				</a>
			</li>
		{/if}
	{/if}
{/each}
