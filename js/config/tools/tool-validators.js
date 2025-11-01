/**
 * Tool Validators Configuration
 *
 * Validation functions and schemas for all tools
 */

/**
 * Validation constants
 */
export const VALIDATION_CONSTANTS = {
    MAX_IDENTIFIER_LENGTH: 200,
    MAX_CONTENT_SIZE: 1000000, // 1MB
    MIN_IDENTIFIER_LENGTH: 1,
};

/**
 * Patterns for validation (duplicated to avoid circular imports)
 */
const VALID_IDENTIFIER_PATTERN = /^[a-zA-Z0-9_-]+$/;
const DANGEROUS_CHARS_PATTERN = /<script|javascript:|onerror=|onclick=/gi;

/**
 * Validate if a string is a valid identifier
 * @param {string} identifier - String to validate
 * @returns {boolean} True if valid
 */
export function isValidIdentifier(identifier) {
    if (!identifier || typeof identifier !== 'string') return false;
    if (identifier.length < VALIDATION_CONSTANTS.MIN_IDENTIFIER_LENGTH) return false;
    if (identifier.length > VALIDATION_CONSTANTS.MAX_IDENTIFIER_LENGTH) return false;
    return VALID_IDENTIFIER_PATTERN.test(identifier);
}

/**
 * Check if text contains dangerous content
 * @param {string} text - Text to check
 * @returns {boolean} True if dangerous content found
 */
export function hasDangerousContent(text) {
    if (!text) return false;
    return DANGEROUS_CHARS_PATTERN.test(text);
}

/**
 * Sanitize text by removing dangerous content
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeText(text) {
    if (!text) return '';
    return text.replace(DANGEROUS_CHARS_PATTERN, '');
}

/**
 * Validate content size
 * @param {string} content - Content to validate
 * @param {number} maxSize - Maximum size (default from config)
 * @returns {boolean} True if valid
 */
export function isValidContentSize(content, maxSize = VALIDATION_CONSTANTS.MAX_CONTENT_SIZE) {
    if (!content) return true;
    return content.length <= maxSize;
}

/**
 * Create a validation error object
 * @param {string} field - Field name
 * @param {string} message - Error message
 * @param {*} value - Invalid value
 * @returns {Object} Error object
 */
export function createValidationError(field, message, value = null) {
    return {
        field,
        message,
        value,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Validate required attributes
 * @param {Object} attrs - Parsed attributes
 * @param {Array<string>} required - Required attribute names
 * @returns {Object} { isValid: boolean, errors: Array }
 */
export function validateRequiredAttributes(attrs, required) {
    const errors = [];

    for (const attrName of required) {
        if (!attrs[attrName]) {
            errors.push(createValidationError(
                attrName,
                `Required attribute '${attrName}' is missing`,
                null
            ));
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate attribute against schema
 * @param {string} attrName - Attribute name
 * @param {*} attrValue - Attribute value
 * @param {Object} schema - Validation schema
 * @returns {Object} { isValid: boolean, error: Object|null }
 */
export function validateAttribute(attrName, attrValue, schema) {
    if (!schema) {
        return { isValid: true, error: null };
    }

    // Required check
    if (schema.required && !attrValue) {
        return {
            isValid: false,
            error: createValidationError(attrName, 'Required attribute is missing', attrValue)
        };
    }

    // Type validation
    if (schema.validate === 'identifier' && !isValidIdentifier(attrValue)) {
        return {
            isValid: false,
            error: createValidationError(attrName, 'Invalid identifier format', attrValue)
        };
    }

    // Enum validation
    if (schema.type === 'enum' && schema.values && !schema.values.includes(attrValue)) {
        return {
            isValid: false,
            error: createValidationError(
                attrName,
                `Invalid value. Must be one of: ${schema.values.join(', ')}`,
                attrValue
            )
        };
    }

    // Max length validation
    if (schema.maxLength && attrValue && attrValue.length > schema.maxLength) {
        return {
            isValid: false,
            error: createValidationError(
                attrName,
                `Content exceeds maximum length of ${schema.maxLength}`,
                attrValue
            )
        };
    }

    return { isValid: true, error: null };
}

export default {
    VALIDATION_CONSTANTS,
    isValidIdentifier,
    hasDangerousContent,
    sanitizeText,
    isValidContentSize,
    createValidationError,
    validateRequiredAttributes,
    validateAttribute,
};
