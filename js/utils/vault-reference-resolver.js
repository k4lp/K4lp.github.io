/**
 * VAULT REFERENCE RESOLVER
 *
 * Centralized utility for resolving vault references in text and code.
 * Eliminates duplication between execution-runner.js and vault-manager.js.
 *
 * Handles patterns like: {{<vaultref id="vault_id" />}}
 */

import {
    VAULT_REFERENCE_CONFIG,
    extractVaultReferenceIds,
    countVaultReferences,
} from '../config/tool-registry-config.js';
import { Storage } from '../storage/storage.js';

// ============================================================================
// VAULT REFERENCE RESOLUTION
// ============================================================================

/**
 * Resolve all vault references in text
 * @param {string} text - Text containing vault references
 * @param {Object} options - Resolution options
 * @param {boolean} options.throwOnMissing - Throw error if vault entry not found
 * @param {Function} options.onMissing - Custom handler for missing entries
 * @param {Function} options.onError - Custom error handler
 * @param {number} options.maxDepth - Maximum recursion depth (default: 3)
 * @returns {Object} Resolution result
 */
export function resolveVaultReferences(text, options = {}) {
    const {
        throwOnMissing = false,
        onMissing = null,
        onError = null,
        maxDepth = 3,
    } = options;

    const result = {
        originalText: text,
        resolvedText: text,
        references: [],
        missing: [],
        errors: [],
        depth: 0,
        fullyResolved: false,
    };

    if (!text) {
        result.fullyResolved = true;
        return result;
    }

    // Load vault data once
    let vault;
    try {
        vault = Storage.loadVault() || [];
    } catch (error) {
        result.errors.push({
            type: 'storage_error',
            message: 'Failed to load vault data',
            error: error.message,
        });
        if (onError) onError(error);
        return result;
    }

    // Create a map for faster lookups
    const vaultMap = new Map();
    vault.forEach(entry => {
        if (entry.identifier) {
            vaultMap.set(entry.identifier, entry);
        }
    });

    // Recursive resolution with depth limit
    let currentText = text;
    let depth = 0;
    let hasReferences = true;

    while (hasReferences && depth < maxDepth) {
        const refIds = extractVaultReferenceIds(currentText);

        if (refIds.length === 0) {
            hasReferences = false;
            result.fullyResolved = true;
            break;
        }

        depth++;
        let resolvedInThisPass = false;

        // Replace each reference
        refIds.forEach(refId => {
            const pattern = new RegExp(
                VAULT_REFERENCE_CONFIG.placeholderTemplate(refId)
                    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                'g'
            );

            // Track this reference
            if (!result.references.includes(refId)) {
                result.references.push(refId);
            }

            const vaultEntry = vaultMap.get(refId);

            if (vaultEntry && vaultEntry.content) {
                // Replace with vault content
                currentText = currentText.replace(pattern, vaultEntry.content);
                resolvedInThisPass = true;
            } else {
                // Handle missing entry
                if (!result.missing.includes(refId)) {
                    result.missing.push(refId);
                }

                const replacement = onMissing
                    ? onMissing(refId)
                    : VAULT_REFERENCE_CONFIG.missingTemplate(refId);

                currentText = currentText.replace(pattern, replacement);

                if (throwOnMissing) {
                    const error = new Error(`Vault entry not found: ${refId}`);
                    result.errors.push({
                        type: 'missing_vault',
                        refId,
                        message: error.message,
                    });
                    if (onError) onError(error);
                }
            }
        });

        // Prevent infinite loops if nothing was resolved
        if (!resolvedInThisPass) {
            break;
        }
    }

    result.resolvedText = currentText;
    result.depth = depth;

    // Check if we hit max depth
    if (depth >= maxDepth && countVaultReferences(currentText) > 0) {
        result.errors.push({
            type: 'max_depth_exceeded',
            message: `Maximum recursion depth (${maxDepth}) exceeded`,
            remainingRefs: extractVaultReferenceIds(currentText),
        });
    }

    return result;
}

/**
 * Resolve vault references in text (simple version)
 * Returns just the resolved text string
 * @param {string} text - Text with vault references
 * @returns {string} Text with references resolved
 */
export function resolveVaultReferencesSimple(text) {
    const result = resolveVaultReferences(text, {
        throwOnMissing: false,
        maxDepth: 3,
    });
    return result.resolvedText;
}

