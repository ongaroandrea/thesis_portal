import { get } from 'svelte/store';
import { _, locale } from 'svelte-i18n';

function localeCode() {
	return get(locale) === 'en' ? 'en-GB' : 'it-IT';
}

// API error codes with their own localized message. The server's `message`
// is English developer text, so it is never shown to users directly.
const API_ERROR_KEYS = {
	UNAUTHORIZED: 'api.error.unauthorized',
	VALIDATION_ERROR: 'api.error.validation',
	INVALID_JSON: 'api.error.validation',
	INVALID_AVAILABILITY: 'api.error.invalidAvailability',
	EXAM_DEADLINE_REQUIRED: 'api.error.examDeadlineRequired',
	IMAGE_TOO_LARGE: 'api.error.imageTooLarge',
	INVALID_IMAGE: 'api.error.invalidImage',
	INVALID_EXAM_FILE: 'api.error.invalidImage',
	DUPLICATE_EXAM_VIEW: 'exam.duplicateView',
	EXAM_NOT_OPEN: 'api.error.examNotOpen',
	EXAM_NOT_AVAILABLE: 'api.error.examNotOpen',
	ACTIVITY_NOT_AVAILABLE: 'api.error.activityNotAvailable',
	CORRECTION_FOCUS_NOT_ALLOWED: 'api.error.focusNotAllowed',
	SELF_DELETE_DENIED: 'api.error.selfDelete',
	RESOURCE_ALREADY_EXISTS: 'api.error.alreadyExists',
	CONCURRENT_WRITE_CONFLICT: 'api.error.conflict',
	CONVERSATION_QUEUE_FULL: 'api.error.queueFull',
	CONVERSATION_SERVICE_UNAVAILABLE: 'api.error.analysisUnavailable',
	CONVERSATION_SERVICE_ERROR: 'api.error.analysisUnavailable',
	PROMPT_TEMPLATE_MISSING: 'api.error.promptMissing'
};

function apiErrorMessage(code, status) {
	const t = get(_);
	if (code && API_ERROR_KEYS[code]) return t(API_ERROR_KEYS[code]);
	if (status === 401) return t('api.error.unauthorized');
	if (status === 403) return t('api.error.forbidden');
	if (status === 404) return t('api.error.notFound');
	if (status === 409) return t('api.error.conflict');
	if (status === 413) return t('api.error.tooLarge');
	if (status === 415) return t('api.error.unsupportedType');
	if (status >= 500) return t('api.error.server');
	if (status >= 400) return t('api.error.validation');
	return t('api.requestFailed');
}

/**
 * fetch wrapper for the portal's JSON API. Sets the JSON content type
 * unless the body is FormData, unwraps `{ data }`, and throws an Error
 * carrying a localized message plus `code`, `status` and the server's
 * original `detail` from `{ error }` responses.
 */
export async function apiRequest(url, options = {}) {
	const response = await fetch(url, {
		...options,
		headers: {
			...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
			...options.headers
		}
	});
	const payload = await response.json().catch(() => ({}));
	if (!response.ok) {
		const error = new Error(apiErrorMessage(payload?.error?.code, response.status));
		error.code = payload?.error?.code;
		error.status = response.status;
		error.detail = payload?.error?.message;
		throw error;
	}
	return payload.data;
}

/** Fetch every page of a paginated endpoint (100 items per request). */
export async function apiListRequest(url, options = {}) {
	const result = [];
	let page = 1;
	let totalPages = 1;
	do {
		const separator = url.includes('?') ? '&' : '?';
		const pageData = await apiRequest(`${url}${separator}page=${page}&pageSize=100`, options);
		if (!pageData || !Array.isArray(pageData.items)) {
			throw new Error(get(_)('api.error.invalidList'));
		}
		result.push(...pageData.items);
		totalPages = pageData.totalPages;
		page += 1;
	} while (page <= totalPages);
	return result;
}

export function formatDateTime(value) {
	if (!value) return get(_)('common.notDefined');
	return new Intl.DateTimeFormat(localeCode(), {
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(new Date(value));
}

export function formatDate(value) {
	if (!value) return get(_)('common.notDefined');
	return new Intl.DateTimeFormat(localeCode(), {
		dateStyle: 'medium'
	}).format(new Date(value));
}

export function toDateTimeLocal(value) {
	if (!value) return '';
	const date = new Date(value);
	const offset = date.getTimezoneOffset() * 60000;
	return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function toDateInput(value) {
	if (!value) return '';
	const date = new Date(value);
	const offset = date.getTimezoneOffset() * 60000;
	return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
