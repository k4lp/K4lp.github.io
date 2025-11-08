/**
 * Deep utilities for cloning, freezing, and binary conversions.
 * These helpers keep the Excel attachment runtime store self-contained
 * without persisting anything outside JS memory.
 */

/**
 * Safely clone arbitrary JSON-compatible structures.
 * Falls back to JSON serialization when structuredClone is unavailable.
 */
export function deepClone(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

/**
 * Recursively freeze an object graph to prevent mutation.
 */
export function deepFreeze(obj) {
  if (!obj || typeof obj !== 'object' || Object.isFrozen(obj)) {
    return obj;
  }

  Object.freeze(obj);

  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const value = obj[prop];
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  });

  return obj;
}

/**
 * Convert an ArrayBuffer to a base64 string.
 * Useful when exporting the workbook without persisting it.
 */
export function arrayBufferToBase64(buffer) {
  if (!buffer) return '';

  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;

  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

