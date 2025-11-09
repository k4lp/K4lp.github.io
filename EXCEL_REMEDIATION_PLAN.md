# Excel Attachment System - Comprehensive Remediation Plan

**Date:** 2025-11-09
**Status:** Draft - Awaiting Approval
**Goal:** Fix all Excel API issues, improve modularity, and create clear LLM instructions

---

## Executive Summary

After analyzing the reasoning logs (32 failed iterations) and codebase, I've identified **critical API design flaws** that caused the LLM to fail repeatedly:

1. **Missing Core Functions**: `getColumnData()`, `addSheet()`, sheet creation
2. **API Signature Confusion**: Inconsistent parameter styles (positional vs object)
3. **Misleading Documentation**: Prompt examples don't match actual implementation
4. **Poor Mutator Design**: `updateSheet()` requires a function but unclear what it should return
5. **Incomplete Error Messages**: Errors don't guide the LLM to correct usage

**Impact**: The LLM wasted 32 iterations trying to extract MPNs because basic APIs were missing or broken.

---

## Critical Issues from Reasoning Log Analysis

### Issue 1: Missing `getColumnData()` Function
**Evidence**: Iteration #13-#15
```javascript
// LLM tried this (FAILED):
const columnData = await sheet.getColumnData(colIndex);

// Error: getColumnData is not a function
```

**Root Cause**: Function doesn't exist despite being a basic operation.

**Impact**: Cannot extract column data, forcing inefficient row-by-row iteration.

---

### Issue 2: Wrong API Signatures in Prompts
**Evidence**: app-config.js:52 vs attachments-helper.js:83

**Prompt says**:
```javascript
sheet.getRowData(rowIndex, startColumn, endColumn)
```

**Actual signature**:
```javascript
sheet.getRowData({ rowIndex, startColumn, endColumn, charLimit })
```

**Impact**: Every API call fails on first attempt, wasting iterations.

---

### Issue 3: `sliceRows()` Signature Confusion
**Evidence**: Iteration #19-#20

**LLM tried** (reasonable assumption from `Array.slice`):
```javascript
sheet.sliceRows(0, 5)  // Start, end
sheet.sliceRows(1, 5)  // Start, count
```

**Actual signature**:
```javascript
sheet.sliceRows({ offset: 0, limit: 5 })
```

**Root Cause**: Method name suggests array semantics but uses different pattern.

---

### Issue 4: `updateSheet()` Mutator Confusion
**Evidence**: Iterations #26-#31

**LLM tried** (reasonable based on typical APIs):
```javascript
// Direct data replacement
attachments.updateSheet('Sheet1', newSheetData);

// Array of rows
attachments.updateSheet('Sheet1', [['MPN'], ['ABC123']]);
```

**What it actually needs**:
```javascript
attachments.updateSheet('Sheet1', (draft) => {
  draft.rows = newRows;
  return draft;
});
```

**Root Cause**:
- No documentation on mutator pattern
- Error "mutator is not a function" doesn't explain what IS needed
- No examples in prompt

---

### Issue 5: No Way to Create New Sheets
**Evidence**: Iterations #28-#44

**LLM tried**:
- `attachments.addSheet()` - doesn't exist
- `attachments.helper.addSheet()` - doesn't exist
- `attachments.updateSheet('NewSheet', data)` - fails "Sheet not found"
- `workingCopy.addSheet()` - doesn't exist

**Root Cause**: System only supports updating existing sheets, not creating new ones.

**Impact**: User explicitly requested "add another sheet" but it's impossible.

---

### Issue 6: `summary()` Returns Different Shapes
**Evidence**:

**At sheet level**:
```javascript
sheet.summary() → { name, rowCount, columnCount, headers, diff }
```

**At workbook level**:
```javascript
workbook.summary() → { [sheetName]: { rowCount, ... } }
```

**Issue**: Same method name, different return shapes. Confusing.

---

### Issue 7: `totalRows` vs `rowCount` Inconsistency
**Evidence**: Iteration #18

```javascript
summary.totalRows  // Used in some places
summary.rowCount   // Used in other places
summary.rows       // Also exists?
```

**Root Cause**: Inconsistent naming across the API surface.

---

### Issue 8: Missing Helper for JSON Export
**Evidence**: LLM had to manually map headers to row data

**Missing**:
```javascript
// Should exist but doesn't:
sheet.getRowsAsObjects({ offset: 0, limit: 10 })
// Returns: [{ header1: value1, header2: value2 }, ...]
```

