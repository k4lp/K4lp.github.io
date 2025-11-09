/**
 * Session Control Event Handlers
 * Run button and model selector functionality
 */

import { LoopController } from '../../control/loop-controller.js';
import { GeminiAPI } from '../../api/gemini-client.js';
import { Storage } from '../../storage/storage.js';
import { qs } from '../../core/utils.js';

/**
 * Bind session control handlers
 */
export function bindSessionHandlers() {
  bindRunButton();
  bindStickyStopButton();
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
 * Bind sticky stop button in status bar
 */
function bindStickyStopButton() {
  const stickyStopBtn = qs('#stickyStopBtn');
  if (!stickyStopBtn) return;

  stickyStopBtn.addEventListener('click', () => {
    LoopController.stopSession();
  });
}

/**
 * Bind model selector to fetch models on focus
 */
function bindModelSelector() {
  const modelSelect = qs('#modelSelect');
  if (!modelSelect) return;

  hydrateModelSelection(modelSelect);

  modelSelect.addEventListener('focus', () => {
    // Only fetch if we don't have models yet
    if (modelSelect.options.length <= 1) {
      GeminiAPI.fetchModelList();
    }
  });

  modelSelect.addEventListener('change', () => {
    persistModelSelection(modelSelect, 'ui:manual-select');
  });
}

function hydrateModelSelection(selectEl) {
  const saved = Storage.loadSelectedModelInfo();
  if (!saved?.id) return;

  const hasOption = Array.from(selectEl.options).some(opt => opt.value === saved.id);
  if (!hasOption) {
    const syntheticOption = document.createElement('option');
    syntheticOption.value = saved.id;
    syntheticOption.textContent = saved.label || saved.id.replace(/^models\//, '');
    syntheticOption.dataset.synthetic = 'true';
    selectEl.appendChild(syntheticOption);
  }
  selectEl.value = saved.id;
}

function persistModelSelection(selectEl, source = 'ui') {
  const value = selectEl.value;
  if (!value) {
    Storage.clearSelectedModel();
    return;
  }

  const label = selectEl.selectedOptions?.[0]?.textContent || value.replace(/^models\//, '');
  Storage.saveSelectedModel(value, { label, source });
}
