import { languageFromCookie } from '$lib/language.js';

/**
 * Pass the UI language chosen in the language switcher (stored in the
 * `language` cookie) to the root layout, so pages are rendered on the server
 * in that language instead of always in Italian and then switched in the
 * browser.
 */
export const load = ({ cookies }) => ({
	language: languageFromCookie(cookies.get('language'))
});
