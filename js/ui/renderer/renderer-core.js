/**
 * GDRS UI Renderer Core
 * Main rendering coordinator with event-driven architecture
 */

import { CodeExecutor } from '../../execution/code-executor.js';
import { eventBus, Events } from '../../core/event-bus.js';
import { renderKeys, renderKeyStats, updateKeyMetadata, updateRotationPill, populateModelDropdown } from './renderer-keys.js';
import { renderTasks, renderMemories, renderGoals } from './renderer-entities.js';
import { renderVault } from './renderer-vault.js';
import { renderReasoningLog } from './renderer-reasoning.js';
import { renderFinalOutput } from './renderer-output.js';

/**
 * Renderer Core object
 */
export const RendererCore = {
  /**
   * Initialize event-driven rendering
   */
  init() {
    this.bindEventListeners();
    console.log('🎨 Renderer initialized with event bus');
  },

  /**
   * Bind event listeners for automatic UI updates
   */
  bindEventListeners() {
    eventBus.on(Events.MEMORY_UPDATED, () => renderMemories());
    eventBus.on(Events.TASKS_UPDATED, () => renderTasks());
    eventBus.on(Events.GOALS_UPDATED, () => renderGoals());
    eventBus.on(Events.VAULT_UPDATED, () => renderVault());
    eventBus.on(Events.FINAL_OUTPUT_UPDATED, () => renderFinalOutput());
    eventBus.on(Events.UI_REFRESH_REQUEST, () => this.renderAll());
  },

  /**
   * Render all UI components
   */
  renderAll() {
    renderKeys();
    renderTasks();
    renderMemories();
    renderGoals();
    renderVault();
    renderReasoningLog();
    renderFinalOutput();
    CodeExecutor.restoreLastExecutedCode();

    eventBus.emit(Events.UI_REFRESH_COMPLETE);
  },

  // Export individual render functions for backward compatibility
  renderKeys,
  renderKeyStats,
  updateKeyMetadata,
  updateRotationPill,
  populateModelDropdown,
  renderTasks,
  renderMemories,
  renderGoals,
  renderVault,
  renderReasoningLog,
  renderFinalOutput
};
