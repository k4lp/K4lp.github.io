import { deepClone, deepFreeze } from '../utils/deep-utils.js';
import { eventBus, Events } from '../core/event-bus.js';

const DEFAULT_CHAR_LIMIT = 50;

class ExcelRuntimeStoreClass {
  constructor() {
    this._listeners = new Set();
    this._resetState();
  }

  _resetState() {
    this._state = {
      metadata: null,
      original: null, // { bufferBase64, sheets: { name: SheetData } }
      working: null,  // { [sheetName]: SheetData }
      diffIndex: {},
      mutationLog: [],
      version: 0
    };
  }

  _notify(reason) {
    const snapshot = this.getPublicState();
    eventBus.emit(Events.EXCEL_ATTACHMENT_UPDATED, { reason, state: snapshot });
    this._listeners.forEach((listener) => {
      try {
        listener(snapshot, reason);
      } catch (error) {
        console.error('[ExcelRuntimeStore] Listener error', error);
      }
    });
  }

  /**
   * Normalize plain sheet payload into internal structure.
   */
  _createSheetData(sheetName, sheetPayload) {
    const headers = Array.isArray(sheetPayload.headers)
      ? sheetPayload.headers.map((header, index) => header || `column_${index + 1}`)
      : [];
    const rows = Array.isArray(sheetPayload.rows) ? sheetPayload.rows : [];
    const cellRows = rows.map((rowArray = []) => {
      return headers.map((_, colIndex) => this._createCell(rowArray[colIndex]));
    });

    return {
      name: sheetName,
      headers,
      rows: cellRows,
      rowCount: cellRows.length,
      columnCount: headers.length,
      uuid: crypto.randomUUID?.() || `${sheetName}-${Date.now()}`
    };
  }

  _createCell(value) {
    return {
      value: value ?? null,
      originalValue: value ?? null
    };
  }

  _createInitialDiffIndex(sheets) {
    const index = {};
    Object.keys(sheets).forEach((sheetName) => {
      index[sheetName] = { changedCells: 0, addedRows: 0, deletedRows: 0 };
    });
    return index;
  }

  _updateDiffIndex(sheetName) {
    if (!this._state.original || !this._state.original.sheets || !this._state.working) {
      return;
    }
    const originalSheet = this._state.original.sheets[sheetName];
    const workingSheet = this._state.working[sheetName];
    if (!originalSheet || !workingSheet) return;

    const maxRows = Math.max(originalSheet.rowCount, workingSheet.rowCount);
    const maxCols = Math.max(originalSheet.columnCount, workingSheet.columnCount);

    let changedCells = 0;
    for (let r = 0; r < maxRows; r += 1) {
      for (let c = 0; c < maxCols; c += 1) {
        const originalCell = originalSheet.rows[r]?.[c];
        const workingCell = workingSheet.rows[r]?.[c];
        const originalValue = originalCell ? originalCell.originalValue : null;
        const workingValue = workingCell ? workingCell.value : null;
        if (originalValue !== workingValue) {
          changedCells += 1;
        }
      }
    }

    const addedRows = Math.max(workingSheet.rowCount - originalSheet.rowCount, 0);
    const deletedRows = Math.max(originalSheet.rowCount - workingSheet.rowCount, 0);

    this._state.diffIndex[sheetName] = { changedCells, addedRows, deletedRows };
  }

  _sheetToPlain(sheetData) {
    return {
      headers: [...sheetData.headers],
      rows: sheetData.rows.map((row) => row.map((cell) => cell.value))
    };
  }

  _emitImport(metadata, normalizedSheets) {
    eventBus.emit(Events.EXCEL_ATTACHMENT_IMPORTED, {
      metadata,
      sheetCount: metadata.sheetOrder.length,
      firstSheet: metadata.sheetOrder[0] || null
    });
  }

  /**
   * Public API
   */
  setWorkbook({ metadata, sheets, bufferBase64 }) {
    if (!sheets || Object.keys(sheets).length === 0) {
      throw new Error('Cannot set workbook without sheets.');
    }

    const normalizedSheets = {};
    Object.entries(sheets).forEach(([sheetName, payload]) => {
      normalizedSheets[sheetName] = this._createSheetData(sheetName, payload);
    });

    const frozenOriginal = deepFreeze({
      bufferBase64: bufferBase64 || null,
      sheets: deepClone(normalizedSheets)
    });

    this._state.metadata = {
      ...metadata,
      sheetOrder: Object.keys(sheets),
      totals: {
        sheets: Object.keys(sheets).length,
        rows: Object.values(normalizedSheets).reduce((sum, sheet) => sum + sheet.rowCount, 0)
      }
    };
    this._state.original = frozenOriginal;
    this._state.working = deepClone(normalizedSheets);
    this._state.diffIndex = this._createInitialDiffIndex(normalizedSheets);
    this._state.mutationLog = [];
    this._state.version = 0;

    console.log('[ExcelRuntimeStore] Workbook imported:', {
      name: metadata?.name,
      sheets: Object.keys(sheets).length
    });

    this._emitImport(this._state.metadata, normalizedSheets);
    this._notify('import');
  }

