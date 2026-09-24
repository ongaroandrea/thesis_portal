//#region src/lib/utils/text.js
function normalizeNameForStorage(value) {
	return String(value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("it-IT").replace(/(^|[\s'-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("it-IT"));
}
function formatNameForDisplay(value) {
	return normalizeNameForStorage(value);
}
//#endregion
export { normalizeNameForStorage as n, formatNameForDisplay as t };
