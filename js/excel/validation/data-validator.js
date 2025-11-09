import { InvalidSheetDataError } from '../errors/excel-errors.js';

/**
 * Validates Excel sheet data structures
 */
export class DataValidator {
  /**
   * Validate sheet data structure
   * @throws {InvalidSheetDataError} if data structure is invalid
   */
  static validateSheetData(sheetData) {
    if (!sheetData || typeof sheetData !== 'object') {
      throw new InvalidSheetDataError('Sheet data must be an object');
    }

    if (!Array.isArray(sheetData.headers)) {
      throw new InvalidSheetDataError('Sheet data must have "headers" array');
    }

    if (!Array.isArray(sheetData.rows)) {
      throw new InvalidSheetDataError('Sheet data must have "rows" array');
    }

    // Validate all rows have correct length
    const headerCount = sheetData.headers.length;
    sheetData.rows.forEach((row, idx) => {
      if (!Array.isArray(row)) {
        throw new InvalidSheetDataError(`Row ${idx} must be an array`);
      }
      if (row.length !== headerCount) {
        throw new InvalidSheetDataError(
          `Row ${idx} has ${row.length} columns, but headers specify ${headerCount} columns. All rows must match header count.`
        );
      }
    });

    return true;
  }

  /**
   * Validate workbook structure
   * @throws {InvalidSheetDataError} if workbook structure is invalid
   */
  static validateWorkbookData(workbookData) {
    if (!workbookData || typeof workbookData !== 'object') {
      throw new InvalidSheetDataError('Workbook data must be an object');
    }

    const sheets = Object.keys(workbookData);
    if (sheets.length === 0) {
      throw new InvalidSheetDataError('Workbook must contain at least one sheet');
    }

    // Validate each sheet
    sheets.forEach((sheetName) => {
      try {
        this.validateSheetData(workbookData[sheetName]);
      } catch (error) {
        throw new InvalidSheetDataError(`Sheet "${sheetName}": ${error.message}`);
      }
    });

    return true;
  }

  /**
   * Validate header names
   * @throws {InvalidSheetDataError} if headers are invalid
   */
  static validateHeaders(headers) {
    if (!Array.isArray(headers)) {
      throw new InvalidSheetDataError('Headers must be an array');
    }

    if (headers.length === 0) {
      throw new InvalidSheetDataError('Headers array cannot be empty');
    }

    // Check for duplicate headers
    const seen = new Set();
    headers.forEach((header, idx) => {
      if (seen.has(header)) {
        throw new InvalidSheetDataError(
          `Duplicate header "${header}" at index ${idx}. Headers must be unique.`
        );
      }
      seen.add(header);
    });

    return true;
  }

  /**
   * Normalize and validate row data
   * Ensures all rows have same length as headers
   */
  static normalizeRowData(rows, headerCount) {
    return rows.map((row, idx) => {
      if (!Array.isArray(row)) {
        throw new InvalidSheetDataError(`Row ${idx} must be an array`);
      }

      // Pad or trim row to match header count
      const normalized = [];
      for (let i = 0; i < headerCount; i += 1) {
        normalized.push(row[i] ?? null);
      }
      return normalized;
    });
  }
}
