/**
 * GDRS Vault Manager
 * Vault-specific operations and validation
 */

import { isNonEmptyString } from '../core/utils.js';
import { Storage } from './storage.js';

export const VaultManager = {
  resolveVaultRefsInText(inputText) {
    if (!isNonEmptyString(inputText)) return inputText;
    const regex = /{{<vaultref\s+id=["']([^"']+)["']\s*\/>}}/g;
    const vault = Storage.loadVault();

    return inputText.replace(regex, (match, vaultId) => {
      const entry = vault.find(v => v.identifier === vaultId);
      if (!entry) {
        console.warn(`⚠️ Missing vault reference: ${vaultId}`);
        return `/* [MISSING_VAULT:${vaultId}] */`;
      }
      return entry.content || '';
    });
  },

  getVaultSummary() {
    const vault = Storage.loadVault();
    return vault.map(v => `- [${v.identifier}] ${v.type}: ${v.description || 'No description'}`).join('\n');
  },

  getVaultEntry(id, limit = null) {
    const vault = Storage.loadVault();
    const entry = vault.find(v => v.identifier === id);
    if (!entry) return null;
    
    let content = entry.content;
    if (limit && limit !== 'full-length') {
      const limitNum = parseInt(limit) || 100;
      content = content.substring(0, limitNum) + (content.length > limitNum ? '...' : '');
    }
    
    return { ...entry, content };
  },

  validateVaultIntegrity() {
    const vault = Storage.loadVault();
    const issues = [];
    
    vault.forEach((entry, index) => {
      if (!entry.identifier) {
        issues.push(`Entry ${index}: Missing identifier`);
      }
      if (!entry.type) {
        issues.push(`Entry ${index}: Missing type`);
      }
      if (entry.content === undefined) {
        issues.push(`Entry ${index}: Missing content`);
      }
    });
    
    return issues;
  }
};