**Impact**: Makes data extraction verbose and error-prone.

---

## Root Cause Analysis

### 1. **API Design Philosophy Issues**
- Mixing paradigms: Object params + positional params
- Inconsistent naming: `rowCount` vs `totalRows`
- Method names misleading: `sliceRows` doesn't work like `Array.slice`

### 2. **Documentation-Reality Gap**
- Prompt examples don't match code
- No examples of mutator pattern
- Missing error recovery guidance

### 3. **Incomplete Feature Set**
- Column operations missing
- Sheet creation missing
- Data transformation helpers missing

### 4. **Poor Error Messages**
- "Sheet not found" doesn't explain can't create new sheets
- "mutator is not a function" doesn't explain what's needed
- "headers is not iterable" doesn't guide to solution

---

## Remediation Strategy

### Phase 1: API Fixes (Critical Path)
**Goal**: Make existing APIs work correctly and consistently

#### 1.1: Fix `attachments-helper.js`
**File**: `js/execution/apis/attachments-helper.js`

**Changes**:
1. **Add `getColumnData()`**:
```javascript
getColumnData: ({ columnIndex, offset = 0, limit = MAX_ROWS_PER_READ, charLimit = ATTACHMENT_DEFAULT_CHAR_LIMIT }) => {
  const sheet = readSheetSnapshot(sheetName);
  if (columnIndex < 0 || columnIndex >= sheet.columnCount) {
    throw new Error(`Column ${columnIndex} out of bounds for sheet ${sheetName}.`);
  }
  const cappedLimit = Math.min(limit, MAX_ROWS_PER_READ);
  const result = [];
  for (let r = offset; r < Math.min(sheet.rowCount, offset + cappedLimit); r += 1) {
    result.push(clampChar(sheet.rows[r]?.[columnIndex]?.value, charLimit));
  }
  return result;
},
```

2. **Add `getRowsAsObjects()`**:
```javascript
getRowsAsObjects: ({ offset = 0, limit = 10, charLimit = ATTACHMENT_DEFAULT_CHAR_LIMIT }) => {
  const sheet = readSheetSnapshot(sheetName);
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
},
```

3. **Rename confusing methods**:
```javascript
// Keep sliceRows for backward compat, but add clearer alias:
getRows: ({ offset = 0, limit = 10, charLimit = ATTACHMENT_DEFAULT_CHAR_LIMIT }) => {
  // Same implementation as sliceRows
},
```

4. **Fix `getRowData` to return object**:
```javascript
getRowData: ({ rowIndex, charLimit = ATTACHMENT_DEFAULT_CHAR_LIMIT }) => {
  const sheet = readSheetSnapshot(sheetName);
  if (rowIndex < 0 || rowIndex >= sheet.rowCount) {
    throw new Error(`Row ${rowIndex} out of bounds for sheet ${sheetName}.`);
  }
  const obj = {};
  sheet.headers.forEach((header, colIdx) => {
    obj[header] = clampChar(sheet.rows[rowIndex]?.[colIdx]?.value, charLimit);
  });
  return obj;
},

// Add separate method for array format:
getRowDataArray: ({ rowIndex, startColumn = 0, endColumn, charLimit = ATTACHMENT_DEFAULT_CHAR_LIMIT }) => {
  // Existing implementation
},
```

#### 1.2: Add Sheet Creation Support
**File**: `js/state/excel-runtime-store.js`

**Add method**:
```javascript
addSheet(sheetName, { headers = ['column_1'], rows = [] } = {}) {
  if (!this._state.working) {
    throw new Error('No workbook loaded.');
  }

  if (this._state.working[sheetName]) {
    throw new Error(`Sheet "${sheetName}" already exists. Use updateSheet() to modify it.`);
  }

  const newSheet = this._createSheetData(sheetName, { headers, rows });
  this._state.working[sheetName] = newSheet;

  // Update metadata
  if (this._state.metadata?.sheetOrder) {
    this._state.metadata.sheetOrder.push(sheetName);
  }

  this._state.version += 1;
  this._state.diffIndex[sheetName] = { changedCells: 0, addedRows: rows.length, deletedRows: 0 };
  this._state.mutationLog.push({
    sheet: sheetName,
    action: 'create',
    timestamp: new Date().toISOString(),
    version: this._state.version
  });

  console.log('[ExcelRuntimeStore] Sheet created:', sheetName);
  this._notify('create');

  return this.getSheetSummary(sheetName);
}
```

