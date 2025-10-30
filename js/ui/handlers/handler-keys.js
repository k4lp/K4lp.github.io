/**
 * API Key Management Event Handlers
 * Key validation and clearing functionality
 */

import { Storage } from '../../storage/storage.js';
import { KeyManager } from '../../api/key-manager.js';
import { GeminiAPI } from '../../api/gemini-client.js';
import { Renderer } from '../renderer.js';
import { qs } from '../../core/utils.js';

/**
 * Bind API key management handlers
 */
export function bindKeyHandlers() {
  bindValidateKeys();
  bindClearKeys();
}

/**
 * Bind validate all keys button
 */
function bindValidateKeys() {
  const validateBtn = qs('#validateKeys');
  if (!validateBtn) return;

  validateBtn.addEventListener('click', async () => {
    // Update keypool from textarea first
    KeyManager.updateKeysFromTextarea();

    const pool = Storage.loadKeypool();
    if (pool.length === 0) {
      alert('Please add some API keys first');
      return;
    }

    // Show loading state
    validateBtn.textContent = `Validating ${pool.length} keys...`;
    validateBtn.disabled = true;

    try {
      // Validate all keys
      await KeyManager.validateAllKeys();
      await GeminiAPI.fetchModelList();
      Renderer.renderKeyStats();

      // Show results
      const stats = KeyManager.getKeyStats();
      if (stats.valid > 0) {
        console.log(`✅ Validation complete: ${stats.valid}/${stats.total} keys valid`);
      } else {
        console.warn('⚠️ No valid keys found');
      }
    } catch (error) {
      console.error('Validation error:', error);
      alert('Error during key validation. Check console for details.');
    } finally {
      // Reset button state
      validateBtn.textContent = 'Validate All';
      validateBtn.disabled = false;
    }
  });
}

/**
 * Bind clear all keys button
 */
function bindClearKeys() {
  const clearBtn = qs('#clearKeys');
  if (!clearBtn) return;

  clearBtn.addEventListener('click', () => {
    if (confirm('Clear ALL API keys? This cannot be undone.')) {
      KeyManager.clearAll();
      Renderer.renderKeys();
      console.log('🗑️ All API keys cleared');
    }
  });
}