/**
 * Expand vault references for code execution
 * Used by execution-runner.js
 * @param {string} code - JavaScript code with vault references
 * @returns {Object} Expansion result
 */
export function expandVaultReferences(code) {
    const result = {
        originalCode: code,
        resolvedCode: code,
        vaultRefs: [],
        errors: [],
        hasErrors: false,
    };

    if (!code) {
        return result;
    }

    try {
        const resolution = resolveVaultReferences(code, {
            throwOnMissing: false,
            onError: (error) => {
                result.errors.push({
                    message: error.message,
                    timestamp: new Date().toISOString(),
                });
            },
        });

        result.resolvedCode = resolution.resolvedText;
        result.vaultRefs = resolution.references;
        result.hasErrors = resolution.errors.length > 0 || resolution.missing.length > 0;

        if (resolution.errors.length > 0) {
            result.errors.push(...resolution.errors);
        }

        if (resolution.missing.length > 0) {
            result.errors.push({
                type: 'missing_references',
                missing: resolution.missing,
                message: `Missing vault entries: ${resolution.missing.join(', ')}`,
            });
        }

    } catch (error) {
        result.hasErrors = true;
        result.errors.push({
            type: 'expansion_error',
            message: error.message,
            stack: error.stack,
        });
    }

    return result;
}

/**
 * Check if text contains vault references
 * @param {string} text - Text to check
 * @returns {boolean} True if vault references found
 */
export function hasVaultReferences(text) {
    if (!text) return false;
    return VAULT_REFERENCE_CONFIG.pattern.test(text);
}

/**
 * Get vault reference analysis
 * @param {string} text - Text to analyze
 * @returns {Object} Analysis result
 */
export function analyzeVaultReferences(text) {
    return {
        hasReferences: hasVaultReferences(text),
        count: countVaultReferences(text),
        ids: extractVaultReferenceIds(text),
        pattern: VAULT_REFERENCE_CONFIG.pattern.source,
    };
}

/**
 * Validate vault references exist
 * @param {string} text - Text containing references
 * @returns {Object} Validation result
 */
export function validateVaultReferences(text) {
    const result = {
        valid: true,
        references: [],
        missing: [],
        errors: [],
    };

    if (!text) {
        return result;
    }

    const refIds = extractVaultReferenceIds(text);

    if (refIds.length === 0) {
        return result;
    }

    try {
        const vault = Storage.loadVault() || [];
        const vaultIds = new Set(vault.map(entry => entry.identifier));

        refIds.forEach(refId => {
            result.references.push(refId);

            if (!vaultIds.has(refId)) {
                result.missing.push(refId);
                result.valid = false;
            }
        });

    } catch (error) {
        result.valid = false;
        result.errors.push({
            type: 'validation_error',
            message: error.message,
        });
    }

    return result;
}

/**
 * Replace vault references with custom values
 * @param {string} text - Text with references
 * @param {Object|Function} replacements - Map of id -> value or function(id) -> value
 * @returns {string} Text with replaced references
 */
export function replaceVaultReferences(text, replacements) {
    if (!text || !replacements) return text;

    let result = text;
    const refIds = extractVaultReferenceIds(text);

    refIds.forEach(refId => {
        const pattern = new RegExp(
            VAULT_REFERENCE_CONFIG.placeholderTemplate(refId)
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            'g'
        );

        const replacement = typeof replacements === 'function'
            ? replacements(refId)
            : replacements[refId];

        if (replacement !== undefined && replacement !== null) {
            result = result.replace(pattern, replacement);
        }
    });

    return result;
}

// ============================================================================
// VAULT REFERENCE CREATION
// ============================================================================

/**
 * Create a vault reference placeholder
 * @param {string} id - Vault entry ID
 * @returns {string} Vault reference placeholder
 */
export function createVaultReference(id) {
    return VAULT_REFERENCE_CONFIG.placeholderTemplate(id);
}

/**
 * Create multiple vault references
 * @param {Array<string>} ids - Array of vault entry IDs
 * @returns {Array<string>} Array of vault reference placeholders
 */
export function createVaultReferences(ids) {
    return ids.map(id => createVaultReference(id));
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
    resolveVaultReferences,
    resolveVaultReferencesSimple,
    expandVaultReferences,
    hasVaultReferences,
    analyzeVaultReferences,
    validateVaultReferences,
    replaceVaultReferences,
    createVaultReference,
    createVaultReferences,
};