**Expose via helper**:
```javascript
// In attachments-helper.js buildWorkbookFacade():
addSheet: (sheetName, options) => {
  ensureWorkbook();
  return ExcelRuntimeStore.addSheet(sheetName, options);
},
```

#### 1.3: Improve `updateSheet()` API
**File**: `js/execution/execution-context-api.js`

**Add overload to accept data directly**:
```javascript
updateSheet: (sheetName, dataOrMutator) => {
  if (typeof dataOrMutator === 'function') {
    // Original mutator pattern
    ExcelRuntimeStore.mutateSheet(sheetName, dataOrMutator);
  } else {
    // Direct data replacement (easier for LLM)
    ExcelRuntimeStore.mutateSheet(sheetName, (draft) => {
      const { headers, rows } = dataOrMutator;
      if (headers) draft.headers = headers;
      if (rows) {
        draft.rows = rows.map(row =>
          (draft.headers || headers).map((_, idx) => ({
            value: row[idx] ?? null,
            originalValue: null,
            lastEditedAt: new Date().toISOString()
          }))
        );
        draft.rowCount = draft.rows.length;
      }
      return draft;
    });
  }
},
```

---

### Phase 2: New Module Structure (Modularity)
**Goal**: Separate concerns into clear, reusable modules

#### 2.1: Create `js/excel/` Directory
**New structure**:
```
js/excel/
├── core/
│   ├── excel-store.js          (Renamed from excel-runtime-store.js)
│   ├── excel-parser.js         (Moved from utils/)
│   └── excel-exporter.js       (Moved from utils/)
├── api/
│   ├── sheet-operations.js     (Extract from attachments-helper.js)
│   ├── workbook-operations.js  (New)
│   └── excel-helpers.js        (Main API facade)
├── validation/
│   ├── bounds-validator.js     (Extract validation logic)
│   └── data-validator.js       (Validate sheet data)
└── index.js                    (Public exports)
```

#### 2.2: Refactor `attachments-helper.js` → Multiple Files

**New: `js/excel/api/sheet-operations.js`**
```javascript
/**
 * Sheet-level operations (read/write/transform)
 * Pure functions that operate on sheet snapshots
 */
export class SheetOperations {
  constructor(sheetSnapshot, sheetName) {
    this.sheet = sheetSnapshot;
    this.name = sheetName;
  }

  // All getRowData, getColumnData, sliceRows, etc.
  // Move from attachments-helper.js
}
```

**New: `js/excel/api/workbook-operations.js`**
```javascript
/**
 * Workbook-level operations (sheets, metadata, export)
 */
export class WorkbookOperations {
  constructor(store) {
    this.store = store;
  }

  getSheetNames() { ... }
  addSheet(name, options) { ... }
  removeSheet(name) { ... }
  renameSheet(oldName, newName) { ... }
  exportAsBlob() { ... }
}
```

**New: `js/excel/api/excel-helpers.js`**
```javascript
/**
 * Main API facade - combines all operations
 * This becomes the new attachments.helper
 */
import { SheetOperations } from './sheet-operations.js';
import { WorkbookOperations } from './workbook-operations.js';

export function createExcelHelpers(store) {
  const workbookOps = new WorkbookOperations(store);

  return {
    // Workbook operations
    ...workbookOps,

    // Sheet selection returns SheetOperations instance
    getSheet: (identifier) => {
      const sheet = store.getSheetSnapshot(identifier);
      return new SheetOperations(sheet, identifier);
    },
  };
}
```

#### 2.3: Delete Redundant Files
- `js/utils/excel-parser.js` → moved to `js/excel/core/`
- `js/utils/excel-exporter.js` → moved to `js/excel/core/`
- `js/execution/apis/attachments-helper.js` → replaced by `js/excel/api/`

---

### Phase 3: Prompt & Documentation Overhaul
**Goal**: Make LLM instructions crystal clear and accurate

#### 3.1: Create `docs/excel-api-reference.md`
**Complete API reference with**:
- Every method signature
- Parameter descriptions with types
- Return value shapes
- Usage examples
- Common patterns
- Error handling

#### 3.2: Create `docs/excel-prompt-instructions.md`
**Extracted LLM instructions**:
- When to use which API
- Mutator pattern explained
- Error recovery strategies
- Best practices
- Anti-patterns to avoid

