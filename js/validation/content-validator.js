/**
 * Content Validator
 *
 * Validates content quality and completeness before marking as verified.
 * Separation of concerns: validation logic separate from processing/storage.
 */

import { nowISO } from '../core/utils.js';

/**
 * Validation result structure
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether content passed all validations
 * @property {string} status - 'valid' | 'invalid' | 'warning'
 * @property {Array<Object>} errors - Critical issues that prevent verification
 * @property {Array<Object>} warnings - Non-critical issues
 * @property {Object} metadata - Additional validation metadata
 */

export class ContentValidator {
  constructor() {
    this.validators = [];
  }

  /**
   * Register a validation function
   * @param {Function} validator - (content) => ValidationResult
   */
  addValidator(validator) {
    this.validators.push(validator);
  }

  /**
   * Validate content through all registered validators
   * @param {string} content - Content to validate
   * @param {Object} options - Validation options
   * @returns {ValidationResult}
   */
  validate(content, options = {}) {
    const result = {
      valid: true,
      status: 'valid',
      errors: [],
      warnings: [],
      metadata: {
        timestamp: nowISO(),
        contentLength: content?.length || 0,
        validators: this.validators.length
      }
    };

    if (!content || content.trim().length === 0) {
      result.valid = false;
      result.status = 'invalid';
      result.errors.push({
        type: 'empty_content',
        message: 'Content is empty or null',
        severity: 'critical'
      });
      return result;
    }

    // Run all validators
    for (const validator of this.validators) {
      try {
        const validatorResult = validator(content, options);

        if (validatorResult.errors?.length > 0) {
          result.errors.push(...validatorResult.errors);
          result.valid = false;
        }

        if (validatorResult.warnings?.length > 0) {
          result.warnings.push(...validatorResult.warnings);
        }

        // Merge metadata
        if (validatorResult.metadata) {
          Object.assign(result.metadata, validatorResult.metadata);
        }
      } catch (error) {
        result.errors.push({
          type: 'validator_error',
          message: `Validator failed: ${error.message}`,
          severity: 'critical',
          stack: error.stack
        });
        result.valid = false;
      }
    }

    // Determine final status
    if (result.errors.length > 0) {
      result.status = 'invalid';
      result.valid = false;
    } else if (result.warnings.length > 0) {
      result.status = 'warning';
      // Still valid, but has warnings
    }

    return result;
  }

  /**
   * Create a validation error object
   * @param {string} type - Error type
   * @param {string} message - Error message
   * @param {Object} extra - Additional error data
   * @returns {Object}
   */
  static createError(type, message, extra = {}) {
    return {
      type,
      message,
      severity: extra.severity || 'error',
      timestamp: nowISO(),
      ...extra
    };
  }

  /**
   * Create a validation warning object
   * @param {string} type - Warning type
   * @param {string} message - Warning message
   * @param {Object} extra - Additional warning data
   * @returns {Object}
   */
  static createWarning(type, message, extra = {}) {
    return {
      type,
      message,
      severity: 'warning',
      timestamp: nowISO(),
      ...extra
    };
  }
}

/**
 * Built-in validator: Check for missing vault references
 */
export function vaultReferenceValidator(content, options = {}) {
  const result = {
    errors: [],
    warnings: [],
    metadata: {}
  };

  // Pattern for missing vault references
  const missingPattern = /\/\*\s*\[MISSING_VAULT:([^\]]+)\]\s*\*\//gi;
  const errorPattern = /\/\*\s*\[VAULT_ERROR:([^\]]+)\]\s*\*\//gi;

  const missingMatches = [...content.matchAll(missingPattern)];
  const errorMatches = [...content.matchAll(errorPattern)];

  if (missingMatches.length > 0) {
    const missingIds = missingMatches.map(m => m[1]);
    result.errors.push(
      ContentValidator.createError(
        'missing_vault_references',
        `Content contains ${missingIds.length} missing vault reference(s)`,
        {
          severity: 'critical',
          missingIds,
          count: missingIds.length
        }
      )
    );
  }

  if (errorMatches.length > 0) {
    const errorIds = errorMatches.map(m => m[1]);
    result.errors.push(
      ContentValidator.createError(
        'vault_reference_errors',
        `Content contains ${errorIds.length} vault reference error(s)`,
        {
          severity: 'critical',
          errorIds,
          count: errorIds.length
        }
      )
    );
  }

  result.metadata.vaultValidation = {
    missingReferences: missingMatches.length,
    errorReferences: errorMatches.length,
    hasIssues: missingMatches.length > 0 || errorMatches.length > 0
  };

  return result;
}

/**
 * Built-in validator: Check content size
 */
export function contentSizeValidator(content, options = {}) {
  const result = {
    errors: [],
    warnings: [],
    metadata: {}
  };

  const minSize = options.minSize || 10;
  const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
  const size = content.length;

  if (size < minSize) {
    result.warnings.push(
      ContentValidator.createWarning(
        'content_too_small',
        `Content size (${size} chars) is below minimum (${minSize} chars)`,
        { size, minSize }
      )
    );
  }

  if (size > maxSize) {
    result.errors.push(
      ContentValidator.createError(
        'content_too_large',
        `Content size (${size} chars) exceeds maximum (${maxSize} chars)`,
        { severity: 'error', size, maxSize }
      )
    );
  }

  result.metadata.sizeValidation = {
    size,
    minSize,
    maxSize,
    withinLimits: size >= minSize && size <= maxSize
  };

  return result;
}

/**
 * Create a default content validator with standard validators
 */
export function createDefaultValidator() {
  const validator = new ContentValidator();
  validator.addValidator(vaultReferenceValidator);
  validator.addValidator(contentSizeValidator);
  return validator;
}

export default ContentValidator;
