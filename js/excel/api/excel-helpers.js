import { ExcelRuntimeStore } from '../core/excel-store.js';
import { SheetOperations } from './sheet-operations.js';
import { WorkbookOperations } from './workbook-operations.js';
import { WorkbookNotLoadedError, SheetNotFoundError } from '../errors/excel-errors.js';

function ensureWorkbook() {
  if (!ExcelRuntimeStore.hasWorkbook()) {
    throw new WorkbookNotLoadedError('attachments helper');
  }
}

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
 * Create attachments helper API
 * Main facade for Excel attachment operations
 *
 * @param {Object} store - Excel runtime store instance (defaults to singleton)
 * @returns {Object} Attachments API object
 */
export function createAttachmentsHelper(store = ExcelRuntimeStore) {
  const selectSheetHandle = (identifier) => {
    ensureWorkbook();
    const sheetName = resolveSheetName(identifier);
    return new SheetOperations(sheetName);
  };

  const workbook = new WorkbookOperations();

  return {
    hasWorkbook: () => store.hasWorkbook(),
    ensureWorkbook,

    listSheets: ({ includeStats = false } = {}) => {
      ensureWorkbook();
      const names = store.getSheetNames();
      if (!includeStats) {
        return names.map((name, index) => ({ name, index }));
      }
      return names.map((name, index) => ({
        name,
        index,
        summary: store.getSheetSummary(name)
      }));
    },

    getSheetNames: () => {
      ensureWorkbook();
      return store.getSheetNames();
    },

    selectSheet: (identifier) => selectSheetHandle(identifier),
    getSheet: (identifier) => selectSheetHandle(identifier),

    getWorkbook: () => {
      ensureWorkbook();
      return workbook;
    },

    getWorkingCopy: () => {
      ensureWorkbook();
      return store.getWorkingCopy();
    },

    getWorkbookSummary: () => {
      ensureWorkbook();
      const summaries = {};
      store.getSheetNames().forEach((name) => {
        summaries[name] = store.getSheetSummary(name);
      });
      return summaries;
    },

    getSummary: () => {
      ensureWorkbook();
      return store.getMetadata();
    }
  };
}
