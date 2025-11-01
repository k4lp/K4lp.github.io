/**
 * GDRS UI Renderer Core - FIXED VERSION
 * Main rendering coordinator with event-driven architecture
 * FIXES: Proper event binding, debugging, initialization checks
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
  initialized: false,

  /**
   * Initialize event-driven rendering
   */
  init() {
    if (this.initialized) {
      console.warn('🎨 Renderer already initialized, skipping...');
      return;
    }
    
    this.bindEventListeners();
    this.initialized = true;
    console.log('🎨 Renderer initialized with event bus');
    
    // Enable debug mode for troubleshooting
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('🐛 Debug mode enabled for local development');
      window.GDRS_DEBUG_EVENTS = true;
    }
  },

  /**
   * Bind event listeners for automatic UI updates
   */
  bindEventListeners() {
    // Clear any existing listeners first to prevent duplicates
    eventBus.removeAllListeners(Events.MEMORY_UPDATED);
    eventBus.removeAllListeners(Events.TASKS_UPDATED);
    eventBus.removeAllListeners(Events.GOALS_UPDATED);
    eventBus.removeAllListeners(Events.VAULT_UPDATED);
    eventBus.removeAllListeners(Events.FINAL_OUTPUT_UPDATED);
    eventBus.removeAllListeners(Events.UI_REFRESH_REQUEST);
    
    // Bind with debugging
    eventBus.on(Events.MEMORY_UPDATED, (data) => {
      if (window.GDRS_DEBUG_EVENTS) {
        console.log('📢 [Event] MEMORY_UPDATED received, rendering...', data?.length || 0, 'items');
      }
      renderMemories();
    });
    
    eventBus.on(Events.TASKS_UPDATED, (data) => {
      if (window.GDRS_DEBUG_EVENTS) {
        console.log('📢 [Event] TASKS_UPDATED received, rendering...', data?.length || 0, 'items');
      }
      renderTasks();
    });
    
    eventBus.on(Events.GOALS_UPDATED, (data) => {
      if (window.GDRS_DEBUG_EVENTS) {
        console.log('📢 [Event] GOALS_UPDATED received, rendering...', data?.length || 0, 'items');
      }
      renderGoals();
    });
    
    eventBus.on(Events.VAULT_UPDATED, (data) => {
      if (window.GDRS_DEBUG_EVENTS) {
        console.log('📢 [Event] VAULT_UPDATED received, rendering...', data?.length || 0, 'items');
      }
      renderVault();
    });
    
    eventBus.on(Events.FINAL_OUTPUT_UPDATED, (data) => {
      if (window.GDRS_DEBUG_EVENTS) {
        console.log('📢 [Event] FINAL_OUTPUT_UPDATED received');
      }
      renderFinalOutput();
    });
    
    eventBus.on(Events.UI_REFRESH_REQUEST, () => {
      if (window.GDRS_DEBUG_EVENTS) {
        console.log('📢 [Event] UI_REFRESH_REQUEST received, rendering all...');
      }
      this.renderAll();
    });
    
    console.log('✅ Event listeners bound successfully');
  },

  /**
   * Render all UI components
   */
  renderAll() {
    if (window.GDRS_DEBUG_EVENTS) {
      console.log('🔄 Rendering all UI components...');
    }
    
    renderKeys();
    renderTasks();
    renderMemories();
    renderGoals();
    renderVault();
    renderReasoningLog();
    renderFinalOutput();
    CodeExecutor.restoreLastExecutedCode();
    
    eventBus.emit(Events.UI_REFRESH_COMPLETE);
    
    if (window.GDRS_DEBUG_EVENTS) {
      console.log('✅ UI render complete');
    }
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
