/**
 * Modal Event Handlers
 * Vault modal open/close functionality
 */

import { closeVaultModal } from '../modals.js';
import { qs } from '../../core/utils.js';

/**
 * Bind modal handlers for vault
 */
export function bindModalHandlers() {
  const closeModalBtn = qs('#vaultModalClose');
  const modal = qs('#vaultModal');

  // Close button
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeVaultModal);
  }

  // Click outside modal to close
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeVaultModal();
      }
    });
  }
}
