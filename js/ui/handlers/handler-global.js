/**
 * Global Event Handlers
 * Global keyboard shortcuts and application-wide events
 */

import { LS_KEYS } from '../../core/constants.js';
import { Storage } from '../../storage/storage.js';
import { ExcelRuntimeStore } from '../../excel/core/excel-store.js';

/**
 * Bind global event handlers
 */
export function bindGlobalHandlers() {
  bindClearAllDataHotkey();
  bindClearAllDataButton();
  bindCollapsibleSections();
}

/**
 * Bind Ctrl+Shift+D hotkey to clear all data
 */
function getKeepKeys() {
  return [
    LS_KEYS.SELECTED_MODEL,
    LS_KEYS.MAX_OUTPUT_TOKENS,
    LS_KEYS.KEYPOOL
  ];
}

function clearPersistedData() {
  if (!confirm('Clear all GDRS data (except keys/model/tokens)? This cannot be undone.')) {
    return;
  }
  Storage.clearAllExcept(getKeepKeys());
  ExcelRuntimeStore.clearWorkbook?.();
  localStorage.removeItem('attachmentStatusCache');
  location.reload();
}

function bindClearAllDataHotkey() {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      clearPersistedData();
    }
  });
}

function bindClearAllDataButton() {
  const btn = document.getElementById('clearAllDataBtn');
  if (!btn) return;
  btn.addEventListener('click', () => clearPersistedData());
}

/**
 * Bind collapsible section functionality
 */
function bindCollapsibleSections() {
  const toggleButtons = document.querySelectorAll('.collapse-toggle');

  toggleButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetId = button.getAttribute('data-target');
      const targetElement = document.getElementById(targetId);
      const parentBlock = button.closest('.block');

      if (parentBlock && targetElement) {
        parentBlock.classList.toggle('collapsed');
        button.textContent = parentBlock.classList.contains('collapsed') ? '+' : '−';
      }
    });
  });
}
