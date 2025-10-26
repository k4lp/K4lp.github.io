/**
 * GDRS TOOLS - Enhanced utility functions for the Gemini Deep Research System
 * Added comprehensive vault reference substitution and execution support
 */

// Enhanced vault reference substitution with multiple syntax support
function substituteVaultRefs(text, vault) {
  if (typeof text !== 'string') return '';
  
  // Handle both vault parameter formats
  const vaultData = Array.isArray(vault) ? vault : (vault && typeof vault === 'object' ? Object.values(vault) : []);
  
  // Primary syntax: {{<vaultref id="vault_id" />}}
  let result = text.replace(/\{\{<vaultref\s+id="([^"]+)"\s*\/>\}\}/g, (_, id) => {
    const entry = vaultData.find ? vaultData.find(v => v.identifier === id) : vaultData[id];
    if (!entry) return `/* [MISSING_VAULT:${id}] */`;
    return entry.content || '';
  });
  
  // Alternative syntax: {{<vaultref id='vault_id' />}}
  result = result.replace(/\{\{<vaultref\s+id='([^']+)'\s*\/>\}\}/g, (_, id) => {
    const entry = vaultData.find ? vaultData.find(v => v.identifier === id) : vaultData[id];
    if (!entry) return `/* [MISSING_VAULT:${id}] */`;
    return entry.content || '';
  });
  
  return result;
}

// Enhanced vault substitution for execution environments
function resolveAllVaultReferences(text) {
  if (typeof window !== 'undefined' && window.GDRS && window.GDRS.Storage) {
    const vault = window.GDRS.Storage.loadVault();
    return substituteVaultRefs(text, vault);
  }
  return text;
}

// Safe JSON stringify with enhanced object handling
function safeStringify(value, indent = 2) {
  try {
    if (typeof value === 'string') return value;
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'function') return value.toString();
    return JSON.stringify(value, (key, val) => {
      if (typeof val === 'function') return '[Function: ' + val.name + ']';
      if (val instanceof Error) return '[Error: ' + val.message + ']';
      return val;
    }, indent);
  } catch (error) {
    return '[Stringify Error: ' + String(value) + ']';
  }
}

// Safe JSON parse with enhanced error handling
function safeJSONParse(raw, fallback = null) {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('JSON parse error:', error.message, 'Raw:', raw);
    return fallback;
  }
}

// Enhanced HTML encoding for security
function encodeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;');
}

// Enhanced ID generation with collision prevention
function generateId(prefix = 'id') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  const counter = (generateId._counter = (generateId._counter || 0) + 1).toString(36);
  return `${prefix}_${timestamp}_${random}_${counter}`;
}

// Enhanced date/time utilities with timezone support
function nowISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yr = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  const hr = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const se = pad(d.getSeconds());
  return `${yr}-${mo}-${da} ${hr}:${mi}:${se}`;
}

function nowTimestamp() {
  return Date.now();
}

function formatTimestamp(timestamp, format = 'ISO') {
  const d = new Date(timestamp);
  if (format === 'ISO') return d.toISOString();
  if (format === 'local') return nowISO();
  return d.toString();
}

// DOM utilities with enhanced error handling
function qs(selector, root = document) {
  try {
    return root.querySelector(selector);
  } catch (error) {
    console.error('Query selector error:', error, 'Selector:', selector);
    return null;
  }
}

function qsa(selector, root = document) {
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch (error) {
    console.error('Query selector all error:', error, 'Selector:', selector);
    return [];
  }
}

// Enhanced validation utilities
function isNonEmptyString(x) {
  return typeof x === 'string' && x.trim().length > 0;
}

function isValidObject(x) {
  return x != null && typeof x === 'object' && !Array.isArray(x);
}

function isValidArray(x, minLength = 0) {
  return Array.isArray(x) && x.length >= minLength;
}

function isValidFunction(x) {
  return typeof x === 'function';
}

// Enhanced deep clone with circular reference handling
function deepClone(obj) {
  try {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof RegExp) return new RegExp(obj);
    
    // Handle circular references
    const seen = new WeakSet();
    function clone(item) {
      if (seen.has(item)) return '[Circular Reference]';
      seen.add(item);
      
      if (Array.isArray(item)) {
        return item.map(clone);
      }
      
      if (typeof item === 'object' && item !== null) {
        const result = {};
        for (const key in item) {
          if (item.hasOwnProperty(key)) {
            result[key] = clone(item[key]);
          }
        }
        return result;
      }
      
      return item;
    }
    
    return clone(obj);
  } catch (error) {
    console.warn('Deep clone error:', error);
    return JSON.parse(JSON.stringify(obj));
  }
}

