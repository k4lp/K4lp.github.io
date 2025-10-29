/**
 * GDRS Code Executor
 * Manual code execution interface for users
 */

import { VaultManager } from '../storage/vault-manager.js';
import { Storage } from '../storage/storage.js';
import { qs } from '../core/utils.js';

export const CodeExecutor = {
  run() {
    const editorEl = qs('#codeInput');
    const outputEl = qs('#execOutput');
    const pill = qs('#execStatus');

    if (!editorEl || !outputEl || !pill) return;

    const rawCode = editorEl.value || '';
    const expanded = VaultManager.resolveVaultRefsInText(rawCode);

    const logs = [];
    const origLog = console.log;
    console.log = (...args) => {
      const line = args.map(a => {
        try {
          if (typeof a === 'string') return a;
          return JSON.stringify(a, null, 2);
        } catch {
          return String(a);
        }
      }).join(' ');
      logs.push(line);
      origLog.apply(console, args);
    };

    pill.textContent = 'RUNNING';

    try {
      const fn = new Function(expanded);
      const ret = fn();
      if (ret !== undefined) {
        logs.push('[RETURN] ' + JSON.stringify(ret, null, 2));
      }
      pill.textContent = 'OK';
    } catch (err) {
      logs.push('[ERROR] ' + (err.stack || err.message || String(err)));
      pill.textContent = 'ERROR';
    } finally {
      console.log = origLog;
    }

    outputEl.textContent = logs.length ? logs.join('\n') : 'No output';
  },

  clear() {
    const editorEl = qs('#codeInput');
    const outputEl = qs('#execOutput');
    const pill = qs('#execStatus');

    if (editorEl) editorEl.value = '// Use {{<vaultref id="example" />}} to inline vault content\nconsole.log("Hello GDRS");\nreturn { status: "ready", timestamp: new Date() };';
    if (outputEl) outputEl.textContent = 'Execution output will appear here...';
    if (pill) pill.textContent = 'READY';
  },

  restoreLastExecutedCode() {
    const lastCode = Storage.loadLastExecutedCode();
    const editorEl = qs('#codeInput');
    if (lastCode && editorEl) {
      editorEl.value = lastCode;
    }
  }
};
