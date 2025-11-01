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

  // Get the actual content (not placeholder)
  const content = codeInput.value || '';

  // Count lines properly - split by newline
  const lines = content.split('\n');
  const lineCount = Math.max(lines.length, 1);

  // Generate line numbers
  const lineNumbersArray = [];
  for (let i = 1; i <= lineCount; i++) {
    lineNumbersArray.push(i);
  }

  // Update line numbers display
  lineNumbers.textContent = lineNumbersArray.join('\n');
}

/**
 * Sync scroll between textarea and line numbers
 */
function syncScroll() {
  const codeInput = qs('#codeInput');
  const lineNumbers = qs('#lineNumbers');

  if (!codeInput || !lineNumbers) return;

  // Sync line numbers scroll with textarea scroll
  lineNumbers.scrollTop = codeInput.scrollTop;
}

/**
 * Initialize code editor
 */
function initCodeEditor() {
  const codeInput = qs('#codeInput');
  const lineNumbers = qs('#lineNumbers');

  if (!codeInput || !lineNumbers) return;

  // Set initial line numbers
  updateLineNumbers();

  // Setup event listeners
  codeInput.addEventListener('input', updateLineNumbers);

  codeInput.addEventListener('scroll', syncScroll);

  codeInput.addEventListener('keydown', (e) => {
    // Handle tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = codeInput.selectionStart;
      const end = codeInput.selectionEnd;
      const value = codeInput.value;

      // Insert 2 spaces
      codeInput.value = value.substring(0, start) + '  ' + value.substring(end);
      codeInput.selectionStart = codeInput.selectionEnd = start + 2;

      updateLineNumbers();
    }
  });
}

/**
 * Bind code execution handlers
 */
export function bindCodeHandlers() {
  const execBtn = qs('#execBtn');
  const clearExecBtn = qs('#clearExec');

  if (execBtn) {
    execBtn.addEventListener('click', () => {
      CodeExecutor.run().catch((error) => console.error('[CodeExecutor] Manual run failed', error));
    });
  }

  if (clearExecBtn) {
    clearExecBtn.addEventListener('click', () => {
      CodeExecutor.clear();
      // Update line numbers after clear
      setTimeout(updateLineNumbers, 0);
    });
  }

  // Initialize code editor with line numbers
  initCodeEditor();
}

