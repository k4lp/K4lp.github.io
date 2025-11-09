import { ExcelRuntimeStore } from '../../../excel/core/excel-store.js';

/**
 * EXCEL API REFERENCE - ALWAYS INJECTED INTO CONTEXT
 * This ensures the LLM always knows the Excel API, even when no workbook is loaded.
 */
const EXCEL_API_QUICK_REFERENCE = `
**EXCEL ATTACHMENT API (Always Available)**

**Check & Get Sheets:**
- \`attachments.hasWorkbook()\` → **boolean** - Check if workbook loaded
- \`attachments.getSheetNames()\` → **string[]** - Get all sheet names
- \`attachments.getSheet(nameOrIndex)\` → **SheetHandle** - Get sheet by name/index (0-based)

**Sheet Reading (ALWAYS call .summary() first):**
- \`sheet.summary()\` → **{ name: string, rowCount: number, columnCount: number, headers: string[], diff: object }**
- \`sheet.getRowsAsObjects({ offset?, limit?, charLimit? })\` → **Array<{ [header: string]: any }>**
  - Returns: Array of objects where keys are column headers
  - Default: offset=0, limit=10, charLimit=50
- \`sheet.sliceRows({ offset?, limit?, charLimit? })\` → **any[][]** - Raw 2D array
- \`sheet.getColumnData({ columnIndex, offset?, limit?, charLimit? })\` → **any[]** - Single column values
- \`sheet.getRange({ startCell, endCell, charLimit? })\` → **any[][]** - 2D array for range (e.g., 'A1' to 'C10')

**Sheet Writing:**
- \`attachments.addSheet(name, { headers, rows })\` → **void** - Create new sheet
- \`attachments.updateSheet(name, { headers, rows })\` → **void** - Replace entire sheet
- \`sheet.appendRows(rowsArray)\` → **void** - Add rows to end (rowsArray: any[][])
- \`sheet.updateCell({ rowIndex, columnIndex, value })\` → **void** - Update single cell
- \`sheet.deleteRows({ start, count })\` → **void** - Delete rows starting at index

**Export:**
- \`attachments.downloadWorkbook(filename)\` → **void** - Download current state as .xlsx

**CRITICAL RULES:**
1. ALWAYS call \`sheet.summary()\` first to check dimensions
2. NEVER dump entire sheets - use offset/limit (max 200 rows per call)
3. Character Limits:
   - Default: 50 chars per cell (use for initial scans)
   - Medium: 100 chars (when you need more context)
   - Maximum: 200 chars (only when absolutely needed)
4. Store large results in Vault, don't print to reasoning
5. All parameters use object format: \`{ paramName: value }\`
6. Errors include 💡 suggestions and 📝 examples
`;

