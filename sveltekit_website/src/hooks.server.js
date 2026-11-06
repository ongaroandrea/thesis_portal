import { sequence } from '@sveltejs/kit/hooks';
import * as Sentry from '@sentry/sveltekit';
import { auth } from '$lib/server/auth/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { LANGUAGE_COOKIE, languageFromCookie } from '$lib/language.js';

/**
 * Runs on every request: loads the Better Auth session from the cookies and
 * exposes it as `locals.user` / `locals.session` (null when logged out or
 * banned). `svelteKitHandler` then serves Better Auth's own `/api/auth/*`
 * endpoints and passes everything else to SvelteKit.
 */
async function authenticationHandle({ event, resolve }) {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session && !session.user?.banned) {
		event.locals.user = session.user;
		event.locals.session = session.session;
	} else {
		event.locals.user = null;
		event.locals.session = null;
	}

	return svelteKitHandler({ event, resolve, auth });
}

/**
 * Set `<html lang>` (hard-coded to "it" in app.html) to the language chosen
 * in the language switcher, so screen readers and the browser get it right
 * from the first byte.
 */
function languageHandle({ event, resolve }) {
	const language = languageFromCookie(event.cookies.get(LANGUAGE_COOKIE));
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('<html lang="it">', `<html lang="${language}">`)
	});
}

export const handle = sequence(Sentry.sentryHandle(), languageHandle, authenticationHandle);
