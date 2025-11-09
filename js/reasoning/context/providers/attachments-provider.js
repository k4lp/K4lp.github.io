import { ExcelRuntimeStore } from '../../../excel/core/excel-store.js';

/**
 * EXCEL API REFERENCE - ALWAYS INJECTED INTO CONTEXT
 * This ensures the LLM always knows the Excel API, even when no workbook is loaded.
 */
const EXCEL_API_QUICK_REFERENCE = `
**EXCEL ATTACHMENT API (Always Available)**

**Check & Get Sheets:**
- \`attachments.hasWorkbook()\` → boolean - Check if workbook loaded
- \`attachments.getSheetNames()\` → string[] - Get all sheet names
- \`attachments.getSheet(nameOrIndex)\` → SheetHandle - Get sheet by name/index (0-based)

**Sheet Reading (ALWAYS call .summary() first):**
- \`sheet.summary()\` → { name, rowCount, columnCount, headers, diff }
- \`sheet.getRowsAsObjects({ offset: 0, limit: 10 })\` → [{ col1: val, col2: val }]
- \`sheet.sliceRows({ offset: 0, limit: 10 })\` → [[val1, val2], [val3, val4]]
- \`sheet.getColumnData({ columnIndex: 2, limit: 100 })\` → [val1, val2, val3]
- \`sheet.getRange({ startCell: 'A1', endCell: 'C10' })\` → 2D array

**Sheet Writing:**
- \`attachments.addSheet(name, { headers: [...], rows: [[...]] })\` - Create sheet
- \`attachments.updateSheet(name, { headers, rows })\` - Replace sheet (data object)
- \`sheet.appendRows([[val1, val2]])\` - Add rows to end
- \`sheet.updateCell({ rowIndex: 0, columnIndex: 0, value: 'new' })\` - Update cell
- \`sheet.deleteRows({ start: 5, count: 3 })\` - Delete rows

**CRITICAL RULES:**
1. ALWAYS call \`sheet.summary()\` before reading to check dimensions
2. NEVER dump entire sheets - use offset/limit (max 200 rows per call)
3. Default charLimit: 50 chars (increase only when needed, max 200)
4. Store large results in Vault, don't print to reasoning
5. All parameters use object format: \`{ paramName: value }\`
6. Errors include 💡 suggestions and 📝 examples

**Common Pattern - Extract Column:**
\`\`\`javascript
const sheet = attachments.getSheet(0);
const summary = sheet.summary();
const colIndex = summary.headers.findIndex(h => h.includes('MPN'));
const values = sheet.getColumnData({ columnIndex: colIndex, limit: summary.rowCount });
const unique = [...new Set(values.filter(v => v))];
vault.set('result', unique);
\`\`\`
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
      EXCEL_API_QUICK_REFERENCE
    ].join('\n');
  }
};
