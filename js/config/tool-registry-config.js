/**
 * TOOL REGISTRY CONFIGURATION
 *
 * Centralized configuration for all LLM tool parsing, validation, and execution.
 * This file defines:
 * - Tool definitions with regex patterns
 * - Validation schemas and rules
 * - Common patterns (vault refs, attributes, etc.)
 * - Tool types and actions
 *
 * To add a new tool:
 * 1. Add a new entry to TOOL_DEFINITIONS
 * 2. Define extraction pattern(s)
 * 3. Define validation schema
 * 4. Implement handler in parser-appliers.js (if needed)
 */

// ============================================================================
// COMMON PATTERNS
// ============================================================================

/**
 * Common regex patterns used across tools
 */
export const COMMON_PATTERNS = {
    // Attribute parsing: key="value" or key='value' or standalone flags
    ATTRIBUTES: /(\w+)=["']([^"']*)["']|\b(\w+)(?=\s|$)/g,

    // Vault reference: {{<vaultref id="vault_id" />}}
    VAULT_REFERENCE: /{{<vaultref\s+id=["']([^"']+)["']\s*\/>}}/gi,

    // Identifier validation: alphanumeric, underscore, hyphen
    VALID_IDENTIFIER: /^[a-zA-Z0-9_-]+$/,

    // Dangerous characters/scripts
    DANGEROUS_CHARS: /<script|javascript:|onerror=|onclick=/gi,
};

function buildSelfClosingPattern(tagName) {
    return new RegExp(String.raw`{{<${tagName}(?:\s+([\s\S]*?))?\s*\/>}}`, 'g');
}

function buildBlockPattern(tagName) {
    return new RegExp(String.raw`{{<${tagName}(?:\s+([\s\S]*?))?>}}([\s\S]*?){{<\/${tagName}>}}`, 'g');
}

/**
 * Validation constants
 */
export const VALIDATION_CONSTANTS = {
    MAX_IDENTIFIER_LENGTH: 200,
    MAX_CONTENT_SIZE: 1000000, // 1MB
    MIN_IDENTIFIER_LENGTH: 1,
};

// ============================================================================
// TOOL TYPE ENUMERATIONS
// ============================================================================

/**
 * Tool types - defines category of tools
 */
export const TOOL_TYPES = {
    BLOCK: 'block',           // Tools with content blocks ({{<tool>}}...{{</tool>}})
    SELF_CLOSING: 'self_closing', // Self-closing tags ({{<tool ... />}})
    HYBRID: 'hybrid',         // Supports both formats
};

/**
 * Tool categories for organization
 */
export const TOOL_CATEGORIES = {
    REASONING: 'reasoning',
    STORAGE: 'storage',
    EXECUTION: 'execution',
    OUTPUT: 'output',
};

/**
 * Storage entity types
 */
export const STORAGE_ENTITIES = {
    MEMORY: 'memory',
    TASK: 'task',
    GOAL: 'goal',
    VAULT: 'vault',
};

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

// ============================================================================
// TOOL DEFINITIONS REGISTRY
// ============================================================================

/**
 * Complete tool registry with extraction patterns and validation schemas.
 * Each tool definition includes:
 * - id: Unique identifier
 * - name: Display name
 * - type: TOOL_TYPES value
 * - category: TOOL_CATEGORIES value
 * - patterns: Regex patterns for extraction
 * - schema: Validation schema
 * - storage: Storage entity type (if applicable)
 */
