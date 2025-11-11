/**
 * XML TOOL PARSER
 *
 * Modern XML-based parser using browser-native DOMParser.
 * Replaces 14+ custom regex patterns with standard XML parsing.
 *
 * BENEFITS:
 * - Zero regex (eliminates maintenance nightmare)
 * - Better error messages (XML parser reports line/column)
 * - Faster performance (native C++ parser)
 * - Standards-compliant (works everywhere)
 * - IDE support (syntax highlighting, validation)
 *
 * REPLACES:
 * - js/reasoning/parser/unified-tool-parser.js (556 lines of regex hell)
 * - js/config/tool-registry-config.js (729 lines with 14+ patterns)
 */

import {
    XML_TOOL_TYPES,
    XML_TOOL_SCHEMAS,
    XML_PARSE_CONFIG,
    validateXMLTool
} from '../../config/tool-format-xml.js';

export class XMLToolParser {
    constructor(config = {}) {
        this.config = {
            ...XML_PARSE_CONFIG,
            ...config
        };

        this.parser = new DOMParser();
        this.stats = {
            totalParsed: 0,
            totalErrors: 0,
            byType: {}
        };
    }

    /**
     * Parse all tool operations from text
     * @param {string} text - Text containing <tool> tags
     * @returns {Object} Parse result
     */
    parse(text) {
        const result = {
            success: true,
            tools: [],
            errors: [],
            warnings: [],
            raw: text
        };

        try {
            // Wrap text in root element for parsing
            const wrapped = this._wrapForParsing(text);

            // Parse XML
            const doc = this.parser.parseFromString(wrapped, this.config.parserOptions.mimeType);

            // Check for parser errors
            const parserError = doc.querySelector('parsererror');
            if (parserError) {
                result.success = false;
                result.errors.push({
                    type: 'parse_error',
                    message: 'XML parsing failed',
                    details: parserError.textContent
                });
                return result;
            }

            // Extract all <tool> elements
            const toolElements = doc.querySelectorAll('tool');

            toolElements.forEach((element, index) => {
                try {
                    const tool = this._parseToolElement(element, index);

                    // Validate if enabled
                    if (this.config.validation.validateSchema) {
                        const validation = validateXMLTool(element);

                        if (!validation.valid) {
                            result.errors.push({
                                type: 'validation_error',
                                tool: tool.type,
                                index,
                                errors: validation.errors
                            });

                            if (this.config.validation.strictMode) {
                                result.success = false;
                            }
                        }

                        if (validation.warnings.length > 0) {
                            result.warnings.push({
                                type: 'validation_warning',
                                tool: tool.type,
                                index,
                                warnings: validation.warnings
                            });
                        }

                        // Add validation to tool
                        tool.validation = validation;
                    }

                    result.tools.push(tool);

                    // Update stats
                    this._updateStats(tool.type);

                } catch (error) {
                    result.errors.push({
                        type: 'extraction_error',
                        index,
                        message: error.message
                    });
                }
            });

            this.stats.totalParsed += toolElements.length;
            if (result.errors.length > 0) {
                this.stats.totalErrors += result.errors.length;
            }

        } catch (error) {
            result.success = false;
            result.errors.push({
                type: 'fatal_error',
                message: error.message,
                stack: error.stack
            });
        }

        return result;
    }

    /**
     * Parse specific tool type from text
     * @param {string} text - Text to parse
     * @param {string} toolType - Specific tool type to extract
     * @returns {Array} Array of tools of specified type
     */
    parseType(text, toolType) {
        const result = this.parse(text);

        if (!result.success) {
            return [];
        }

        return result.tools.filter(tool => tool.type === toolType);
    }

    /**
     * Parse and execute (for backward compatibility with old parser)
     * @param {string} text - Text to parse
     * @returns {Object} Parse and execution result
     */
    parseAndExtract(text) {
        const parseResult = this.parse(text);

        return {
            success: parseResult.success,
            operations: parseResult.tools,
            errors: parseResult.errors,
            warnings: parseResult.warnings,
            count: parseResult.tools.length
        };
    }

    /**
     * Check if text contains tool tags
     * @param {string} text - Text to check
     * @returns {boolean} True if contains <tool> tags
     */
    hasTools(text) {
        return /<tool\s/.test(text);
    }

    /**
     * Count tools in text
     * @param {string} text - Text to analyze
     * @returns {number} Number of tools
     */
    countTools(text) {
        const matches = text.match(/<tool\s/g);
        return matches ? matches.length : 0;
    }

    /**
     * Get parsing statistics
     * @returns {Object} Statistics
     */
    getStatistics() {
        return {
            ...this.stats,
            averageErrorRate: this.stats.totalParsed > 0
                ? (this.stats.totalErrors / this.stats.totalParsed * 100).toFixed(2) + '%'
                : 'N/A'
        };
    }

