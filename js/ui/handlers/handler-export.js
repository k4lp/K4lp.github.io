/**
 * Export Event Handlers
 * Export analysis results to text file
 */

import { Storage } from '../../storage/storage.js';
import { qs } from '../../core/utils.js';

/**
 * Bind export button handler
 */
export function bindExportHandler() {
  const exportBtn = qs('#exportTxt');
  if (!exportBtn) return;

  exportBtn.addEventListener('click', () => {
    // Get final output and strip HTML tags
    const output = Storage.loadFinalOutput();
    const text = output.html
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"');

    // Create downloadable text file
    const blob = new Blob([`GDRS Analysis Report\n${'='.repeat(50)}\n\n${text}`], {
      type: 'text/plain'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gdrs-analysis-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
