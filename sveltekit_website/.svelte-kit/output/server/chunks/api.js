//#region src/lib/client/api.js
async function apiRequest(url, options = {}) {
	const response = await fetch(url, {
		...options,
		headers: {
			...options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {},
			...options.headers
		}
	});
	const payload = await response.json().catch(() => ({}));
	if (!response.ok) {
		const error = new Error(payload?.error?.message ?? "La richiesta non è andata a buon fine.");
		error.code = payload?.error?.code;
		error.status = response.status;
		throw error;
	}
	return payload.data;
}
async function apiListRequest(url, options = {}) {
	const result = [];
	let page = 1;
	let totalPages = 1;
	do {
		const pageData = await apiRequest(`${url}${url.includes("?") ? "&" : "?"}page=${page}&pageSize=100`, options);
		if (!pageData || !Array.isArray(pageData.items)) throw new Error("La risposta della lista non contiene dati di paginazione validi.");
		result.push(...pageData.items);
		totalPages = pageData.totalPages;
		page += 1;
	} while (page <= totalPages);
	return result;
}
function formatDateTime(value) {
	if (!value) return "Non definita";
	return new Intl.DateTimeFormat("it-IT", {
		dateStyle: "medium",
		timeStyle: "short"
	}).format(new Date(value));
}
function formatDate(value) {
	if (!value) return "Non definita";
	return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(new Date(value));
}
function toDateTimeLocal(value) {
	if (!value) return "";
	const date = new Date(value);
	const offset = date.getTimezoneOffset() * 6e4;
	return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
function toDateInput(value) {
	if (!value) return "";
	const date = new Date(value);
	const offset = date.getTimezoneOffset() * 6e4;
	return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
//#endregion
export { toDateInput as a, formatDateTime as i, apiRequest as n, toDateTimeLocal as o, formatDate as r, apiListRequest as t };
