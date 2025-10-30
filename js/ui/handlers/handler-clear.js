/**
 * Clear Button Event Handlers
 * Clear buttons for memory, goals, and vault
 */

import { Storage } from '../../storage/storage.js';
import { qs } from '../../core/utils.js';

/**
 * Bind clear button handlers for memory, goals, and vault
 */
export function bindClearHandlers() {
  bindClearMemory();
  bindClearGoals();
  bindClearVault();
}

/**
 * Bind clear memory button
 */
function bindClearMemory() {
  const clearMemoryBtn = qs('#clearMemory');
  if (!clearMemoryBtn) return;

  clearMemoryBtn.addEventListener('click', () => {
    if (confirm('Clear ALL memories? This cannot be undone.')) {
      Storage.saveMemory([]);
      const log = Storage.loadReasoningLog();
      log.push('=== ACTION ===\nCleared all memories');
      Storage.saveReasoningLog(log);
    }
  });
}

/**
 * Bind clear goals button
 */
function bindClearGoals() {
  const clearGoalsBtn = qs('#clearGoals');
  if (!clearGoalsBtn) return;

  clearGoalsBtn.addEventListener('click', () => {
    if (confirm('Clear ALL goals? This cannot be undone.')) {
      Storage.saveGoals([]);
      const log = Storage.loadReasoningLog();
      log.push('=== ACTION ===\nCleared all goals');
      Storage.saveReasoningLog(log);
    }
  });
}

/**
 * Bind clear vault button
 */
function bindClearVault() {
  const clearVaultBtn = qs('#clearVault');
  if (!clearVaultBtn) return;

  clearVaultBtn.addEventListener('click', () => {
    if (confirm('Clear ALL data vault entries? This cannot be undone.')) {
      Storage.saveVault([]);
      const log = Storage.loadReasoningLog();
      log.push('=== ACTION ===\nCleared all data vault entries');
      Storage.saveReasoningLog(log);
    }
  });
}
