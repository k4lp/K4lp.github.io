/**
 * Global Event Handlers
 * Global keyboard shortcuts and application-wide events
 */

import { LS_KEYS } from '../../core/constants.js';

/**
 * Bind global event handlers
 */
export function bindGlobalHandlers() {
  bindClearAllDataHotkey();
}

/**
 * Bind Ctrl+Shift+D hotkey to clear all data
 */
function bindClearAllDataHotkey() {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      if (confirm('Clear all GDRS data? This cannot be undone.')) {
        Object.values(LS_KEYS).forEach(key => localStorage.removeItem(key));
        location.reload();
      }
    }
  });
}
