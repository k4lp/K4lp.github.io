import { ExcelRuntimeStore } from '../../../state/excel-runtime-store.js';

export const attachmentsProvider = {
  id: 'attachments',
  description: 'Summarizes in-memory Excel attachment state.',
  async build() {
    const metadata = ExcelRuntimeStore.getMetadata();
    if (!metadata) {
      return 'No workbook attached.';
    }

    const mutationLog = ExcelRuntimeStore.getMutationLog();
    const working = ExcelRuntimeStore.getWorkingCopy();
    const sheetSummaries = Object.keys(working || {}).map((sheetName) => {
      const rows = working?.[sheetName]?.rows?.length || 0;
      const mutated = mutationLog.some((entry) => entry.sheet === sheetName);
      return `- ${sheetName}: ${rows} rows${mutated ? ' (modified)' : ''}`;
    }).join('\n');

    return [
      `File: **${metadata.name}** (${(metadata.sizeBytes / 1024).toFixed(2)} KB)`,
      `Sheets: ${metadata.sheetNames.length}`,
      `Imported: ${metadata.importedAt}`,
      sheetSummaries || '- No sheets detected.'
    ].join('\n');
  }
};