#### 3.3: Update `app-config.js` SYSTEM_PROMPT
**Replace current Excel section with**:
```javascript
## EXCEL ATTACHMENT API

When \`attachments.hasWorkbook()\` returns true, you have access to in-memory Excel data.

### Core Concepts
1. **Original snapshot is frozen** - use \`attachments.getOriginal()\` for read-only access
2. **Working copy is mutable** - use \`attachments.getWorkingCopy()\` or mutation methods
3. **All operations are tracked** - check \`attachments.getMutationLog()\` for history

### API Overview

**Workbook Level:**
\`\`\`javascript
// Check if workbook exists (ALWAYS call this first)
if (!attachments.hasWorkbook()) {
  throw new Error('No workbook attached');
}

// Get sheet names
const sheets = attachments.getSheetNames(); // ['Sheet1', 'Sheet2']

// Get a sheet handle (by name or 0-based index)
const sheet = attachments.getSheet('Sheet1'); // or getSheet(0)
const sheet2 = attachments.getSheet(1);

// Create a new sheet
attachments.addSheet('NewSheet', {
  headers: ['Name', 'Value'],
  rows: [['Item1', '100'], ['Item2', '200']]
});
\`\`\`

**Sheet Level - Reading Data:**
\`\`\`javascript
const sheet = attachments.getSheet('Sheet1');

// Get summary (ALWAYS do this first to check size)
const summary = sheet.summary();
// Returns: { name, rowCount, columnCount, headers, diff }

// Get rows as arrays
const rows = sheet.getRows({ offset: 0, limit: 10, charLimit: 50 });
// Returns: [['val1', 'val2'], ['val3', 'val4']]

// Get rows as objects (with headers as keys)
const data = sheet.getRowsAsObjects({ offset: 0, limit: 10 });
// Returns: [{ header1: 'val1', header2: 'val2' }, ...]

// Get single row as object
const row = sheet.getRowData({ rowIndex: 5 });
// Returns: { header1: 'val1', header2: 'val2' }

// Get column data
const column = sheet.getColumnData({ columnIndex: 2, offset: 0, limit: 100 });
// Returns: ['val1', 'val2', 'val3']

// Get range
const range = sheet.getRange({ startCell: 'A1', endCell: 'C10' });
// Returns: [['A1', 'B1', 'C1'], ['A2', 'B2', 'C2'], ...]
\`\`\`

**Sheet Level - Modifying Data:**
\`\`\`javascript
// Update single cell
sheet.updateCell({ rowIndex: 0, columnIndex: 0, value: 'NewValue' });

// Append rows
sheet.appendRows([
  ['row1col1', 'row1col2'],
  ['row2col1', 'row2col2']
]);

// Delete rows
sheet.deleteRows({ start: 5, count: 3 });

// Replace entire sheet
sheet.replaceSheet({
  headers: ['Col1', 'Col2'],
  rows: [['A', 'B'], ['C', 'D']]
});
\`\`\`

**Direct Sheet Update (Alternative Pattern):**
\`\`\`javascript
// Simple data replacement
attachments.updateSheet('Sheet1', {
  headers: ['Name', 'Count'],
  rows: [['Item', '5']]
});

// Or use mutator function for complex changes
attachments.updateSheet('Sheet1', (draft) => {
  draft.rows.forEach(row => {
    row[0].value = row[0].value.toUpperCase();
  });
  return draft;
});
\`\`\`

### CRITICAL RULES
1. **ALWAYS call \`sheet.summary()\` first** to check rowCount/columnCount
2. **Use charLimit parameter** to avoid context overflow (default: 50 chars)
3. **Never dump entire sheets** - use offset/limit to get windows
4. **Check diff after mutations**: \`sheet.diff()\` → { changedCells, addedRows, deletedRows }
5. **Store large datasets in Vault**, not in reasoning block
6. **Handle errors gracefully** - sheet may not exist, column may be out of bounds

### Common Patterns

**Pattern 1: Scan sheet for specific values**
\`\`\`javascript
const sheet = attachments.getSheet('Data');
const summary = sheet.summary();
console.log(\`Scanning \${summary.rowCount} rows\`);

const matches = [];
const batchSize = 100;

for (let offset = 0; offset < summary.rowCount; offset += batchSize) {
  const batch = sheet.getRowsAsObjects({ offset, limit: batchSize });
  batch.forEach((row, idx) => {
    if (row.Status === 'Pending') {
      matches.push({ rowIndex: offset + idx, data: row });
    }
  });
}

vault.set('scan_results', matches);
\`\`\`

**Pattern 2: Extract column and analyze**
\`\`\`javascript
const sheet = attachments.getSheet(0);
const mpnColumnIndex = sheet.summary().headers.findIndex(h => h.includes('MPN'));

if (mpnColumnIndex === -1) {
  throw new Error('MPN column not found');
}

const allMpns = sheet.getColumnData({
  columnIndex: mpnColumnIndex,
  offset: 0,
  limit: sheet.summary().rowCount
});

const uniqueMpns = [...new Set(allMpns.filter(v => v && v.trim()))];
vault.set('unique_mpns', uniqueMpns);
\`\`\`

**Pattern 3: Create new sheet with processed data**
\`\`\`javascript
// Process data
const sourceSheet = attachments.getSheet('Raw Data');
const data = sourceSheet.getRowsAsObjects({ offset: 0, limit: 1000 });
const processed = data.map(row => ({
  Name: row.Name,
  Total: parseFloat(row.Price) * parseInt(row.Quantity)
}));

// Create new sheet
attachments.addSheet('Processed', {
  headers: ['Name', 'Total'],
  rows: processed.map(p => [p.Name, p.Total])
});

console.log('Created new sheet with processed data');
\`\`\`
\`\`\`

#### 3.4: Add Inline Examples to Helper Functions
**In each function JSDoc**:
```javascript
/**
 * Get column data
 *
 * @param {Object} options
 * @param {number} options.columnIndex - 0-based column index
 * @param {number} [options.offset=0] - Start row (0-based)
 * @param {number} [options.limit=200] - Max rows to retrieve
 * @param {number} [options.charLimit=50] - Max chars per cell
 * @returns {Array<string|number|null>} Column values
 *
 * @example
 * // Get first 100 values from column 3
 * const values = sheet.getColumnData({ columnIndex: 3, limit: 100 });
 *
 * @example
 * // Get column with longer text values
 * const descriptions = sheet.getColumnData({
 *   columnIndex: 5,
 *   charLimit: 200
 * });
 */
