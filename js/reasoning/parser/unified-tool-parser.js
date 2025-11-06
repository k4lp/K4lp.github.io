/**
 * UNIFIED TOOL PARSER
 *
 * Registry-based tool parser that dynamically handles all tools defined in
 * tool-registry-config.js. This module provides a single interface for:
 * - Extracting any tool from LLM responses
 * - Validating tool operations
 * - Parsing tool attributes
 *
 * To add a new tool:
 * 1. Add it to TOOL_DEFINITIONS in tool-registry-config.js
 * 2. That's it! This parser will automatically handle it.
 */

import {
    TOOL_DEFINITIONS,
    TOOL_TYPES,
    parseAttributes,
    getToolDefinition,
    getAllToolPatterns,
    isValidIdentifier,
    isValidContentSize,
    normalizeVaultType,
    normalizeTaskStatus,
    sanitizeText,
} from '../../config/tool-registry-config.js';

// ============================================================================
// REGEX CACHE - Performance optimization
// ============================================================================

const REGEX_CACHE = new Map();

/**
 * Get cached compiled regex pattern
 * @param {Object} tool - Tool definition
 * @param {string} patternKey - Pattern key (block/selfClosing)
 * @returns {RegExp} Compiled regex
 */
function getCompiledPattern(tool, patternKey) {
    const cacheKey = `${tool.id}:${patternKey}`;
    if (!REGEX_CACHE.has(cacheKey)) {
        const patternString = tool.patterns[patternKey];
        if (patternString) {
            REGEX_CACHE.set(cacheKey, new RegExp(patternString));
        }
    }
    return REGEX_CACHE.get(cacheKey);
}

// ============================================================================
// EXTRACTION
// ============================================================================

/**
 * Helper: Extract operations using a specific pattern
 * @param {string} text - Text to parse
 * @param {RegExp} pattern - Cached compiled regex pattern
 * @param {Object} tool - Tool definition
 * @param {string} type - Operation type (block/self_closing)
 * @param {boolean} isBlock - Whether this is a block pattern
 * @returns {Array} Extracted operations
 */
function extractByPattern(text, pattern, tool, type, isBlock) {
    const operations = [];
    let match;

    while ((match = pattern.exec(text)) !== null) {
        if (isBlock) {
            // Block format: match[1] = attributes (optional), match[2] or match[1] = content
            const hasAttributes = match[2] !== undefined;
            const attrString = hasAttributes ? match[1] : '';
            const content = hasAttributes ? match[2] : match[1];
            const attributes = attrString ? parseAttributes(attrString) : {};

            operations.push({
                toolId: tool.id,
                type,
                raw: match[0],
                content,
                attributes,
                hasContent: true,
            });
        } else {
            // Self-closing format: match[1] = attributes
            const attrString = match[1] || '';
            const attributes = parseAttributes(attrString);

            operations.push({
                toolId: tool.id,
                type,
                raw: match[0],
                content: null,
                attributes,
                hasContent: false,
            });
        }
    }

    return operations;
}

/**
 * Extract all operations for a specific tool from text
 * OPTIMIZED: Uses cached regex patterns, no redundant code
 * @param {string} text - Text to parse
 * @param {string} toolId - Tool ID from TOOL_DEFINITIONS
 * @returns {Array} Array of extracted operations
 */
export function extractToolOperations(text, toolId) {
    const tool = getToolDefinition(toolId);
    if (!tool) {
        console.warn(`Unknown tool: ${toolId}`);
        return [];
    }

    const operations = [];

    // Extract based on tool type - using cached regex patterns
    if (tool.type === TOOL_TYPES.BLOCK && tool.patterns.block) {
        const pattern = getCompiledPattern(tool, 'block');
        if (pattern) {
            operations.push(...extractByPattern(text, pattern, tool, 'block', true));
        }
    }

    if (tool.type === TOOL_TYPES.SELF_CLOSING && tool.patterns.selfClosing) {
        const pattern = getCompiledPattern(tool, 'selfClosing');
        if (pattern) {
            operations.push(...extractByPattern(text, pattern, tool, 'self_closing', false));
        }
    }

    if (tool.type === TOOL_TYPES.HYBRID) {
        // Hybrid: supports both formats
        if (tool.patterns.selfClosing) {
            const pattern = getCompiledPattern(tool, 'selfClosing');
            if (pattern) {
                operations.push(...extractByPattern(text, pattern, tool, 'self_closing', false));
            }
        }

        if (tool.patterns.block) {
            const pattern = getCompiledPattern(tool, 'block');
            if (pattern) {
                operations.push(...extractByPattern(text, pattern, tool, 'block', true));
            }
        }
    }

    return operations;
}

