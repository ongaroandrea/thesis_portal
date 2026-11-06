
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/(public)" | "/(protected)/(professore)" | "/(protected)" | "/" | "/api" | "/api/consegne-esame" | "/api/consegne-esame/[fileId]" | "/api/corsi" | "/api/corsi/import" | "/api/corsi/[id]" | "/api/esercitazioni" | "/api/esercitazioni/[id]" | "/api/esercitazioni/[id]/immagini" | "/api/esercitazioni/[id]/immagini/[imageId]" | "/api/feedback-correzione" | "/api/feedback-correzione/statistiche" | "/api/membri" | "/api/membri/[id]" | "/api/prompt-template" | "/api/risultati" | "/api/risultati/[id]" | "/api/sessioni-correzione" | "/api/sessioni-correzione/[id]" | "/api/sessioni-correzione/[id]/job" | "/api/storage" | "/api/storage/[...key]" | "/api/supporto" | "/api/supporto/[id]" | "/api/tentativi-correzione" | "/api/tentativi-correzione/[id]" | "/api/utenti" | "/api/utenti/[id]" | "/auth" | "/auth/verifica-password" | "/(protected)/corsi" | "/(protected)/corsi/aggiungi" | "/(protected)/corsi/[id]" | "/(protected)/corsi/[id]/esercitazioni" | "/(protected)/corsi/[id]/esercitazioni/aggiungi" | "/(protected)/corsi/[id]/esercitazioni/[activityId]" | "/(protected)/corsi/[id]/esercitazioni/[activityId]/correzione" | "/(protected)/corsi/[id]/esercitazioni/[activityId]/modifica" | "/(protected)/corsi/[id]/modifica" | "/(protected)/corsi/[id]/prompt" | "/(protected)/corsi/[id]/statistiche" | "/(public)/login" | "/(public)/password-dimenticata" | "/(protected)/profilo" | "/(protected)/prompt" | "/(protected)/(professore)/studenti" | "/(protected)/(professore)/studenti/aggiungi" | "/(protected)/(professore)/studenti/[id]" | "/(protected)/supporto" | "/(protected)/supporto/gestione";
		RouteParams(): {
			"/api/consegne-esame/[fileId]": { fileId: string };
			"/api/corsi/[id]": { id: string };
			"/api/esercitazioni/[id]": { id: string };
			"/api/esercitazioni/[id]/immagini": { id: string };
			"/api/esercitazioni/[id]/immagini/[imageId]": { id: string; imageId: string };
			"/api/membri/[id]": { id: string };
			"/api/risultati/[id]": { id: string };
			"/api/sessioni-correzione/[id]": { id: string };
			"/api/sessioni-correzione/[id]/job": { id: string };
			"/api/storage/[...key]": { key: string };
			"/api/supporto/[id]": { id: string };
			"/api/tentativi-correzione/[id]": { id: string };
			"/api/utenti/[id]": { id: string };
			"/(protected)/corsi/[id]": { id: string };
			"/(protected)/corsi/[id]/esercitazioni": { id: string };
			"/(protected)/corsi/[id]/esercitazioni/aggiungi": { id: string };
			"/(protected)/corsi/[id]/esercitazioni/[activityId]": { id: string; activityId: string };
			"/(protected)/corsi/[id]/esercitazioni/[activityId]/correzione": { id: string; activityId: string };
			"/(protected)/corsi/[id]/esercitazioni/[activityId]/modifica": { id: string; activityId: string };
			"/(protected)/corsi/[id]/modifica": { id: string };
			"/(protected)/corsi/[id]/prompt": { id: string };
			"/(protected)/corsi/[id]/statistiche": { id: string };
			"/(protected)/(professore)/studenti/[id]": { id: string }
		};
		LayoutParams(): {
			"/(public)": Record<string, never>;
			"/(protected)/(professore)": { id?: string | undefined };
			"/(protected)": { id?: string | undefined; activityId?: string | undefined };
			"/": { fileId?: string | undefined; id?: string | undefined; imageId?: string | undefined; key?: string | undefined; activityId?: string | undefined };
			"/api": { fileId?: string | undefined; id?: string | undefined; imageId?: string | undefined; key?: string | undefined };
			"/api/consegne-esame": { fileId?: string | undefined };
			"/api/consegne-esame/[fileId]": { fileId: string };
			"/api/corsi": { id?: string | undefined };
			"/api/corsi/import": Record<string, never>;
			"/api/corsi/[id]": { id: string };
			"/api/esercitazioni": { id?: string | undefined; imageId?: string | undefined };
			"/api/esercitazioni/[id]": { id: string; imageId?: string | undefined };
			"/api/esercitazioni/[id]/immagini": { id: string; imageId?: string | undefined };
			"/api/esercitazioni/[id]/immagini/[imageId]": { id: string; imageId: string };
			"/api/feedback-correzione": Record<string, never>;
			"/api/feedback-correzione/statistiche": Record<string, never>;
			"/api/membri": { id?: string | undefined };
			"/api/membri/[id]": { id: string };
			"/api/prompt-template": Record<string, never>;
			"/api/risultati": { id?: string | undefined };
			"/api/risultati/[id]": { id: string };
			"/api/sessioni-correzione": { id?: string | undefined };
			"/api/sessioni-correzione/[id]": { id: string };
			"/api/sessioni-correzione/[id]/job": { id: string };
			"/api/storage": { key?: string | undefined };
			"/api/storage/[...key]": { key: string };
			"/api/supporto": { id?: string | undefined };
			"/api/supporto/[id]": { id: string };
			"/api/tentativi-correzione": { id?: string | undefined };
			"/api/tentativi-correzione/[id]": { id: string };
			"/api/utenti": { id?: string | undefined };
			"/api/utenti/[id]": { id: string };
			"/auth": Record<string, never>;
			"/auth/verifica-password": Record<string, never>;
			"/(protected)/corsi": { id?: string | undefined; activityId?: string | undefined };
			"/(protected)/corsi/aggiungi": Record<string, never>;
			"/(protected)/corsi/[id]": { id: string; activityId?: string | undefined };
			"/(protected)/corsi/[id]/esercitazioni": { id: string; activityId?: string | undefined };
			"/(protected)/corsi/[id]/esercitazioni/aggiungi": { id: string };
			"/(protected)/corsi/[id]/esercitazioni/[activityId]": { id: string; activityId: string };
			"/(protected)/corsi/[id]/esercitazioni/[activityId]/correzione": { id: string; activityId: string };
			"/(protected)/corsi/[id]/esercitazioni/[activityId]/modifica": { id: string; activityId: string };
			"/(protected)/corsi/[id]/modifica": { id: string };
			"/(protected)/corsi/[id]/prompt": { id: string };
			"/(protected)/corsi/[id]/statistiche": { id: string };
			"/(public)/login": Record<string, never>;
			"/(public)/password-dimenticata": Record<string, never>;
			"/(protected)/profilo": Record<string, never>;
			"/(protected)/prompt": Record<string, never>;
			"/(protected)/(professore)/studenti": { id?: string | undefined };
			"/(protected)/(professore)/studenti/aggiungi": Record<string, never>;
			"/(protected)/(professore)/studenti/[id]": { id: string };
			"/(protected)/supporto": Record<string, never>;
			"/(protected)/supporto/gestione": Record<string, never>
		};
		Pathname(): "/" | "/api/consegne-esame" | `/api/consegne-esame/${string}` & {} | "/api/corsi" | "/api/corsi/import" | `/api/corsi/${string}` & {} | "/api/esercitazioni" | `/api/esercitazioni/${string}` & {} | `/api/esercitazioni/${string}/immagini` & {} | `/api/esercitazioni/${string}/immagini/${string}` & {} | "/api/feedback-correzione" | "/api/feedback-correzione/statistiche" | "/api/membri" | `/api/membri/${string}` & {} | "/api/prompt-template" | "/api/risultati" | `/api/risultati/${string}` & {} | "/api/sessioni-correzione" | `/api/sessioni-correzione/${string}` & {} | `/api/sessioni-correzione/${string}/job` & {} | `/api/storage/${string}` & {} | "/api/supporto" | `/api/supporto/${string}` & {} | "/api/tentativi-correzione" | `/api/tentativi-correzione/${string}` & {} | "/api/utenti" | `/api/utenti/${string}` & {} | "/auth/verifica-password" | "/corsi" | "/corsi/aggiungi" | `/corsi/${string}` & {} | `/corsi/${string}/esercitazioni` & {} | `/corsi/${string}/esercitazioni/aggiungi` & {} | `/corsi/${string}/esercitazioni/${string}` & {} | `/corsi/${string}/esercitazioni/${string}/correzione` & {} | `/corsi/${string}/esercitazioni/${string}/modifica` & {} | `/corsi/${string}/modifica` & {} | `/corsi/${string}/prompt` & {} | `/corsi/${string}/statistiche` & {} | "/login" | "/password-dimenticata" | "/profilo" | "/prompt" | "/studenti" | "/studenti/aggiungi" | `/studenti/${string}` & {} | "/supporto" | "/supporto/gestione";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/images/favicon.ico" | "/images/polito_logo_desktop.svg" | "/images/polito_logo_desktop_bianco.png" | "/robots.txt" | string & {};
	}
}