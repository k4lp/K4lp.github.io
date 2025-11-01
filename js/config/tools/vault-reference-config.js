/**
 * Vault Reference Configuration
 *
 * Configuration for vault reference syntax and resolution
 */

/**
 * Vault reference pattern (duplicated to avoid circular imports)
 */
const VAULT_REFERENCE_PATTERN = /{{<vaultref\s+id=["']([^"']+)["']\s*\/>}}/gi;

/**
 * Vault reference configuration
 */
export const VAULT_REFERENCE_CONFIG = {
    pattern: VAULT_REFERENCE_PATTERN,
    placeholderTemplate: (id) => `{{<vaultref id="${id}" />}}`,
    missingTemplate: (id) => `/* [MISSING_VAULT:${id}] */`,
    errorTemplate: (id, error) => `/* [VAULT_ERROR:${id}:${error}] */`,
};

/**
 * Vault reference resolution modes
 */
export const RESOLUTION_MODES = {
    INLINE: 'inline',         // Replace with content inline
    REFERENCE: 'reference',   // Keep as reference
    ERROR: 'error',           // Show error if missing
    SILENT: 'silent',         // Remove if missing
};

/**
 * Default resolution mode
 */
export const DEFAULT_RESOLUTION_MODE = RESOLUTION_MODES.INLINE;

/**
 * Maximum recursion depth for nested vault references
 */
export const MAX_VAULT_REFERENCE_DEPTH = 10;

/**
 * Extract vault reference IDs from text
 * @param {string} text - Text to search
 * @returns {Array<string>} Array of vault IDs
 */
export function extractVaultReferenceIds(text) {
    if (!text) return [];
    const pattern = new RegExp(VAULT_REFERENCE_CONFIG.pattern);
    const ids = [];
    let match;

    while ((match = pattern.exec(text)) !== null) {
        ids.push(match[1]);
    }

    return [...new Set(ids)]; // Remove duplicates
}

/**
 * Count vault references in text
 * @param {string} text - Text to search
 * @returns {number} Number of vault references
 */
export function countVaultReferences(text) {
    if (!text) return 0;
    const matches = text.match(VAULT_REFERENCE_CONFIG.pattern);
    return matches ? matches.length : 0;
}

/**
 * Check if text contains vault references
 * @param {string} text - Text to check
 * @returns {boolean} True if contains vault references
 */
export function hasVaultReferences(text) {
    return countVaultReferences(text) > 0;
}

/**
 * Create vault reference placeholder
 * @param {string} id - Vault entry ID
 * @returns {string} Vault reference string
 */
export function createVaultReference(id) {
    return VAULT_REFERENCE_CONFIG.placeholderTemplate(id);
}

/**
 * Create missing vault placeholder
 * @param {string} id - Vault entry ID
 * @returns {string} Missing vault placeholder
 */
export function createMissingPlaceholder(id) {
    return VAULT_REFERENCE_CONFIG.missingTemplate(id);
}

/**
 * Create vault error placeholder
 * @param {string} id - Vault entry ID
 * @param {string} error - Error message
 * @returns {string} Error placeholder
 */
export function createErrorPlaceholder(id, error) {
    return VAULT_REFERENCE_CONFIG.errorTemplate(id, error);
}

export default {
    VAULT_REFERENCE_CONFIG,
    RESOLUTION_MODES,
    DEFAULT_RESOLUTION_MODE,
    MAX_VAULT_REFERENCE_DEPTH,
    extractVaultReferenceIds,
    countVaultReferences,
    hasVaultReferences,
    createVaultReference,
    createMissingPlaceholder,
    createErrorPlaceholder,
};
