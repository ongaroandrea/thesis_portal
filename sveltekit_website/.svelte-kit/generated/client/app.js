// in dev, this makes Vite inject its client as this module's first dependency,
// so that global constant replacements are installed before any other module
// (including user hooks) evaluates. In build it's inert.
import.meta.hot;




export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13'),
	() => import('./nodes/14'),
	() => import('./nodes/15'),
	() => import('./nodes/16'),
	() => import('./nodes/17'),
	() => import('./nodes/18'),
	() => import('./nodes/19'),
	() => import('./nodes/20'),
	() => import('./nodes/21'),
	() => import('./nodes/22'),
	() => import('./nodes/23'),
	() => import('./nodes/24'),
	() => import('./nodes/25'),
	() => import('./nodes/26'),
	() => import('./nodes/27'),
	() => import('./nodes/28')
];

export const server_loads = [0,6,2,4,5,3];

export const dictionary = {
		"/": [7],
		"/auth/verifica-password": [28,[6]],
		"/(protected)/corsi": [11,[2]],
		"/(protected)/corsi/aggiungi": [~21,[2]],
		"/(protected)/corsi/[id]": [12,[2]],
		"/(protected)/corsi/[id]/esercitazioni": [13,[2]],
		"/(protected)/corsi/[id]/esercitazioni/aggiungi": [17,[2]],
		"/(protected)/corsi/[id]/esercitazioni/[activityId]": [14,[2]],
		"/(protected)/corsi/[id]/esercitazioni/[activityId]/correzione": [15,[2]],
		"/(protected)/corsi/[id]/esercitazioni/[activityId]/modifica": [16,[2]],
		"/(protected)/corsi/[id]/modifica": [18,[2]],
		"/(protected)/corsi/[id]/prompt": [~19,[2]],
		"/(protected)/corsi/[id]/statistiche": [20,[2]],
		"/(public)/login": [26,[4,5]],
		"/(public)/password-dimenticata": [27,[4]],
		"/(protected)/profilo": [22,[2]],
		"/(protected)/prompt": [~23,[2]],
		"/(protected)/(professore)/studenti": [8,[2,3]],
		"/(protected)/(professore)/studenti/aggiungi": [~10,[2,3]],
		"/(protected)/(professore)/studenti/[id]": [9,[2,3]],
		"/(protected)/supporto": [24,[2]],
		"/(protected)/supporto/gestione": [~25,[2]]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
	
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));
export const encoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.encode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.js';

export const get_error_template = () => import('../shared/error-template.js').then(m => m.default);