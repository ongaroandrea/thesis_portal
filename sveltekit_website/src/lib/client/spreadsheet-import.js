export function spreadsheetRows(parsedWorkbook) {
	if (!Array.isArray(parsedWorkbook)) return [];
	if (parsedWorkbook.every((row) => Array.isArray(row))) return parsedWorkbook;
	const firstSheet = parsedWorkbook.find((sheet) => Array.isArray(sheet?.data));
	return firstSheet?.data ?? [];
}
