import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';

// Better Auth error codes the portal can produce, mapped to localized copy.
// The server message is Italian-only (see AUTH_ERROR_TRANSLATE in auth.js),
// so the client picks the text from the code in the user's language.
const AUTH_ERROR_KEYS = {
	INVALID_EMAIL_OR_PASSWORD: 'auth.errors.invalidCredentials',
	INCORRECT_PASSWORD: 'auth.errors.invalidCredentials',
	USER_NOT_FOUND: 'auth.errors.invalidCredentials',
	INVALID_EMAIL: 'auth.errors.invalidEmail',
	INVALID_PASSWORD: 'auth.errors.invalidPassword',
	PASSWORD_TOO_SHORT: 'password.minLengthError',
	PASSWORD_COMPROMISED: 'auth.errors.passwordCompromised',
	EMAIL_NOT_VERIFIED: 'auth.errors.emailNotVerified',
	ACCOUNT_NOT_VERIFIED: 'auth.errors.emailNotVerified',
	BANNED_USER: 'auth.errors.banned',
	TOO_MANY_REQUESTS: 'auth.errors.tooManyRequests',
	INVALID_TOKEN: 'auth.errors.invalidToken',
	TOKEN_EXPIRED: 'auth.errors.invalidToken',
	SESSION_EXPIRED: 'auth.errors.sessionExpired'
};

/**
 * Turn a Better Auth error (or a bare code from an `?error=` redirect) into a
 * message in the current locale. Unknown errors fall back to `fallbackKey`.
 */
export function authErrorMessage(error, fallbackKey = 'auth.errors.unknown') {
	const t = get(_);
	const code = typeof error === 'string' ? error : error?.code;
	const status = typeof error === 'object' ? error?.status : undefined;
	const key = AUTH_ERROR_KEYS[String(code ?? '').toUpperCase()] ?? (status === 429 ? 'auth.errors.tooManyRequests' : fallbackKey);
	return t(key);
}
