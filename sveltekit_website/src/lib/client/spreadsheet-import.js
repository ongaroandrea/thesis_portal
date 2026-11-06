/**
 * Normalize a parsed spreadsheet into a plain array of rows.
 *
 * The parser returns either a single sheet as `row[]` (each row an array)
 * or a workbook as `[{ name, data: row[] }, ...]`; in the workbook case only
 * the first sheet that has data is used.
 *
 * @param {unknown} parsedWorkbook - Parser output.
 * @returns {Array<Array<unknown>>} Rows of the first sheet, or `[]`.
 */
export function spreadsheetRows(parsedWorkbook) {
	if (!Array.isArray(parsedWorkbook)) return [];
	if (parsedWorkbook.every((row) => Array.isArray(row))) return parsedWorkbook;
	const firstSheet = parsedWorkbook.find((sheet) => Array.isArray(sheet?.data));
	return firstSheet?.data ?? [];
}
