/**
 * GDRS Core Utility Functions
 * DOM helpers, string utilities, validation functions
 */

// DOM utility functions
export function qs(selector) {
  return document.querySelector(selector);
}

export function qsa(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

// String and data utilities
export function safeJSONParse(str, defaultValue) {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

export function isNonEmptyString(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

export function encodeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Date and ID utilities
export function nowISO() {
  return new Date().toISOString();
}

export function generateId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Validation functions
export function validateVaultData(data) {
  // Validate that vault data is properly formatted
  if (typeof data === 'string') {
    try {
      JSON.parse(data);
      return true;
    } catch {
      return false;
    }
  }
  return typeof data === 'object';
}