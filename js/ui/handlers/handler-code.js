/**
 * Code Execution Event Handlers
 * Execute and clear code execution buttons
 */

import { CodeExecutor } from '../../execution/code-executor.js';
import { qs } from '../../core/utils.js';

/**
 * Update line numbers for code editor
 */
function updateLineNumbers() {
  const codeInput = qs('#codeInput');
  const lineNumbers = qs('#lineNumbers');

  if (!codeInput || !lineNumbers) return;

  const lines = codeInput.value.split('\n');
  const lineCount = lines.length;

  // Generate line numbers HTML
  let lineNumbersHTML = '';
  for (let i = 1; i <= lineCount; i++) {
    lineNumbersHTML += `<div>${i}</div>`;
  }

  lineNumbers.innerHTML = lineNumbersHTML;

  // Sync scroll
  lineNumbers.scrollTop = codeInput.scrollTop;
}

/**
 * Sync scroll between textarea and line numbers
 */
function syncScroll() {
  const codeInput = qs('#codeInput');
  const lineNumbers = qs('#lineNumbers');

  if (!codeInput || !lineNumbers) return;

  lineNumbers.scrollTop = codeInput.scrollTop;
}

/**
 * Bind code execution handlers
 */
export function bindCodeHandlers() {
  const execBtn = qs('#execBtn');
  const clearExecBtn = qs('#clearExec');
  const codeInput = qs('#codeInput');

  if (execBtn) {
    execBtn.addEventListener('click', () => {
      CodeExecutor.run().catch((error) => console.error('[CodeExecutor] Manual run failed', error));
    });
  }

  if (clearExecBtn) {
    clearExecBtn.addEventListener('click', () => CodeExecutor.clear());
  }

  // Initialize and update line numbers
  if (codeInput) {
    // Initial line numbers
    updateLineNumbers();

    // Update on input
    codeInput.addEventListener('input', updateLineNumbers);

    // Update on scroll
    codeInput.addEventListener('scroll', syncScroll);

    // Update on any change
    codeInput.addEventListener('change', updateLineNumbers);
  }
}
