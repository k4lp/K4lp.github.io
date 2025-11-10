/**
 * GDRS UI Renderer - Re-export Layer
 * Backward compatible interface to modular renderer components
 *
 * Original 426 lines → 7 focused modules
 */

// Re-export the main Renderer interface from RendererCore
export { RendererCore as Renderer } from './renderer/renderer-core.js';

// Re-export individual render functions for direct access
export {
  renderKeys,
  renderKeyStats,
  updateKeyMetadata,
  updateRotationPill,
  populateModelDropdown
} from './renderer/renderer-keys.js';

export {
  renderTasks,
  renderMemories,
  renderGoals
} from './renderer/renderer-entities.js';

export {
  renderVault
} from './renderer/renderer-vault.js';

export {
  renderReasoningLog
} from './renderer/renderer-reasoning.js';

export {
  renderFinalOutput
} from './renderer/renderer-output.js';

export {
  renderEntityList,
  formatActivityDetails,
  getTypeColor,
  renderToolActivities
} from './renderer/renderer-helpers.js';

export {
  renderSubAgentStatus,
  renderSubAgentPanel
} from './renderer/renderer-subagent.js';
