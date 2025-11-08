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
      '- Call `attachments.helper.ensureWorkbook()` before referencing sheets.',
      '- Inspect `sheet.summary()` to understand row/column counts before printing anything.',
      '- Use `sheet.sliceRows({ limit, charLimit })` or `sheet.getRange()` to fetch small subsets (default char limit 50).',
      '- Never dump entire sheets; summarize or move data to the Vault instead.',
      '- Mutations must follow: plan ➜ `sheet.update...()` ➜ describe changes ➜ verify via `sheet.summary()` ➜ log diff.',
      '- Always check row/column counts prior to printing to avoid context overflow.'
    ].join('\n');
  }
};
