import { ExcelRuntimeStore, ATTACHMENT_DEFAULT_CHAR_LIMIT } from '../core/excel-store.js';
import {
  WorkbookNotLoadedError,
  SheetNotFoundError,
  ColumnOutOfBoundsError,
  RowOutOfBoundsError,
  InvalidRangeError
} from '../errors/excel-errors.js';

const MAX_ROWS_PER_READ = 200;
const MAX_COLUMNS_PER_READ = 50;

function clampChar(value, charLimit = ATTACHMENT_DEFAULT_CHAR_LIMIT) {
  if (value === null || value === undefined) return null;
  const str = String(value);
  return str.length > charLimit ? `${str.slice(0, charLimit)}…` : str;
}

function columnLabelToIndex(label) {
  let result = 0;
  const upper = label.toUpperCase();
  for (let i = 0; i < upper.length; i += 1) {
    result = result * 26 + (upper.charCodeAt(i) - 64);
  }
  return result - 1;
}

function parseCellRef(ref) {
  const match = /^([A-Za-z]+)(\d+)$/.exec(ref);
  if (!match) {
    throw new InvalidRangeError(ref, 'unknown', 'Invalid cell reference format. Use format like "A1", "B5", or "C10".');
  }
  const [, colLetters, rowDigits] = match;
  return {
    rowIndex: parseInt(rowDigits, 10) - 1,
    columnIndex: columnLabelToIndex(colLetters)
  };
}

function clampIndexes({ rowIndex, columnIndex }, sheet) {
  return {
    rowIndex: Math.max(0, Math.min(rowIndex, sheet.rowCount - 1)),
    columnIndex: Math.max(0, Math.min(columnIndex, sheet.columnCount - 1))
  };
}

function ensureWorkbook() {
  if (!ExcelRuntimeStore.hasWorkbook()) {
    throw new WorkbookNotLoadedError('attachments helper');
  }
}

function readSheetSnapshot(sheetName) {
  ensureWorkbook();
  const snapshot = ExcelRuntimeStore.getSheetSnapshot(sheetName);
  if (!snapshot) {
    throw new SheetNotFoundError(sheetName, ExcelRuntimeStore.getSheetNames());
  }
  return snapshot;
}

function mutateSheet(sheetName, mutator) {
  ensureWorkbook();
  ExcelRuntimeStore.mutateSheet(sheetName, mutator);
}

function buildRowPreview(row, startColumn, endColumn, charLimit) {
  const slice = row.slice(startColumn, endColumn + 1).map((cell) => clampChar(cell?.value, charLimit));
  return slice;
}

/**
 * Sheet-level operations class
 * Provides methods for reading and modifying individual sheets
 */
export class SheetOperations {
  constructor(sheetName) {
    this.sheetName = sheetName;
  }

  /**
   * Get sheet summary with metadata
   */
  summary() {
    return ExcelRuntimeStore.getSheetSummary(this.sheetName);
  }

  /**
   * Get single row data as array
   */
  getRowData({ rowIndex, startColumn = 0, endColumn, charLimit = ATTACHMENT_DEFAULT_CHAR_LIMIT }) {
    const sheet = readSheetSnapshot(this.sheetName);
    if (rowIndex < 0 || rowIndex >= sheet.rowCount) {
      throw new RowOutOfBoundsError(rowIndex, this.sheetName, sheet.rowCount);
    }
    const finalEnd = endColumn !== undefined ? Math.min(endColumn, sheet.columnCount - 1) : sheet.columnCount - 1;
    return buildRowPreview(sheet.rows[rowIndex], startColumn, finalEnd, charLimit);
  }

  /**
   * Get cell range
   */
  getRange({ startCell, endCell, charLimit = ATTACHMENT_DEFAULT_CHAR_LIMIT }) {
    const sheet = readSheetSnapshot(this.sheetName);
    const start = clampIndexes(parseCellRef(startCell), sheet);
    const end = clampIndexes(parseCellRef(endCell), sheet);
    const rowStart = Math.min(start.rowIndex, end.rowIndex);
    const rowEnd = Math.min(rowStart + MAX_ROWS_PER_READ, Math.max(start.rowIndex, end.rowIndex));
    const colStart = Math.min(start.columnIndex, end.columnIndex);
    const colEnd = Math.min(colStart + MAX_COLUMNS_PER_READ, Math.max(start.columnIndex, end.columnIndex));
    const rows = [];
    for (let r = rowStart; r <= rowEnd; r += 1) {
      rows.push(buildRowPreview(sheet.rows[r] || [], colStart, colEnd, charLimit));
    }
    return rows;
  }

