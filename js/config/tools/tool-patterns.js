/**
 * Tool Patterns Configuration
 *
 * Regex patterns used for tool extraction and parsing
 */

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

/**
 * Tool extraction patterns
 * Each tool has patterns for its specific format (block, self-closing, or both)
 */
export const TOOL_PATTERNS = {
    REASONING_TEXT: {
        block: /{{<reasoning_text>}}([\s\S]*?){{<\/reasoning_text>}}/g,
    },

    MEMORY: {
        selfClosing: /{{<memory\s+([^>]*)\s*\/>}}/g,
    },

    TASK: {
        selfClosing: /{{<task\s+([^>]*)\s*\/>}}/g,
    },

    GOAL: {
        selfClosing: /{{<goal\s+([^>]*)\s*\/>}}/g,
    },

    DATAVAULT: {
        selfClosing: /{{<datavault\s+([^>]*)\s*\/>}}/g,
        block: /{{<datavault\s+([^>]*)>}}([\s\S]*?){{<\/datavault>}}/g,
    },

    JS_EXECUTE: {
        block: /{{<js_execute>}}([\s\S]*?){{<\/js_execute>}}/g,
    },

    FINAL_OUTPUT: {
        block: /{{<final_output>}}([\s\S]*?){{<\/final_output>}}/g,
    },
};

/**
 * Parse attributes from a string
 * @param {string} attrString - Attribute string (e.g., 'id="foo" type="bar" delete')
 * @returns {Object} Parsed attributes
 */
export function parseAttributes(attrString) {
    const attrs = {};
    if (!attrString) return attrs;

    const pattern = new RegExp(COMMON_PATTERNS.ATTRIBUTES);
    let match;

    while ((match = pattern.exec(attrString)) !== null) {
        if (match[1] && match[2] !== undefined) {
            // key="value" or key='value'
            attrs[match[1]] = match[2];
        } else if (match[3]) {
            // standalone flag
            attrs[match[3]] = true;
        }
    }

    return attrs;
}

/**
 * Get pattern for a specific tool
 * @param {string} toolId - Tool identifier
 * @param {string} format - Format type ('block' or 'selfClosing')
 * @returns {RegExp|null} Pattern or null if not found
 */
export function getToolPattern(toolId, format) {
    const toolPatterns = TOOL_PATTERNS[toolId.toUpperCase()];
    if (!toolPatterns) return null;
    return toolPatterns[format] || null;
}

export default {
    COMMON_PATTERNS,
    TOOL_PATTERNS,
    parseAttributes,
    getToolPattern,
};
