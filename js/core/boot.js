/**
 * GDRS Boot Sequence and Initialization
 * Application startup, data migration, initial setup
 */

import { VERSION, LS_KEYS, DEFAULT_KEYPOOL } from './constants.js';
import { Storage } from '../storage/storage.js';
import { VaultManager } from '../storage/vault-manager.js';
import { KeyManager } from '../api/key-manager.js';
import { GeminiAPI } from '../api/gemini-client.js';
import { Renderer } from '../ui/renderer.js';
import { bindEvents } from '../ui/events.js';

/**
 * Cooldown ticker that preserves focus
 */
function startCooldownTicker() {
  setInterval(() => {
    Renderer.updateKeyMetadata();
  }, 1000);
}

/**
 * BOOT SEQUENCE
 */
export function boot() {
  console.log('%cGDRS Runtime Core v' + VERSION + ' - Booting...', 'color: #00ff00; font-weight: bold;');

  // Initialize storage if needed
  if (!localStorage.getItem(LS_KEYS.META)) {
    localStorage.setItem(LS_KEYS.META, JSON.stringify({ version: VERSION }));
    Storage.saveKeypool(DEFAULT_KEYPOOL());
    Storage.saveGoals([]);
    Storage.saveMemory([]);
    Storage.saveTasks([]);
    Storage.saveVault([]);
    Storage.saveFinalOutput('');
    Storage.saveReasoningLog([]);
    Storage.saveCurrentQuery('');
    Storage.saveExecutionLog([]);
    Storage.saveToolActivityLog([]);
    Storage.saveLastExecutedCode('');
    if (!localStorage.getItem(LS_KEYS.MAX_OUTPUT_TOKENS)) {
      Storage.saveMaxOutputTokens(4096);
    }
    console.log('%cGDRS - Fresh installation initialized', 'color: #ffaa00;');
  }

  // Check vault integrity on boot
  const vaultIssues = VaultManager.validateVaultIntegrity();
  if (vaultIssues.length > 0) {
    console.warn('Vault integrity issues:', vaultIssues);
  }

  // Initial render
  Renderer.renderAll();

  // Bind events
  bindEvents();

  // Start tickers
  startCooldownTicker();

  // Auto-fetch models if we have keys
  setTimeout(() => {
    const activeKey = KeyManager.chooseActiveKey();
    if (activeKey) {
      GeminiAPI.fetchModelList();
    }
  }, 1000);

  console.log('%cGDRS Runtime Core - Ready for Intelligent Deep Research', 'color: #00ff00; font-weight: bold;');
  console.log('%cModular Architecture: All modules loaded successfully!', 'color: #00aa00;');
}
