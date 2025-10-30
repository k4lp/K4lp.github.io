/**
 * API Keys Renderer
 * Handles all API key related rendering
 */

import { Storage } from '../../storage/storage.js';
import { KeyManager } from '../../api/key-manager.js';
import { qs, encodeHTML } from '../../core/utils.js';

/**
 * Render API keys interface with textarea and stats
 */
export function renderKeys() {
  const keysContainer = qs('#keysContainer');
  if (!keysContainer) return;

  const pool = Storage.loadKeypool();
  const stats = KeyManager.getKeyStats();
  const keysText = Storage.formatKeysToText(pool);

  keysContainer.innerHTML = `
    <div class="keys-input-section">
      <label for="apiKeysTextarea" class="keys-label">API Keys (one per line)</label>
      <textarea
        id="apiKeysTextarea"
        class="keys-textarea"
        placeholder="Paste your API keys here, one per line:\nAIzaSy...\nAIzaSy..."
        rows="6"
      >${encodeHTML(keysText)}</textarea>
      <div class="keys-hint">💡 Paste keys separated by newlines. Stats preserved automatically.</div>
    </div>

    <div class="keys-stats-section">
      <div class="stats-header">
        <h3>Key Pool Statistics</h3>
        <div class="stats-summary">
          <span class="stat-badge stat-total">${stats.total} total</span>
          <span class="stat-badge stat-ready">${stats.ready} ready</span>
          <span class="stat-badge stat-cooling">${stats.cooling} cooling</span>
          <span class="stat-badge stat-invalid">${stats.invalid} invalid</span>
        </div>
      </div>

      <div class="stats-details">
        <div class="stat-row">
          <span class="stat-label">Valid Keys:</span>
          <span class="stat-value">${stats.valid}/${stats.total}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Total Usage:</span>
          <span class="stat-value">${stats.totalUsage} calls</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Avg Failures:</span>
          <span class="stat-value">${stats.avgFailures.toFixed(1)}</span>
        </div>
      </div>

      ${stats.total === 0 ? '<div class="no-keys-message">No API keys added yet</div>' : ''}
    </div>
  `;

  // Bind textarea events
  const textarea = qs('#apiKeysTextarea');
  if (textarea) {
    textarea.addEventListener('input', () => {
      KeyManager.updateKeysFromTextarea();
      setTimeout(() => renderKeyStats(), 500);
    });
  }

  updateRotationPill();
}

/**
 * Update key stats only (for performance)
 */
export function renderKeyStats() {
  const statsSection = qs('.keys-stats-section');
  if (!statsSection) return;

  const stats = KeyManager.getKeyStats();
  const statsHTML = `
    <div class="stats-header">
      <h3>Key Pool Statistics</h3>
      <div class="stats-summary">
        <span class="stat-badge stat-total">${stats.total} total</span>
        <span class="stat-badge stat-ready">${stats.ready} ready</span>
        <span class="stat-badge stat-cooling">${stats.cooling} cooling</span>
        <span class="stat-badge stat-invalid">${stats.invalid} invalid</span>
      </div>
    </div>

    <div class="stats-details">
      <div class="stat-row">
        <span class="stat-label">Valid Keys:</span>
        <span class="stat-value">${stats.valid}/${stats.total}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Total Usage:</span>
        <span class="stat-value">${stats.totalUsage} calls</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Avg Failures:</span>
        <span class="stat-value">${stats.avgFailures.toFixed(1)}</span>
      </div>
    </div>

    ${stats.total === 0 ? '<div class="no-keys-message">No API keys added yet</div>' : ''}
  `;

  statsSection.innerHTML = statsHTML;
  updateRotationPill();
}

/**
 * Update key metadata display
 */
export function updateKeyMetadata() {
  renderKeyStats();
}

/**
 * Update rotation pill indicator
 */
export function updateRotationPill() {
  const rotPill = qs('#keyRotationPill');
  if (!rotPill) return;

  const nextKey = KeyManager.chooseActiveKey();
  const availableKeys = KeyManager.getAllAvailableKeys();

  rotPill.textContent = nextKey ?
    `NEXT: #${nextKey.slot} (${availableKeys.length} available)` :
    availableKeys.length > 0 ? `${availableKeys.length} keys cooling down` : 'NO KEY';
}

/**
 * Populate model dropdown with available models
 * @param {Array} modelsArray - Array of model objects
 */
export function populateModelDropdown(modelsArray) {
  const modelSelect = qs('#modelSelect');
  if (!modelSelect) return;

  const currentValue = modelSelect.value;
  modelSelect.innerHTML = `<option value="">-- select model --</option>`;

  modelsArray.forEach(m => {
    const label = (m.name || '').replace(/^models\//, '');
    const opt = document.createElement('option');
    opt.value = m.name;
    opt.textContent = label;
    modelSelect.appendChild(opt);
  });

  if (currentValue && modelsArray.some(m => m.name === currentValue)) {
    modelSelect.value = currentValue;
  } else if (modelsArray.length > 0) {
    const preferred = modelsArray.find(m => m.name.includes('gemini-1.5-pro')) || modelsArray[0];
    modelSelect.value = preferred.name;
  }
}
