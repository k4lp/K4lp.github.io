# Excel Attachment API - Complete Reference

**ALWAYS AVAILABLE** - This reference is injected into every reasoning context.

## Quick Start

```javascript
// Check if workbook exists
if (!attachments.hasWorkbook()) {
  throw new Error('Upload an Excel file first');
}

// Get sheet names
const sheets = attachments.getSheetNames(); // ['Sheet1', 'Sheet2']

// Get a sheet (by name or 0-based index)
const sheet = attachments.getSheet('Sheet1'); // or attachments.getSheet(0)

// ALWAYS check dimensions first
const summary = sheet.summary();
console.log(`${summary.rowCount} rows × ${summary.columnCount} columns`);
```

## Core Concepts

1. **Original is Frozen** - `attachments.getOriginal()` returns read-only snapshot
2. **Working Copy is Mutable** - All operations modify working copy
3. **All Changes Tracked** - Use `sheet.diff()` to see modifications
4. **Character Limiting** - Default 50 chars/cell to avoid context overflow

## Complete API Reference

### Workbook Level

#### `attachments.hasWorkbook()` → boolean
Check if workbook is loaded.

#### `attachments.getSheetNames()` → string[]
Get all sheet names in workbook order.

```javascript
const sheets = attachments.getSheetNames();
// Returns: ['Sheet1', 'Data', 'Summary']
```

#### `attachments.getSheet(identifier)` → SheetHandle
Get sheet by name (string) or index (number).

```javascript
const sheet1 = attachments.getSheet('Sheet1');  // by name
const sheet2 = attachments.getSheet(0);          // by index (0-based)
```

#### `attachments.addSheet(name, options)` → summary
Create a new sheet.

```javascript
attachments.addSheet('NewSheet', {
  headers: ['Name', 'Age', 'City'],
  rows: [
    ['Alice', '30', 'NYC'],
    ['Bob', '25', 'LA']
  ]
});
```

#### `attachments.updateSheet(name, dataOrMutator)` → void
Update entire sheet with data object OR mutator function.

```javascript
// Option 1: Data object (RECOMMENDED for LLM)
attachments.updateSheet('Sheet1', {
  headers: ['Col1', 'Col2', 'Col3'],
  rows: [['A', 'B', 'C'], ['D', 'E', 'F']]
});

// Option 2: Mutator function (for complex changes)
attachments.updateSheet('Sheet1', (draft) => {
  draft.rows[0][0].value = 'Modified';
  draft.headers.push('NewColumn');
  return draft;
});
```

#### `attachments.getMetadata()` → object
Get workbook metadata.

```javascript
const meta = attachments.getMetadata();
// Returns: { name, sizeBytes, importedAt, sheetNames, totals: { sheets, rows } }
```

#### `attachments.getWorkingCopy()` → object
Get entire working copy as plain object.

```javascript
const working = attachments.getWorkingCopy();
// Returns: { Sheet1: { headers: [...], rows: [...] }, Sheet2: {...} }
```

#### `attachments.getDiffIndex()` → object
Get diff summary for all sheets.

```javascript
const diffs = attachments.getDiffIndex();
// Returns: { Sheet1: { changedCells: 5, addedRows: 2, deletedRows: 0 }, ... }
```

### Sheet Level - Reading Data

All sheet methods below are called on a sheet handle from `attachments.getSheet()`.

#### `sheet.summary()` → object
**ALWAYS CALL THIS FIRST** to check dimensions.

```javascript
const summary = sheet.summary();
// Returns: {
//   name: 'Sheet1',
//   rowCount: 100,
//   columnCount: 5,
//   headers: ['Name', 'Age', 'City', 'State', 'Zip'],
//   diff: { changedCells: 0, addedRows: 0, deletedRows: 0 }
// }
```

#### `sheet.sliceRows(options)` → array[]
Get rows as 2D array.

```javascript
const rows = sheet.sliceRows({
  offset: 0,      // Start row (0-based)
  limit: 10,      // Max rows to get
  charLimit: 50   // Max chars per cell (default: 50)
});
// Returns: [['val1', 'val2'], ['val3', 'val4'], ...]
```

#### `sheet.getRowsAsObjects(options)` → object[]
Get rows as objects with header keys.

```javascript
const data = sheet.getRowsAsObjects({
  offset: 0,
  limit: 10,
  charLimit: 50
});
// Returns: [
//   { Name: 'Alice', Age: '30', City: 'NYC' },
//   { Name: 'Bob', Age: '25', City: 'LA' }
// ]
```

#### `sheet.getRowData(options)` → array
Get single row as array.

```javascript
const row = sheet.getRowData({
  rowIndex: 5,
  startColumn: 0,    // Optional: start column
  endColumn: 3,      // Optional: end column
  charLimit: 50
});
// Returns: ['val1', 'val2', 'val3', 'val4']
```

#### `sheet.getColumnData(options)` → array
Get entire column as array.

```javascript
const column = sheet.getColumnData({
  columnIndex: 2,   // 0-based column index
  offset: 0,        // Start row
  limit: 100,       // Max rows
  charLimit: 50
});
// Returns: ['NYC', 'LA', 'SF', 'Chicago', ...]
```

#### `sheet.getRange(options)` → array[]
Get cell range as 2D array.

```javascript
const range = sheet.getRange({
  startCell: 'A1',
  endCell: 'C10',
  charLimit: 50
});
// Returns: [['A1', 'B1', 'C1'], ['A2', 'B2', 'C2'], ...]
```

#### `sheet.diff()` → object
Get modification summary for this sheet.

