/**
 * GDRS Modal Management
 * Vault modal and other popup management
 */

import { Storage } from '../storage/storage.js';
import { qs } from '../core/utils.js';

export function openVaultModal(vaultId) {
  const vault = Storage.loadVault();
  const entry = vault.find(v => v.identifier === vaultId);
  if (!entry) return;

  const modal = qs('#vaultModal');
  const idEl = qs('#vaultModalId');
  const typeEl = qs('#vaultModalType');
  const descEl = qs('#vaultModalDesc');
  const contentEl = qs('#vaultModalContent');

  if (idEl) idEl.textContent = entry.identifier;
  if (typeEl) typeEl.textContent = entry.type.toUpperCase();
  if (descEl) descEl.textContent = entry.description || '— no description —';
  if (contentEl) contentEl.textContent = entry.content;
  if (modal) modal.style.display = 'flex';
}

export function closeVaultModal() {
  const modal = qs('#vaultModal');
  if (modal) modal.style.display = 'none';
}
