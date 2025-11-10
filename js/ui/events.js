/**
 * GDRS Event Handlers
 * Main coordinator for all event binding
 *
 * This module coordinates event handler registration across the application.
 * Individual handlers are organized in the handlers/ directory by responsibility.
 */

import { bindConfigHandlers } from './handlers/handler-config.js';
import { bindClearHandlers } from './handlers/handler-clear.js';
import { bindKeyHandlers } from './handlers/handler-keys.js';
import { bindSessionHandlers } from './handlers/handler-session.js';
import { bindCodeHandlers } from './handlers/handler-code.js';
import { bindExportHandler } from './handlers/handler-export.js';
import { bindModalHandlers } from './handlers/handler-modal.js';
import { bindStorageHandlers } from './handlers/handler-storage.js';
import { bindAttachmentHandlers } from './handlers/handler-attachments.js';
import { bindGlobalHandlers } from './handlers/handler-global.js';
import { bindSubAgentHandlers } from './handlers/handler-subagent.js';

/**
 * Bind all application event handlers
 * Called once during application initialization
 */
export function bindEvents() {
  // Storage event listeners (must be first for reactive UI updates)
  bindStorageHandlers();
  bindAttachmentHandlers();

  // Configuration handlers
  bindConfigHandlers();

  // Clear button handlers
  bindClearHandlers();

  // API key management handlers
  bindKeyHandlers();

  // Session control handlers
  bindSessionHandlers();

  // Code execution handlers
  bindCodeHandlers();

  // Export handlers
  bindExportHandler();

  // Modal handlers
  bindModalHandlers();

  // Global keyboard shortcuts
  bindGlobalHandlers();

  // Sub-agent controls
  bindSubAgentHandlers();
}
