/**
 * GDRS Code Executor
 * Manual code execution interface for users routed through the execution queue
 */

import { JSExecutor } from './js-executor.js';
import { Storage } from '../storage/storage.js';
import { qs } from '../core/utils.js';

export const CodeExecutor = {
  async run() {
    const editorEl = qs('#codeInput');
    const outputEl = qs('#execOutput');
    const pill = qs('#execStatus');

    if (!editorEl || !outputEl || !pill) return;

    const rawCode = editorEl.value || '';
    pill.textContent = 'QUEUED';
    outputEl.textContent = 'Waiting for execution...';

    await JSExecutor.executeCode(rawCode, {
      source: 'manual',
      context: { trigger: 'manual_run' }
    });
  },

  clear() {
    const editorEl = qs('#codeInput');
    const outputEl = qs('#execOutput');
    const pill = qs('#execStatus');

    if (editorEl) editorEl.value = '// Use {{<vaultref id="example" />}} to inline vault content\nconsole.log("Hello GDRS");\nreturn { status: "ready", timestamp: new Date() };';
    if (outputEl) outputEl.textContent = 'Execution output will appear here...';
    if (pill) {
      pill.textContent = 'READY';
      pill.style.background = '';
      pill.style.color = '';
    }
  },

  restoreLastExecutedCode() {
    const lastCode = Storage.loadLastExecutedCode();
    const editorEl = qs('#codeInput');
    if (editorEl && typeof lastCode === 'string') {
      editorEl.value = lastCode;
    }
  }
};
