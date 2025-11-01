/**
 * TOOL REGISTRY CONFIGURATION V2 - MODULAR
 *
 * Central registry that aggregates all tool-related configuration from modular files.
 * This is a refactored version that pulls from:
 * - tools/tool-patterns.js
 * - tools/tool-validators.js
 * - tools/tool-normalizers.js
 * - tools/vault-reference-config.js
 */

import { COMMON_PATTERNS, TOOL_PATTERNS, parseAttributes, getToolPattern } from './tools/tool-patterns.js';
import {
    VALIDATION_CONSTANTS,
    isValidIdentifier,
    hasDangerousContent,
    sanitizeText,
    isValidContentSize,
    createValidationError,
    validateRequiredAttributes,
    validateAttribute
} from './tools/tool-validators.js';
import {
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
    autoDetectVaultType
} from './tools/tool-normalizers.js';
import {
    VAULT_REFERENCE_CONFIG,
    RESOLUTION_MODES,
    DEFAULT_RESOLUTION_MODE,
    MAX_VAULT_REFERENCE_DEPTH,
    extractVaultReferenceIds,
    countVaultReferences,
    hasVaultReferences,
    createVaultReference,
    createMissingPlaceholder,
    createErrorPlaceholder
} from './tools/vault-reference-config.js';

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

// ============================================================================
// TOOL DEFINITIONS REGISTRY
// ============================================================================

/**
 * Complete tool registry with extraction patterns and validation schemas.
 */
export const TOOL_DEFINITIONS = {

    REASONING_TEXT: {
        id: 'reasoning_text',
        name: 'Reasoning Text',
        type: TOOL_TYPES.BLOCK,
        category: TOOL_CATEGORIES.REASONING,
        patterns: TOOL_PATTERNS.REASONING_TEXT,
        schema: {
            hasContent: true,
            requiresContent: true,
            attributes: {},
        },
        storage: null,
    },

    MEMORY: {
        id: 'memory',
        name: 'Memory',
        type: TOOL_TYPES.SELF_CLOSING,
        category: TOOL_CATEGORIES.STORAGE,
        patterns: TOOL_PATTERNS.MEMORY,
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
        patterns: TOOL_PATTERNS.TASK,
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
        patterns: TOOL_PATTERNS.GOAL,
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
        patterns: TOOL_PATTERNS.DATAVAULT,
        schema: {
            hasContent: true,
            requiresContent: false,
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
                    normalize: true,
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

    JS_EXECUTE: {
        id: 'js_execute',
        name: 'JavaScript Execution',
        type: TOOL_TYPES.BLOCK,
        category: TOOL_CATEGORIES.EXECUTION,
        patterns: TOOL_PATTERNS.JS_EXECUTE,
        schema: {
            hasContent: true,
            requiresContent: true,
            attributes: {},
        },
        storage: null,
    },

    FINAL_OUTPUT: {
        id: 'final_output',
        name: 'Final Output',
        type: TOOL_TYPES.BLOCK,
        category: TOOL_CATEGORIES.OUTPUT,
        patterns: TOOL_PATTERNS.FINAL_OUTPUT,
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

// ============================================================================
// RE-EXPORTS FROM MODULAR FILES
// ============================================================================

// From tool-patterns.js
export { COMMON_PATTERNS, TOOL_PATTERNS, parseAttributes, getToolPattern };

// From tool-validators.js
export {
    VALIDATION_CONSTANTS,
    isValidIdentifier,
    hasDangerousContent,
    sanitizeText,
    isValidContentSize,
    createValidationError,
    validateRequiredAttributes,
    validateAttribute
};

// From tool-normalizers.js
export {
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
    autoDetectVaultType
};

// From vault-reference-config.js
export {
    VAULT_REFERENCE_CONFIG,
    RESOLUTION_MODES,
    DEFAULT_RESOLUTION_MODE,
    MAX_VAULT_REFERENCE_DEPTH,
    extractVaultReferenceIds,
    countVaultReferences,
    hasVaultReferences,
    createVaultReference,
    createMissingPlaceholder,
    createErrorPlaceholder
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
    // Main registry
    TOOL_DEFINITIONS,
    TOOL_TYPES,
    TOOL_CATEGORIES,
    STORAGE_ENTITIES,

    // Helper functions
    getToolDefinition,
    getToolsByCategory,
    getStorageTools,
    getAllToolPatterns,

    // Re-exported modules
    COMMON_PATTERNS,
    TOOL_PATTERNS,
    VALIDATION_CONSTANTS,
    TASK_STATUSES,
    VAULT_TYPES,
    VAULT_ACTIONS,
    VAULT_REFERENCE_CONFIG,
    RESOLUTION_MODES,
    DEFAULT_RESOLUTION_MODE,
    MAX_VAULT_REFERENCE_DEPTH,

    // All functions
    parseAttributes,
    getToolPattern,
    isValidIdentifier,
    hasDangerousContent,
    sanitizeText,
    isValidContentSize,
    createValidationError,
    validateRequiredAttributes,
    validateAttribute,
    normalizeVaultType,
    normalizeTaskStatus,
    normalizeVaultAction,
    normalizeIdentifier,
    normalizeBoolean,
    normalizeNumber,
    normalizeContent,
    autoDetectVaultType,
    extractVaultReferenceIds,
    countVaultReferences,
    hasVaultReferences,
    createVaultReference,
    createMissingPlaceholder,
    createErrorPlaceholder,
};
