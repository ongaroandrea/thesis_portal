export function normalizeNameForStorage(value) {
	return String(value ?? '')
		.trim()
		.replace(/\s+/g, ' ')
		.toLocaleLowerCase('it-IT')
		.replace(/(^|[\s'-])\p{L}/gu, (letter) => letter.toLocaleUpperCase('it-IT'));
}

export function formatNameForDisplay(value) {
	return normalizeNameForStorage(value);
}