getColumnData({ columnIndex, offset = 0, limit = MAX_ROWS_PER_READ, charLimit = ATTACHMENT_DEFAULT_CHAR_LIMIT }) {
  // implementation
}
```

---

### Phase 4: Error Handling Improvements
**Goal**: Make errors guide the LLM to correct usage

#### 4.1: Create Error Classes
**New: `js/excel/errors/excel-errors.js`**
```javascript
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

export class SheetNotFoundError extends ExcelError {
  constructor(sheetName, availableSheets) {
    super(
      `Sheet "${sheetName}" not found.`,
      {
        code: 'SHEET_NOT_FOUND',
        suggestion: `Available sheets: ${availableSheets.join(', ')}. Use attachments.getSheetNames() to list all sheets.`,
        exampleCode: `const sheets = attachments.getSheetNames();\nconst sheet = attachments.getSheet(sheets[0]);`
      }
    );
    this.availableSheets = availableSheets;
  }
}

export class CannotCreateSheetError extends ExcelError {
  constructor(sheetName) {
    super(
      `Cannot create sheet "${sheetName}" using updateSheet(). Sheet does not exist.`,
      {
        code: 'CANNOT_CREATE_VIA_UPDATE',
        suggestion: `Use attachments.addSheet() to create new sheets.`,
        exampleCode: `attachments.addSheet('${sheetName}', {\n  headers: ['Column1', 'Column2'],\n  rows: [['value1', 'value2']]\n});`
      }
    );
  }
}

export class InvalidMutatorError extends ExcelError {
  constructor(received) {
    super(
      `updateSheet() expected a function or data object, got ${typeof received}`,
      {
        code: 'INVALID_MUTATOR',
        suggestion: 'Pass either a data object or a mutator function.',
        exampleCode: `// Option 1: Data object\nattachments.updateSheet('Sheet1', {\n  headers: ['A', 'B'],\n  rows: [['1', '2']]\n});\n\n// Option 2: Mutator function\nattachments.updateSheet('Sheet1', (draft) => {\n  draft.rows[0][0].value = 'Modified';\n  return draft;\n});`
      }
    );
  }
}
```

#### 4.2: Update All Error Throws
**Replace generic errors with helpful errors**:

**In excel-runtime-store.js**:
```javascript
// Before:
if (!this._state.working[sheetName]) {
  throw new Error(`Sheet "${sheetName}" not found.`);
}

