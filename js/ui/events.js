/**
 * GDRS Event Handlers
 * All event binding and user interaction handlers - NOW WITH 65536 MAX TOKENS!
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
  // CRITICAL FIX: Add event-driven UI update system for memory and other components
  bindStorageEventListeners();
  
  // NEW: Extended Max Output Tokens input handling (512-65536)
  const maxTokensInput = qs('#maxOutputTokens');
  if (maxTokensInput) {
    maxTokensInput.value = Storage.loadMaxOutputTokens();
    
    maxTokensInput.addEventListener('change', () => {
      const value = parseInt(maxTokensInput.value);
      if (Storage.saveMaxOutputTokens(value)) {
        console.log(`⚙️ Max output tokens updated to: ${value}`);
      } else {
        maxTokensInput.value = Storage.loadMaxOutputTokens();
        alert('Invalid token count. Please enter a value between 512 and 65536.');
      }
    });
    
    maxTokensInput.addEventListener('input', () => {
      const value = parseInt(maxTokensInput.value);
      if (value < 512 || value > 65536 || isNaN(value)) {
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

  // Key management for unlimited textarea keys
  const validateBtn = qs('#validateKeys');
  const clearBtn = qs('#clearKeys');
  
  if (validateBtn) {
    validateBtn.addEventListener('click', async () => {
      // Update keypool from textarea first
      KeyManager.updateKeysFromTextarea();
      
      const pool = Storage.loadKeypool();
      if (pool.length === 0) {
        alert('Please add some API keys first');
        return;
      }
      
      validateBtn.textContent = `Validating ${pool.length} keys...`;
      validateBtn.disabled = true;
      
      try {
        await KeyManager.validateAllKeys();
        await GeminiAPI.fetchModelList();
        Renderer.renderKeyStats();
        
        const stats = KeyManager.getKeyStats();
        if (stats.valid > 0) {
          console.log(`\u2705 Validation complete: ${stats.valid}/${stats.total} keys valid`);
        } else {
          console.warn('\u26a0\ufe0f No valid keys found');
        }
      } catch (error) {
        console.error('Validation error:', error);
        alert('Error during key validation. Check console for details.');
      } finally {
        validateBtn.textContent = 'Validate All';
        validateBtn.disabled = false;
      }
    });
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear ALL API keys? This cannot be undone.')) {
        KeyManager.clearAll();
        Renderer.renderKeys();
        console.log('\ud83d\uddd1\ufe0f All API keys cleared');
      }
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

// CRITICAL FIX: Event-driven UI update system to fix memory rendering issues
function bindStorageEventListeners() {
  // Listen for custom storage events to trigger UI updates
  document.addEventListener('gdrs-memories-updated', () => {
    if (Renderer && Renderer.renderMemories) {
      Renderer.renderMemories();
      console.log('\ud83d\udd04 Memory UI updated via event');
    }
  });
  
  document.addEventListener('gdrs-tasks-updated', () => {
    if (Renderer && Renderer.renderTasks) {
      Renderer.renderTasks();
      console.log('\ud83d\udd04 Tasks UI updated via event');
    }
  });
  
  document.addEventListener('gdrs-goals-updated', () => {
    if (Renderer && Renderer.renderGoals) {
      Renderer.renderGoals();
      console.log('\ud83d\udd04 Goals UI updated via event');
    }
  });
  
  document.addEventListener('gdrs-vault-updated', () => {
    if (Renderer && Renderer.renderVault) {
      Renderer.renderVault();
      console.log('\ud83d\udd04 Vault UI updated via event');
    }
  });
  
  // Fallback: Listen for direct DOM element events
  const memoryList = qs('#memoryList');
  const tasksList = qs('#tasksList');
  const goalsList = qs('#goalsList');
  const vaultList = qs('#vaultList');
  
  if (memoryList) {
    memoryList.addEventListener('force-update', () => {
      if (Renderer && Renderer.renderMemories) {
        Renderer.renderMemories();
      }
    });
  }
  
  if (tasksList) {
    tasksList.addEventListener('force-update', () => {
      if (Renderer && Renderer.renderTasks) {
        Renderer.renderTasks();
      }
    });
  }
  
  if (goalsList) {
    goalsList.addEventListener('force-update', () => {
      if (Renderer && Renderer.renderGoals) {
        Renderer.renderGoals();
      }
    });
  }
  
  if (vaultList) {
    vaultList.addEventListener('force-update', () => {
      if (Renderer && Renderer.renderVault) {
        Renderer.renderVault();
      }
    });
  }
}