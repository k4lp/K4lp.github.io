/**
 * XML TOOL FORMAT CONFIGURATION
 *
 * MIGRATION FROM: Custom {{<tag>}} format
 * MIGRATION TO: Standard XML <tool> format
 *
 * WHY THIS CHANGE:
 * - Standard XML is parseable by DOMParser (browser native)
 * - No custom regex needed (eliminates 14+ patterns)
 * - Better error messages (XML parser reports exact issues)
 * - IDE support (XML syntax highlighting, validation)
 * - Industry standard (no learning curve)
 *
 * BEFORE:
 * {{<task heading="Do something" status="pending">}}Task content{{</task>}}
 * {{<vaultref id="ref_001" />}}
 *
 * AFTER:
 * <tool type="task" heading="Do something" status="pending">Task content</tool>
 * <tool type="vaultref" id="ref_001"/>
 */

// ============================================================================
// TOOL TYPE DEFINITIONS
// ============================================================================

export const XML_TOOL_TYPES = {
    // Data management tools
    VAULT: 'vault',
    VAULTREF: 'vaultref',
    MEMORY: 'memory',
    TASK: 'task',
    GOAL: 'goal',

    // Execution tools
    EXECUTE: 'execute',
    SUBAGENT: 'subagent',

    // Reasoning tools
    THINK: 'think',
    REFLECT: 'reflect',

    // Communication
    RESPOND: 'respond'
};

// ============================================================================
// TOOL SCHEMAS (XML-BASED)
// ============================================================================

export const XML_TOOL_SCHEMAS = {
    [XML_TOOL_TYPES.VAULT]: {
        tag: 'tool',
        requiredAttributes: ['type', 'identifier'],
        optionalAttributes: ['description', 'vault-type'],
        hasContent: true,
        contentRequired: true,
        examples: [
            '<tool type="vault" identifier="api_key_doc" vault-type="text" description="API documentation">Content here</tool>'
        ]
    },

    [XML_TOOL_TYPES.VAULTREF]: {
        tag: 'tool',
        requiredAttributes: ['type', 'id'],
        optionalAttributes: [],
        hasContent: false,
        selfClosing: true,
        examples: [
            '<tool type="vaultref" id="api_key_doc"/>',
            '<tool type="vaultref" id="config_data"/>'
        ]
    },

    [XML_TOOL_TYPES.MEMORY]: {
        tag: 'tool',
        requiredAttributes: ['type', 'heading'],
        optionalAttributes: ['priority', 'tags'],
        hasContent: true,
        contentRequired: true,
        examples: [
            '<tool type="memory" heading="User preference" priority="high">User prefers dark mode</tool>'
        ]
    },

    [XML_TOOL_TYPES.TASK]: {
        tag: 'tool',
        requiredAttributes: ['type', 'heading'],
        optionalAttributes: ['status', 'priority'],
        hasContent: true,
        contentRequired: false,
        examples: [
            '<tool type="task" heading="Implement feature" status="pending">Details about the task</tool>',
            '<tool type="task" heading="Quick task" status="completed"/>'
        ]
    },

    [XML_TOOL_TYPES.GOAL]: {
        tag: 'tool',
        requiredAttributes: ['type', 'heading'],
        optionalAttributes: ['timeframe', 'status'],
        hasContent: true,
        contentRequired: false,
        examples: [
            '<tool type="goal" heading="Launch product" timeframe="Q2 2025">Product launch goals</tool>'
        ]
    },

    [XML_TOOL_TYPES.EXECUTE]: {
        tag: 'tool',
        requiredAttributes: ['type'],
        optionalAttributes: ['language', 'timeout'],
        hasContent: true,
        contentRequired: true,
        examples: [
            '<tool type="execute" language="javascript">console.log("Hello")</tool>',
            '<tool type="execute" language="python" timeout="5000">print("test")</tool>'
        ]
    },

    [XML_TOOL_TYPES.SUBAGENT]: {
        tag: 'tool',
        requiredAttributes: ['type', 'query'],
        optionalAttributes: ['agent', 'scope'],
        hasContent: false,
        selfClosing: true,
        examples: [
            '<tool type="subagent" query="Search for latest news" agent="research-agent"/>',
            '<tool type="subagent" query="Analyze data" scope="micro"/>'
        ]
    },

    [XML_TOOL_TYPES.THINK]: {
        tag: 'tool',
        requiredAttributes: ['type'],
        optionalAttributes: [],
        hasContent: true,
        contentRequired: true,
        examples: [
            '<tool type="think">Let me break this down step by step...</tool>'
        ]
    },

    [XML_TOOL_TYPES.REFLECT]: {
        tag: 'tool',
        requiredAttributes: ['type'],
        optionalAttributes: ['on'],
        hasContent: true,
        contentRequired: true,
        examples: [
            '<tool type="reflect" on="previous-reasoning">Looking back, I should have...</tool>'
        ]
    },

    [XML_TOOL_TYPES.RESPOND]: {
        tag: 'tool',
        requiredAttributes: ['type'],
        optionalAttributes: ['format'],
        hasContent: true,
        contentRequired: true,
        examples: [
            '<tool type="respond">This is my final answer</tool>',
            '<tool type="respond" format="markdown">## Answer\nDetailed response</tool>'
        ]
    }
};

