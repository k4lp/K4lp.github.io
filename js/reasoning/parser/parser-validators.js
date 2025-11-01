/**
 * Parser Validators
 *
 * Validates and parses attributes from operation tags.
 * Now uses centralized validation from tool-registry-config.js.
 */

import {
  parseAttributes as parseAttributesFromRegistry,
  isValidIdentifier,
  isValidContentSize,
  sanitizeText as sanitizeTextFromRegistry,
  normalizeVaultType as normalizeVaultTypeFromRegistry,
  normalizeTaskStatus as normalizeTaskStatusFromRegistry,
  TASK_STATUSES,
  VAULT_TYPES,
  VAULT_ACTIONS,
} from '../../config/tool-registry-config.js';

/**
 * Parse attributes from tag attribute string
 * @param {string} attrString - Attribute string
 * @returns {Object} Parsed attributes object
 *
 * @example
 * parseAttributes('id="test" type="text" delete')
 * // Returns: { id: 'test', type: 'text', delete: true }
 */
export function parseAttributes(attrString) {
  // Use the centralized parser from registry config
  return parseAttributesFromRegistry(attrString);
}

/**
 * Validate memory operation attributes
 * @param {Object} attrs - Parsed attributes
 * @returns {boolean} True if valid
 */
export function validateMemoryOperation(attrs) {
  if (!attrs) return false;

  // Must have identifier or heading
  if (!attrs.identifier && !attrs.heading) {
    return false;
  }

  // If creating, need heading and content
  if (!attrs.delete && attrs.identifier && !attrs.heading) {
    // This is an update, which is OK
    return true;
  }

  return true;
}

/**
 * Validate task operation attributes
 * @param {Object} attrs - Parsed attributes
 * @returns {boolean} True if valid
 */
export function validateTaskOperation(attrs) {
  if (!attrs) return false;

  // Must have identifier or heading
  if (!attrs.identifier && !attrs.heading) {
    return false;
  }

  // Validate status if present (use centralized constant)
  if (attrs.status && !TASK_STATUSES.includes(attrs.status)) {
    console.warn(`Invalid task status: ${attrs.status}`);
    return false;
  }

  return true;
}

/**
 * Validate goal operation attributes
 * @param {Object} attrs - Parsed attributes
 * @returns {boolean} True if valid
 */
export function validateGoalOperation(attrs) {
  if (!attrs) return false;

  // Must have identifier or heading
  if (!attrs.identifier && !attrs.heading) {
    return false;
  }

  return true;
}

/**
 * Validate vault operation attributes
 * @param {Object} attrs - Parsed attributes
 * @returns {boolean} True if valid
 */
export function validateVaultOperation(attrs) {
  if (!attrs) return false;

  // Must have id
  if (!attrs.id) {
    return false;
  }

  // Validate type if present (use centralized constants)
  const vaultTypeValues = Object.values(VAULT_TYPES);
  if (attrs.type && !vaultTypeValues.includes(attrs.type.toLowerCase())) {
    console.warn(`Invalid vault type: ${attrs.type}`);
    // Don't fail, just warn - we'll default to 'text'
  }

  // Validate action if present (use centralized constants)
  const vaultActionValues = Object.values(VAULT_ACTIONS);
  if (attrs.action && !vaultActionValues.includes(attrs.action)) {
    console.warn(`Invalid vault action: ${attrs.action}`);
  }

  return true;
}

/**
 * Sanitize text input
 * Uses centralized sanitization from tool-registry-config.js
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeText(text) {
  return sanitizeTextFromRegistry(text);
}

/**
 * Validate identifier format
 * Uses centralized validation from tool-registry-config.js
 * @param {string} identifier - Identifier to validate
 * @returns {boolean} True if valid
 */
export function validateIdentifier(identifier) {
  return isValidIdentifier(identifier);
}

/**
 * Validate and normalize vault type
 * Uses centralized normalization from tool-registry-config.js
 * @param {string} type - Vault entry type
 * @returns {string} Normalized type ('text', 'code', or 'data')
 */
export function normalizeVaultType(type) {
  return normalizeVaultTypeFromRegistry(type);
}

/**
 * Validate and normalize task status
 * Uses centralized normalization from tool-registry-config.js
 * @param {string} status - Task status
 * @returns {string} Normalized status
 */
export function normalizeTaskStatus(status) {
  return normalizeTaskStatusFromRegistry(status);
}

/**
 * Validate content size (prevent excessive data)
 * Uses centralized validation from tool-registry-config.js
 * @param {string} content - Content to validate
 * @param {number} maxSize - Maximum size in characters
 * @returns {boolean} True if within size limit
 */
export function validateContentSize(content, maxSize = 1000000) {
  return isValidContentSize(content, maxSize);
}
