/**
 * Session Control Event Handlers
 * Run button and model selector functionality
 */

import { LoopController } from '../../control/loop-controller.js';
import { GeminiAPI } from '../../api/gemini-client.js';
import { qs } from '../../core/utils.js';

/**
 * Bind session control handlers
 */
export function bindSessionHandlers() {
  bindRunButton();
  bindModelSelector();
}

/**
 * Bind run/stop button
 */
function bindRunButton() {
  const runBtn = qs('#runQueryBtn');
  if (!runBtn) return;

  runBtn.addEventListener('click', () => {
    if (LoopController.isActive()) {
      LoopController.stopSession();
    } else {
      LoopController.startSession();
    }
  });
}

/**
 * Bind model selector to fetch models on focus
 */
function bindModelSelector() {
  const modelSelect = qs('#modelSelect');
  if (!modelSelect) return;

  modelSelect.addEventListener('focus', () => {
    // Only fetch if we don't have models yet
    if (modelSelect.options.length <= 1) {
      GeminiAPI.fetchModelList();
    }
  });
}
