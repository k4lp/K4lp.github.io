/**
 * Excel Module - Public API
 *
 * Centralized exports for the Excel attachment system
 */

// Core
export { ExcelRuntimeStore, ATTACHMENT_DEFAULT_CHAR_LIMIT } from './core/excel-store.js';
export { parseWorkbook } from './core/excel-parser.js';
export { buildWorkbookBlob, downloadWorkbook } from './core/excel-exporter.js';

// API
export { SheetOperations } from './api/sheet-operations.js';
export { WorkbookOperations } from './api/workbook-operations.js';
export { createAttachmentsHelper } from './api/excel-helpers.js';

// Validation
export { BoundsValidator } from './validation/bounds-validator.js';
export { DataValidator } from './validation/data-validator.js';

// Errors
export {
  ExcelError,
  SheetNotFoundError,
  SheetAlreadyExistsError,
  CannotCreateSheetError,
  WorkbookNotLoadedError,
  ColumnOutOfBoundsError,
  RowOutOfBoundsError,
  InvalidMutatorError,
  InvalidRangeError,
  InvalidSheetDataError,
  CannotDeleteAllRowsError
} from './errors/excel-errors.js';
