/**
 * Vault Resolution Service
 *
 * Enhanced vault resolution that returns structured results with full
 * validation information instead of just resolved text.
 *
 * Replaces the lossy `resolveVaultRefsInText()` pattern with a
 * comprehensive resolution result.
 */

import { resolveVaultReferences } from '../utils/vault-reference-resolver.js';
import { nowISO } from '../core/utils.js';

/**
 * Vault resolution result structure
 * @typedef {Object} VaultResolutionResult
 * @property {boolean} success - Whether resolution was completely successful
 * @property {string} resolvedText - Text with vault references resolved
 * @property {string} originalText - Original text before resolution
 * @property {Array<string>} resolvedReferences - Successfully resolved vault IDs
 * @property {Array<string>} missingReferences - Vault IDs that couldn't be found
 * @property {Array<Object>} errors - Errors encountered during resolution
 * @property {Array<Object>} warnings - Non-critical issues
 * @property {Object} metadata - Resolution metadata
 */

export class VaultResolutionService {
  /**
   * Resolve vault references in text with full validation
   * @param {string} text - Text containing vault references
   * @param {Object} options - Resolution options
   * @returns {VaultResolutionResult}
   */
  static resolve(text, options = {}) {
    const startTime = Date.now();

    const result = {
      success: false,
      resolvedText: text,
      originalText: text,
      resolvedReferences: [],
      missingReferences: [],
      errors: [],
      warnings: [],
      metadata: {
        timestamp: nowISO(),
        originalLength: text?.length || 0,
        resolvedLength: 0,
        duration: 0,
        depth: 0
      }
    };

    if (!text) {
      result.success = true; // Empty text is "successfully" resolved
      result.metadata.duration = Date.now() - startTime;
      return result;
    }

    try {
      // Use existing vault reference resolver
      const resolution = resolveVaultReferences(text, {
        throwOnMissing: false,
        maxDepth: options.maxDepth || 3,
        onError: (error) => {
          result.errors.push({
            type: 'resolution_error',
            message: error.message,
            timestamp: nowISO()
          });
        }
      });

      // Extract data from resolution
      result.resolvedText = resolution.resolvedText;
      result.metadata.resolvedLength = resolution.resolvedText?.length || 0;
      result.metadata.depth = resolution.depth;
      result.metadata.fullyResolved = resolution.fullyResolved;

      // Track resolved and missing references
      result.resolvedReferences = resolution.references.filter(
        id => !resolution.missing.includes(id)
      );
      result.missingReferences = resolution.missing;

      // Convert resolution errors to our format
      if (resolution.errors.length > 0) {
        result.errors.push(...resolution.errors.map(err => ({
          type: err.type || 'resolution_error',
          message: err.message,
          ...err
        })));
      }

      // Add warnings for missing references
      if (result.missingReferences.length > 0) {
        result.warnings.push({
          type: 'missing_vault_references',
          message: `${result.missingReferences.length} vault reference(s) could not be resolved`,
          missingIds: result.missingReferences,
          count: result.missingReferences.length
        });
      }

      // Success if no missing references and no errors
      result.success =
        result.missingReferences.length === 0 &&
        result.errors.length === 0 &&
        resolution.fullyResolved;

      // Metadata
      result.metadata.referenceCount = resolution.references.length;
      result.metadata.resolvedCount = result.resolvedReferences.length;
      result.metadata.missingCount = result.missingReferences.length;
      result.metadata.errorCount = result.errors.length;

    } catch (error) {
      result.errors.push({
        type: 'resolution_failure',
        message: `Vault resolution failed: ${error.message}`,
        severity: 'critical',
        stack: error.stack
      });
      result.success = false;
    }

    result.metadata.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Resolve and validate vault references
   * @param {string} text - Text to resolve
   * @param {Object} options - Options
   * @returns {VaultResolutionResult}
   */
  static resolveAndValidate(text, options = {}) {
    const resolution = this.resolve(text, options);

    // Add validation results
    resolution.validation = {
      hasErrors: resolution.errors.length > 0,
      hasWarnings: resolution.warnings.length > 0,
      hasMissingReferences: resolution.missingReferences.length > 0,
      isValid: resolution.success
    };

    return resolution;
  }

  /**
   * Get a summary of resolution result
   * @param {VaultResolutionResult} result
   * @returns {string}
   */
  static getSummary(result) {
    const parts = [];

    if (result.success) {
      parts.push(`✓ Resolution successful`);
    } else {
      parts.push(`✗ Resolution failed`);
    }

    parts.push(`${result.resolvedReferences.length} resolved`);

    if (result.missingReferences.length > 0) {
      parts.push(`${result.missingReferences.length} missing`);
    }

    if (result.errors.length > 0) {
      parts.push(`${result.errors.length} error(s)`);
    }

    if (result.warnings.length > 0) {
      parts.push(`${result.warnings.length} warning(s)`);
    }

    return parts.join(', ');
  }

  /**
   * Log resolution result to console
   * @param {VaultResolutionResult} result
   * @param {string} prefix - Log prefix
   */
  static logResult(result, prefix = 'VaultResolution') {
    const summary = this.getSummary(result);

    if (result.success) {
      console.log(`[${nowISO()}] [${prefix}] ${summary}`);
    } else {
      console.error(`[${nowISO()}] [${prefix}] ${summary}`);

      if (result.missingReferences.length > 0) {
        console.error(`[${nowISO()}] [${prefix}] Missing: ${result.missingReferences.join(', ')}`);
      }

      if (result.errors.length > 0) {
        result.errors.forEach(err => {
          console.error(`[${nowISO()}] [${prefix}] Error: ${err.message}`);
        });
      }
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach(warn => {
        console.warn(`[${nowISO()}] [${prefix}] Warning: ${warn.message}`);
      });
    }
  }
}

export default VaultResolutionService;