// ============================================================================
// XML PARSING CONFIGURATION
// ============================================================================

export const XML_PARSE_CONFIG = {
    // Root element wrapping (for parsing fragments)
    wrapperTag: 'gdrs-tools',

    // Namespace (optional, for future use)
    namespace: null,

    // Parser options
    parserOptions: {
        // DOMParser mime type
        mimeType: 'text/xml',

        // Error handling
        throwOnError: false,
        collectErrors: true
    },

    // Validation options
    validation: {
        // Validate against schema
        validateSchema: true,

        // Check required attributes
        checkRequired: true,

        // Warn on unknown attributes
        warnUnknown: true,

        // Strict mode (fail on any warning)
        strictMode: false
    }
};

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Migration map from old custom format to new XML format
 */
export const MIGRATION_MAP = {
    // Old: {{<datavault identifier="x" type="y">}}content{{</datavault>}}
    // New: <tool type="vault" identifier="x" vault-type="y">content</tool>
    'datavault': {
        newType: XML_TOOL_TYPES.VAULT,
        attributeMap: {
            'type': 'vault-type',
            'identifier': 'identifier',
            'description': 'description'
        }
    },

    // Old: {{<vaultref id="x" />}}
    // New: <tool type="vaultref" id="x"/>
    'vaultref': {
        newType: XML_TOOL_TYPES.VAULTREF,
        attributeMap: {
            'id': 'id'
        }
    },

    // Old: {{<memory heading="x">}}content{{</memory>}}
    // New: <tool type="memory" heading="x">content</tool>
    'memory': {
        newType: XML_TOOL_TYPES.MEMORY,
        attributeMap: {
            'heading': 'heading',
            'priority': 'priority'
        }
    },

    // Old: {{<task heading="x" status="y">}}content{{</task>}}
    // New: <tool type="task" heading="x" status="y">content</tool>
    'task': {
        newType: XML_TOOL_TYPES.TASK,
        attributeMap: {
            'heading': 'heading',
            'status': 'status',
            'priority': 'priority'
        }
    },

    // Old: {{<goal heading="x">}}content{{</goal>}}
    // New: <tool type="goal" heading="x">content</tool>
    'goal': {
        newType: XML_TOOL_TYPES.GOAL,
        attributeMap: {
            'heading': 'heading',
            'timeframe': 'timeframe'
        }
    },

    // Old: {{<execute language="js">}}code{{</execute>}}
    // New: <tool type="execute" language="js">code</tool>
    'execute': {
        newType: XML_TOOL_TYPES.EXECUTE,
        attributeMap: {
            'language': 'language',
            'timeout': 'timeout'
        }
    },

    // Old: {{<subagent query="x" agent="y" />}}
    // New: <tool type="subagent" query="x" agent="y"/>
    'subagent': {
        newType: XML_TOOL_TYPES.SUBAGENT,
        attributeMap: {
            'query': 'query',
            'agent': 'agent',
            'scope': 'scope'
        }
    }
};

