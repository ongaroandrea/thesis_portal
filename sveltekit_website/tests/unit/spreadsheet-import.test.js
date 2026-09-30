import { describe, expect, it } from 'vitest';
import { spreadsheetRows } from '../../src/lib/client/spreadsheet-import.js';

describe('spreadsheetRows', () => {
	it('keeps the legacy row-array response', () => {
		const rows = [['email'], ['student@polito.it']];
		expect(spreadsheetRows(rows)).toEqual(rows);
	});

	it('extracts the first worksheet from read-excel-file v9 responses', () => {
		const rows = [['Table 1'], ['email'], ['student@polito.it']];
		expect(spreadsheetRows([{ sheet: 'Sheet 1', data: rows }])).toEqual(rows);
	});

	it('returns an empty row set for malformed parser responses', () => {
		expect(spreadsheetRows(null)).toEqual([]);
		expect(spreadsheetRows([{ sheet: 'Sheet 1' }])).toEqual([]);
	});
});