/**
 * Extract all tool operations from text
 * @param {string} text - Text to parse
 * @param {Object} options - Extraction options
 * @param {Array<string>} options.toolIds - Specific tools to extract (default: all)
 * @param {Array<string>} options.categories - Extract only from specific categories
 * @returns {Object} Map of toolId -> operations array
 */
export function extractAllToolOperations(text, options = {}) {
    const { toolIds = null, categories = null } = options;

    const result = {};

    // Determine which tools to extract
    let toolsToExtract = Object.values(TOOL_DEFINITIONS);

    if (toolIds) {
        toolsToExtract = toolsToExtract.filter(tool => toolIds.includes(tool.id));
    }

    if (categories) {
        toolsToExtract = toolsToExtract.filter(tool => categories.includes(tool.category));
    }

    // Extract operations for each tool
    toolsToExtract.forEach(tool => {
        const operations = extractToolOperations(text, tool.id);
        if (operations.length > 0) {
            result[tool.id] = operations;
        }
    });

    return result;
}

/**
 * Extract operations and flatten into single array with metadata
 * @param {string} text - Text to parse
 * @param {Object} options - Extraction options
 * @returns {Array} Flat array of all operations with tool metadata
 */
export function extractAllOperationsFlat(text, options = {}) {
    const toolOperations = extractAllToolOperations(text, options);
    const flat = [];

    Object.entries(toolOperations).forEach(([toolId, operations]) => {
        const tool = getToolDefinition(toolId);
        operations.forEach(op => {
            flat.push({
                ...op,
                toolName: tool.name,
                toolCategory: tool.category,
                toolStorage: tool.storage,
            });
        });
    });

    return flat;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate operation against tool schema
 * @param {Object} operation - Operation to validate
 * @param {string} operation.toolId - Tool ID
 * @param {Object} operation.attributes - Operation attributes
 * @param {string} operation.content - Operation content (if any)
 * @returns {Object} Validation result
 */
export function validateOperation(operation) {
    const result = {
        valid: true,
        errors: [],
        warnings: [],
        normalized: {},
    };

    const tool = getToolDefinition(operation.toolId);
    if (!tool) {
        result.valid = false;
        result.errors.push({
            field: 'toolId',
            message: `Unknown tool: ${operation.toolId}`,
        });
        return result;
    }

    const schema = tool.schema;
    const attrs = operation.attributes || {};

    // FIXED: Use statically imported validation functions (not async import)
    // This ensures validation actually executes before the function returns

    // Validate attributes
    Object.entries(schema.attributes || {}).forEach(([attrName, attrSchema]) => {
        const value = attrs[attrName];

        // Check required attributes
        if (attrSchema.required) {
            // Check for alternative keys
            if (attrSchema.alternativeKeys) {
                const hasAny = attrSchema.alternativeKeys.some(key => attrs[key]);
                if (!value && !hasAny) {
                    result.valid = false;
                    result.errors.push({
                        field: attrName,
                        message: `Required attribute missing. Provide ${attrName} or one of: ${attrSchema.alternativeKeys.join(', ')}`,
                    });
                }
            } else if (!value && value !== false && value !== 0) {
                result.valid = false;
                result.errors.push({
                    field: attrName,
                    message: `Required attribute missing: ${attrName}`,
                });
            }
        }

        // Skip validation if no value and not required
        if (!value && value !== false && value !== 0) {
            return;
        }

        // Validate by type
        if (attrSchema.type === 'string') {
            if (typeof value !== 'string') {
                result.warnings.push({
                    field: attrName,
                    message: `Expected string, got ${typeof value}`,
                });
            }

            // Check max length
            if (attrSchema.maxLength && value.length > attrSchema.maxLength) {
                result.valid = false;
                result.errors.push({
                    field: attrName,
                    message: `Value exceeds maximum length of ${attrSchema.maxLength}`,
                });
            }
        } else if (attrSchema.type === 'enum') {
            if (!attrSchema.values.includes(value)) {
                // Use default if available
                if (attrSchema.default) {
                    result.normalized[attrName] = attrSchema.default;
                    result.warnings.push({
                        field: attrName,
                        message: `Invalid value "${value}", using default: ${attrSchema.default}`,
                    });
                } else {
                    result.valid = false;
                    result.errors.push({
                        field: attrName,
                        message: `Invalid value. Allowed values: ${attrSchema.values.join(', ')}`,
                    });
                }
            } else {
                result.normalized[attrName] = value;
            }
        } else if (attrSchema.type === 'number') {
            const num = Number(value);
            if (isNaN(num)) {
                result.valid = false;
                result.errors.push({
                    field: attrName,
                    message: `Expected number, got ${typeof value}`,
                });
            } else {
                result.normalized[attrName] = num;
            }
        } else if (attrSchema.type === 'flag') {
            result.normalized[attrName] = Boolean(value);
        }

        // Custom validators
        if (attrSchema.validate === 'identifier' && value) {
            if (!isValidIdentifier(value)) {
                result.valid = false;
                result.errors.push({
                    field: attrName,
                    message: `Invalid identifier format: ${value}`,
                });
            }
        }

        // Normalization
        if (attrSchema.normalize && value) {
            if (attrName === 'type' && tool.id === 'datavault') {
                result.normalized[attrName] = normalizeVaultType(value);
            } else if (attrName === 'status' && tool.id === 'task') {
                result.normalized[attrName] = normalizeTaskStatus(value);
            }
        }
    });

    // Validate content
    if (schema.requiresContent && !operation.content) {
        result.valid = false;
        result.errors.push({
            field: 'content',
            message: 'Content is required for this tool',
        });
    }

    if (operation.content && !isValidContentSize(operation.content)) {
        result.valid = false;
        result.errors.push({
            field: 'content',
            message: 'Content exceeds maximum size',
        });
    }

    return result;
}

/**
 * Validate multiple operations
 * @param {Array} operations - Array of operations
 * @returns {Object} Validation summary
 */
export function validateOperations(operations) {
    const summary = {
        total: operations.length,
        valid: 0,
        invalid: 0,
        results: [],
    };

    operations.forEach(operation => {
        const validation = validateOperation(operation);
        summary.results.push({
            operation,
            validation,
        });

        if (validation.valid) {
            summary.valid++;
        } else {
            summary.invalid++;
        }
    });

    return summary;
}

// ============================================================================
// PARSING (EXTRACT + VALIDATE)
// ============================================================================

/**
 * Parse tool operations from text (extract and validate)
 * @param {string} text - Text to parse
 * @param {string} toolId - Tool ID
 * @returns {Object} Parse result
 */
export function parseToolOperations(text, toolId) {
    const operations = extractToolOperations(text, toolId);
    const validated = operations.map(op => {
        const validation = validateOperation(op);
        return {
            ...op,
            validation,
            isValid: validation.valid,
        };
    });

    return {
        toolId,
        count: validated.length,
        operations: validated,
        validCount: validated.filter(op => op.isValid).length,
        invalidCount: validated.filter(op => !op.isValid).length,
    };
}

/**
 * Parse all tool operations from text
 * @param {string} text - Text to parse
 * @param {Object} options - Parse options
 * @returns {Object} Complete parse result
 */
export function parseAllToolOperations(text, options = {}) {
    const extracted = extractAllToolOperations(text, options);
    const result = {
        toolCount: Object.keys(extracted).length,
        totalOperations: 0,
        validOperations: 0,
        invalidOperations: 0,
        byTool: {},
    };

    Object.entries(extracted).forEach(([toolId, operations]) => {
        const parsed = parseToolOperations(text, toolId);
        result.byTool[toolId] = parsed;
        result.totalOperations += parsed.count;
        result.validOperations += parsed.validCount;
        result.invalidOperations += parsed.invalidCount;
    });

    return result;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if text contains operations for a specific tool
 * @param {string} text - Text to check
 * @param {string} toolId - Tool ID
 * @returns {boolean} True if tool operations found
 */
export function hasToolOperations(text, toolId) {
    const operations = extractToolOperations(text, toolId);
    return operations.length > 0;
}

/**
 * Count operations for a specific tool
 * @param {string} text - Text to check
 * @param {string} toolId - Tool ID
 * @returns {number} Number of operations
 */
export function countToolOperations(text, toolId) {
    const operations = extractToolOperations(text, toolId);
    return operations.length;
}

/**
 * Get operation summary
 * @param {string} text - Text to analyze
 * @returns {Object} Operation summary
 */
export function getOperationSummary(text) {
    const summary = {
        hasOperations: false,
        tools: [],
        totalCount: 0,
        byTool: {},
    };

    Object.values(TOOL_DEFINITIONS).forEach(tool => {
        const count = countToolOperations(text, tool.id);
        if (count > 0) {
            summary.hasOperations = true;
            summary.tools.push(tool.id);
            summary.totalCount += count;
            summary.byTool[tool.id] = {
                name: tool.name,
                count,
                category: tool.category,
            };
        }
    });

    return summary;
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
    // Extraction
    extractToolOperations,
    extractAllToolOperations,
    extractAllOperationsFlat,

    // Validation
    validateOperation,
    validateOperations,

    // Parsing (extract + validate)
    parseToolOperations,
    parseAllToolOperations,

    // Utilities
    hasToolOperations,
    countToolOperations,
    getOperationSummary,
};