/**
 * Convert old format to new XML format
 * @param {string} oldFormat - Old custom tag format
 * @returns {string} New XML format
 */
export function migrateToXML(oldFormat) {
    let result = oldFormat;

    Object.entries(MIGRATION_MAP).forEach(([oldTag, config]) => {
        // Self-closing tags
        const selfClosingPattern = new RegExp(
            `\\{\\{<${oldTag}\\s+([^>]*?)\\s*/>\\}\\}`,
            'g'
        );

        result = result.replace(selfClosingPattern, (match, attrs) => {
            const newAttrs = migrateAttributes(attrs, config.attributeMap);
            return `<tool type="${config.newType}"${newAttrs ? ' ' + newAttrs : ''}/>`;
        });

        // Block tags
        const blockPattern = new RegExp(
            `\\{\\{<${oldTag}(?:\\s+([^>]*?))?\\s*>\\}\\}([\\s\\S]*?)\\{\\{</${oldTag}>\\}\\}`,
            'g'
        );

        result = result.replace(blockPattern, (match, attrs, content) => {
            const newAttrs = attrs ? migrateAttributes(attrs, config.attributeMap) : '';
            return `<tool type="${config.newType}"${newAttrs ? ' ' + newAttrs : ''}>${content}</tool>`;
        });
    });

    return result;
}

/**
 * Migrate attributes based on attribute map
 * @param {string} attrString - Old attribute string
 * @param {Object} attrMap - Attribute mapping
 * @returns {string} New attribute string
 */
function migrateAttributes(attrString, attrMap) {
    if (!attrString) return '';

    // Parse old attributes
    const attrs = {};
    const attrPattern = /(\w+)="([^"]*)"/g;
    let match;

    while ((match = attrPattern.exec(attrString)) !== null) {
        const [, key, value] = match;
        attrs[key] = value;
    }

    // Map to new attributes
    const newAttrs = [];
    Object.entries(attrs).forEach(([key, value]) => {
        const newKey = attrMap[key] || key;
        newAttrs.push(`${newKey}="${value}"`);
    });

    return newAttrs.join(' ');
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate XML tool element
 * @param {Element} element - XML element
 * @returns {Object} Validation result
 */
export function validateXMLTool(element) {
    const result = {
        valid: true,
        errors: [],
        warnings: []
    };

    // Check if it's a tool element
    if (element.tagName.toLowerCase() !== 'tool') {
        result.valid = false;
        result.errors.push('Element must be a <tool> tag');
        return result;
    }

    // Get tool type
    const toolType = element.getAttribute('type');
    if (!toolType) {
        result.valid = false;
        result.errors.push('Missing required attribute: type');
        return result;
    }

    // Get schema for this tool type
    const schema = XML_TOOL_SCHEMAS[toolType];
    if (!schema) {
        result.valid = false;
        result.errors.push(`Unknown tool type: ${toolType}`);
        return result;
    }

    // Check required attributes
    schema.requiredAttributes.forEach(attr => {
        if (attr === 'type') return; // Already checked

        if (!element.hasAttribute(attr)) {
            result.valid = false;
            result.errors.push(`Missing required attribute: ${attr}`);
        }
    });

    // Check unknown attributes
    if (XML_PARSE_CONFIG.validation.warnUnknown) {
        const allAttributes = Array.from(element.attributes).map(attr => attr.name);
        const allowedAttributes = [
            ...schema.requiredAttributes,
            ...schema.optionalAttributes
        ];

        allAttributes.forEach(attr => {
            if (!allowedAttributes.includes(attr)) {
                result.warnings.push(`Unknown attribute: ${attr}`);
            }
        });
    }

    // Check content
    if (schema.contentRequired && !element.textContent.trim()) {
        result.valid = false;
        result.errors.push('Content is required but missing');
    }

    if (!schema.hasContent && element.textContent.trim()) {
        result.warnings.push('Tool does not expect content, but content was provided');
    }

    return result;
}

export default {
    XML_TOOL_TYPES,
    XML_TOOL_SCHEMAS,
    XML_PARSE_CONFIG,
    MIGRATION_MAP,
    migrateToXML,
    validateXMLTool
};
