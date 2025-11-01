/**
 * Tool Normalizers Configuration
 *
 * Normalization functions for tool attributes and values
 */

/**
 * Task status values
 */
export const TASK_STATUSES = ['pending', 'ongoing', 'finished', 'paused'];

/**
 * Vault types
 */
export const VAULT_TYPES = {
    TEXT: 'text',
    CODE: 'code',
    DATA: 'data',
};

/**
 * Vault actions
 */
export const VAULT_ACTIONS = {
    REQUEST_READ: 'request_read',
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
};

/**
 * Normalize vault type to lowercase and validate
 * @param {string} type - Vault type
 * @returns {string} Normalized type or default
 */
export function normalizeVaultType(type) {
    if (!type) return VAULT_TYPES.TEXT;
    const normalized = type.toLowerCase();
    return Object.values(VAULT_TYPES).includes(normalized)
        ? normalized
        : VAULT_TYPES.TEXT;
}

/**
 * Normalize task status and validate
 * @param {string} status - Task status
 * @returns {string} Normalized status or default
 */
export function normalizeTaskStatus(status) {
    if (!status) return 'pending';
    const normalized = status.toLowerCase();
    return TASK_STATUSES.includes(normalized)
        ? normalized
        : 'pending';
}

/**
 * Normalize vault action
 * @param {string} action - Vault action
 * @returns {string} Normalized action or null
 */
export function normalizeVaultAction(action) {
    if (!action) return null;
    const normalized = action.toLowerCase();
    return Object.values(VAULT_ACTIONS).includes(normalized)
        ? normalized
        : null;
}

/**
 * Normalize identifier (trim, lowercase optional)
 * @param {string} identifier - Identifier to normalize
 * @param {boolean} toLowerCase - Convert to lowercase
 * @returns {string} Normalized identifier
 */
export function normalizeIdentifier(identifier, toLowerCase = false) {
    if (!identifier) return '';
    let normalized = identifier.trim();
    if (toLowerCase) {
        normalized = normalized.toLowerCase();
    }
    return normalized;
}

/**
 * Normalize boolean flag
 * @param {*} value - Value to normalize
 * @returns {boolean} Boolean value
 */
export function normalizeBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const lower = value.toLowerCase();
        return lower === 'true' || lower === '1' || lower === 'yes';
    }
    return Boolean(value);
}

/**
 * Normalize number value
 * @param {*} value - Value to normalize
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} Number value
 */
export function normalizeNumber(value, defaultValue = 0) {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
}

/**
 * Normalize content (trim, clean up whitespace)
 * @param {string} content - Content to normalize
 * @returns {string} Normalized content
 */
export function normalizeContent(content) {
    if (!content) return '';
    // Trim but preserve internal structure
    return content.trim();
}

/**
 * Auto-detect vault type from content
 * @param {string} content - Vault content
 * @returns {string} Detected type
 */
export function autoDetectVaultType(content) {
    if (!content) return VAULT_TYPES.TEXT;

    const trimmed = content.trim();

    // Check for code patterns
    const codePatterns = [
        /^function\s+\w+/,
        /^const\s+\w+\s*=/,
        /^let\s+\w+\s*=/,
        /^var\s+\w+\s*=/,
        /^class\s+\w+/,
        /^import\s+/,
        /^export\s+/,
    ];

    for (const pattern of codePatterns) {
        if (pattern.test(trimmed)) {
            return VAULT_TYPES.CODE;
        }
    }

    // Check for JSON/data patterns
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
            JSON.parse(trimmed);
            return VAULT_TYPES.DATA;
        } catch (e) {
            // Not valid JSON, treat as text
        }
    }

    return VAULT_TYPES.TEXT;
}

export default {
    TASK_STATUSES,
    VAULT_TYPES,
    VAULT_ACTIONS,
    normalizeVaultType,
    normalizeTaskStatus,
    normalizeVaultAction,
    normalizeIdentifier,
    normalizeBoolean,
    normalizeNumber,
    normalizeContent,
    autoDetectVaultType,
};
