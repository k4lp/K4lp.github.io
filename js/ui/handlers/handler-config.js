/**
 * Configuration Event Handlers
 * Max output tokens input handling and validation
 */

import { Storage } from '../../storage/storage.js';
import { qs } from '../../core/utils.js';
import { renderSubAgentStatus, renderSubAgentPanel } from '../renderer/renderer-subagent.js';

/**
 * Bind max output tokens input handlers
 */
export function bindConfigHandlers() {
  const maxTokensInput = qs('#maxOutputTokens');
  if (!maxTokensInput) return;

  // Load saved value
  maxTokensInput.value = Storage.loadMaxOutputTokens();

  // Handle change event (save valid values)
  maxTokensInput.addEventListener('change', () => {
    const value = parseInt(maxTokensInput.value);
    if (Storage.saveMaxOutputTokens(value)) {
      console.log(`⚙️ Max output tokens updated to: ${value}`);
    } else {
      // Revert to previous valid value
      maxTokensInput.value = Storage.loadMaxOutputTokens();
      alert('Invalid token count. Please enter a value between 512 and 65536.');
    }
  });

  // Handle input event (visual validation feedback)
  maxTokensInput.addEventListener('input', () => {
    const value = parseInt(maxTokensInput.value);
    if (value < 512 || value > 65536 || isNaN(value)) {
      maxTokensInput.style.borderColor = 'var(--error)';
    } else {
      maxTokensInput.style.borderColor = '';
    }
  });

  const subAgentToggle = qs('#enableSubAgent');
  const excelHelpersToggle = qs('#enableExcelHelpers');
  const groqKeysInput = qs('#groqApiKeys');
  const subAgentSettings = Storage.loadSubAgentSettings();

  if (subAgentToggle) {
    subAgentToggle.checked = !!subAgentSettings.enableSubAgent;
    subAgentToggle.addEventListener('change', () => {
      Storage.saveSubAgentSettings({ enableSubAgent: subAgentToggle.checked });
      if (!subAgentToggle.checked) {
        Storage.clearSubAgentLastResult();
      }
      renderSubAgentStatus();
    });
  }

  if (excelHelpersToggle) {
    excelHelpersToggle.checked = !!subAgentSettings.enableExcelHelpers;
    excelHelpersToggle.addEventListener('change', () => {
      Storage.saveSubAgentSettings({ enableExcelHelpers: excelHelpersToggle.checked });
      renderSubAgentStatus();
      renderSubAgentPanel();
    });
  }

  if (groqKeysInput) {
    groqKeysInput.value = (Storage.loadGroqApiKeys?.() || []).join('\n');
    groqKeysInput.addEventListener('change', () => {
      Storage.saveGroqApiKeys(groqKeysInput.value || '');
    });
  }

  renderSubAgentStatus();
  renderSubAgentPanel();
}
