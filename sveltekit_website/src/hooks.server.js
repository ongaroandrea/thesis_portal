import { sequence } from '@sveltejs/kit/hooks';
import * as Sentry from '@sentry/sveltekit';
import { auth } from '$lib/server/auth/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';

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

export const handle = sequence(Sentry.sentryHandle(), authenticationHandle);
