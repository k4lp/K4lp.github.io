/**
 * EXCEL ERROR CLASSES
 *
 * Provides helpful error messages with suggestions and example code
 * to guide LLM when Excel operations fail.
 */

/**
 * Base Excel error class with suggestion and example code support
 */
export class ExcelError extends Error {
  constructor(message, { code, suggestion, exampleCode } = {}) {
    super(message);
    this.name = 'ExcelError';
    this.code = code;
    this.suggestion = suggestion;
    this.exampleCode = exampleCode;
  }

  toString() {
    let msg = `${this.name}: ${this.message}`;
    if (this.suggestion) msg += `\n💡 Suggestion: ${this.suggestion}`;
    if (this.exampleCode) msg += `\n📝 Example:\n${this.exampleCode}`;
    return msg;
  }
}

/**
 * Thrown when requesting a sheet that doesn't exist
 */
export class SheetNotFoundError extends ExcelError {
  constructor(sheetName, availableSheets) {
    super(
      `Sheet "${sheetName}" not found.`,
      {
        code: 'SHEET_NOT_FOUND',
        suggestion: `Available sheets: ${availableSheets.join(', ')}. Use attachments.getSheetNames() to list all sheets, or use 0-based index to access sheets.`,
        exampleCode: `const sheets = attachments.getSheetNames();\nconsole.log('Available sheets:', sheets);\nconst sheet = attachments.getSheet(sheets[0]); // Use first sheet\n// Or use index:\nconst sheet = attachments.getSheet(0);`
      }
    );
    this.name = 'SheetNotFoundError';
    this.availableSheets = availableSheets;
  }
}

/**
 * Thrown when trying to create a sheet using updateSheet()
 */
export class CannotCreateSheetError extends ExcelError {
  constructor(sheetName) {
    super(
      `Cannot create sheet "${sheetName}" using updateSheet(). Sheet does not exist.`,
      {
        code: 'CANNOT_CREATE_VIA_UPDATE',
        suggestion: `Use attachments.addSheet() to create new sheets. The updateSheet() method only works with existing sheets.`,
        exampleCode: `// Create a new sheet:\nattachments.addSheet('${sheetName}', {\n  headers: ['Column1', 'Column2'],\n  rows: [['value1', 'value2'], ['value3', 'value4']]\n});\n\n// Then you can update it:\nattachments.updateSheet('${sheetName}', {\n  headers: ['UpdatedCol1', 'UpdatedCol2'],\n  rows: [['new1', 'new2']]\n});`
      }
    );
    this.name = 'CannotCreateSheetError';
  }
}

/**
 * Thrown when updateSheet() receives invalid mutator/data
 */
export class InvalidMutatorError extends ExcelError {
  constructor(received) {
    super(
      `updateSheet() expected a function or data object, got ${typeof received}`,
      {
        code: 'INVALID_MUTATOR',
        suggestion: 'Pass either a data object with { headers, rows } or a mutator function.',
        exampleCode: `// Option 1: Data object (recommended for LLM)\nattachments.updateSheet('Sheet1', {\n  headers: ['A', 'B', 'C'],\n  rows: [['1', '2', '3'], ['4', '5', '6']]\n});\n\n// Option 2: Mutator function (for complex changes)\nattachments.updateSheet('Sheet1', (draft) => {\n  draft.rows[0][0].value = 'Modified';\n  return draft;\n});`
      }
    );
    this.name = 'InvalidMutatorError';
  }
}

/**
 * Thrown when trying to use Excel APIs without a workbook loaded
 */
export class WorkbookNotLoadedError extends ExcelError {
  constructor(operation) {
    super(
      `No workbook loaded. Cannot perform operation: ${operation}`,
      {
        code: 'WORKBOOK_NOT_LOADED',
        suggestion: 'Upload an Excel file first, or check if workbook exists using attachments.hasWorkbook().',
        exampleCode: `// Always check first:\nif (!attachments.hasWorkbook()) {\n  throw new Error('Please upload an Excel file first');\n}\n\n// Then proceed with operations:\nconst sheets = attachments.getSheetNames();`
      }
    );
    this.name = 'WorkbookNotLoadedError';
  }
}

/**
 * Thrown when column index is out of bounds
 */
