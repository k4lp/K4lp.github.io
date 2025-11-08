# Excel Attachment Guide

## Overview
- Attachments live entirely in-memory via `ExcelRuntimeStore`.
- Original workbook snapshot is immutable; working copy tracks diffs.
- Use the helper API (`attachments.helper`) for all interactions.

## Quick Start
```js
attachments.helper.ensureWorkbook();
const sheetNames = attachments.helper.getSheetNames();
const sheet = attachments.helper.selectSheet(sheetNames[0]);
const summary = sheet.summary();
const preview = sheet.sliceRows({ offset: 0, limit: 5 });
```

## Helper API Reference
- `attachments.helper.listSheets({ includeStats })`
- `attachments.helper.getSheetNames()`
- `attachments.helper.getSheet(nameOrIndex)` / `selectSheet`
- `sheet.summary()` → `{ rowCount, columnCount, headers, diff }`
- `sheet.getRowData({ rowIndex, startColumn = 0, endColumn, charLimit = 50 })`
- `sheet.getRange({ startCell, endCell, charLimit = 50 })`
- `sheet.sliceRows({ offset = 0, limit = 10, charLimit = 50 })`
- Mutations:
  - `sheet.updateCell({ rowIndex, columnIndex, value })`
  - `sheet.appendRows(rowsArray)`
  - `sheet.deleteRows({ start, count })`
  - `sheet.replaceSheet({ headers, rows })`
- `sheet.diff()` → `{ changedCells, addedRows, deletedRows }`

## Best Practices
1. **Check summaries first** to understand scale.
2. **Limit outputs**: default char limit 50; avoid dumping entire sheets.
3. **Plan mutations**: document intent, execute, verify via `sheet.summary()`, log diff.
4. **Use Vault for large data** instead of printing raw rows.
5. **Reset responsibly**: confirm diff counts before calling `attachments.resetWorkingCopy()`.

## Error Handling
- Helper throws descriptive errors (out-of-bounds row/column, oversize requests).
- All operations are logged via `ExcelRuntimeStore` + tool activity log.
