/**
 * COMPACTION HANDLERS
 *
 * Event handlers for context compaction UI
 */

import { CompactionButton } from '../compaction/CompactionButton.js';

// Create singleton instance
const compactionButton = new CompactionButton();

/**
 * Bind compaction event handlers
 */
export function bindCompactionHandlers() {
  // Initialize compaction button
  compactionButton.init();

  console.log('[CompactionHandlers] Handlers bound');
}
