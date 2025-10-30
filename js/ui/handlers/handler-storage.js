/**
 * Storage Event Handlers
 * Event-driven UI update system for reactive rendering
 */

import { Renderer } from '../renderer.js';
import { qs } from '../../core/utils.js';

/**
 * Bind storage event listeners for reactive UI updates
 * CRITICAL FIX: Event-driven UI update system to fix memory rendering issues
 */
export function bindStorageHandlers() {
  bindCustomStorageEvents();
  bindFallbackDOMEvents();
}

/**
 * Listen for custom storage events to trigger UI updates
 */
function bindCustomStorageEvents() {
  document.addEventListener('gdrs-memories-updated', () => {
    if (Renderer && Renderer.renderMemories) {
      Renderer.renderMemories();
      console.log('🔄 Memory UI updated via event');
    }
  });

  document.addEventListener('gdrs-tasks-updated', () => {
    if (Renderer && Renderer.renderTasks) {
      Renderer.renderTasks();
      console.log('🔄 Tasks UI updated via event');
    }
  });

  document.addEventListener('gdrs-goals-updated', () => {
    if (Renderer && Renderer.renderGoals) {
      Renderer.renderGoals();
      console.log('🔄 Goals UI updated via event');
    }
  });

  document.addEventListener('gdrs-vault-updated', () => {
    if (Renderer && Renderer.renderVault) {
      Renderer.renderVault();
      console.log('🔄 Vault UI updated via event');
    }
  });
}

/**
 * Fallback: Listen for direct DOM element events
 */
function bindFallbackDOMEvents() {
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
