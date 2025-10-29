/**
 * GDRS Storage Layer
 * All CRUD operations for local storage management
 */

import { LS_KEYS, DEFAULT_KEYPOOL, createKeyFromText } from '../core/constants.js';
import { safeJSONParse, isNonEmptyString, nowISO } from '../core/utils.js';
import { Renderer } from '../ui/renderer.js';

export const Storage = {
  // NEW: Keypool management for unlimited keys
  loadKeypool() {
    const raw = safeJSONParse(localStorage.getItem(LS_KEYS.KEYPOOL), null);
    if (!Array.isArray(raw)) {
      const seed = DEFAULT_KEYPOOL();
      localStorage.setItem(LS_KEYS.KEYPOOL, JSON.stringify(seed));
      return seed;
    }
    return this.normalizeKeypool(raw);
  },

  saveKeypool(pool) {
    localStorage.setItem(LS_KEYS.KEYPOOL, JSON.stringify(pool));
  },

  // NEW: Parse keys from textarea and create keypool
  parseKeysFromText(keysText) {
    if (!keysText || typeof keysText !== 'string') return [];
    
    const lines = keysText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    return lines.map((keyText, index) => createKeyFromText(keyText, index));
  },

  // NEW: Convert keypool back to textarea format
  formatKeysToText(pool) {
    if (!Array.isArray(pool)) return '';
    return pool.map(k => k.key).join('\n');
  },

  // NEW: Update keypool from textarea input
  updateKeysFromText(keysText) {
    const oldPool = this.loadKeypool();
    const newKeys = this.parseKeysFromText(keysText);
    
    // Preserve stats for existing keys
    const updatedPool = newKeys.map(newKey => {
      const existing = oldPool.find(oldKey => oldKey.key === newKey.key);
      if (existing) {
        // Keep existing stats but update slot number
        return {
          ...existing,
          slot: newKey.slot
        };
      } else {
        // New key with default stats
        return newKey;
      }
    });
    
    this.saveKeypool(updatedPool);
    return updatedPool;
  },

  normalizeKeypool(arr) {
    // Ensure all key objects have required properties
    return arr.map((k, index) => ({
      slot: index + 1,
      key: isNonEmptyString(k.key) ? k.key.trim() : '',
      usage: Number(k.usage || 0),
      cooldownUntil: Number(k.cooldownUntil || 0),
      rateLimited: !!k.rateLimited,
      valid: !!k.valid,
      failureCount: Number(k.failureCount || 0),
      lastFailure: Number(k.lastFailure || 0),
      addedAt: Number(k.addedAt || Date.now())
    }));
  },

  // NEW: Max Output Tokens management with higher limit
  loadMaxOutputTokens() {
    const stored = localStorage.getItem(LS_KEYS.MAX_OUTPUT_TOKENS);
    if (stored) {
      const value = parseInt(stored);
      if (value >= 512 && value <= 65536) {
        return value;
      }
    }
    return 4096; // Default value
  },
  
  saveMaxOutputTokens(tokens) {
    const value = parseInt(tokens);
    if (value >= 512 && value <= 65536) {
      localStorage.setItem(LS_KEYS.MAX_OUTPUT_TOKENS, String(value));
      return true;
    }
    return false;
  },

  // Entity storage
  loadGoals() {
    return safeJSONParse(localStorage.getItem(LS_KEYS.GOALS), []) || [];
  },
  saveGoals(goals) {
    localStorage.setItem(LS_KEYS.GOALS, JSON.stringify(goals));
    setTimeout(() => Renderer.renderGoals(), 0);
  },

  loadMemory() {
    return safeJSONParse(localStorage.getItem(LS_KEYS.MEMORY), []) || [];
  },
  saveMemory(memory) {
    localStorage.setItem(LS_KEYS.MEMORY, JSON.stringify(memory));
    setTimeout(() => Renderer.renderMemories(), 0);
  },

  loadTasks() {
    return safeJSONParse(localStorage.getItem(LS_KEYS.TASKS), []) || [];
  },
  saveTasks(tasks) {
    localStorage.setItem(LS_KEYS.TASKS, JSON.stringify(tasks));
    setTimeout(() => Renderer.renderTasks(), 0);
  },

  loadVault() {
    const vault = safeJSONParse(localStorage.getItem(LS_KEYS.VAULT), []) || [];
    return vault.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  },
  
  saveVault(vault) {
    const validatedVault = vault.filter(entry => {
      return entry && 
             typeof entry === 'object' && 
             entry.identifier && 
             entry.type && 
             entry.content !== undefined;
    }).map(entry => ({
      identifier: String(entry.identifier || '').trim(),
      type: String(entry.type || 'text').toLowerCase(),
      description: String(entry.description || '').trim(),
      content: entry.content || '',
      createdAt: entry.createdAt || nowISO(),
      updatedAt: nowISO()
    }));
    
    localStorage.setItem(LS_KEYS.VAULT, JSON.stringify(validatedVault));
    setTimeout(() => Renderer.renderVault(), 0);
  },

  // Output and logs
  loadFinalOutput() {
    return safeJSONParse(localStorage.getItem(LS_KEYS.FINAL_OUTPUT), {
      timestamp: '\u2014',
      html: '<p>Report will render here after goal validation.</p>'
    });
  },
  saveFinalOutput(htmlString) {
    const outObj = {
      timestamp: nowISO(),
      html: htmlString || ''
    };
    localStorage.setItem(LS_KEYS.FINAL_OUTPUT, JSON.stringify(outObj));
  },

  loadReasoningLog() {
    return safeJSONParse(localStorage.getItem(LS_KEYS.REASONING_LOG), []) || [];
  },
  saveReasoningLog(log) {
    localStorage.setItem(LS_KEYS.REASONING_LOG, JSON.stringify(log));
  },

  loadCurrentQuery() {
    return localStorage.getItem(LS_KEYS.CURRENT_QUERY) || '';
  },
  saveCurrentQuery(query) {
    localStorage.setItem(LS_KEYS.CURRENT_QUERY, query || '');
  },

  // Execution log storage
  loadExecutionLog() {
    return safeJSONParse(localStorage.getItem(LS_KEYS.EXECUTION_LOG), []) || [];
  },
  saveExecutionLog(log) {
    localStorage.setItem(LS_KEYS.EXECUTION_LOG, JSON.stringify(log));
  },
  
  appendExecutionResult(result) {
    const log = this.loadExecutionLog();
    log.push({
      timestamp: nowISO(),
      ...result
    });
    this.saveExecutionLog(log);
  },

  loadLastExecutedCode() {
    return localStorage.getItem(LS_KEYS.LAST_EXECUTED_CODE) || '';
  },
  saveLastExecutedCode(code) {
    localStorage.setItem(LS_KEYS.LAST_EXECUTED_CODE, code || '');
  },

  // Tool Activity Log
  loadToolActivityLog() {
    return safeJSONParse(localStorage.getItem(LS_KEYS.TOOL_ACTIVITY_LOG), []) || [];
  },
  saveToolActivityLog(log) {
    localStorage.setItem(LS_KEYS.TOOL_ACTIVITY_LOG, JSON.stringify(log));
  },
  appendToolActivity(activity) {
    const log = this.loadToolActivityLog();
    log.push({
      timestamp: nowISO(),
      iteration: window.GDRS?.currentIteration || 0,
      ...activity
    });
    if (log.length > 500) log.splice(0, log.length - 500);
    this.saveToolActivityLog(log);
  }
};