```javascript
const diff = sheet.diff();
// Returns: { changedCells: 5, addedRows: 2, deletedRows: 1 }
```

### Sheet Level - Modifying Data

#### `sheet.updateCell(options)` → void
Update single cell value.

```javascript
sheet.updateCell({
  rowIndex: 0,
  columnIndex: 2,
  value: 'NewValue'
});
```

#### `sheet.appendRows(rows)` → void
Append rows to end of sheet.

```javascript
sheet.appendRows([
  ['Alice', '30', 'NYC'],
  ['Bob', '25', 'LA'],
  ['Charlie', '35', 'SF']
]);
```

#### `sheet.deleteRows(options)` → void
Delete rows from sheet.

```javascript
sheet.deleteRows({
  start: 5,    // Start index (0-based)
  count: 3     // Number of rows to delete
});
```

#### `sheet.replaceSheet(data)` → void
Replace entire sheet content.

```javascript
sheet.replaceSheet({
  headers: ['Name', 'Value'],
  rows: [['Item1', '100'], ['Item2', '200']]
});
```

## Common Patterns

### Pattern 1: Extract Column and Find Unique Values

```javascript
const sheet = attachments.getSheet('Data');
const summary = sheet.summary();

// Find MPN column
const mpnColIndex = summary.headers.findIndex(h =>
  h.toLowerCase().includes('mpn')
);

if (mpnColIndex === -1) {
  throw new Error('MPN column not found');
}

// Extract all MPNs
const allMpns = sheet.getColumnData({
  columnIndex: mpnColIndex,
  offset: 0,
  limit: summary.rowCount
});

// Get unique, non-empty values
const uniqueMpns = [...new Set(allMpns.filter(v => v && v.trim()))];

// Store result (don't print to reasoning!)
vault.set('unique_mpns', uniqueMpns);
console.log(`Found ${uniqueMpns.length} unique MPNs`);
```

### Pattern 2: Scan Sheet for Matching Rows

```javascript
const sheet = attachments.getSheet(0);
const summary = sheet.summary();
const matches = [];
const batchSize = 100;

// Process in batches to avoid context overflow
for (let offset = 0; offset < summary.rowCount; offset += batchSize) {
  const batch = sheet.getRowsAsObjects({
    offset,
    limit: Math.min(batchSize, summary.rowCount - offset)
  });

  batch.forEach((row, idx) => {
    if (row.Status === 'Pending' && parseFloat(row.Amount) > 1000) {
      matches.push({ rowIndex: offset + idx, data: row });
    }
  });
}

vault.set('matches', matches);
console.log(`Found ${matches.length} matching rows`);
```

### Pattern 3: Create Summary Sheet

```javascript
// Get data from source sheet
const source = attachments.getSheet('Orders');
const data = source.getRowsAsObjects({ offset: 0, limit: 1000 });

// Aggregate data
const summary = data.reduce((acc, row) => {
  const category = row.Category;
  if (!acc[category]) acc[category] = { count: 0, total: 0 };
  acc[category].count += 1;
  acc[category].total += parseFloat(row.Amount) || 0;
  return acc;
}, {});

// Create new sheet with summary
const summaryRows = Object.entries(summary).map(([cat, stats]) => [
  cat,
  stats.count.toString(),
  stats.total.toFixed(2)
]);

attachments.addSheet('Summary', {
  headers: ['Category', 'Count', 'Total'],
  rows: summaryRows
});

console.log('Created summary sheet with', summaryRows.length, 'categories');
```

### Pattern 4: Update Cells Based on Condition

```javascript
const sheet = attachments.getSheet('Data');
const summary = sheet.summary();

// Get all data
const data = sheet.getRowsAsObjects({
  offset: 0,
  limit: summary.rowCount
});

// Find rows to update
const updates = [];
data.forEach((row, idx) => {
  if (parseFloat(row.Price) < 10) {
    updates.push(idx);
  }
});

// Apply updates (update cells individually)
const priceColIndex = summary.headers.indexOf('Price');
updates.forEach(rowIndex => {
  sheet.updateCell({
    rowIndex,
    columnIndex: priceColIndex,
    value: '10.00'
  });
});

console.log(`Updated ${updates.length} rows`);
```

## CRITICAL RULES

1. **ALWAYS call `sheet.summary()` first** to check rowCount/columnCount
2. **NEVER dump entire sheets** - Use offset/limit to get small batches (max 200 rows)
3. **Use charLimit parameter** to prevent context overflow (default: 50, max: 200)
4. **Store large data in Vault** - Don't print to reasoning block
5. **All parameters are objects** - Use `{ paramName: value }` format
6. **Check diff after changes** - Use `sheet.diff()` to verify mutations
7. **0-based indexing** - Rows and columns start at 0
8. **Handle errors** - Sheet/column/row may not exist

## Error Messages

If you get an error, it will include:
- 💡 **Suggestion**: What to do instead
- 📝 **Example**: Code showing correct usage

Common errors:
- `SheetNotFoundError` → Lists available sheets
- `ColumnOutOfBoundsError` → Shows valid column range
- `RowOutOfBoundsError` → Shows valid row range
- `WorkbookNotLoadedError` → Reminds to upload file first

## Performance Tips

1. **Batch operations**: Process 100-200 rows at a time
2. **Minimize reads**: Cache summary data
3. **Use appropriate charLimit**: Only increase if needed
4. **Prefer getRowsAsObjects**: Easier to work with than 2D arrays
5. **Store in Vault**: Use `vault.set()` for large result sets
