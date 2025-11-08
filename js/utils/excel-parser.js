import { deepClone } from './deep-utils.js';

/**
 * Parse an Excel/CSV ArrayBuffer into JSON-friendly structures.
 * Relies on the global SheetJS `XLSX` object (loaded via CDN).
 */
export function parseWorkbook(arrayBuffer, { fileName = 'workbook.xlsx', sizeBytes = 0, sourceType = 'upload' } = {}) {
  if (typeof XLSX === 'undefined') {
    throw new Error('SheetJS (XLSX) library not loaded.');
  }

  const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
    type: 'array',
    cellDates: true,
    cellNF: false,
    cellText: false
  });

  const metadata = {
    name: fileName,
    sizeBytes: sizeBytes || arrayBuffer.byteLength,
    importedAt: new Date().toISOString(),
    sheetNames: deepClone(workbook.SheetNames),
    sourceType
  };

  const sheets = {};

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rowsArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, blankrows: false });

    const headers = rowsArray[0] ? rowsArray[0].map((header, idx) => header || `column_${idx + 1}`) : [];
    const rows = rowsArray.slice(1).map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index] ?? null;
      });
      return record;
    });

    sheets[sheetName] = {
      headers,
      rows
    };
  });

  return { metadata, sheets };
}