// After:
if (!this._state.working[sheetName]) {
  throw new SheetNotFoundError(sheetName, Object.keys(this._state.working));
}
```

**In execution-context-api.js**:
```javascript
// Before:
mutateSheet(sheetName, mutator) {
  ExcelRuntimeStore.mutateSheet(sheetName, mutator);
}

// After:
mutateSheet(sheetName, dataOrMutator) {
  if (!dataOrMutator) {
    throw new InvalidMutatorError(dataOrMutator);
  }

  if (typeof dataOrMutator === 'function') {
    ExcelRuntimeStore.mutateSheet(sheetName, dataOrMutator);
  } else if (typeof dataOrMutator === 'object') {
    // Handle data object
  } else {
    throw new InvalidMutatorError(dataOrMutator);
  }
}
```

---

### Phase 5: Testing & Validation
**Goal**: Ensure all APIs work as documented

#### 5.1: Create Test Suite
**New: `tests/excel-api.test.js`** (manual test harness)
```javascript
/**
 * Manual test suite for Excel APIs
 * Run in browser console after attaching a workbook
 */

const ExcelAPITests = {
  async runAll() {
    console.log('🧪 Starting Excel API Tests...\n');

    await this.testSheetOperations();
    await this.testColumnOperations();
    await this.testSheetCreation();
    await this.testMutatorPatterns();
    await this.testErrorHandling();

    console.log('\n✅ All tests completed!');
  },

  async testSheetOperations() {
    console.log('📋 Testing sheet operations...');

    const sheet = attachments.getSheet(0);
    const summary = sheet.summary();
    console.assert(summary.rowCount >= 0, 'Summary should have rowCount');
    console.assert(Array.isArray(summary.headers), 'Headers should be array');

    const rows = sheet.getRows({ offset: 0, limit: 5 });
    console.assert(Array.isArray(rows), 'getRows should return array');

    console.log('  ✓ Sheet operations passed');
  },

  async testColumnOperations() {
    console.log('📊 Testing column operations...');

    const sheet = attachments.getSheet(0);
    const columnData = sheet.getColumnData({ columnIndex: 0, limit: 10 });
    console.assert(Array.isArray(columnData), 'getColumnData should return array');

    console.log('  ✓ Column operations passed');
  },

  async testSheetCreation() {
    console.log('📄 Testing sheet creation...');

    const beforeCount = attachments.getSheetNames().length;

    attachments.addSheet('TestSheet', {
      headers: ['Col1', 'Col2'],
      rows: [['A', 'B']]
    });

    const afterCount = attachments.getSheetNames().length;
    console.assert(afterCount === beforeCount + 1, 'Sheet count should increase');

    const newSheet = attachments.getSheet('TestSheet');
    console.assert(newSheet.summary().rowCount === 1, 'New sheet should have 1 row');

    console.log('  ✓ Sheet creation passed');
  },

  async testMutatorPatterns() {
    console.log('🔧 Testing mutator patterns...');

    // Test data object pattern
    attachments.updateSheet('TestSheet', {
      headers: ['Updated'],
      rows: [['Value']]
    });

    // Test function pattern
    attachments.updateSheet('TestSheet', (draft) => {
      draft.rows[0][0].value = 'Modified';
      return draft;
    });

    const sheet = attachments.getSheet('TestSheet');
    console.assert(sheet.summary().rowCount === 1, 'Mutations should work');

    console.log('  ✓ Mutator patterns passed');
  },

  async testErrorHandling() {
    console.log('⚠️  Testing error handling...');

    let caughtError = false;
    try {
      attachments.getSheet('NonExistentSheet');
    } catch (e) {
      caughtError = true;
      console.assert(e.suggestion, 'Error should include suggestion');
    }
    console.assert(caughtError, 'Should throw on non-existent sheet');

    console.log('  ✓ Error handling passed');
  }
};

// Auto-run if workbook attached
if (attachments.hasWorkbook()) {
  ExcelAPITests.runAll();
} else {
  console.log('⚠️  Please attach a workbook first, then run: ExcelAPITests.runAll()');
}
```

#### 5.2: Create Integration Test Scenario
**New: `tests/excel-integration-test.md`**
```markdown
# Excel API Integration Test Scenario

