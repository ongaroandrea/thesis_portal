import { s as head } from "../../chunks/server.js";
//#region src/routes/+page.svelte
function _page($$renderer) {
	head("1uha8ag", $$renderer, ($$renderer) => {
		$$renderer.title(($$renderer) => {
			$$renderer.push(`<title>Portale correzione automatica</title>`);
		});
		$$renderer.push(`<meta name="description" content="Portale in fase Alpha per sperimentare la correzione automatica delle attività didattiche."/>`);
	});
	$$renderer.push(`<main class="home-page svelte-1uha8ag"><header class="site-header container svelte-1uha8ag"><a class="brand svelte-1uha8ag" href="/" aria-label="Portale correzione automatica — Home"><img src="/images/polito_logo_desktop.svg" alt="Politecnico di Torino" class="svelte-1uha8ag"/></a> <a class="login-link svelte-1uha8ag" href="/login">Accedi</a></header> <section class="hero container svelte-1uha8ag"><div class="hero-copy"><p class="eyebrow svelte-1uha8ag">Portale correzione automatica</p> <h1 class="svelte-1uha8ag">Più tempo per insegnare.<br/><span class="svelte-1uha8ag">Feedback più rapido.</span></h1> <p class="intro svelte-1uha8ag">Il progetto esplora come supportare docenti e studenti attraverso la correzione
				automatica delle attività didattiche, rendendo la valutazione più tempestiva,
				coerente e trasparente.</p> <div class="actions svelte-1uha8ag"><a class="primary-action svelte-1uha8ag" href="/login">Accedi al portale <i class="ri-arrow-right-line" aria-hidden="true"></i></a></div></div> <div class="project-card svelte-1uha8ag"><p class="card-kicker svelte-1uha8ag">Obiettivo del progetto</p> <h2 class="svelte-1uha8ag">Un processo di correzione più semplice e consapevole.</h2> <p class="svelte-1uha8ag">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
				incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
				exercitation ullamco laboris.</p> <div class="alpha-note svelte-1uha8ag"><i class="ri-flask-line svelte-1uha8ag" aria-hidden="true"></i> <div class="svelte-1uha8ag"><strong class="svelte-1uha8ag">Progetto in fase Alpha</strong><span class="svelte-1uha8ag">Funzionalità e contenuti sono in evoluzione.</span></div></div></div></section></main>`);
}
//#endregion
export { _page as default };
