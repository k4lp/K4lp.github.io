/**
 * GDRS Storage Layer - Streamlined and Event-Driven
 * Clean CRUD operations with immediate UI updates via event bus
 */

import { LS_KEYS, DEFAULT_KEYPOOL, createKeyFromText } from '../core/constants.js';
import { safeJSONParse, isNonEmptyString, nowISO } from '../core/utils.js';
import { eventBus, Events } from '../core/event-bus.js';

export const Storage = {
  // === KEYPOOL MANAGEMENT ===
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

  parseKeysFromText(keysText) {
    if (!keysText || typeof keysText !== 'string') return [];
    return keysText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map((keyText, index) => createKeyFromText(keyText, index));
  },

  formatKeysToText(pool) {
    if (!Array.isArray(pool)) return '';
    return pool.map(k => k.key).join('\n');
  },

  updateKeysFromText(keysText) {
    const oldPool = this.loadKeypool();
    const newKeys = this.parseKeysFromText(keysText);
    
    const updatedPool = newKeys.map(newKey => {
      const existing = oldPool.find(oldKey => oldKey.key === newKey.key);
      return existing ? { ...existing, slot: newKey.slot } : newKey;
    });
    
    this.saveKeypool(updatedPool);
    return updatedPool;
  },

  normalizeKeypool(arr) {
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

  // === CONFIGURATION ===
  loadMaxOutputTokens() {
    const stored = localStorage.getItem(LS_KEYS.MAX_OUTPUT_TOKENS);
    if (stored) {
      const value = parseInt(stored);
      if (value >= 512 && value <= 65536) return value;
    }
    return 4096;
  },
  
  saveMaxOutputTokens(tokens) {
    const value = parseInt(tokens);
    if (value >= 512 && value <= 65536) {
      localStorage.setItem(LS_KEYS.MAX_OUTPUT_TOKENS, String(value));
      return true;
    }
    return false;
  },

  // === CORE ENTITIES (with event-driven UI updates) ===
  loadGoals() {
    return safeJSONParse(localStorage.getItem(LS_KEYS.GOALS), []);
  },
  
  saveGoals(goals) {
    localStorage.setItem(LS_KEYS.GOALS, JSON.stringify(goals));
    eventBus.emit(Events.GOALS_UPDATED, goals);
  },

  loadMemory() {
    return safeJSONParse(localStorage.getItem(LS_KEYS.MEMORY), []);
  },
  
  saveMemory(memory) {
    localStorage.setItem(LS_KEYS.MEMORY, JSON.stringify(memory));
    eventBus.emit(Events.MEMORY_UPDATED, memory);
  },

  loadTasks() {
    return safeJSONParse(localStorage.getItem(LS_KEYS.TASKS), []);
  },
  
  saveTasks(tasks) {
    localStorage.setItem(LS_KEYS.TASKS, JSON.stringify(tasks));
    eventBus.emit(Events.TASKS_UPDATED, tasks);
  },

  loadVault() {
    const vault = safeJSONParse(localStorage.getItem(LS_KEYS.VAULT), []);
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
    eventBus.emit(Events.VAULT_UPDATED, validatedVault);
  },

  // === FINAL OUTPUT (streamlined) ===
  loadFinalOutput() {
    return safeJSONParse(localStorage.getItem(LS_KEYS.FINAL_OUTPUT), {
      timestamp: '\u2014',
      html: '<p>Report will render here after goal validation.</p>',
      verified: false,
      source: 'none'
    });
  },
  
  saveFinalOutput(htmlString, verified = false, source = 'auto') {
    const saveTime = nowISO();
    console.log(`[${saveTime}] ========== Storage.saveFinalOutput() CALLED ==========`);
    console.log(`[${saveTime}] PARAMETERS:`);
    console.log(`   - htmlString: ${htmlString ? 'provided' : 'null/undefined'}, length: ${htmlString?.length || 0} chars, type: ${typeof htmlString}`);
    console.log(`   - verified: ${verified} (type: ${typeof verified}, truthy: ${!!verified})`);
    console.log(`   - source: '${source}'`);

    const output = {
      timestamp: saveTime,
      html: htmlString || '',
      verified,
      source
    };

    const serialized = JSON.stringify(output);
    console.log(`[${nowISO()}] Serialized output object - length: ${serialized.length} chars`);
    console.log(`[${nowISO()}] Writing to localStorage key: '${LS_KEYS.FINAL_OUTPUT}'`);
    localStorage.setItem(LS_KEYS.FINAL_OUTPUT, serialized);
    console.log(`[${nowISO()}] localStorage.setItem() completed`);

    // Critical verification flag logic
    console.log(`[${nowISO()}] Checking if verification flag should be set: verified = ${verified}, if(verified) = ${!!verified}`);
    if (verified) {
      console.log(`[${nowISO()}] CONDITION MET - verified is truthy`);
      console.log(`[${nowISO()}] Setting localStorage['${LS_KEYS.FINAL_OUTPUT_VERIFIED}'] = 'true'`);
      localStorage.setItem(LS_KEYS.FINAL_OUTPUT_VERIFIED, 'true');
      const checkValue = localStorage.getItem(LS_KEYS.FINAL_OUTPUT_VERIFIED);
      console.log(`[${nowISO()}] VERIFICATION FLAG SET SUCCESSFULLY - Readback: '${checkValue}' (type: ${typeof checkValue})`);
    } else {
      console.log(`[${nowISO()}] CONDITION NOT MET - verified is falsy, NOT setting verification flag`);
      console.log(`[${nowISO()}] This means isFinalOutputVerified() will return false`);
    }

    console.log(`[${nowISO()}] Emitting event '${Events.FINAL_OUTPUT_UPDATED}'`);
    eventBus.emit(Events.FINAL_OUTPUT_UPDATED, output);
    console.log(`[${nowISO()}] ========== Storage.saveFinalOutput() COMPLETE ==========`);
  },

  isFinalOutputVerified() {
    const checkTime = nowISO();
    console.log(`[${checkTime}] ========== Storage.isFinalOutputVerified() CALLED ==========`);
    console.log(`[${checkTime}] Call stack: ${new Error().stack.split('\n').slice(1, 4).join(' << ')}`);

    const rawValue = localStorage.getItem(LS_KEYS.FINAL_OUTPUT_VERIFIED);
    console.log(`[${nowISO()}] Reading localStorage['${LS_KEYS.FINAL_OUTPUT_VERIFIED}']`);
    console.log(`[${nowISO()}] Value: '${rawValue}' (type: ${typeof rawValue}, null: ${rawValue === null})`);

    const result = rawValue === 'true';
    console.log(`[${nowISO()}] Comparison logic: '${rawValue}' === 'true' => ${result}`);

    // Also log the actual final output object for debugging
    const finalOutputRaw = localStorage.getItem(LS_KEYS.FINAL_OUTPUT);
    console.log(`[${nowISO()}] Reading localStorage['${LS_KEYS.FINAL_OUTPUT}'] for additional context`);
    if (finalOutputRaw) {
      try {
        const finalOutputObj = JSON.parse(finalOutputRaw);
        console.log(`[${nowISO()}] FINAL_OUTPUT object exists in storage:`);
        console.log(`   - timestamp: ${finalOutputObj.timestamp}`);
        console.log(`   - verified field: ${finalOutputObj.verified} (type: ${typeof finalOutputObj.verified})`);
        console.log(`   - source: ${finalOutputObj.source}`);
        console.log(`   - html exists: ${!!finalOutputObj.html}, length: ${finalOutputObj.html?.length || 0} chars`);
      } catch (e) {
        console.error(`[${nowISO()}] Error parsing FINAL_OUTPUT from storage: ${e.message}`);
      }
    } else {
      console.log(`[${nowISO()}] FINAL_OUTPUT key not found in localStorage (value is null)`);
    }

    console.log(`[${nowISO()}] ========== Storage.isFinalOutputVerified() RETURNING: ${result} ==========`);
    return result;
  },

  clearFinalOutputVerification() {
    const clearTime = nowISO();
    console.log(`[${clearTime}] ========== Storage.clearFinalOutputVerification() CALLED ==========`);
    console.log(`[${clearTime}] Removing localStorage['${LS_KEYS.FINAL_OUTPUT_VERIFIED}']`);
    localStorage.removeItem(LS_KEYS.FINAL_OUTPUT_VERIFIED);
    const checkValue = localStorage.getItem(LS_KEYS.FINAL_OUTPUT_VERIFIED);
    console.log(`[${nowISO()}] Verification flag cleared - Readback value: ${checkValue === null ? 'null' : `'${checkValue}'`}`);
    console.log(`[${nowISO()}] ========== Storage.clearFinalOutputVerification() COMPLETE ==========`);
  },

  // === LOGGING ===
  loadReasoningLog() {
    return normalizeArray(
      safeJSONParse(localStorage.getItem(LS_KEYS.REASONING_LOG), [])
    );
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

  // === EXECUTION TRACKING ===
  loadExecutionLog() {
    return normalizeArray(
      safeJSONParse(localStorage.getItem(LS_KEYS.EXECUTION_LOG), [])
    );
  },
  
  saveExecutionLog(log) {
    localStorage.setItem(LS_KEYS.EXECUTION_LOG, JSON.stringify(log));
  },
  
  appendExecutionResult(result) {
    const log = this.loadExecutionLog();
    log.push({ timestamp: nowISO(), ...result });
    this.saveExecutionLog(log);
    eventBus.emit(Events.JS_EXECUTION_COMPLETE, result);
  },

  loadLastExecutedCode() {
    return localStorage.getItem(LS_KEYS.LAST_EXECUTED_CODE) || '';
  },
  
  saveLastExecutedCode(code) {
    localStorage.setItem(LS_KEYS.LAST_EXECUTED_CODE, code || '');
  },

  // === TOOL ACTIVITY ===
  loadToolActivityLog() {
    return normalizeArray(
      safeJSONParse(localStorage.getItem(LS_KEYS.TOOL_ACTIVITY_LOG), [])
    );
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

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || value === undefined) {
    return [];
  }

  // Legacy fallback: convert array-like objects to arrays
  if (typeof value === 'object') {
    try {
      return Array.from(value);
    } catch {
      return [];
    }
  }

  return [];
}

// Expose storage helper to legacy global scripts while preserving ES module exports
if (typeof window !== 'undefined') {
  window.Storage = Storage;
  window.GDRS = window.GDRS || {};
  window.GDRS.Storage = Storage;
}
