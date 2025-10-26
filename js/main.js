/**
 * GEMINI DEEP RESEARCH SYSTEM - MAIN APPLICATION
 * Complete production runtime with LLM integration
 */

(function() {
  'use strict';

  // ... existing code (truncated for brevity in this diff) ...

  /**
   * EVENT BINDING
   */
  function bindEvents() {
    // Existing bindings ...

    // Clear buttons for Memory, Goals, Vault
    const clearMemoryBtn = qs('#clearMemory');
    if (clearMemoryBtn) {
      clearMemoryBtn.addEventListener('click', () => {
        if (confirm('Clear ALL memories? This cannot be undone.')) {
          localStorage.setItem('gdrs_memory', JSON.stringify([]));
          const log = Storage.loadReasoningLog();
          log.push('=== ACTION ===\nCleared all memories');
          Storage.saveReasoningLog(log);
          Renderer.renderMemories();
        }
      });
    }

    const clearGoalsBtn = qs('#clearGoals');
    if (clearGoalsBtn) {
      clearGoalsBtn.addEventListener('click', () => {
        if (confirm('Clear ALL goals? This cannot be undone.')) {
          localStorage.setItem('gdrs_goals', JSON.stringify([]));
          const log = Storage.loadReasoningLog();
          log.push('=== ACTION ===\nCleared all goals');
          Storage.saveReasoningLog(log);
          Renderer.renderGoals();
        }
      });
    }

    const clearVaultBtn = qs('#clearVault');
    if (clearVaultBtn) {
      clearVaultBtn.addEventListener('click', () => {
        if (confirm('Clear ALL data vault entries? This cannot be undone.')) {
          localStorage.setItem('gdrs_vault', JSON.stringify([]));
          const log = Storage.loadReasoningLog();
          log.push('=== ACTION ===\nCleared all data vault entries');
          Storage.saveReasoningLog(log);
          Renderer.renderVault();
        }
      });
    }
  }

  // ... rest of file remains unchanged ...
})();
