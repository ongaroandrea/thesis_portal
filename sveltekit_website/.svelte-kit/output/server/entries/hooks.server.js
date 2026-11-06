import { i as svelteKitHandler, n as auth } from "../chunks/auth.js";
import { sequence } from "@sveltejs/kit/hooks";
import * as Sentry from "@sentry/sveltekit";
// src/hooks.server.js
async function authenticationHandle({ event, resolve }) {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (session && !session.user?.banned) {
		event.locals.user = session.user;
		event.locals.session = session.session;
	} else {
		event.locals.user = null;
		event.locals.session = null;
	}
	return svelteKitHandler({
		event,
		resolve,
		auth
	});
}
var handle = sequence(Sentry.sentryHandle(), authenticationHandle);
export { handle };
