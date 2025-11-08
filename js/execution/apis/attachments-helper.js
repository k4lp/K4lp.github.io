import { ExcelRuntimeStore, ATTACHMENT_DEFAULT_CHAR_LIMIT } from '../../state/excel-runtime-store.js';

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
    throw new Error(`Invalid cell reference: ${ref}`);
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
    throw new Error('No workbook attached. Upload a workbook before using attachments helper.');
  }
}

function resolveSheetName(identifier) {
  const names = ExcelRuntimeStore.getSheetNames();
  if (typeof identifier === 'number') {
    if (identifier < 0 || identifier >= names.length) {
      throw new Error(`Sheet index ${identifier} out of bounds.`);
    }
    return names[identifier];
  }
  if (!names.includes(identifier)) {
    throw new Error(`Sheet "${identifier}" not found. Available: ${names.join(', ')}`);
  }
  return identifier;
}

function readSheetSnapshot(sheetName) {
  ensureWorkbook();
  const snapshot = ExcelRuntimeStore.getSheetSnapshot(sheetName);
  if (!snapshot) {
    throw new Error(`Sheet "${sheetName}" not available in working copy.`);
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

function buildSheetHandle(sheetName) {
  return {
    name: sheetName,
    summary: () => ExcelRuntimeStore.getSheetSummary(sheetName),
    getRowData: ({ rowIndex, startColumn = 0, endColumn, charLimit = ATTACHMENT_DEFAULT_CHAR_LIMIT }) => {
      const sheet = readSheetSnapshot(sheetName);
      if (rowIndex < 0 || rowIndex >= sheet.rowCount) {
        throw new Error(`Row ${rowIndex} out of bounds for sheet ${sheetName}.`);
      }
      const finalEnd = endColumn !== undefined ? Math.min(endColumn, sheet.columnCount - 1) : sheet.columnCount - 1;
      return buildRowPreview(sheet.rows[rowIndex], startColumn, finalEnd, charLimit);
    },
    getRange: ({ startCell, endCell, charLimit = ATTACHMENT_DEFAULT_CHAR_LIMIT }) => {
      const sheet = readSheetSnapshot(sheetName);
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
    },
    sliceRows: ({ offset = 0, limit = 10, charLimit = ATTACHMENT_DEFAULT_CHAR_LIMIT }) => {
      const cappedLimit = Math.min(limit, MAX_ROWS_PER_READ);
      const sheet = readSheetSnapshot(sheetName);
      const rows = [];
      for (let r = offset; r < Math.min(sheet.rowCount, offset + cappedLimit); r += 1) {
        rows.push(buildRowPreview(sheet.rows[r] || [], 0, Math.min(sheet.columnCount - 1, MAX_COLUMNS_PER_READ), charLimit));
      }
      return rows;
    },
    updateCell: ({ rowIndex, columnIndex, value }) => {
      mutateSheet(sheetName, (draft) => {
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
    },
    appendRows: (rows) => {
      mutateSheet(sheetName, (draft) => {
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
    },
    deleteRows: ({ start, count }) => {
      mutateSheet(sheetName, (draft) => {
        draft.rows.splice(start, count);
        draft.rowCount = draft.rows.length;
        return draft;
      });
    },
    replaceSheet: ({ headers, rows }) => {
      mutateSheet(sheetName, () => {
        const newHeaders = headers && headers.length ? headers : ['column_1'];
        const normalizedRows = rows.map((rowArray = []) => newHeaders.map((_, idx) => ({
          value: rowArray[idx] ?? null,
          originalValue: null,
          lastEditedAt: new Date().toISOString()
        })));
        return {
          name: sheetName,
          headers: newHeaders,
          rows: normalizedRows,
          rowCount: normalizedRows.length,
          columnCount: newHeaders.length,
          uuid: crypto.randomUUID?.() || `${sheetName}-${Date.now()}`
        };
      });
    },
    diff: () => {
      const diffIndex = ExcelRuntimeStore.getDiffIndex();
      return diffIndex[sheetName] || { changedCells: 0, addedRows: 0, deletedRows: 0 };
    }
  };
}

export function createAttachmentsHelper(store = ExcelRuntimeStore) {
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
    selectSheet: (identifier) => {
      ensureWorkbook();
      const sheetName = resolveSheetName(identifier);
      return buildSheetHandle(sheetName);
    },
    getSummary: () => {
      ensureWorkbook();
      return store.getMetadata();
    }
  };
}