const EXCEL_EXPLORATION_GUIDE = `
**📊 HOW TO EXPLORE & UNDERSTAND EXCEL DATA (Active Attachment Detected)**

**STEP-BY-STEP WORKFLOW:**

**1. Get Overview:**
\`\`\`javascript
// Start with summary to understand dimensions
const sheet = attachments.getSheet(0); // or getSheet('Sheet1')
const summary = sheet.summary();
// Returns: { name, rowCount, columnCount, headers, diff }
console.log(\`Sheet: \${summary.name}, \${summary.rowCount} rows × \${summary.columnCount} cols\`);
console.log('Headers:', summary.headers);
\`\`\`

**2. Sample Beginning of Sheet (First 10-20 rows):**
\`\`\`javascript
// Read first rows to understand data structure
const firstRows = sheet.getRowsAsObjects({
  offset: 0,
  limit: 10,      // Start small (10-20 rows)
  charLimit: 50   // Default 50 chars per cell
});
console.log('First 10 rows:', firstRows);

// Or get raw array format:
const firstRowsRaw = sheet.sliceRows({ offset: 0, limit: 10 });
\`\`\`

**3. Sample End of Sheet (Last 10-20 rows):**
\`\`\`javascript
// CRITICAL: Always check the END too to understand full data range
const lastRowsOffset = Math.max(0, summary.rowCount - 10);
const lastRows = sheet.getRowsAsObjects({
  offset: lastRowsOffset,
  limit: 10,
  charLimit: 50
});
console.log(\`Last 10 rows (from row \${lastRowsOffset}):\`, lastRows);
\`\`\`

**4. Sample Middle Section (Optional - for large datasets):**
\`\`\`javascript
// For sheets with 1000+ rows, sample the middle too
const middleOffset = Math.floor(summary.rowCount / 2) - 5;
const middleRows = sheet.getRowsAsObjects({
  offset: middleOffset,
  limit: 10
});
console.log(\`Middle 10 rows (from row \${middleOffset}):\`, middleRows);
\`\`\`

**5. Extract Specific Column Data:**
\`\`\`javascript
// Find column by header name
const mpnColIndex = summary.headers.findIndex(h =>
  h.toLowerCase().includes('mpn') || h.toLowerCase().includes('part')
);

if (mpnColIndex >= 0) {
  // Read entire column (for analysis, storage in vault)
  const mpnValues = sheet.getColumnData({
    columnIndex: mpnColIndex,
    offset: 0,
    limit: summary.rowCount,  // Get all rows
    charLimit: 100            // Increase if values are long
  });

  // Process data
  const uniqueMPNs = [...new Set(mpnValues.filter(v => v))];
  vault.set('extracted_mpns', uniqueMPNs);
  console.log(\`Found \${uniqueMPNs.length} unique MPNs\`);
}
\`\`\`

**6. Scan Multiple Sheets:**
\`\`\`javascript
// When workbook has multiple sheets
const allSheets = attachments.getSheetNames();
allSheets.forEach((sheetName, index) => {
  const sheet = attachments.getSheet(sheetName);
  const summary = sheet.summary();
  console.log(\`\${index + 1}. \${sheetName}: \${summary.rowCount} rows\`);

  // Sample first 5 rows from each sheet
  const preview = sheet.getRowsAsObjects({ limit: 5 });
  vault.set(\`sheet_\${index}_preview\`, preview);
});
\`\`\`

**CHARACTER LIMIT STRATEGY:**
- **50 chars** (default): Initial exploration, understanding structure
- **100 chars**: When you need to see more content (product names, descriptions)
- **200 chars** (max): Only for fields you know contain long text (notes, addresses)

**BEST PRACTICES:**
✅ ALWAYS read summary first
✅ ALWAYS sample beginning AND end of sheet
✅ Start with charLimit=50, increase only if needed
✅ Store large results in Vault (use \`vault.set()\`)
✅ Use offset/limit to avoid loading entire sheets
✅ For large datasets (1000+ rows), sample beginning/middle/end

❌ NEVER dump entire sheets to console
❌ NEVER use limit > 200 rows per call
❌ NEVER skip checking the END of the sheet
❌ NEVER assume data is clean - always filter nulls/empties
`;

export const attachmentsProvider = {
  id: 'attachments',
  description: 'Provides Excel API reference and current workbook state.',
  async build() {
    const metadata = ExcelRuntimeStore.getMetadata();

    // ALWAYS include API reference, even when no workbook is loaded
    if (!metadata) {
      return [
        '**Excel Attachment Status:** NO WORKBOOK LOADED',
        '',
        'Upload an Excel file (.xlsx/.xls/.csv) to use these APIs:',
        '',
        EXCEL_API_QUICK_REFERENCE
      ].join('\n');
    }

    // Workbook is loaded - include status + API reference
    const mutationLog = ExcelRuntimeStore.getMutationLog();
    const working = ExcelRuntimeStore.getWorkingCopy();
    const diffIndex = ExcelRuntimeStore.getDiffIndex();
    const sheetOrder = metadata.sheetOrder || Object.keys(working || {});

    const sheetSummaries = sheetOrder.map((sheetName) => {
      const rows = working?.[sheetName]?.rows?.length || 0;
      const cols = working?.[sheetName]?.headers?.length || 0;
      const diff = diffIndex[sheetName] || { changedCells: 0, addedRows: 0, deletedRows: 0 };
      const mutated = mutationLog.some((entry) => entry.sheet === sheetName);

      const changes = [];
      if (diff.changedCells) changes.push(`${diff.changedCells} cells changed`);
      if (diff.addedRows) changes.push(`+${diff.addedRows} rows`);
      if (diff.deletedRows) changes.push(`-${diff.deletedRows} rows`);

      const changeLabel = changes.length ? ` (${changes.join(', ')})` : '';
      const editLabel = mutated ? ' 🔄' : '';

      return `- **${sheetName}**: ${rows} rows × ${cols} columns${changeLabel}${editLabel}`;
    }).join('\n');

    const totalChanges = Object.values(diffIndex).reduce(
      (sum, diff) => sum + diff.changedCells + diff.addedRows + diff.deletedRows,
      0
    );

    return [
      `**Excel Attachment Status:** ACTIVE`,
      `File: **${metadata.name}** (${(metadata.sizeBytes / 1024).toFixed(2)} KB)`,
      `Sheets: ${sheetOrder.length} | Total Rows: ${metadata.totals?.rows || 0} | Changes: ${totalChanges}`,
      `Imported: ${new Date(metadata.importedAt).toLocaleString()}`,
      '',
      '**Current Sheets:**',
      sheetSummaries || '- No sheets detected.',
      '',
      EXCEL_API_QUICK_REFERENCE,
      '',
      EXCEL_EXPLORATION_GUIDE
    ].join('\n');
  }
};
