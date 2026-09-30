import { get } from 'svelte/store';
import { _, locale } from 'svelte-i18n';

function localeCode() {
	return get(locale) === 'en' ? 'en-GB' : 'it-IT';
}

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
		const error = new Error(payload?.error?.message ?? get(_)('api.requestFailed'));
		error.code = payload?.error?.code;
		error.status = response.status;
		throw error;
	}
	return payload.data;
}

export async function apiListRequest(url, options = {}) {
	const result = [];
	let page = 1;
	let totalPages = 1;
	do {
		const separator = url.includes('?') ? '&' : '?';
		const pageData = await apiRequest(`${url}${separator}page=${page}&pageSize=100`, options);
		if (!pageData || !Array.isArray(pageData.items)) {
			throw new Error('La risposta della lista non contiene dati di paginazione validi.');
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
