/**
 * Export - SIMPLE VERSION
 */

import { Storage } from '../../storage/storage.js';
import { qs } from '../../core/utils.js';

export function bindExportHandler() {
  const exportBtn = qs('#exportTxt');
  if (!exportBtn) return;

  exportBtn.addEventListener('click', () => {
    const output = Storage.loadFinalOutput();
    const content = output.html || '';

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gdrs-analysis-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
