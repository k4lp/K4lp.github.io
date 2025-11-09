import { ExcelRuntimeStore } from '../../../state/excel-runtime-store.js';

export const attachmentsProvider = {
  id: 'attachments',
  description: 'Summarizes in-memory Excel attachment state.',
  async build() {
    const metadata = ExcelRuntimeStore.getMetadata();
    if (!metadata) {
      return '';
    }

    const mutationLog = ExcelRuntimeStore.getMutationLog();
    const working = ExcelRuntimeStore.getWorkingCopy();
    const diffIndex = ExcelRuntimeStore.getDiffIndex();
    const sheetOrder = metadata.sheetOrder || Object.keys(working || {});
    const sheetSummaries = sheetOrder.map((sheetName) => {
      const rows = working?.[sheetName]?.rows?.length || 0;
      const diff = diffIndex[sheetName] || { changedCells: 0 };
      const mutated = mutationLog.some((entry) => entry.sheet === sheetName);
      const diffLabel = diff.changedCells
        ? `diff: ${diff.changedCells} cells`
        : 'no changes';
      return `- ${sheetName}: ${rows} rows (${diffLabel}${mutated ? ', recent edit' : ''})`;
    }).join('\n');

    return [
      `File: **${metadata.name}** (${(metadata.sizeBytes / 1024).toFixed(2)} KB)`,
      `Sheets: ${sheetOrder.length}`,
      `Imported: ${metadata.importedAt}`,
      sheetSummaries || '- No sheets detected.',
      '',
      '**Excel Attachment Protocol (Active):**',
      '- Call `attachments.ensureWorkbook()` before accessing sheets',
      '- Get sheets: `attachments.getSheet(nameOrIndex)` returns handle with methods',
      '- **ALWAYS call `sheet.summary()` first** to check rowCount/columnCount',
      '',
      '**Reading Data:**',
      '- `sheet.sliceRows({ offset: 0, limit: 10 })` - Get rows as 2D array',
      '- `sheet.getRowsAsObjects({ offset: 0, limit: 10 })` - Get rows as objects with header keys',
      '- `sheet.getColumnData({ columnIndex: 2, limit: 100 })` - Get entire column',
      '- `sheet.getRange({ startCell: \'A1\', endCell: \'C10\' })` - Get cell range',
      '- All methods use object params: `{ paramName: value }` format',
      '- Default charLimit: 50 chars (increase only when needed)',
      '',
      '**Modifying Data:**',
      '- Create sheet: `attachments.addSheet(\'NewSheet\', { headers: [\'A\'], rows: [[\'1\']] })`',
      '- Update sheet: `attachments.updateSheet(\'Sheet1\', { headers, rows })` (data object)',
      '- Or mutator: `attachments.updateSheet(\'Sheet1\', (draft) => { ... })`',
      '- Append: `sheet.appendRows([[\'val1\', \'val2\']])`',
      '- Update cell: `sheet.updateCell({ rowIndex: 0, columnIndex: 0, value: \'new\' })`',
      '',
      '**CRITICAL**: Never dump entire sheets. Use offset/limit. Store large data in Vault.'
    ].join('\n');
  }
};
