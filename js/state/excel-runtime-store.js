/**
 * COMPATIBILITY SHIM
 * This file has been moved to js/excel/core/excel-store.js
 *
 * This shim prevents 404 errors during deployment and gradual migration.
 * Re-exports everything from the new location.
 *
 * @deprecated Use js/excel/core/excel-store.js directly
 */

export { ExcelRuntimeStore, ATTACHMENT_DEFAULT_CHAR_LIMIT } from '../excel/core/excel-store.js';