## Setup
1. Create test Excel file with:
   - Sheet1: "Products" - 100 rows, columns: SKU, Name, Price, Category
   - Sheet2: "Orders" - 50 rows, columns: OrderID, ProductSKU, Quantity, Date
   - Sheet3: "Empty" - 0 rows

2. Upload to GDRS

## Test Cases

### TC1: Basic Reading
```javascript
// Should successfully read all sheets
const sheets = attachments.getSheetNames();
assert(sheets.length === 3);

// Should get correct summary
const products = attachments.getSheet('Products');
const summary = products.summary();
assert(summary.rowCount === 100);
assert(summary.headers.includes('SKU'));
```

### TC2: Column Extraction
```javascript
// Should extract SKU column
const skus = products.getColumnData({ columnIndex: 0, limit: 100 });
assert(skus.length === 100);
```

### TC3: Row Operations
```javascript
// Should get rows as objects
const rows = products.getRowsAsObjects({ offset: 0, limit: 10 });
assert(rows[0].hasOwnProperty('SKU'));
assert(rows[0].hasOwnProperty('Name'));
```

### TC4: Sheet Creation
```javascript
// Should create new summary sheet
attachments.addSheet('Summary', {
  headers: ['Category', 'Count'],
  rows: [['Electronics', '50'], ['Furniture', '30']]
});

const summary = attachments.getSheet('Summary');
assert(summary.summary().rowCount === 2);
```

### TC5: Data Mutation
```javascript
// Should update prices
products.updateCell({ rowIndex: 0, columnIndex: 2, value: '99.99' });
const diff = products.diff();
assert(diff.changedCells === 1);
```

## Success Criteria
- All test cases pass
- No console errors
- Diff tracking accurate
- Export works correctly
```

---

## Implementation Phases

### Phase 1: Critical API Fixes (2-3 hours)
**Priority: IMMEDIATE**

- [ ] Add `getColumnData()` to attachments-helper.js
- [ ] Add `getRowsAsObjects()` to attachments-helper.js
- [ ] Add `addSheet()` to excel-runtime-store.js
- [ ] Fix `updateSheet()` to accept data objects
- [ ] Update all prompt examples in app-config.js
- [ ] Fix method signature docs

**Deliverable**: LLM can successfully extract column data and create sheets

---

### Phase 2: Error Handling (1-2 hours)
**Priority: HIGH**

- [ ] Create excel-errors.js with helpful error classes
- [ ] Replace all generic errors with helpful errors
- [ ] Add suggestions and example code to errors
- [ ] Test error messages with LLM

**Deliverable**: Errors guide LLM to correct usage

---

### Phase 3: Code Reorganization (3-4 hours)
**Priority: MEDIUM**

- [ ] Create js/excel/ directory structure
- [ ] Move excel-parser.js and excel-exporter.js to js/excel/core/
- [ ] Split attachments-helper.js into:
  - sheet-operations.js
  - workbook-operations.js
  - excel-helpers.js
- [ ] Update all imports across codebase
- [ ] Delete old files

**Deliverable**: Clean, modular codebase

---

### Phase 4: Documentation (2-3 hours)
**Priority: MEDIUM**

- [ ] Create docs/excel-api-reference.md (complete API docs)
- [ ] Create docs/excel-prompt-instructions.md (LLM guide)
- [ ] Update docs/attachments-guide.md
- [ ] Add JSDoc examples to all methods
- [ ] Create troubleshooting guide

**Deliverable**: Comprehensive documentation

---

### Phase 5: Testing (1-2 hours)
**Priority: MEDIUM**

- [ ] Create manual test suite
- [ ] Create integration test scenarios
- [ ] Test with actual Excel files
- [ ] Verify LLM can complete common tasks
- [ ] Performance testing (large files)

**Deliverable**: Verified, working system

---

## File Changes Summary

### Files to Modify
1. `js/state/excel-runtime-store.js` - Add `addSheet()`, improve errors
2. `js/execution/apis/attachments-helper.js` - Add missing methods, fix signatures
3. `js/execution/execution-context-api.js` - Improve `updateSheet()` API
4. `js/config/app-config.js` - Complete prompt rewrite
5. `js/reasoning/context/providers/attachments-provider.js` - Update instructions

### Files to Create
1. `js/excel/core/excel-store.js` (refactored excel-runtime-store.js)
2. `js/excel/core/excel-parser.js` (moved from utils/)
3. `js/excel/core/excel-exporter.js` (moved from utils/)
4. `js/excel/api/sheet-operations.js` (extracted)
5. `js/excel/api/workbook-operations.js` (new)
6. `js/excel/api/excel-helpers.js` (main facade)
7. `js/excel/validation/bounds-validator.js` (new)
8. `js/excel/validation/data-validator.js` (new)
9. `js/excel/errors/excel-errors.js` (new)
10. `js/excel/index.js` (public exports)
11. `docs/excel-api-reference.md` (complete API docs)
12. `docs/excel-prompt-instructions.md` (LLM instructions)
13. `tests/excel-api.test.js` (test suite)
14. `tests/excel-integration-test.md` (test scenarios)

### Files to Delete
1. `js/utils/excel-parser.js` (moved to js/excel/core/)
2. `js/utils/excel-exporter.js` (moved to js/excel/core/)
3. Old plan files:
   - `EXCEL_ATTACHMENT_PLAN.md`
   - `EXCEL_ATTACHMENT_IMPLEMENTATION_PLAN.md`
   - `EXCEL_ATTACHMENT_CONSOLIDATED_PLAN.md`
   - `EXCEL_ATTACHMENT_RUNTIME_PLAN.md`
   - `EXCEL_ATTACHMENT_REWRITE_PLAN.md`
   - `EXCEL_ATTACHMENT_MASTER_PLAN.md`

---

## Risk Analysis

### High Risk
- **Breaking existing code**: Mitigate with backward compatibility layer
- **Import path changes**: Update all files in single commit

### Medium Risk
- **Performance with large files**: Add streaming/chunking for files >5MB
- **Browser memory limits**: Document max file size (current: 8MB)

### Low Risk
- **Documentation drift**: Generate docs from JSDoc comments
- **Test coverage**: Manual tests sufficient for now

---

## Success Metrics

### Before (Current State)
- ❌ LLM fails basic MPN extraction (32 iterations)
- ❌ No column data extraction
- ❌ Cannot create new sheets
- ❌ Confusing error messages
- ❌ Inconsistent API signatures

### After (Target State)
- ✅ LLM completes MPN extraction in <10 iterations
- ✅ All documented APIs work as described
- ✅ Can create/modify/delete sheets
- ✅ Errors guide to solutions
- ✅ Consistent, predictable API surface

---

## Next Steps

**Before Implementation:**
1. Review this plan with user
2. Confirm priority of phases
3. Decide on Phase 1 vs "do everything" approach

**During Implementation:**
1. Create feature branch
2. Implement phase by phase
3. Test after each phase
4. Document changes in PROGRESS.md
5. Create pull request with before/after comparisons

---

## Appendix: API Comparison

### Current (Broken) API
```javascript
// Doesn't exist:
sheet.getColumnData(index)  // ❌

