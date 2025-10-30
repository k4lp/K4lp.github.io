/**
 * Parser Validators
 *
 * Validates and parses attributes from operation tags
 */

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
  const attrs = {};
  if (!attrString) return attrs;

  // Match key="value" or standalone flags
  const regex = /(\w+)=["']([^"']*)["']|\b(\w+)(?=\s|$)/g;
  let match;

  while ((match = regex.exec(attrString)) !== null) {
    if (match[1] && match[2] !== undefined) {
      // Key-value pair: key="value"
      attrs[match[1]] = match[2];
    } else if (match[3]) {
      // Standalone flag: delete, update, etc.
      attrs[match[3]] = true;
    }
  }

  return attrs;
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

  // Validate status if present
  if (attrs.status && !['pending', 'ongoing', 'finished', 'paused'].includes(attrs.status)) {
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

  // Validate type if present
  if (attrs.type && !['text', 'code', 'data'].includes(attrs.type.toLowerCase())) {
    console.warn(`Invalid vault type: ${attrs.type}`);
    // Don't fail, just warn - we'll default to 'text'
  }

  // Validate action if present
  if (attrs.action && !['request_read', 'create', 'update', 'delete'].includes(attrs.action)) {
    console.warn(`Invalid vault action: ${attrs.action}`);
  }

  return true;
}

/**
 * Sanitize text input
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';

  // Remove potentially dangerous HTML tags but allow basic formatting
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .trim();
}

/**
 * Validate identifier format
 * @param {string} identifier - Identifier to validate
 * @returns {boolean} True if valid
 */
export function validateIdentifier(identifier) {
  if (!identifier || typeof identifier !== 'string') {
    return false;
  }

  // Identifiers should be reasonable length and format
  if (identifier.length === 0 || identifier.length > 200) {
    return false;
  }

  // Should not contain dangerous characters
  const dangerousChars = /[<>{}]/;
  if (dangerousChars.test(identifier)) {
    return false;
  }

  return true;
}

/**
 * Validate and normalize vault type
 * @param {string} type - Vault entry type
 * @returns {string} Normalized type ('text', 'code', or 'data')
 */
export function normalizeVaultType(type) {
  if (!type || typeof type !== 'string') {
    return 'text';
  }

  const normalized = type.toLowerCase();

  if (['text', 'code', 'data'].includes(normalized)) {
    return normalized;
  }

  console.warn(`Unknown vault type "${type}", defaulting to "text"`);
  return 'text';
}

/**
 * Validate and normalize task status
 * @param {string} status - Task status
 * @returns {string} Normalized status
 */
export function normalizeTaskStatus(status) {
  if (!status || typeof status !== 'string') {
    return 'pending';
  }

  const normalized = status.toLowerCase();
  const validStatuses = ['pending', 'ongoing', 'finished', 'paused'];

  if (validStatuses.includes(normalized)) {
    return normalized;
  }

  console.warn(`Unknown task status "${status}", defaulting to "pending"`);
  return 'pending';
}

/**
 * Validate content size (prevent excessive data)
 * @param {string} content - Content to validate
 * @param {number} maxSize - Maximum size in characters
 * @returns {boolean} True if within size limit
 */
export function validateContentSize(content, maxSize = 1000000) {
  if (!content) return true;

  const size = String(content).length;

  if (size > maxSize) {
    console.warn(`Content size (${size}) exceeds maximum (${maxSize})`);
    return false;
  }

  return true;
}
