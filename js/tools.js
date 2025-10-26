/**
 * GDRS TOOLS - Utility functions for the Gemini Deep Research System
 */

// Vault reference substitution
function substituteVaultRefs(text, vault) {
  if (typeof text !== 'string') return '';
  
  return text.replace(/\{\{<vaultref\s+id="([^"]+)"\s*\/>\}\}/g, (_, id) => {
    const entry = vault && vault.find ? vault.find(v => v.identifier === id) : vault?.[id];
    if (!entry) return `/* [MISSING_VAULT:${id}] */`;
    return entry.content || '';
  });
}

// Safe JSON stringify with fallback
function safeStringify(value) {
  try {
    if (typeof value === 'string') return value;
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

// Safe JSON parse with fallback
function safeJSONParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// HTML encoding for security
function encodeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Generate unique IDs
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Date/time utilities
function nowISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yr = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  const hr = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yr}-${mo}-${da} ${hr}:${mi}`;
}

// DOM utilities
function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

// Validation utilities
function isNonEmptyString(x) {
  return typeof x === 'string' && x.trim().length > 0;
}

// Deep clone utility
function deepClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}

// Console logging with timestamp
function logWithTime(message, level = 'info') {
  const timestamp = nowISO();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  switch (level) {
    case 'error':
      console.error(prefix, message);
      break;
    case 'warn':
      console.warn(prefix, message);
      break;
    case 'debug':
      console.debug(prefix, message);
      break;
    default:
      console.log(prefix, message);
  }
}

// Export functions to global scope for use by other scripts
if (typeof window !== 'undefined') {
  window.substituteVaultRefs = substituteVaultRefs;
  window.safeStringify = safeStringify;
  window.safeJSONParse = safeJSONParse;
  window.encodeHTML = encodeHTML;
  window.generateId = generateId;
  window.nowISO = nowISO;
  window.qs = qs;
  window.qsa = qsa;
  window.isNonEmptyString = isNonEmptyString;
  window.deepClone = deepClone;
  window.logWithTime = logWithTime;
  
  // Add to window.GDRS namespace as well
  window.GDRS = window.GDRS || {};
  Object.assign(window.GDRS, {
    substituteVaultRefs,
    safeStringify,
    safeJSONParse,
    encodeHTML,
    generateId,
    nowISO,
    qs,
    qsa,
    isNonEmptyString,
    deepClone,
    logWithTime
  });
}

// Console banner
console.log('%cGDRS Tools Loaded', 'color: #00ff00; font-weight: bold;');
console.log('%cUtility functions available globally and at window.GDRS', 'color: #888888;');