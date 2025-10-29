/**
 * GDRS Event Handlers
 * All event binding and user interaction handlers
 */

import { Storage } from '../storage/storage.js';
import { KeyManager } from '../api/key-manager.js';
import { GeminiAPI } from '../api/gemini-client.js';
import { LoopController } from '../control/loop-controller.js';
import { CodeExecutor } from '../execution/code-executor.js';
import { Renderer } from './renderer.js';
import { closeVaultModal } from './modals.js';
import { LS_KEYS } from '../core/constants.js';
import { qs } from '../core/utils.js';

export function bindEvents() {
  // Max Output Tokens input handling
  const maxTokensInput = qs('#maxOutputTokens');
  if (maxTokensInput) {
    maxTokensInput.value = Storage.loadMaxOutputTokens();
    
    maxTokensInput.addEventListener('change', () => {
      const value = parseInt(maxTokensInput.value);
      if (Storage.saveMaxOutputTokens(value)) {
        console.log(`⚙️ Max output tokens updated to: ${value}`);
      } else {
        maxTokensInput.value = Storage.loadMaxOutputTokens();
        alert('Invalid token count. Please enter a value between 512 and 8192.');
      }
    });
    
    maxTokensInput.addEventListener('input', () => {
      const value = parseInt(maxTokensInput.value);
      if (value < 512 || value > 8192 || isNaN(value)) {
        maxTokensInput.style.borderColor = 'var(--error)';
      } else {
        maxTokensInput.style.borderColor = '';
      }
    });
  }

  // Clear buttons for Memory, Goals, Vault
  const clearMemoryBtn = qs('#clearMemory');
  if (clearMemoryBtn) {
    clearMemoryBtn.addEventListener('click', () => {
      if (confirm('Clear ALL memories? This cannot be undone.')) {
        Storage.saveMemory([]);
        const log = Storage.loadReasoningLog();
        log.push('=== ACTION ===\nCleared all memories');
        Storage.saveReasoningLog(log);
      }
    });
  }

  const clearGoalsBtn = qs('#clearGoals');
  if (clearGoalsBtn) {
    clearGoalsBtn.addEventListener('click', () => {
      if (confirm('Clear ALL goals? This cannot be undone.')) {
        Storage.saveGoals([]);
        const log = Storage.loadReasoningLog();
        log.push('=== ACTION ===\nCleared all goals');
        Storage.saveReasoningLog(log);
      }
    });
  }

  const clearVaultBtn = qs('#clearVault');
  if (clearVaultBtn) {
    clearVaultBtn.addEventListener('click', () => {
      if (confirm('Clear ALL data vault entries? This cannot be undone.')) {
        Storage.saveVault([]);
        const log = Storage.loadReasoningLog();
        log.push('=== ACTION ===\nCleared all data vault entries');
        Storage.saveReasoningLog(log);
      }
    });
  }
  
  // Run buttons
  const runBtn = qs('#runQueryBtn');
  if (runBtn) {
    runBtn.addEventListener('click', () => {
      if (LoopController.isActive()) {
        LoopController.stopSession();
      } else {
        LoopController.startSession();
      }
    });
  }

  // Key management
  const validateBtn = qs('#validateKeys');
  const clearBtn = qs('#clearKeys');
  if (validateBtn) {
    validateBtn.addEventListener('click', async () => {
      validateBtn.textContent = 'validating...';
      await KeyManager.validateAllKeys();
      await GeminiAPI.fetchModelList();
      Renderer.renderKeys();
      validateBtn.textContent = 'Validate';
    });
  }
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      KeyManager.clearAll();
      Renderer.renderKeys();
    });
  }

  // Model selector
  const modelSelect = qs('#modelSelect');
  if (modelSelect) {
    modelSelect.addEventListener('focus', () => {
      if (modelSelect.options.length <= 1) {
        GeminiAPI.fetchModelList();
      }
    });
  }

  // Code execution
  const execBtn = qs('#execBtn');
  const clearExecBtn = qs('#clearExec');
  if (execBtn) execBtn.addEventListener('click', () => CodeExecutor.run());
  if (clearExecBtn) clearExecBtn.addEventListener('click', () => CodeExecutor.clear());

  // Export
  const exportBtn = qs('#exportTxt');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const output = Storage.loadFinalOutput();
      const text = output.html
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"');
      
      const blob = new Blob([`GDRS Analysis Report\n${'='.repeat(50)}\n\n${text}`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gdrs-analysis-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Vault modal
  const closeModalBtn = qs('#vaultModalClose');
  const modal = qs('#vaultModal');
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeVaultModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeVaultModal();
    });
  }

  // Clear all data (for testing)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      if (confirm('Clear all GDRS data? This cannot be undone.')) {
        Object.values(LS_KEYS).forEach(key => localStorage.removeItem(key));
        location.reload();
      }
    }
  });
}