export const TOOL_DEFINITIONS = {

    // ========================================================================
    // REASONING TOOLS
    // ========================================================================

    REASONING_TEXT: {
        id: 'reasoning_text',
        name: 'Reasoning Text',
        type: TOOL_TYPES.BLOCK,
        category: TOOL_CATEGORIES.REASONING,
        patterns: {
            block: /{{<reasoning_text>}}([\s\S]*?){{<\/reasoning_text>}}/g,
        },
        schema: {
            hasContent: true,
            requiresContent: true,
            attributes: {},
        },
        storage: null,
    },

    // ========================================================================
    // STORAGE TOOLS
    // ========================================================================

    MEMORY: {
        id: 'memory',
        name: 'Memory',
        type: TOOL_TYPES.SELF_CLOSING,
        category: TOOL_CATEGORIES.STORAGE,
        patterns: {
            selfClosing: buildSelfClosingPattern('memory'),
        },
        schema: {
            hasContent: false,
            requiresContent: false,
            attributes: {
                identifier: {
                    required: true,
                    alternativeKeys: ['heading'],
                    validate: 'identifier',
                    description: 'Unique identifier for the memory entry',
                },
                heading: {
                    required: false,
                    type: 'string',
                    description: 'Title or summary of the memory',
                },
                content: {
                    required: false,
                    type: 'string',
                    maxLength: VALIDATION_CONSTANTS.MAX_CONTENT_SIZE,
                    description: 'Main content of the memory',
                },
                notes: {
                    required: false,
                    type: 'string',
                    description: 'Optional annotations',
                },
                delete: {
                    required: false,
                    type: 'flag',
                    description: 'Flag to delete this entry',
                },
            },
        },
        storage: STORAGE_ENTITIES.MEMORY,
    },

    TASK: {
        id: 'task',
        name: 'Task',
        type: TOOL_TYPES.SELF_CLOSING,
        category: TOOL_CATEGORIES.STORAGE,
        patterns: {
            selfClosing: buildSelfClosingPattern('task'),
        },
        schema: {
            hasContent: false,
            requiresContent: false,
            attributes: {
                identifier: {
                    required: true,
                    alternativeKeys: ['heading'],
                    validate: 'identifier',
                    description: 'Unique identifier for the task',
                },
                heading: {
                    required: false,
                    type: 'string',
                    description: 'Task title',
                },
                content: {
                    required: false,
                    type: 'string',
                    maxLength: VALIDATION_CONSTANTS.MAX_CONTENT_SIZE,
                    description: 'Task description',
                },
                status: {
                    required: false,
                    type: 'enum',
                    values: TASK_STATUSES,
                    default: 'pending',
                    description: 'Task status',
                },
                notes: {
                    required: false,
                    type: 'string',
                    description: 'Progress notes',
                },
                delete: {
                    required: false,
                    type: 'flag',
                    description: 'Flag to delete this entry',
                },
            },
        },
        storage: STORAGE_ENTITIES.TASK,
    },

    GOAL: {
        id: 'goal',
        name: 'Goal',
        type: TOOL_TYPES.SELF_CLOSING,
        category: TOOL_CATEGORIES.STORAGE,
        patterns: {
            selfClosing: buildSelfClosingPattern('goal'),
        },
        schema: {
            hasContent: false,
            requiresContent: false,
            attributes: {
                identifier: {
                    required: true,
                    alternativeKeys: ['heading'],
                    validate: 'identifier',
                    description: 'Unique identifier for the goal',
                },
                heading: {
                    required: false,
                    type: 'string',
                    description: 'Goal title',
                },
                content: {
                    required: false,
                    type: 'string',
                    maxLength: VALIDATION_CONSTANTS.MAX_CONTENT_SIZE,
                    description: 'Goal description/success criteria',
                },
                notes: {
                    required: false,
                    type: 'string',
                    description: 'Optional metadata',
                },
                delete: {
                    required: false,
                    type: 'flag',
                    description: 'Flag to delete this entry',
                },
            },
        },
        storage: STORAGE_ENTITIES.GOAL,
    },

    DATAVAULT: {
        id: 'datavault',
        name: 'DataVault',
        type: TOOL_TYPES.HYBRID,
        category: TOOL_CATEGORIES.STORAGE,
        patterns: {
            selfClosing: buildSelfClosingPattern('datavault'),
            block: buildBlockPattern('datavault'),
        },
        schema: {
            hasContent: true, // Can have content
            requiresContent: false, // But not always required
            attributes: {
                id: {
                    required: true,
                    validate: 'identifier',
                    description: 'Unique identifier for vault entry',
                },
                action: {
                    required: false,
                    type: 'enum',
                    values: Object.values(VAULT_ACTIONS),
                    description: 'Vault operation type',
                },
                type: {
                    required: false,
                    type: 'enum',
                    values: Object.values(VAULT_TYPES),
                    default: VAULT_TYPES.TEXT,
                    normalize: true, // Convert to lowercase
                    description: 'Type of content stored',
                },
                description: {
                    required: false,
                    type: 'string',
                    description: 'Description of vault content',
                },
                limit: {
                    required: false,
                    type: 'number',
                    description: 'Character limit for read operations',
                },
                delete: {
                    required: false,
                    type: 'flag',
                    description: 'Flag to delete this entry',
                },
            },
        },
        storage: STORAGE_ENTITIES.VAULT,
    },

    // ========================================================================
    // EXECUTION TOOLS
    // ========================================================================

    JS_EXECUTE: {
        id: 'js_execute',
        name: 'JavaScript Execution',
        type: TOOL_TYPES.BLOCK,
        category: TOOL_CATEGORIES.EXECUTION,
        patterns: {
            block: /{{<js_execute>}}([\s\S]*?){{<\/js_execute>}}/g,
        },
        schema: {
            hasContent: true,
            requiresContent: true,
            attributes: {},
        },
        storage: null,
    },

    // ========================================================================
    // OUTPUT TOOLS
    // ========================================================================

    FINAL_OUTPUT: {
        id: 'final_output',
        name: 'Final Output',
        type: TOOL_TYPES.BLOCK,
        category: TOOL_CATEGORIES.OUTPUT,
        patterns: {
            block: /{{<final_output>}}([\s\S]*?){{<\/final_output>}}/g,
        },
        schema: {
            hasContent: true,
            requiresContent: true,
            attributes: {},
        },
        storage: null,
    },

};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get tool definition by ID
 * @param {string} toolId - Tool identifier
 * @returns {Object|null} Tool definition or null if not found
 */
export function getToolDefinition(toolId) {
    return Object.values(TOOL_DEFINITIONS).find(tool => tool.id === toolId) || null;
}