// Enhanced console logging with structured output
function logWithTime(message, level = 'info', context = null) {
  const timestamp = nowISO();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  const logData = {
    timestamp,
    level,
    message,
    context
  };
  
  switch (level.toLowerCase()) {
    case 'error':
      console.error(prefix, message, context || '');
      break;
    case 'warn':
      console.warn(prefix, message, context || '');
      break;
    case 'debug':
      console.debug(prefix, message, context || '');
      break;
    case 'info':
    default:
      console.log(prefix, message, context || '');
  }
  
  // Store in session for debugging if available
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const logs = JSON.parse(sessionStorage.getItem('gdrs_debug_logs') || '[]');
      logs.push(logData);
      // Keep only last 100 log entries
      if (logs.length > 100) logs.splice(0, logs.length - 100);
      sessionStorage.setItem('gdrs_debug_logs', JSON.stringify(logs));
    } catch (err) {
      // Ignore storage errors
    }
  }
}

// Enhanced error handling utility
function handleError(error, context = 'Unknown', logLevel = 'error') {
  const errorInfo = {
    message: error.message || String(error),
    stack: error.stack,
    context,
    timestamp: nowISO()
  };
  
  logWithTime(`Error in ${context}: ${errorInfo.message}`, logLevel, errorInfo);
  
  return errorInfo;
}

// Execution context utilities for JavaScript execution
function createSafeExecutionContext() {
  return {
    console: {
      log: (...args) => logWithTime(args.join(' '), 'info', 'execution'),
      error: (...args) => logWithTime(args.join(' '), 'error', 'execution'),
      warn: (...args) => logWithTime(args.join(' '), 'warn', 'execution'),
      debug: (...args) => logWithTime(args.join(' '), 'debug', 'execution')
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    fetch,
    JSON,
    Date,
    Math,
    String,
    Number,
    Boolean,
    Array,
    Object,
    RegExp,
    localStorage: typeof localStorage !== 'undefined' ? localStorage : null,
    sessionStorage: typeof sessionStorage !== 'undefined' ? sessionStorage : null
  };
}

// Local storage helpers with error handling
function getFromStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    logWithTime(`Storage read error for key ${key}:`, 'error', error);
    return defaultValue;
  }
}

function setToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    logWithTime(`Storage write error for key ${key}:`, 'error', error);
    return false;
  }
}

function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    logWithTime(`Storage remove error for key ${key}:`, 'error', error);
    return false;
  }
}

// Export functions to global scope for use by other scripts
if (typeof window !== 'undefined') {
  const toolsExports = {
    substituteVaultRefs,
    resolveAllVaultReferences,
    safeStringify,
    safeJSONParse,
    encodeHTML,
    generateId,
    nowISO,
    nowTimestamp,
    formatTimestamp,
    qs,
    qsa,
    isNonEmptyString,
    isValidObject,
    isValidArray,
    isValidFunction,
    deepClone,
    logWithTime,
    handleError,
    createSafeExecutionContext,
    getFromStorage,
    setToStorage,
    removeFromStorage
  };
  
  // Export to global scope
  Object.assign(window, toolsExports);
  
  // Add to window.GDRS namespace as well
  window.GDRS = window.GDRS || {};
  Object.assign(window.GDRS, toolsExports);
}

// Console banner with enhanced information
console.log('%cGDRS Enhanced Tools Loaded', 'color: #00ff00; font-weight: bold;');
console.log('%cUtility functions available globally and at window.GDRS', 'color: #888888;');
console.log('%cVault reference substitution, JS execution context, and enhanced logging enabled', 'color: #00aaff;');

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    substituteVaultRefs,
    resolveAllVaultReferences,
    safeStringify,
    safeJSONParse,
    encodeHTML,
    generateId,
    nowISO,
    nowTimestamp,
    formatTimestamp,
    qs,
    qsa,
    isNonEmptyString,
    isValidObject,
    isValidArray,
    isValidFunction,
    deepClone,
    logWithTime,
    handleError,
    createSafeExecutionContext,
    getFromStorage,
    setToStorage,
    removeFromStorage
  };
}