  /**
   * Get rows as 2D array (slice)
   */
  sliceRows({ offset = 0, limit = 10, charLimit = ATTACHMENT_DEFAULT_CHAR_LIMIT }) {
    const cappedLimit = Math.min(limit, MAX_ROWS_PER_READ);
    const sheet = readSheetSnapshot(this.sheetName);
    const rows = [];
    for (let r = offset; r < Math.min(sheet.rowCount, offset + cappedLimit); r += 1) {
      rows.push(buildRowPreview(sheet.rows[r] || [], 0, Math.min(sheet.columnCount - 1, MAX_COLUMNS_PER_READ), charLimit));
    }
    return rows;
  }

  /**
   * Get column data as array
   */
  getColumnData({ columnIndex, offset = 0, limit = MAX_ROWS_PER_READ, charLimit = ATTACHMENT_DEFAULT_CHAR_LIMIT }) {
    const sheet = readSheetSnapshot(this.sheetName);
    if (columnIndex < 0 || columnIndex >= sheet.columnCount) {
      throw new ColumnOutOfBoundsError(columnIndex, this.sheetName, sheet.columnCount);
    }
    const cappedLimit = Math.min(limit, MAX_ROWS_PER_READ);
    const result = [];
    for (let r = offset; r < Math.min(sheet.rowCount, offset + cappedLimit); r += 1) {
      result.push(clampChar(sheet.rows[r]?.[columnIndex]?.value, charLimit));
    }
    return result;
  }

  /**
   * Get rows as objects with header keys
   */
  getRowsAsObjects({ offset = 0, limit = 10, charLimit = ATTACHMENT_DEFAULT_CHAR_LIMIT }) {
    const sheet = readSheetSnapshot(this.sheetName);
    const cappedLimit = Math.min(limit, MAX_ROWS_PER_READ);
    const result = [];
    for (let r = offset; r < Math.min(sheet.rowCount, offset + cappedLimit); r += 1) {
      const obj = {};
      sheet.headers.forEach((header, colIdx) => {
        obj[header] = clampChar(sheet.rows[r]?.[colIdx]?.value, charLimit);
      });
      result.push(obj);
    }
    return result;
  }

  /**
   * Update single cell
   */
  updateCell({ rowIndex, columnIndex, value }) {
    mutateSheet(this.sheetName, (draft) => {
      while (draft.headers.length <= columnIndex) {
        draft.headers.push(`column_${draft.headers.length + 1}`);
      }
      if (!draft.rows[rowIndex]) {
        draft.rows[rowIndex] = draft.headers.map(() => ({ value: null, originalValue: null }));
      }
      while (draft.rows[rowIndex].length < draft.headers.length) {
        draft.rows[rowIndex].push({ value: null, originalValue: null });
      }
      draft.rows[rowIndex][columnIndex].value = value;
      draft.rows[rowIndex][columnIndex].lastEditedAt = new Date().toISOString();
      draft.rowCount = draft.rows.length;
      draft.columnCount = draft.headers.length;
      return draft;
    });
  }

  /**
   * Append rows to sheet
   */
  appendRows(rows) {
    mutateSheet(this.sheetName, (draft) => {
      let maxColumns = draft.headers.length;
      rows.forEach((rowArray = []) => {
        if (rowArray.length > maxColumns) {
          maxColumns = rowArray.length;
        }
      });
      while (draft.headers.length < maxColumns) {
        draft.headers.push(`column_${draft.headers.length + 1}`);
      }
      rows.forEach((rowArray = []) => {
        const newRow = draft.headers.map((_, colIndex) => ({
          value: rowArray[colIndex] ?? null,
          originalValue: null,
          lastEditedAt: new Date().toISOString()
        }));
        draft.rows.push(newRow);
      });
      draft.rowCount = draft.rows.length;
      draft.columnCount = draft.headers.length;
      return draft;
    });
  }

  /**
   * Delete rows from sheet
   */
  deleteRows({ start, count }) {
    mutateSheet(this.sheetName, (draft) => {
      draft.rows.splice(start, count);
      draft.rowCount = draft.rows.length;
      return draft;
    });
  }

  /**
   * Replace entire sheet content
   */
  replaceSheet({ headers, rows }) {
    mutateSheet(this.sheetName, () => {
      const newHeaders = headers && headers.length ? headers : ['column_1'];
      const normalizedRows = rows.map((rowArray = []) => newHeaders.map((_, idx) => ({
        value: rowArray[idx] ?? null,
        originalValue: null,
        lastEditedAt: new Date().toISOString()
      })));
      return {
        name: this.sheetName,
        headers: newHeaders,
        rows: normalizedRows,
        rowCount: normalizedRows.length,
        columnCount: newHeaders.length,
        uuid: crypto.randomUUID?.() || `${this.sheetName}-${Date.now()}`
      };
    });
  }

  /**
   * Get diff information for this sheet
   */
  diff() {
    const diffIndex = ExcelRuntimeStore.getDiffIndex();
    return diffIndex[this.sheetName] || { changedCells: 0, addedRows: 0, deletedRows: 0 };
  }

  /**
   * Getter for sheet name
   */
  get name() {
    return this.sheetName;
  }
}