export class ColumnOutOfBoundsError extends ExcelError {
  constructor(columnIndex, sheetName, maxColumns) {
    super(
      `Column index ${columnIndex} out of bounds for sheet "${sheetName}". Sheet has ${maxColumns} columns (valid indices: 0-${maxColumns - 1}).`,
      {
        code: 'COLUMN_OUT_OF_BOUNDS',
        suggestion: `Check the sheet summary first to see how many columns exist. Column indices are 0-based.`,
        exampleCode: `const sheet = attachments.getSheet('${sheetName}');\nconst summary = sheet.summary();\nconsole.log('Column count:', summary.columnCount);\nconsole.log('Headers:', summary.headers);\n\n// Use valid column index:\nconst columnData = sheet.getColumnData({\n  columnIndex: 0, // Valid: 0 to ${maxColumns - 1}\n  limit: 100\n});`
      }
    );
    this.name = 'ColumnOutOfBoundsError';
  }
}

/**
 * Thrown when row index is out of bounds
 */
export class RowOutOfBoundsError extends ExcelError {
  constructor(rowIndex, sheetName, maxRows) {
    super(
      `Row index ${rowIndex} out of bounds for sheet "${sheetName}". Sheet has ${maxRows} rows (valid indices: 0-${maxRows - 1}).`,
      {
        code: 'ROW_OUT_OF_BOUNDS',
        suggestion: `Check the sheet summary first to see how many rows exist. Row indices are 0-based.`,
        exampleCode: `const sheet = attachments.getSheet('${sheetName}');\nconst summary = sheet.summary();\nconsole.log('Row count:', summary.rowCount);\n\n// Use valid row index:\nconst rowData = sheet.getRowData({\n  rowIndex: 0 // Valid: 0 to ${maxRows - 1}\n});`
      }
    );
    this.name = 'RowOutOfBoundsError';
  }
}

/**
 * Thrown when trying to create a sheet that already exists
 */
export class SheetAlreadyExistsError extends ExcelError {
  constructor(sheetName) {
    super(
      `Sheet "${sheetName}" already exists. Cannot create duplicate sheet.`,
      {
        code: 'SHEET_ALREADY_EXISTS',
        suggestion: `Use attachments.updateSheet() to modify the existing sheet, or choose a different name for the new sheet.`,
        exampleCode: `// Option 1: Update existing sheet\nattachments.updateSheet('${sheetName}', {\n  headers: ['Updated'],\n  rows: [['New data']]\n});\n\n// Option 2: Create sheet with different name\nattachments.addSheet('${sheetName}_v2', {\n  headers: ['Column1'],\n  rows: [['Data']]\n});`
      }
    );
    this.name = 'SheetAlreadyExistsError';
  }
}

/**
 * Thrown when cell range is invalid
 */
export class InvalidRangeError extends ExcelError {
  constructor(startCell, endCell, reason) {
    super(
      `Invalid cell range from "${startCell}" to "${endCell}": ${reason}`,
      {
        code: 'INVALID_RANGE',
        suggestion: 'Use valid Excel cell notation (e.g., "A1" to "C10"). Start cell must come before end cell.',
        exampleCode: `// Valid range examples:\nconst range1 = sheet.getRange({ startCell: 'A1', endCell: 'C10' });\nconst range2 = sheet.getRange({ startCell: 'B5', endCell: 'E20' });\n\n// Invalid:\n// sheet.getRange({ startCell: 'C10', endCell: 'A1' }); // Wrong order`
      }
    );
    this.name = 'InvalidRangeError';
  }
}

/**
 * Thrown when sheet data structure is invalid
 */
export class InvalidSheetDataError extends ExcelError {
  constructor(reason) {
    super(
      `Invalid sheet data structure: ${reason}`,
      {
        code: 'INVALID_SHEET_DATA',
        suggestion: 'Sheet data must have "headers" array and "rows" array. All rows must have same length as headers.',
        exampleCode: `// Valid sheet data structure:\nconst sheetData = {\n  headers: ['Name', 'Age', 'City'],\n  rows: [\n    ['Alice', '30', 'NYC'],\n    ['Bob', '25', 'LA'],\n    ['Charlie', '35', 'SF']\n  ]\n};\n\nattachments.addSheet('NewSheet', sheetData);`
      }
    );
    this.name = 'InvalidSheetDataError';
  }
}

/**
 * Thrown when trying to delete all rows from a sheet
 */
export class CannotDeleteAllRowsError extends ExcelError {
  constructor(sheetName) {
    super(
      `Cannot delete all rows from sheet "${sheetName}". Sheet must have at least headers.`,
      {
        code: 'CANNOT_DELETE_ALL_ROWS',
        suggestion: 'Use sheet.replaceSheet() to create an empty sheet with headers only.',
        exampleCode: `// Create empty sheet with headers:\nsheet.replaceSheet({\n  headers: ['Column1', 'Column2'],\n  rows: [] // Empty rows array\n});`
      }
    );
    this.name = 'CannotDeleteAllRowsError';
  }
}