    /**
     * Reset statistics
     */
    resetStatistics() {
        this.stats = {
            totalParsed: 0,
            totalErrors: 0,
            byType: {}
        };
    }

    // ==========================================================================
    // PRIVATE METHODS
    // ==========================================================================

    /**
     * Wrap text for XML parsing
     * @private
     */
    _wrapForParsing(text) {
        return `<${this.config.wrapperTag}>${text}</${this.config.wrapperTag}>`;
    }

    /**
     * Parse individual tool element
     * @private
     */
    _parseToolElement(element, index) {
        const tool = {
            type: element.getAttribute('type') || 'unknown',
            attributes: {},
            content: null,
            raw: element.outerHTML,
            index
        };

        // Extract all attributes
        Array.from(element.attributes).forEach(attr => {
            if (attr.name !== 'type') {
                tool.attributes[attr.name] = attr.value;
            }
        });

        // Extract content (if any)
        const content = element.textContent.trim();
        if (content) {
            tool.content = content;
        }

        // Check if self-closing
        tool.selfClosing = element.children.length === 0 && !content;

        // Add schema reference
        tool.schema = XML_TOOL_SCHEMAS[tool.type] || null;

        return tool;
    }

    /**
     * Update parsing statistics
     * @private
     */
    _updateStats(toolType) {
        if (!this.stats.byType[toolType]) {
            this.stats.byType[toolType] = 0;
        }
        this.stats.byType[toolType]++;
    }
}

// ============================================================================
// MIGRATION LAYER (for backward compatibility)
// ============================================================================

/**
 * Adapter that provides old unified-tool-parser API using new XML parser
 * This allows gradual migration without breaking existing code
 */
export class UnifiedToolParserAdapter {
    constructor() {
        this.xmlParser = new XMLToolParser();
    }

    /**
     * Extract tool operations (old API)
     * Maps to new XML parser
     */
    extractToolOperations(text, toolId) {
        const result = this.xmlParser.parseType(text, toolId);
        return result;
    }

    /**
     * Extract all operations (old API)
     */
    extractAllToolOperations(text, options = {}) {
        const result = this.xmlParser.parse(text);

        const grouped = {};
        result.tools.forEach(tool => {
            if (!grouped[tool.type]) {
                grouped[tool.type] = [];
            }
            grouped[tool.type].push(tool);
        });

        return grouped;
    }

    /**
     * Validate operation (old API)
     */
    validateOperation(operation) {
        // If operation already has validation from XML parser
        if (operation.validation) {
            return operation.validation;
        }

        // Otherwise, validation not available
        return {
            valid: true,
            errors: [],
            warnings: ['Validation not performed - use XML parser directly']
        };
    }

    /**
     * Has tool operations (old API)
     */
    hasToolOperations(text, toolId) {
        const tools = this.xmlParser.parseType(text, toolId);
        return tools.length > 0;
    }

    /**
     * Count tool operations (old API)
     */
    countToolOperations(text, toolId) {
        const tools = this.xmlParser.parseType(text, toolId);
        return tools.length;
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Quick parse function for one-off parsing
 * @param {string} text - Text to parse
 * @returns {Object} Parse result
 */
export function parseTools(text) {
    const parser = new XMLToolParser();
    return parser.parse(text);
}

/**
 * Quick check if text has tools
 * @param {string} text - Text to check
 * @returns {boolean} True if has tools
 */
export function hasTools(text) {
    return /<tool\s/.test(text);
}

/**
 * Extract specific tool type quickly
 * @param {string} text - Text to parse
 * @param {string} toolType - Tool type
 * @returns {Array} Array of tools
 */
export function extractToolType(text, toolType) {
    const parser = new XMLToolParser();
    return parser.parseType(text, toolType);
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/*
// OLD WAY (regex hell):
import { extractToolOperations } from './unified-tool-parser.js';
const ops = extractToolOperations(text, 'datavault'); // uses 14 regex patterns

// NEW WAY (clean XML):
import { XMLToolParser } from './XMLToolParser.js';
const parser = new XMLToolParser();
const result = parser.parse(text); // uses native DOMParser

// Example text:
const text = `
<tool type="vault" identifier="api_docs" vault-type="text" description="API documentation">
Complete API documentation here
</tool>

<tool type="vaultref" id="api_docs"/>

<tool type="task" heading="Implement feature" status="pending">
Details about the task
</tool>
`;

const result = parser.parse(text);
console.log(result.tools); // All tools extracted cleanly
console.log(result.errors); // Any parsing/validation errors
console.log(result.warnings); // Any warnings
*/

export default XMLToolParser;
