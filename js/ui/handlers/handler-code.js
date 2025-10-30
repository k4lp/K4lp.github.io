/**
 * Code Execution Event Handlers
 * Execute and clear code execution buttons
 */

import { CodeExecutor } from '../../execution/code-executor.js';
import { qs } from '../../core/utils.js';

/**
 * Bind code execution handlers
 */
export function bindCodeHandlers() {
  const execBtn = qs('#execBtn');
  const clearExecBtn = qs('#clearExec');

  if (execBtn) {
    execBtn.addEventListener('click', () => CodeExecutor.run());
  }

  if (clearExecBtn) {
    clearExecBtn.addEventListener('click', () => CodeExecutor.clear());
  }
}
