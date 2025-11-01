/**
 * Modal Event Handlers
 * All modal open/close functionality
 */

import { closeTaskModal, closeMemoryModal, closeGoalModal, closeVaultModal } from '../modals.js';
import { qs } from '../../core/utils.js';

/**
 * Bind modal handlers for all modals
 */
export function bindModalHandlers() {
  // Task Modal
  const taskCloseBtn = qs('#taskModalClose');
  const taskModal = qs('#taskModal');

  if (taskCloseBtn) {
    taskCloseBtn.addEventListener('click', closeTaskModal);
  }

  if (taskModal) {
    taskModal.addEventListener('click', (e) => {
      if (e.target === taskModal) {
        closeTaskModal();
      }
    });
  }

  // Memory Modal
  const memoryCloseBtn = qs('#memoryModalClose');
  const memoryModal = qs('#memoryModal');

  if (memoryCloseBtn) {
    memoryCloseBtn.addEventListener('click', closeMemoryModal);
  }

  if (memoryModal) {
    memoryModal.addEventListener('click', (e) => {
      if (e.target === memoryModal) {
        closeMemoryModal();
      }
    });
  }

  // Goal Modal
  const goalCloseBtn = qs('#goalModalClose');
  const goalModal = qs('#goalModal');

  if (goalCloseBtn) {
    goalCloseBtn.addEventListener('click', closeGoalModal);
  }

  if (goalModal) {
    goalModal.addEventListener('click', (e) => {
      if (e.target === goalModal) {
        closeGoalModal();
      }
    });
  }

  // Vault Modal
  const vaultCloseBtn = qs('#vaultModalClose');
  const vaultModal = qs('#vaultModal');

  if (vaultCloseBtn) {
    vaultCloseBtn.addEventListener('click', closeVaultModal);
  }

  if (vaultModal) {
    vaultModal.addEventListener('click', (e) => {
      if (e.target === vaultModal) {
        closeVaultModal();
      }
    });
  }
}
