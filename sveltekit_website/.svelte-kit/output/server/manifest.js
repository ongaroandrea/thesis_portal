export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["images/favicon.ico","images/polito_logo_desktop.svg","images/polito_logo_desktop_bianco.png","robots.txt"]),
	mimeTypes: {".svg":"image/svg+xml",".png":"image/png",".txt":"text/plain"},
	_: {
		client: {start:"_app/immutable/entry/start.BzTZEFYr.js",app:"_app/immutable/entry/app.BSueasaL.js",imports:["_app/immutable/entry/start.BzTZEFYr.js","_app/immutable/chunks/DQOf03GT.js","_app/immutable/chunks/xpPworqp.js","_app/immutable/chunks/BVpGFOjf.js","_app/immutable/entry/app.BSueasaL.js","_app/immutable/chunks/xpPworqp.js","_app/immutable/chunks/xihTtKlq.js","_app/immutable/chunks/CRzLMJPS.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js')),
			__memo(() => import('./nodes/9.js')),
			__memo(() => import('./nodes/10.js')),
			__memo(() => import('./nodes/11.js')),
			__memo(() => import('./nodes/12.js')),
			__memo(() => import('./nodes/13.js')),
			__memo(() => import('./nodes/14.js')),
			__memo(() => import('./nodes/15.js')),
			__memo(() => import('./nodes/16.js')),
			__memo(() => import('./nodes/17.js')),
			__memo(() => import('./nodes/18.js')),
			__memo(() => import('./nodes/19.js')),
			__memo(() => import('./nodes/20.js')),
			__memo(() => import('./nodes/21.js')),
			__memo(() => import('./nodes/22.js')),
			__memo(() => import('./nodes/23.js')),
			__memo(() => import('./nodes/24.js')),
			__memo(() => import('./nodes/25.js')),
			__memo(() => import('./nodes/26.js')),
			__memo(() => import('./nodes/27.js')),
			__memo(() => import('./nodes/28.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/api/consegne-esame",
				pattern: /^\/api\/consegne-esame\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/consegne-esame/_server.js'))
			},
			{
				id: "/api/consegne-esame/[fileId]",
				pattern: /^\/api\/consegne-esame\/([^/]+?)\/?$/,
				params: [{"name":"fileId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/consegne-esame/_fileId_/_server.js'))
			},
			{
				id: "/api/corsi",
				pattern: /^\/api\/corsi\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/corsi/_server.js'))
			},
			{
				id: "/api/corsi/import",
				pattern: /^\/api\/corsi\/import\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/corsi/import/_server.js'))
			},
			{
				id: "/api/corsi/[id]",
				pattern: /^\/api\/corsi\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/corsi/_id_/_server.js'))
			},
			{
				id: "/api/esercitazioni",
				pattern: /^\/api\/esercitazioni\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/esercitazioni/_server.js'))
			},
			{
				id: "/api/esercitazioni/[id]",
				pattern: /^\/api\/esercitazioni\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/esercitazioni/_id_/_server.js'))
			},
			{
				id: "/api/esercitazioni/[id]/immagini",
				pattern: /^\/api\/esercitazioni\/([^/]+?)\/immagini\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/esercitazioni/_id_/immagini/_server.js'))
			},
			{
				id: "/api/esercitazioni/[id]/immagini/[imageId]",
				pattern: /^\/api\/esercitazioni\/([^/]+?)\/immagini\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false},{"name":"imageId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/esercitazioni/_id_/immagini/_imageId_/_server.js'))
			},
			{
				id: "/api/feedback-correzione",
				pattern: /^\/api\/feedback-correzione\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/feedback-correzione/_server.js'))
			},
			{
				id: "/api/feedback-correzione/statistiche",
				pattern: /^\/api\/feedback-correzione\/statistiche\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/feedback-correzione/statistiche/_server.js'))
			},
			{
				id: "/api/membri",
				pattern: /^\/api\/membri\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/membri/_server.js'))
			},
			{
				id: "/api/membri/[id]",
				pattern: /^\/api\/membri\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/membri/_id_/_server.js'))
			},
			{
				id: "/api/prompt-template",
				pattern: /^\/api\/prompt-template\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/prompt-template/_server.js'))
			},
			{
				id: "/api/risultati",
				pattern: /^\/api\/risultati\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/risultati/_server.js'))
			},
			{
				id: "/api/risultati/[id]",
				pattern: /^\/api\/risultati\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/risultati/_id_/_server.js'))
			},
			{
				id: "/api/sessioni-correzione",
				pattern: /^\/api\/sessioni-correzione\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/sessioni-correzione/_server.js'))
			},
			{
				id: "/api/sessioni-correzione/[id]",
				pattern: /^\/api\/sessioni-correzione\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/sessioni-correzione/_id_/_server.js'))
			},
			{
				id: "/api/sessioni-correzione/[id]/job",
				pattern: /^\/api\/sessioni-correzione\/([^/]+?)\/job\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/sessioni-correzione/_id_/job/_server.js'))
			},
			{
				id: "/api/storage/[...key]",
				pattern: /^\/api\/storage(?:\/([^]*))?\/?$/,
				params: [{"name":"key","optional":false,"rest":true,"chained":true}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/storage/_...key_/_server.js'))
			},
			{
				id: "/api/supporto",
				pattern: /^\/api\/supporto\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/supporto/_server.js'))
			},
			{
				id: "/api/supporto/[id]",
				pattern: /^\/api\/supporto\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/supporto/_id_/_server.js'))
			},
			{
				id: "/api/tentativi-correzione",
				pattern: /^\/api\/tentativi-correzione\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/tentativi-correzione/_server.js'))
			},
			{
				id: "/api/tentativi-correzione/[id]",
				pattern: /^\/api\/tentativi-correzione\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/tentativi-correzione/_id_/_server.js'))
			},
			{
				id: "/api/utenti",
				pattern: /^\/api\/utenti\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/utenti/_server.js'))
			},
			{
				id: "/api/utenti/[id]",
				pattern: /^\/api\/utenti\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/utenti/_id_/_server.js'))
			},
			{
				id: "/auth/verifica-password",
				pattern: /^\/auth\/verifica-password\/?$/,
				params: [],
				page: { layouts: [0,6,], errors: [1,,], leaf: 28 },
				endpoint: null
			},
			{
				id: "/(protected)/corsi",
				pattern: /^\/corsi\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/(protected)/corsi/aggiungi",
				pattern: /^\/corsi\/aggiungi\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 21 },
				endpoint: null
			},
			{
				id: "/(protected)/corsi/[id]",
				pattern: /^\/corsi\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/(protected)/corsi/[id]/esercitazioni",
				pattern: /^\/corsi\/([^/]+?)\/esercitazioni\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/(protected)/corsi/[id]/esercitazioni/aggiungi",
				pattern: /^\/corsi\/([^/]+?)\/esercitazioni\/aggiungi\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 17 },
				endpoint: null
			},
			{
				id: "/(protected)/corsi/[id]/esercitazioni/[activityId]",
				pattern: /^\/corsi\/([^/]+?)\/esercitazioni\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false},{"name":"activityId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 14 },
				endpoint: null
			},
			{
				id: "/(protected)/corsi/[id]/esercitazioni/[activityId]/correzione",
				pattern: /^\/corsi\/([^/]+?)\/esercitazioni\/([^/]+?)\/correzione\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false},{"name":"activityId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 15 },
				endpoint: null
			},
			{
				id: "/(protected)/corsi/[id]/esercitazioni/[activityId]/modifica",
				pattern: /^\/corsi\/([^/]+?)\/esercitazioni\/([^/]+?)\/modifica\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false},{"name":"activityId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 16 },
				endpoint: null
			},
			{
				id: "/(protected)/corsi/[id]/modifica",
				pattern: /^\/corsi\/([^/]+?)\/modifica\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 18 },
				endpoint: null
			},
			{
				id: "/(protected)/corsi/[id]/prompt",
				pattern: /^\/corsi\/([^/]+?)\/prompt\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 19 },
				endpoint: null
			},
			{
				id: "/(protected)/corsi/[id]/statistiche",
				pattern: /^\/corsi\/([^/]+?)\/statistiche\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 20 },
				endpoint: null
			},
			{
				id: "/(public)/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,4,5,], errors: [1,,,], leaf: 26 },
				endpoint: null
			},
			{
				id: "/(public)/password-dimenticata",
				pattern: /^\/password-dimenticata\/?$/,
				params: [],
				page: { layouts: [0,4,], errors: [1,,], leaf: 27 },
				endpoint: null
			},
			{
				id: "/(protected)/profilo",
				pattern: /^\/profilo\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 22 },
				endpoint: null
			},
			{
				id: "/(protected)/prompt",
				pattern: /^\/prompt\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 23 },
				endpoint: null
			},
			{
				id: "/(protected)/(professore)/studenti",
				pattern: /^\/studenti\/?$/,
				params: [],
				page: { layouts: [0,2,3,], errors: [1,,,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/(protected)/(professore)/studenti/aggiungi",
				pattern: /^\/studenti\/aggiungi\/?$/,
				params: [],
				page: { layouts: [0,2,3,], errors: [1,,,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/(protected)/(professore)/studenti/[id]",
				pattern: /^\/studenti\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,3,], errors: [1,,,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/(protected)/supporto",
				pattern: /^\/supporto\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 24 },
				endpoint: null
			},
			{
				id: "/(protected)/supporto/gestione",
				pattern: /^\/supporto\/gestione\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 25 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
