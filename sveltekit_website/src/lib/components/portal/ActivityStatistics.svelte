<script>
	import { _ } from 'svelte-i18n';

	export let allowedFocuses = [];

	const categories = [
		{ id: 'CAMERA', label: 'correction.camera', icon: 'ri-camera-lens-line', parameters: ['pitch', 'zoom', 'pedestal', 'roll', 'dolly', 'fov', 'yaw'] },
		{ id: 'MATERIAL', label: 'correction.materials', icon: 'ri-shapes-line', parameters: ['roughness', 'metallic', 'specular', 'ior', 'opacity', 'transmission'] },
		{ id: 'TEXTURE', label: 'correction.texture', icon: 'ri-grid-line', parameters: ['texture_scale', 'texture_rotation', 'texture_offset_x', 'texture_offset_y', 'texture_uv_distortion', 'texture_microdetail', 'texture_normal_displacement', 'texture_transmission', 'texture_refraction', 'texture_content'] },
		{ id: 'LIGHT', label: 'correction.lighting', icon: 'ri-sun-line', parameters: ['light_count', 'light_type', 'direction', 'intensity', 'shadow_behavior', 'shadow_direction', 'environment_intensity', 'environment_rotation'] }
	];
	let activeCategoryId = 'CAMERA';
	$: availableCategories = categories.filter((category) => allowedFocuses.length === 0 || allowedFocuses.includes(category.id) || allowedFocuses.includes('GENERAL'));
	$: activeCategory = availableCategories.find((category) => category.id === activeCategoryId) ?? availableCategories[0] ?? categories[0];

	function parameterLabel(parameter) {
		return $_(`stats.parameter.${parameter}`);
	}
</script>

