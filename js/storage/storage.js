/**
 * GDRS Storage Layer
 * All CRUD operations for local storage management
 */

import { LS_KEYS, DEFAULT_KEYPOOL, createKeyFromText } from '../core/constants.js';
import { safeJSONParse, isNonEmptyString, nowISO } from '../core/utils.js';
// CRITICAL FIX: Remove Renderer import to avoid circular dependency
// import { Renderer } from '../ui/renderer.js';

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

  // CRITICAL FIX: Entity storage with immediate rendering (no setTimeout) + fallback mechanisms
  loadGoals() {
    return safeJSONParse(localStorage.getItem(LS_KEYS.GOALS), []) || [];
  },
  saveGoals(goals) {
    localStorage.setItem(LS_KEYS.GOALS, JSON.stringify(goals));
    // CRITICAL FIX: Force immediate render with fallback
    this._forceRender('renderGoals');
  },

  loadMemory() {
    return safeJSONParse(localStorage.getItem(LS_KEYS.MEMORY), []) || [];
  },
  saveMemory(memory) {
    localStorage.setItem(LS_KEYS.MEMORY, JSON.stringify(memory));
    // CRITICAL FIX: Force immediate render with fallback
    this._forceRender('renderMemories');
  },

  loadTasks() {
    return safeJSONParse(localStorage.getItem(LS_KEYS.TASKS), []) || [];
  },
  saveTasks(tasks) {
    localStorage.setItem(LS_KEYS.TASKS, JSON.stringify(tasks));
    // CRITICAL FIX: Force immediate render with fallback
    this._forceRender('renderTasks');
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
    // CRITICAL FIX: Force immediate render with fallback
    this._forceRender('renderVault');
  },

  // CRITICAL FIX: Universal render method with multiple fallback strategies
  _forceRender(methodName) {
    try {
      // Strategy 1: Direct window.GDRS access
      if (typeof window !== 'undefined' && window.GDRS?.Renderer?.[methodName]) {
        window.GDRS.Renderer[methodName]();
        return;
      }
      
      // Strategy 2: Event-based fallback
      if (typeof window !== 'undefined') {
        const eventName = methodName.replace('render', '').toLowerCase() + '-updated';
        setTimeout(() => {
          const event = new CustomEvent('gdrs-' + eventName, { detail: { method: methodName } });
          document.dispatchEvent(event);
        }, 0);
      }
      
      // Strategy 3: Direct DOM manipulation as last resort
      setTimeout(() => {
        const targetMap = {
          'renderMemories': '#memoryList',
          'renderTasks': '#tasksList', 
          'renderGoals': '#goalsList',
          'renderVault': '#vaultList'
        };
        
        const selector = targetMap[methodName];
        if (selector) {
          const element = document.querySelector(selector);
          if (element) {
            // Force a re-render by dispatching a custom event
            element.dispatchEvent(new Event('force-update'));
          }
        }
      }, 10);
      
    } catch (e) {
      console.warn(`Render failed for ${methodName}:`, e);
    }
  },

  // Enhanced final output with verification tracking
  loadFinalOutput() {
    return safeJSONParse(localStorage.getItem(LS_KEYS.FINAL_OUTPUT), {
      timestamp: '\u2014',
      html: '<p>Report will render here after goal validation.</p>',
      verified: false,
      source: 'none' // 'llm' or 'auto' or 'none'
    });
  },
  
  saveFinalOutput(htmlString, verified = false, source = 'auto') {
    const outObj = {
      timestamp: nowISO(),
      html: htmlString || '',
      verified: verified,
      source: source // Track if LLM-generated or auto-generated
    };
    localStorage.setItem(LS_KEYS.FINAL_OUTPUT, JSON.stringify(outObj));
    
    // Also save verified status separately for quick checks
    if (verified) {
      localStorage.setItem(LS_KEYS.FINAL_OUTPUT_VERIFIED, 'true');
    }
    
    console.log(`\ud83d\udcc4 Final output saved - Source: ${source}, Verified: ${verified}`);
  },

  isFinalOutputVerified() {
    return localStorage.getItem(LS_KEYS.FINAL_OUTPUT_VERIFIED) === 'true';
  },

  clearFinalOutputVerification() {
    localStorage.removeItem(LS_KEYS.FINAL_OUTPUT_VERIFIED);
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