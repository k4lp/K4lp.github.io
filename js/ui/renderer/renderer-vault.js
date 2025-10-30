/**
 * Vault Renderer
 * Handles vault entry rendering and modal binding
 */

import { Storage } from '../../storage/storage.js';
import { qs, qsa, encodeHTML } from '../../core/utils.js';
import { openVaultModal } from '../modals.js';
import { getTypeColor } from './renderer-helpers.js';

/**
 * Render vault entries list
 */
export function renderVault() {
  const vault = Storage.loadVault();
  const vaultEl = qs('#vaultList');
  if (!vaultEl) return;

  if (vault.length === 0) {
    vaultEl.innerHTML = '<div class="storage-placeholder">No vault entries yet - Complex data and code will be stored here</div>';
    return;
  }

  vaultEl.innerHTML = vault.map(v => {
    const timestamp = v.createdAt ? new Date(v.createdAt).toLocaleTimeString() : '—';
    const dataSize = String(v.content || '').length;
    return `
      <div class="li" data-vault-id="${encodeHTML(v.identifier)}">
        <div>
          <div class="mono">${encodeHTML(v.identifier)}</div>
          <div class="pm">${encodeHTML(v.description || 'No description')}</div>
          <div class="pm" style="font-size: 0.8em; color: #666;">Created: ${timestamp} • Size: ${dataSize} chars</div>
        </div>
        <div class="status" style="background: ${getTypeColor(v.type)}">
          ${encodeHTML(v.type.toUpperCase())}
        </div>
      </div>
    `;
  }).join('');

  // Bind vault modal handlers
  qsa('[data-vault-id]', vaultEl).forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-vault-id');
      openVaultModal(id);
    });
  });
}