  clearWorkbook() {
    this._resetState();
    console.log('[ExcelRuntimeStore] Workbook cleared from memory');
    this._notify('remove');
  }

  hasWorkbook() {
    return !!this._state.metadata;
  }

  getMetadata() {
    return this._state.metadata ? { ...this._state.metadata } : null;
  }

  getOriginalBuffer() {
    return this._state.original?.bufferBase64 || null;
  }

  getOriginalSheets() {
    if (!this._state.original?.sheets) return null;
    const plain = {};
    Object.entries(this._state.original.sheets).forEach(([name, sheet]) => {
      plain[name] = this._sheetToPlain(sheet);
    });
    return plain;
  }

  getOriginal() {
    return this.getOriginalSheets();
  }

  getWorkingCopy() {
    if (!this._state.working) return null;
    const plain = {};
    Object.entries(this._state.working).forEach(([name, sheet]) => {
      plain[name] = this._sheetToPlain(sheet);
    });
    return plain;
  }

  getSheetNames() {
    if (this._state.metadata?.sheetOrder?.length) {
      return [...this._state.metadata.sheetOrder];
    }
    return this._state.working ? Object.keys(this._state.working) : [];
  }

  getSheetSummary(sheetName) {
    const sheet = this._state.working?.[sheetName];
    if (!sheet) return null;
    const diff = this._state.diffIndex[sheetName] || { changedCells: 0, addedRows: 0, deletedRows: 0 };
    return {
      name: sheetName,
      rowCount: sheet.rowCount,
      columnCount: sheet.columnCount,
      headers: [...sheet.headers],
      diff
    };
  }

  getSheetSnapshot(sheetName) {
    const sheet = this._state.working?.[sheetName];
    return sheet ? deepClone(sheet) : null;
  }

  getDiffIndex() {
    return deepClone(this._state.diffIndex);
  }

  getMutationLog() {
    return [...this._state.mutationLog];
  }

  mutateSheet(sheetName, mutator) {
    if (!this._state.working) {
      throw new Error('No workbook loaded.');
    }

    if (!this._state.working[sheetName]) {
      throw new Error(`Sheet "${sheetName}" not found.`);
    }

    const draft = deepClone(this._state.working[sheetName]);
    const result = mutator(draft);
    this._state.working[sheetName] = result === undefined ? draft : result;
    this._state.working[sheetName].rowCount = this._state.working[sheetName].rows.length;
    this._state.working[sheetName].columnCount = this._state.working[sheetName].headers.length;

    this._state.version += 1;
    this._updateDiffIndex(sheetName);
    this._state.mutationLog.push({
      sheet: sheetName,
      action: 'update',
      timestamp: new Date().toISOString(),
      version: this._state.version
    });
    console.log('[ExcelRuntimeStore] Sheet mutated:', sheetName, 'version', this._state.version);

    this._notify('update');
  }

  resetWorkingCopy() {
    if (!this._state.original) {
      this._state.working = null;
      console.warn('[ExcelRuntimeStore] resetWorkingCopy() called without original data');
      return;
    }

    this._state.working = deepClone(this._state.original.sheets);
    this._state.diffIndex = this._createInitialDiffIndex(this._state.working);
    this._state.version += 1;
    this._state.mutationLog.push({
      action: 'reset',
      timestamp: new Date().toISOString(),
      version: this._state.version
    });
    console.log('[ExcelRuntimeStore] Working copy reset to original snapshot');

    this._notify('reset');
  }

  snapshotWorking() {
    return this._state.working ? deepClone(this._state.working) : null;
  }

  restoreWorking(snapshot) {
    this._state.working = snapshot ? deepClone(snapshot) : null;
    if (this._state.working) {
      Object.keys(this._state.working).forEach((sheetName) => this._updateDiffIndex(sheetName));
    }
    console.log('[ExcelRuntimeStore] Working copy restored from snapshot');
    this._notify('restore');
  }

  getPublicState() {
    return {
      metadata: this.getMetadata(),
      diffIndex: this.getDiffIndex(),
      mutationLog: this.getMutationLog(),
      version: this._state.version
    };
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this._listeners.add(listener);
    }
    return () => this.unsubscribe(listener);
  }

  unsubscribe(listener) {
    if (listener) {
      this._listeners.delete(listener);
    }
  }
}

export const ExcelRuntimeStore = new ExcelRuntimeStoreClass();
export const ATTACHMENT_DEFAULT_CHAR_LIMIT = DEFAULT_CHAR_LIMIT;