// Wrong signature in docs:
sheet.getRowData(rowIndex)  // ❌ Actually needs object

// Confusing name:
sheet.sliceRows(start, end)  // ❌ Actually needs { offset, limit }

// Can't create sheets:
attachments.addSheet('New')  // ❌ Doesn't exist

// Unclear mutator:
attachments.updateSheet('Sheet1', data)  // ❌ Needs function
```

### Proposed (Fixed) API
```javascript
// Column operations:
sheet.getColumnData({ columnIndex: 0, limit: 100 })  // ✅

// Row operations:
sheet.getRowData({ rowIndex: 5 })  // ✅ Returns object
sheet.getRowsAsObjects({ offset: 0, limit: 10 })  // ✅

// Clear naming:
sheet.getRows({ offset: 0, limit: 10 })  // ✅ More intuitive

// Sheet creation:
attachments.addSheet('New', { headers: ['A'], rows: [['1']] })  // ✅

// Flexible updates:
attachments.updateSheet('Sheet1', { rows: [[...]] })  // ✅ Data
attachments.updateSheet('Sheet1', (draft) => { ... })  // ✅ Function
```

---

## Questions for User

1. **Implementation approach**:
   - Option A: Fix critical APIs first (Phase 1 only, ~3 hours)
   - Option B: Do complete refactor (All phases, ~12 hours)

2. **Backward compatibility**:
   - Keep old method names as deprecated aliases?
   - Or breaking change with migration guide?

3. **File reorganization priority**:
   - Do now (cleaner but more files changed)?
   - Or defer to separate PR?

4. **Testing strategy**:
   - Manual testing sufficient?
   - Or create automated test runner?

---

**END OF PLAN**

This plan is now ready for your review and approval.
