# Tool Parsing System Documentation

**Version:** 2.0 (Refactored)
**Last Updated:** 2025-11-01

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [How to Add a New Tool](#how-to-add-a-new-tool)
5. [Usage Examples](#usage-examples)
6. [Configuration Reference](#configuration-reference)
7. [API Reference](#api-reference)

---

## Overview

The Tool Parsing System is a **centralized, registry-based architecture** for parsing, validating, and executing tools requested by LLMs. All tools (Memory, Task, Goal, DataVault, JavaScript Execution, etc.) are defined in a single registry with their patterns, schemas, and validation rules.

### Key Features

- **Centralized Configuration**: All tool definitions, patterns, and validation rules in one place
- **Dynamic & Modular**: Add new tools by simply updating the registry
- **Self-Explanatory**: Clear schemas and type definitions
- **Reusable**: Common utilities for vault references, validation, etc.
- **Type-Safe**: Strong validation and normalization

---

## Architecture

### System Flow

```
LLM Response Text
    ↓
[EXTRACTION] - Use registry patterns to extract tool operations
    ↓
[VALIDATION] - Validate against tool schemas
    ↓
[APPLICATION] - Execute operations and update storage
    ↓
Result/Effect
```

### File Structure

```
js/
├── config/
│   └── tool-registry-config.js     ← CENTRAL REGISTRY (all tool definitions)
├── utils/
│   └── vault-reference-resolver.js ← Vault reference utilities
├── reasoning/parser/
│   ├── unified-tool-parser.js      ← High-level parser using registry
│   ├── parser-extractors.js        ← Pattern extraction (uses registry)
│   ├── parser-validators.js        ← Validation (uses registry)
│   └── parser-appliers.js          ← Operation application
└── execution/
    └── execution-runner.js         ← Code execution (uses vault resolver)
```

---

## Core Components

### 1. Tool Registry Config (`tool-registry-config.js`)

**Purpose:** Central definition of all tools, patterns, and validation rules.

**Key Exports:**
- `TOOL_DEFINITIONS` - Complete registry of all tools
- `COMMON_PATTERNS` - Shared regex patterns
- `VALIDATION_CONSTANTS` - Limits and constraints
- Helper functions: `parseAttributes()`, `isValidIdentifier()`, etc.

### 2. Vault Reference Resolver (`vault-reference-resolver.js`)

**Purpose:** Centralized vault reference resolution (eliminates duplication).

**Key Functions:**
- `resolveVaultReferences(text, options)` - Full resolution with metadata
- `resolveVaultReferencesSimple(text)` - Simple string replacement
- `expandVaultReferences(code)` - For code execution
- `analyzeVaultReferences(text)` - Get analysis of references

### 3. Unified Tool Parser (`unified-tool-parser.js`)

**Purpose:** High-level API for parsing any tool using the registry.

**Key Functions:**
- `extractToolOperations(text, toolId)` - Extract specific tool
- `extractAllToolOperations(text, options)` - Extract all tools
- `parseToolOperations(text, toolId)` - Extract + validate
- `validateOperation(operation)` - Validate against schema

### 4. Parser Extractors (`parser-extractors.js`)

**Purpose:** Pattern-based extraction functions (now uses registry patterns).

**Functions:** `extractReasoningBlocks()`, `extractMemoryOperations()`, etc.

### 5. Parser Validators (`parser-validators.js`)

**Purpose:** Validation and normalization (now uses registry functions).

**Functions:** `validateMemoryOperation()`, `normalizeTaskStatus()`, etc.

---

## How to Add a New Tool

Adding a new tool is now **extremely simple** - just update the registry!

### Step 1: Define Tool in Registry

Edit `js/config/tool-registry-config.js` and add to `TOOL_DEFINITIONS`:

```javascript
export const TOOL_DEFINITIONS = {
  // ... existing tools ...

  MY_NEW_TOOL: {
    id: 'my_new_tool',
    name: 'My New Tool',
    type: TOOL_TYPES.SELF_CLOSING,  // or BLOCK or HYBRID
    category: TOOL_CATEGORIES.STORAGE,  // or EXECUTION, OUTPUT, etc.

    // Define extraction patterns
    patterns: {
      selfClosing: /{{<my_tool\s+([^>]*)\s*\/>}}/g,
      // block: /{{<my_tool>}}([\s\S]*?){{<\/my_tool>}}/g,  // If needed
    },

    // Define validation schema
    schema: {
      hasContent: false,
      requiresContent: false,
      attributes: {
        id: {
          required: true,
          validate: 'identifier',
          description: 'Unique identifier',
        },
        value: {
          required: false,
          type: 'string',
          description: 'Tool value',
        },
        // ... more attributes
      },
    },

    // Storage entity (if tool stores data)
    storage: 'my_tool',  // or null if no storage
  },
};
```

### Step 2: Add Handler (if needed)

If your tool needs custom logic, add a handler in `js/reasoning/parser/parser-appliers.js`:

```javascript
function applyMyToolOperation(operation, options) {
  const { attributes } = operation;

  // Your custom logic here
  // Access storage: Storage.loadMyTool(), Storage.saveMyTool()

  return {
    id: attributes.id,
    action: 'created',
    status: 'success',
  };
}
```

### Step 3: That's It!

The system will automatically:
- Extract your tool using the pattern
- Validate using the schema
- Parse attributes
- Handle errors

**No changes needed to:**
- `parser-extractors.js`
- `parser-validators.js`
- `unified-tool-parser.js`

---

## Usage Examples

### Example 1: Extract All Tools

```javascript
import { extractAllToolOperations } from './reasoning/parser/unified-tool-parser.js';

const llmResponse = `
{{<reasoning_text>}}
{{<memory identifier="key1" heading="Title" content="Body" />}}
{{<task identifier="task1" heading="Do X" status="pending" />}}
{{</reasoning_text>}}
`;

const operations = extractAllToolOperations(llmResponse);
console.log(operations);
// {
//   memory: [{ toolId: 'memory', attributes: {...}, ... }],
//   task: [{ toolId: 'task', attributes: {...}, ... }]
// }
```

### Example 2: Parse and Validate Specific Tool

```javascript
import { parseToolOperations } from './reasoning/parser/unified-tool-parser.js';

const result = parseToolOperations(text, 'memory');
console.log(result);
// {
//   toolId: 'memory',
//   count: 2,
//   operations: [...],
//   validCount: 2,
//   invalidCount: 0
// }
```

### Example 3: Resolve Vault References

```javascript
import { resolveVaultReferences } from './utils/vault-reference-resolver.js';

const text = `
Results: {{<vaultref id="data_analysis" />}}
Summary: {{<vaultref id="conclusions" />}}
`;

const result = resolveVaultReferences(text);
console.log(result.resolvedText);  // Text with vault content inserted
console.log(result.references);     // ['data_analysis', 'conclusions']
console.log(result.missing);        // [] if all found
```

### Example 4: Add Custom Tool

```javascript
// 1. Add to TOOL_DEFINITIONS in tool-registry-config.js
NOTIFICATION: {
  id: 'notification',
  name: 'Notification',
  type: TOOL_TYPES.SELF_CLOSING,
  category: TOOL_CATEGORIES.OUTPUT,
  patterns: {
    selfClosing: /{{<notify\s+([^>]*)\s*\/>}}/g,
  },
  schema: {
    attributes: {
      message: { required: true, type: 'string' },
      level: {
        required: false,
        type: 'enum',
        values: ['info', 'warning', 'error'],
        default: 'info'
      },
    },
  },
  storage: null,
},

// 2. Use immediately!
const ops = extractToolOperations(text, 'notification');
```

---

## Configuration Reference

### Tool Types

```javascript
TOOL_TYPES = {
  BLOCK: 'block',           // {{<tool>}}content{{</tool>}}
  SELF_CLOSING: 'self_closing',  // {{<tool attr="value" />}}
  HYBRID: 'hybrid',         // Both formats supported
}
```

### Tool Categories

```javascript
TOOL_CATEGORIES = {
  REASONING: 'reasoning',   // Reasoning blocks
  STORAGE: 'storage',       // Memory, Task, Goal, Vault
  EXECUTION: 'execution',   // JavaScript execution
  OUTPUT: 'output',         // Final output
}
```

### Validation Types

```javascript
// Attribute schema types:
{
  type: 'string',     // String value
  type: 'number',     // Numeric value
  type: 'enum',       // One of specified values
  type: 'flag',       // Boolean flag
  validate: 'identifier',  // Validate as identifier
}
```

### Common Patterns

```javascript
COMMON_PATTERNS = {
  ATTRIBUTES: /(\w+)=["']([^"']*)["']|\b(\w+)(?=\s|$)/g,
  VAULT_REFERENCE: /{{<vaultref\s+id=["']([^"']+)["']\s*\/>}}/gi,
  VALID_IDENTIFIER: /^[a-zA-Z0-9_-]+$/,
  DANGEROUS_CHARS: /<script|javascript:|onerror=|onclick=/gi,
}
```

---

## API Reference

### Tool Registry Config

#### `getToolDefinition(toolId)`
Get tool definition by ID.

**Parameters:**
- `toolId` (string) - Tool identifier

**Returns:** Tool definition object or null

#### `parseAttributes(attrString)`
Parse attribute string into object.

**Parameters:**
- `attrString` (string) - e.g., `'id="test" type="text" delete'`

**Returns:** `{ id: 'test', type: 'text', delete: true }`

#### `isValidIdentifier(identifier)`
Validate identifier format.

**Parameters:**
- `identifier` (string) - Identifier to validate

**Returns:** boolean

#### `normalizeVaultType(type)`
Normalize and validate vault type.

**Parameters:**
- `type` (string) - Vault type

**Returns:** `'text' | 'code' | 'data'`

### Vault Reference Resolver

#### `resolveVaultReferences(text, options)`
Resolve all vault references in text.

**Parameters:**
- `text` (string) - Text with vault references
- `options` (object) - Resolution options
  - `throwOnMissing` (boolean) - Throw if entry not found
  - `maxDepth` (number) - Max recursion depth (default: 3)
  - `onMissing` (function) - Custom missing handler
  - `onError` (function) - Custom error handler

**Returns:**
```javascript
{
  originalText: string,
  resolvedText: string,
  references: string[],
  missing: string[],
  errors: object[],
  depth: number,
  fullyResolved: boolean
}
```

#### `expandVaultReferences(code)`
Expand vault references for code execution.

**Parameters:**
- `code` (string) - JavaScript code with vault refs

**Returns:**
```javascript
{
  originalCode: string,
  resolvedCode: string,
  vaultRefs: string[],
  errors: object[],
  hasErrors: boolean
}
```

### Unified Tool Parser

#### `extractToolOperations(text, toolId)`
Extract operations for a specific tool.

**Parameters:**
- `text` (string) - Text to parse
- `toolId` (string) - Tool ID from registry

**Returns:** Array of operations

#### `parseToolOperations(text, toolId)`
Extract and validate tool operations.

**Parameters:**
- `text` (string) - Text to parse
- `toolId` (string) - Tool ID

**Returns:**
```javascript
{
  toolId: string,
  count: number,
  operations: object[],
  validCount: number,
  invalidCount: number
}
```

#### `validateOperation(operation)`
Validate operation against tool schema.

**Parameters:**
- `operation` (object) - Operation to validate

**Returns:**
```javascript
{
  valid: boolean,
  errors: object[],
  warnings: object[],
  normalized: object
}
```

---

## Migration Notes

### From Old System

The old system had:
- Hardcoded regex patterns in multiple files
- Duplicated vault reference resolution
- Scattered validation logic

**New system benefits:**
- ✅ Single source of truth (tool-registry-config.js)
- ✅ No duplication (centralized utilities)
- ✅ Easy extensibility (add tools in one place)
- ✅ Better maintainability (self-documenting)

### Breaking Changes

None! The existing API is maintained for backwards compatibility.

### Deprecated

- `EXECUTION_VAULT_REF_PATTERN` in execution-config.js
  - Use `vault-reference-resolver.js` instead

---

## Best Practices

1. **Always use the registry** - Don't hardcode patterns elsewhere
2. **Validate early** - Use schema validation before processing
3. **Centralize utilities** - Add common functions to registry config
4. **Document schemas** - Include clear descriptions in tool definitions
5. **Test thoroughly** - Validate tool operations before application

---

## Troubleshooting

### Tool Not Extracting

1. Check pattern is correct in `TOOL_DEFINITIONS`
2. Ensure pattern has global flag (`/g`)
3. Verify tool ID matches registry

### Validation Failing

1. Check schema definition is complete
2. Verify attribute requirements
3. Check for type mismatches

### Vault References Not Resolving

1. Ensure vault entry exists with correct identifier
2. Check vault reference format: `{{<vaultref id="..." />}}`
3. Verify Storage.loadVault() returns data

---

## Future Enhancements

- [ ] Tool versioning support
- [ ] Custom validators per tool
- [ ] Tool composition (nested tools)
- [ ] Performance metrics
- [ ] Tool usage analytics

---

## Contributing

When adding new tools or modifying the system:

1. Update `tool-registry-config.js` with new definitions
2. Add tests for new tools
3. Update this documentation
4. Follow existing patterns and conventions

---

## License

Same as parent project.
