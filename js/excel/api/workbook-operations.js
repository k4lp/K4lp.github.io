import { ExcelRuntimeStore } from '../core/excel-store.js';
import { SheetOperations } from './sheet-operations.js';
import { SheetNotFoundError } from '../errors/excel-errors.js';

function resolveSheetName(identifier) {
  const names = ExcelRuntimeStore.getSheetNames();
  if (typeof identifier === 'number') {
    if (identifier < 0 || identifier >= names.length) {
      throw new SheetNotFoundError(`[index ${identifier}]`, names);
    }
    return names[identifier];
  }
  if (!names.includes(identifier)) {
    throw new SheetNotFoundError(identifier, names);
  }
  return identifier;
}

/**
 * Workbook-level operations class
 * Provides methods for working with the entire workbook
 */
export class WorkbookOperations {
  constructor() {
    // No state needed
  }

  /**
   * Get list of all sheet names
   */
  getSheetNames() {
    return ExcelRuntimeStore.getSheetNames();
  }

  /**
   * Get a sheet handle by name or index
   */
  getSheetByName(identifier) {
    const sheetName = resolveSheetName(identifier);
    return new SheetOperations(sheetName);
  }

  /**
   * Get summary of all sheets
   */
  summary() {
    const summaryData = {};
    ExcelRuntimeStore.getSheetNames().forEach((name) => {
      summaryData[name] = ExcelRuntimeStore.getSheetSummary(name);
    });
    return summaryData;
  }
}