<section class="statistics-shell" aria-labelledby="activity-statistics-title">
	<div class="statistics-heading">
		<div>
			<div class="preview-label"><i class="ri-layout-4-line"></i>{$_('stats.interfacePreview')}</div>
			<h3 id="activity-statistics-title">{$_('stats.correctionResults')}</h3>
			<p>{$_('stats.correctionResultsHelp')}</p>
		</div>
		<div class="statistics-state"><span></span>{$_('stats.notConnected')}</div>
	</div>

	<div class="summary-grid">
		<article><span class="summary-icon total"><i class="ri-scan-2-line"></i></span><div><small>{$_('stats.analyzedChecks')}</small><strong>0</strong></div></article>
		<article><span class="summary-icon good"><i class="ri-checkbox-circle-line"></i></span><div><small>{$_('stats.goodResults')}</small><strong>0</strong></div></article>
		<article><span class="summary-icon review"><i class="ri-error-warning-line"></i></span><div><small>{$_('stats.toReview')}</small><strong>0</strong></div></article>
	</div>

	<div class="category-tabs" role="tablist" aria-label={$_('stats.categories')}>
		{#each availableCategories as category}
			<button class:active={activeCategory.id === category.id} type="button" role="tab" aria-selected={activeCategory.id === category.id} on:click={() => activeCategoryId = category.id}>
				<i class={category.icon}></i><span>{$_(category.label)}</span><small>{category.parameters.length}</small>
			</button>
		{/each}
	</div>

	<div class="category-panel" role="tabpanel">
		<div class="panel-heading">
			<div><span class="panel-icon"><i class={activeCategory.icon}></i></span><div><h4>{$_(activeCategory.label)}</h4><p>{$_('stats.parameterBreakdown')}</p></div></div>
			<span class="badge bg-light text-dark">{$_('stats.parametersCount', { values: { count: activeCategory.parameters.length } })}</span>
		</div>
		<div class="table-responsive">
			<table class="table align-middle mb-0">
				<thead><tr><th>{$_('stats.analyzedSection')}</th><th>{$_('stats.distribution')}</th><th class="text-center good-column">{$_('stats.good')}</th><th class="text-center review-column">{$_('stats.notGood')}</th><th class="text-end">{$_('stats.total')}</th></tr></thead>
				<tbody>
					{#each activeCategory.parameters as parameter}
						<tr><td><span class="parameter-name">{parameterLabel(parameter)}</span></td><td><div class="distribution-bar" aria-label={$_('stats.noResultsYet')}><span></span></div></td><td class="text-center"><span class="result-count good">0</span></td><td class="text-center"><span class="result-count review">0</span></td><td class="text-end"><strong>0</strong></td></tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="empty-note"><i class="ri-information-line"></i><span>{$_('stats.guiOnlyNote')}</span></div>
	</div>
</section>

<style>
	.statistics-shell { display: grid; gap: 1.5rem; }
	.statistics-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; }
	.statistics-heading h3 { margin: .35rem 0 .35rem; }
	.statistics-heading p { margin: 0; color: var(--bs-secondary-color); }
	.preview-label { width: max-content; display: flex; align-items: center; gap: .4rem; padding: .3rem .55rem; color: #405189; border-radius: 8px; background: rgba(64,81,137,.09); font-size: .72rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
	.statistics-state { display: flex; align-items: center; gap: .45rem; padding: .5rem .7rem; color: var(--bs-secondary-color); border: 1px solid var(--bs-border-color); border-radius: 10px; font-size: .8rem; white-space: nowrap; }
	.statistics-state span { width: 7px; height: 7px; border-radius: 50%; background: #f7b84b; box-shadow: 0 0 0 4px rgba(247,184,75,.13); }
	.summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
	.summary-grid article { display: flex; align-items: center; gap: 1rem; padding: 1.1rem; border: 1px solid var(--bs-border-color); border-radius: 16px; background: var(--bs-body-bg); box-shadow: 0 8px 22px rgba(31,43,79,.05); }
	.summary-grid article > div { display: grid; }
	.summary-grid small { color: var(--bs-secondary-color); }
	.summary-grid strong { font-size: 1.55rem; line-height: 1.2; }
	.summary-icon { width: 44px; height: 44px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 13px; font-size: 1.2rem; }
	.summary-icon.total { color: #405189; background: rgba(64,81,137,.1); }
	.summary-icon.good { color: #0ab39c; background: rgba(10,179,156,.11); }
	.summary-icon.review { color: #f06548; background: rgba(240,101,72,.11); }
	.category-tabs { display: flex; gap: .55rem; overflow-x: auto; padding-bottom: .15rem; }
	.category-tabs button { display: flex; align-items: center; gap: .5rem; padding: .7rem .85rem; color: var(--bs-secondary-color); border: 1px solid var(--bs-border-color); border-radius: 11px; background: var(--bs-body-bg); font-weight: 600; white-space: nowrap; }
	.category-tabs button:hover { color: #405189; border-color: rgba(64,81,137,.35); }
	.category-tabs button.active { color: #fff; border-color: #405189; background: #405189; box-shadow: 0 7px 16px rgba(64,81,137,.2); }
	.category-tabs small { min-width: 22px; padding: .08rem .35rem; border-radius: 99px; background: rgba(127,127,127,.13); font-size: .68rem; }
	.category-tabs button.active small { background: rgba(255,255,255,.16); }
	.category-panel { overflow: hidden; border: 1px solid var(--bs-border-color); border-radius: 18px; background: var(--bs-body-bg); box-shadow: 0 10px 28px rgba(31,43,79,.06); }
	.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.2rem 1.35rem; border-bottom: 1px solid var(--bs-border-color); }
	.panel-heading > div { display: flex; align-items: center; gap: .85rem; }
	.panel-heading h4 { margin: 0 0 .12rem; font-size: 1.05rem; }
	.panel-heading p { margin: 0; color: var(--bs-secondary-color); font-size: .82rem; }
	.panel-icon { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 12px; color: #405189; background: rgba(64,81,137,.1); font-size: 1.1rem; }
	thead th { padding: .8rem 1.1rem; color: var(--bs-secondary-color); background: var(--bs-tertiary-bg); font-size: .7rem; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; }
	tbody td { padding: .85rem 1.1rem; border-color: var(--bs-border-color); }
	.parameter-name { font-weight: 600; }
	.distribution-bar { min-width: 130px; height: 7px; overflow: hidden; border-radius: 99px; background: var(--bs-tertiary-bg); }
	.distribution-bar span { display: block; width: 0; height: 100%; background: #0ab39c; }
	.result-count { min-width: 30px; display: inline-grid; place-items: center; padding: .18rem .45rem; border-radius: 8px; font-weight: 700; }
	.result-count.good { color: #078c7b; background: rgba(10,179,156,.1); }
	.result-count.review { color: #d94b30; background: rgba(240,101,72,.1); }
	.empty-note { display: flex; align-items: center; gap: .5rem; padding: .85rem 1.1rem; color: var(--bs-secondary-color); background: var(--bs-tertiary-bg); font-size: .8rem; }
	@media (max-width: 767.98px) { .statistics-heading { display: grid; } .statistics-state { width: max-content; } .summary-grid { grid-template-columns: 1fr; } .good-column, .review-column { min-width: 80px; } }
</style>
