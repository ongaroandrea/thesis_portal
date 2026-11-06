/** UI languages available in `src/lib/i18n.js`; the first is the default. */
export const LANGUAGES = ['it', 'en'];
export const DEFAULT_LANGUAGE = LANGUAGES[0];

/** Name of the cookie that carries the chosen language to the server. */
export const LANGUAGE_COOKIE = 'language';

/**
 * Normalise a stored language value, falling back to the default for
 * anything missing or unknown.
 * @param {string | null | undefined} value
 * @returns {'it' | 'en'}
 */
export function languageFromCookie(value) {
	return LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE;
}