/**
 * Get all tools in a category
 * @param {string} category - Category from TOOL_CATEGORIES
 * @returns {Array} Array of tool definitions
 */
export function getToolsByCategory(category) {
    return Object.values(TOOL_DEFINITIONS).filter(tool => tool.category === category);
}

/**
 * Get all tools that use storage
 * @returns {Array} Array of tool definitions with storage
 */
export function getStorageTools() {
    return Object.values(TOOL_DEFINITIONS).filter(tool => tool.storage !== null);
}

/**
 * Get extraction patterns for all tools
 * @returns {Object} Map of tool IDs to their patterns
 */
export function getAllToolPatterns() {
    const patterns = {};
    Object.values(TOOL_DEFINITIONS).forEach(tool => {
        patterns[tool.id] = tool.patterns;
    });
    return patterns;
}

/**
 * Validate if a string is a valid identifier
 * @param {string} identifier - String to validate
 * @returns {boolean} True if valid
 */
export function isValidIdentifier(identifier) {
    if (!identifier || typeof identifier !== 'string') return false;
    if (identifier.length < VALIDATION_CONSTANTS.MIN_IDENTIFIER_LENGTH) return false;
    if (identifier.length > VALIDATION_CONSTANTS.MAX_IDENTIFIER_LENGTH) return false;
    return COMMON_PATTERNS.VALID_IDENTIFIER.test(identifier);
}

/**
 * Check if text contains dangerous content
 * @param {string} text - Text to check
 * @returns {boolean} True if dangerous content found
 */
export function hasDangerousContent(text) {
    if (!text) return false;
    return COMMON_PATTERNS.DANGEROUS_CHARS.test(text);
}

/**
 * Sanitize text by removing dangerous content
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeText(text) {
    if (!text) return '';
    return text.replace(COMMON_PATTERNS.DANGEROUS_CHARS, '');
}

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

// ============================================================================
// VAULT REFERENCE UTILITIES
// ============================================================================

/**
 * Vault reference configuration
 */
export const VAULT_REFERENCE_CONFIG = {
    pattern: COMMON_PATTERNS.VAULT_REFERENCE,
    placeholderTemplate: (id) => `{{<vaultref id="${id}" />}}`,
    missingTemplate: (id) => `/* [MISSING_VAULT:${id}] */`,
    errorTemplate: (id, error) => `/* [VAULT_ERROR:${id}:${error}] */`,
};

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

// ============================================================================
// ATTRIBUTE PARSING
// ============================================================================

/**
 * Parse attributes from a string
 * @param {string} attrString - Attribute string (e.g., 'id="foo" type="bar" delete')
 * @returns {Object} Parsed attributes
 */
export function parseAttributes(attrString) {
    const attrs = {};
    if (!attrString) return attrs;

    let i = 0;
    const len = attrString.length;

    const isKeyChar = (char) => /[A-Za-z0-9_-]/.test(char);

    while (i < len) {
        // Skip whitespace
        while (i < len && /\s/.test(attrString[i])) i++;
        if (i >= len) break;

        let key = '';
        while (i < len && isKeyChar(attrString[i])) {
            key += attrString[i++];
        }

        if (!key) {
            // Skip unknown token
            i++;
            continue;
        }

        // Skip whitespace before '='
        while (i < len && /\s/.test(attrString[i])) i++;

        if (attrString[i] !== '=') {
            // Flag-style attribute (e.g., delete)
            attrs[key] = true;
            continue;
        }

        i++; // Skip '='
        while (i < len && /\s/.test(attrString[i])) i++;

        let value = '';
        const quote = attrString[i];
        if (quote === '"' || quote === "'") {
            i++; // Skip opening quote
            while (i < len) {
                const char = attrString[i];
                if (char === '\\' && i + 1 < len) {
                    value += attrString[i + 1];
                    i += 2;
                    continue;
                }
                if (char === quote) {
                    i++;
                    break;
                }
                value += char;
                i++;
            }
        } else {
            // Unquoted value
            while (i < len && !/\s/.test(attrString[i])) {
                value += attrString[i++];
            }
        }

        attrs[key] = value;
    }

    return attrs;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

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

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
    // Main registry
    TOOL_DEFINITIONS,

    // Enums
    TOOL_TYPES,
    TOOL_CATEGORIES,
    STORAGE_ENTITIES,
    TASK_STATUSES,
    VAULT_TYPES,
    VAULT_ACTIONS,

    // Patterns
    COMMON_PATTERNS,
    VALIDATION_CONSTANTS,
    VAULT_REFERENCE_CONFIG,

    // Helper functions
    getToolDefinition,
    getToolsByCategory,
    getStorageTools,
    getAllToolPatterns,
    isValidIdentifier,
    hasDangerousContent,
    sanitizeText,
    normalizeVaultType,
    normalizeTaskStatus,
    extractVaultReferenceIds,
    countVaultReferences,
    parseAttributes,
    isValidContentSize,
    createValidationError,
};
