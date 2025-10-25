// data-vault-enhanced.js - Enhanced Data Vault with improved tag recognition and LLM procedures

import { storageManager } from './storage.js';

class EnhancedDataVault {
    constructor() {
        this.PREVIEW_CHAR_LIMIT = 800;
        this.INLINE_STRING_LIMIT = 240;
        this.MAX_SAMPLE_ITEMS = 12;
        this.REFERENCE_PREFIX = 'vault';
        this.textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
        
        // Enhanced tag patterns for better recognition
        this.TAG_PATTERNS = {
            reasoning: /\{\{<reasoning_text>\}\}([\s\S]*?)\{\{<\/reasoning_text>\}\}/g,
            js_execution: /\{\{<js_execution>\}\}([\s\S]*?)\{\{<\/js_execution>\}\}/g,
            code_block: /\{\{<code_block\s+lang="([^"]+)">\}\}([\s\S]*?)\{\{<\/code_block>\}\}/g,
            vault_store: /\{\{<vault_store\s+id="([^"]+)"\s*(?:label="([^"]+)")?\s*(?:tags="([^"]+)")?\s*>\}\}([\s\S]*?)\{\{<\/vault_store>\}\}/g,
            vault_retrieve: /\{\{<vault_retrieve\s+id="([^"]+)"\s*(?:mode="([^"]+)")?\s*(?:limit="([^"]+)")?\s*\/>\}\}/g,
            vault_reference: /\{\{<vault_ref\s+id="([^"]+)"\s*\/>\}\}/g,
            final_output: /\{\{<final_output>\}\}([\s\S]*?)\{\{<\/final_output>\}\}/g,
            continue_reasoning: /\{\{<continue_reasoning\s*\/>\}\}/g,
            memory_store: /\{\{<memory_store\s+summary="([^"]+)"\s*(?:tags="([^"]+)")?\s*>\}\}([\s\S]*?)\{\{<\/memory_store>\}\}/g,
            function_def: /\{\{<function_def\s+name="([^"]+)"\s*(?:params="([^"]+)")?\s*>\}\}([\s\S]*?)\{\{<\/function_def>\}\}/g,
            data_structure: /\{\{<data_structure\s+type="([^"]+)"\s+name="([^"]+)"\s*>\}\}([\s\S]*?)\{\{<\/data_structure>\}\}/g
        };
        
        // Vault entry types
        this.VAULT_TYPES = {
            TEXT: 'text',
            CODE: 'code', 
            FUNCTION: 'function',
            DATA_STRUCTURE: 'data_structure',
            REASONING: 'reasoning',
            MEMORY: 'memory',
            GENERIC: 'generic'
        };
    }

    // Enhanced tag extraction with improved patterns
    extractEnhancedTags(text) {
        const extractedTags = [];
        
        Object.entries(this.TAG_PATTERNS).forEach(([tagType, pattern]) => {
            let match;
            const regex = new RegExp(pattern.source, pattern.flags);
            
            while ((match = regex.exec(text)) !== null) {
                const tag = {
                    type: tagType,
                    fullMatch: match[0],
                    content: null,
                    attributes: {}
                };
                
                switch (tagType) {
                    case 'reasoning':
                    case 'js_execution':
                    case 'final_output':
                        tag.content = match[1]?.trim();
                        break;
                        
                    case 'code_block':
                        tag.attributes.lang = match[1];
                        tag.content = match[2]?.trim();
                        break;
                        
                    case 'vault_store':
                        tag.attributes.id = match[1];
                        tag.attributes.label = match[2] || null;
                        tag.attributes.tags = match[3] ? match[3].split(',').map(t => t.trim()) : [];
                        tag.content = match[4]?.trim();
                        break;
                        
                    case 'vault_retrieve':
                        tag.attributes.id = match[1];
                        tag.attributes.mode = match[2] || 'preview';
                        tag.attributes.limit = match[3] ? parseInt(match[3]) : undefined;
                        break;
                        
                    case 'vault_reference':
                        tag.attributes.id = match[1];
                        break;
                        
                    case 'memory_store':
                        tag.attributes.summary = match[1];
                        tag.attributes.tags = match[2] ? match[2].split(',').map(t => t.trim()) : [];
                        tag.content = match[3]?.trim();
                        break;
                        
                    case 'function_def':
                        tag.attributes.name = match[1];
                        tag.attributes.params = match[2] ? match[2].split(',').map(p => p.trim()) : [];
                        tag.content = match[3]?.trim();
                        break;
                        
                    case 'data_structure':
                        tag.attributes.type = match[1];
                        tag.attributes.name = match[2];
                        tag.content = match[3]?.trim();
                        break;
                }
                
                extractedTags.push(tag);
            }
        });
        
        return extractedTags;
    }

    // Process enhanced tags and return processed text with vault references
    async processEnhancedTags(text) {
        let processedText = text;
        const extractedTags = this.extractEnhancedTags(text);
        const processingResults = [];
        
        for (const tag of extractedTags) {
            let replacement = '';
            let vaultEntry = null;
            
            switch (tag.type) {
                case 'vault_store':
                    vaultEntry = this.store(tag.content, {
                        label: tag.attributes.label || `Stored content: ${tag.attributes.id}`,
                        tags: tag.attributes.tags || [],
                        source: 'enhanced_tag',
                        customId: tag.attributes.id
                    });
                    replacement = vaultEntry ? vaultEntry.reference : '[Vault storage failed]';
                    break;
                    
                case 'vault_retrieve':
                    const retrievedContent = this.retrieveContent(tag.attributes.id, tag.attributes.mode, tag.attributes.limit);
                    replacement = retrievedContent || `[Vault entry ${tag.attributes.id} not found]`;
                    break;
                    
                case 'vault_reference':
                    const refEntry = this.getEntry(tag.attributes.id);
                    replacement = refEntry ? refEntry.reference : `[Vault reference ${tag.attributes.id} not found]`;
                    break;
                    
                case 'reasoning':
                    if (this.shouldVault(tag.content)) {
                        vaultEntry = this.store(tag.content, {
                            label: 'Reasoning text',
                            type: this.VAULT_TYPES.REASONING,
                            tags: ['reasoning', 'llm-generated'],
                            source: 'enhanced_tag'
                        });
                        replacement = vaultEntry ? `Reasoning stored: ${vaultEntry.reference}` : tag.content;
                    } else {
                        replacement = tag.content;
                    }
                    break;
                    
                case 'js_execution':
                case 'code_block':
                    if (this.shouldVault(tag.content)) {
                        vaultEntry = this.store(tag.content, {
                            label: `${tag.type === 'js_execution' ? 'JavaScript' : tag.attributes.lang || 'Code'} block`,
                            type: this.VAULT_TYPES.CODE,
                            tags: ['code', tag.attributes.lang || 'javascript'],
                            source: 'enhanced_tag'
                        });
                        replacement = vaultEntry ? `Code stored: ${vaultEntry.reference}` : tag.content;
                    } else {
                        replacement = tag.content;
                    }
                    break;
                    
                case 'function_def':
                    vaultEntry = this.store(tag.content, {
                        label: `Function: ${tag.attributes.name}`,
                        type: this.VAULT_TYPES.FUNCTION,
                        tags: ['function', 'reusable'].concat(tag.attributes.params || []),
                        source: 'enhanced_tag',
                        metadata: {
                            name: tag.attributes.name,
                            params: tag.attributes.params || []
                        }
                    });
                    replacement = vaultEntry ? `Function ${tag.attributes.name} stored: ${vaultEntry.reference}` : tag.content;
                    break;
                    
                case 'data_structure':
                    vaultEntry = this.store(tag.content, {
                        label: `${tag.attributes.type}: ${tag.attributes.name}`,
                        type: this.VAULT_TYPES.DATA_STRUCTURE,
                        tags: ['data_structure', tag.attributes.type, tag.attributes.name],
                        source: 'enhanced_tag',
                        metadata: {
                            dataType: tag.attributes.type,
                            name: tag.attributes.name
                        }
                    });
                    replacement = vaultEntry ? `Data structure ${tag.attributes.name} stored: ${vaultEntry.reference}` : tag.content;
                    break;
                    
                case 'memory_store':
                    vaultEntry = this.store(tag.content, {
                        label: tag.attributes.summary,
                        type: this.VAULT_TYPES.MEMORY,
                        tags: ['memory'].concat(tag.attributes.tags || []),
                        source: 'enhanced_tag'
                    });
                    replacement = vaultEntry ? `Memory stored: ${vaultEntry.reference}` : tag.content;
                    break;
                    
                case 'final_output':
                case 'continue_reasoning':
                    // These tags are processed by the reasoning system, not the vault
                    replacement = tag.fullMatch;
                    break;
                    
                default:
                    replacement = tag.fullMatch;
            }
            
            processingResults.push({
                tag,
                vaultEntry,
                replacement
            });
            
            // Replace the tag in the text
            processedText = processedText.replace(tag.fullMatch, replacement);
        }
        
        return {
            processedText,
            results: processingResults,
            vaultEntries: processingResults.filter(r => r.vaultEntry).map(r => r.vaultEntry)
        };
    }

    // Retrieve content with specified mode and limit
    retrieveContent(id, mode = 'preview', limit = null) {
        const entry = this.getEntry(id);
        if (!entry) return null;
        
        if (mode === 'full') {
            return this.getFull(id);
        } else if (mode === 'summary') {
            return entry.label || entry.preview?.substring(0, 200) || '';
        } else {
            return this.getPreview(id, { limit: limit || this.PREVIEW_CHAR_LIMIT });
        }
    }

    // Enhanced store method with custom ID support
    store(value, options = {}) {
        const prepared = this.prepareValueForStorage(value, options);
        const id = options.customId || storageManager.generateId('vault');
        
        // Check if custom ID already exists
        if (options.customId && this.getEntry(options.customId)) {
            // Update existing entry
            const updated = storageManager.updateDataVaultEntry(options.customId, {
                label: prepared.label,
                type: prepared.type,
                rawType: prepared.rawType,
                stats: prepared.stats,
                preview: prepared.preview,
                previewTruncated: prepared.previewTruncated,
                bytes: prepared.bytes,
                serialized: prepared.serialized,
                notes: options.notes || '',
                tags: Array.isArray(options.tags) ? options.tags : [],
                metadata: options.metadata || {},
                updatedAt: new Date().toISOString()
            });
            
            return updated ? this.getEntry(options.customId) : null;
        }
        
        // Create new entry
        const entryId = storageManager.addDataVaultEntry({
            id,
            label: prepared.label,
            type: prepared.type,
            rawType: prepared.rawType,
            stats: prepared.stats,
            preview: prepared.preview,
            previewTruncated: prepared.previewTruncated,
            bytes: prepared.bytes,
            serialized: prepared.serialized,
            source: options.source || 'runtime',
            execId: options.execId || null,
            notes: options.notes || '',
            tags: Array.isArray(options.tags) ? options.tags : [],
            metadata: options.metadata || {},
            reference: null,
            createdAt: new Date().toISOString()
        });

        const reference = this.buildReference(entryId);
        storageManager.updateDataVaultEntry(entryId, { reference });
        return this.getEntry(entryId);
    }

    // Generate LLM usage instructions
    generateUsageInstructions() {
        return `
# Enhanced Data Vault Usage Instructions for LLMs

## Purpose
The Data Vault system allows you to store and retrieve large text blocks, code, functions, and data structures efficiently. This prevents token limit issues when working with large content.

## Enhanced Tag System
Use these enhanced tags with double curly braces and angle brackets for better recognition:

### 1. Storing Content in Vault
\{\{<vault_store id="unique_id" label="Description" tags="tag1,tag2">\}\}
Your large content here...
\{\{</vault_store>\}\}

### 2. Retrieving Content from Vault
\{\{<vault_retrieve id="unique_id" mode="preview|full|summary" limit="500" />\}\}

### 3. Referencing Vault Content
\{\{<vault_ref id="unique_id" />\}\}

### 4. Storing Reasoning Text
\{\{<reasoning_text>\}\}
Long reasoning or analysis...
\{\{</reasoning_text>\}\}

### 5. Storing Code Blocks
\{\{<code_block lang="javascript">\}\}
function example() {
    return "stored code";
}
\{\{</code_block>\}\}

### 6. Storing JavaScript for Execution
\{\{<js_execution>\}\}
console.log("This will be executed");
\{\{</js_execution>\}\}

### 7. Storing Function Definitions
\{\{<function_def name="calculateSum" params="a,b">\}\}
function calculateSum(a, b) {
    return a + b;
}
\{\{</function_def>\}\}

### 8. Storing Data Structures
\{\{<data_structure type="array" name="userList">\}\}
[
    {"name": "John", "age": 30},
    {"name": "Jane", "age": 25}
]
\{\{</data_structure>\}\}

### 9. Storing Memory/Context
\{\{<memory_store summary="User preferences" tags="user,config">\}\}
User prefers dark mode, uses metric units, located in timezone UTC+5:30
\{\{</memory_store>\}\}

### 10. Control Flow Tags
\{\{<final_output>\}\}
Final response to user
\{\{</final_output>\}\}

\{\{<continue_reasoning />\}\}

## Best Practices

### When to Use the Vault
- Text blocks longer than 500 characters
- Code that will be reused multiple times
- Complex data structures
- Function definitions
- Long reasoning chains
- Analysis results

### Naming Conventions for IDs
- Use descriptive names: "user_data_parser", "api_response_handler"
- Include version if iterating: "calculator_v1", "calculator_v2"
- Use categories: "func_", "data_", "analysis_", "reasoning_"

### Tag Usage
- Use relevant tags for easy retrieval
- Common tags: "reusable", "function", "data", "analysis", "temp"
- Include language for code: "javascript", "python", "html", "css"

## Workflow Example

1. **First, store large content:**
\{\{<vault_store id="user_api_client" label="User API Client Class" tags="javascript,class,api">\}\}
class UserApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    // ... rest of large class definition
}
\{\{</vault_store>\}\}

2. **Later, reference it:**
\{\{<vault_ref id="user_api_client" />\}\}

3. **Or retrieve specific parts:**
\{\{<vault_retrieve id="user_api_client" mode="preview" limit="200" />\}\}

## Output Rendering
When the system processes these tags:
- Stored content gets a vault reference like [[vault:abc123]]
- Retrieved content is inserted inline
- References are replaced with actual content or summaries
- The user sees the final processed text, not the vault tags

## Error Handling
- If storage fails: Tag content remains in place
- If retrieval fails: Error message is inserted
- Always check if content was successfully stored before referencing

## Memory Management
- Vault entries persist across conversations
- Use meaningful labels for easier management
- Clean up temporary entries when no longer needed
- Large data structures are automatically compressed

Remember: The vault is transparent to users - they see the final processed content, not the vault mechanics.
`;
    }

    // All existing methods from original DataVault class...
    listEntries() {
        return storageManager.getDataVaultEntries();
    }

    getEntry(id) {
        return this.listEntries().find(entry => entry.id === id) || null;
    }

    getEntryByReference(reference) {
        const id = this.extractId(reference);
        return id ? this.getEntry(id) : null;
    }

    resolve(referenceOrId) {
        const entry = typeof referenceOrId === 'string'
            ? this.getEntryByReference(referenceOrId) || this.getEntry(referenceOrId)
            : null;
        return entry;
    }

    update(id, updates) {
        return storageManager.updateDataVaultEntry(id, updates);
    }

    delete(id) {
        storageManager.deleteDataVaultEntry(id);
    }

    clear() {
        storageManager.clearDataVault();
    }

    shouldVault(value, options = {}) {
        if (options.force) return true;
        const type = this.detectType(value);

        if (type === 'string') {
            return value.length > 500;
        }

        if (type === 'array' || type === 'object') {
            try {
                const serialized = JSON.stringify(value);
                return serialized.length > 500;
            } catch {
                return true;
            }
        }
    
        if (type === 'function' || type === 'map' || type === 'set' || type === 'buffer' || type === 'date') {
            return true;
        }
    
        return false;
    }

    getPreview(id, { limit = this.PREVIEW_CHAR_LIMIT } = {}) {
        const entry = this.getEntry(id);
        if (!entry) return null;

        const preview = entry.preview || '';
        if (preview.length <= limit) {
            return preview;
        }
        return `${preview.slice(0, limit)}… (truncated preview, use full mode to retrieve everything)`;
    }

    getFull(id) {
        const entry = this.getEntry(id);
        if (!entry) return null;
        return entry.serialized || '';
    }

    getValue(id) {
        const serialized = this.getFull(id);
        if (!serialized) return null;
        return this.safeDeserialize(serialized, id);
    }

    buildReference(id) {
        return `[[${this.REFERENCE_PREFIX}:${id}]]`;
    }

    extractId(reference) {
        if (typeof reference !== 'string') return null;
        const match = reference.match(/\[\[\s*vault:([^\]]+)\s*\]\]/i);
        if (match) {
            return match[1].trim();
        }
        const trimmed = reference.trim();
        if (trimmed.startsWith('vault-') || trimmed.startsWith('data-')) {
            return trimmed;
        }
        return null;
    }

    isReferenceToken(text) {
        if (typeof text !== 'string') return false;
        return /\[\[\s*vault:[^\]]+\]\]/i.test(text);
    }

    // Continue with all other methods from original implementation...
    detectType(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        if (value instanceof Map) return 'map';
        if (value instanceof Set) return 'set';
        if (value instanceof Date) return 'date';
        if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return 'buffer';

        const type = typeof value;
        if (type === 'object') return 'object';
        if (type === 'bigint') return 'bigint';
        if (type === 'function') return 'function';
        return type;
    }

    prepareValueForStorage(value, options) {
        const type = this.detectType(value);
        const rawType = Object.prototype.toString.call(value);
        const serialized = this.safeSerialize(value);
        const previewInfo = this.buildPreview(value, serialized, type);
        const bytes = this.estimateBytes(serialized);

        const stats = {
            length: this.measureLength(value, type),
            keys: type === 'object' ? Object.keys(value || {}).length : undefined
        };

        const label = this.resolveLabel(value, type, stats, options.label);

        return {
            type: options.type || type,
            rawType,
            stats,
            serialized,
            preview: previewInfo.preview,
            previewTruncated: previewInfo.truncated,
            bytes,
            label
        };
    }

    resolveLabel(value, type, stats, providedLabel) {
        if (providedLabel) {
            return providedLabel;
        }

        switch (type) {
            case 'array':
                return `Array(${stats.length ?? '??'})`;
            case 'object':
                return `Object(${stats.keys ?? '??'} keys)`;
            case 'map':
                return `Map(${stats.length ?? '??'})`;
            case 'set':
                return `Set(${stats.length ?? '??'})`;
            case 'string': {
                const len = typeof stats.length === 'number' ? stats.length : (value ? value.length : 0);
                return `String(${len})`;
            }
            case 'function': {
                const name = value && value.name ? value.name : 'anonymous';
                return `Function(${name})`;
            }
            case 'buffer':
                return `Buffer(${stats.length ?? '??'})`;
            default:
                return `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
        }
    }

    measureLength(value, type) {
        if (type === 'array') return value.length;
        if (type === 'map' || type === 'set') return value.size;
        if (type === 'string') return value.length;
        if (type === 'function') {
            try {
                return value.toString().length;
            } catch (error) {
                console.error('Vault length measurement failed for function', error);
            }
        }
        if (type === 'buffer') {
            if (ArrayBuffer.isView(value)) return value.byteLength;
            if (value instanceof ArrayBuffer) return value.byteLength;
        }
        return undefined;
    }

    buildPreview(value, serialized, type) {
        try {
            if (type === 'string') {
                const truncated = value.length > this.PREVIEW_CHAR_LIMIT;
                const preview = truncated ? `${value.slice(0, this.PREVIEW_CHAR_LIMIT)}...` : value;
                return { preview, truncated };
            }

            if (type === 'function') {
                const source = this.extractFunctionSource(value);
                const truncated = source.length > this.PREVIEW_CHAR_LIMIT;
                const preview = truncated ? `${source.slice(0, this.PREVIEW_CHAR_LIMIT)}...` : source;
                return { preview, truncated };
            }

            if (type === 'array') {
                const items = value.slice(0, this.MAX_SAMPLE_ITEMS).map(item => this.describeScalar(item));
                const suffix = value.length > this.MAX_SAMPLE_ITEMS ? ', ...' : '';
                return {
                    preview: `[${items.join(', ')}${suffix}] (len ${value.length})`,
                    truncated: value.length > this.MAX_SAMPLE_ITEMS
                };
            }

            if (type === 'object') {
                const keys = Object.keys(value || {}).slice(0, this.MAX_SAMPLE_ITEMS);
                const mapped = keys.map(key => `${key}: ${this.describeScalar(value[key])}`);
                const suffix = Object.keys(value || {}).length > this.MAX_SAMPLE_ITEMS ? ', ...' : '';
                return {
                    preview: `{ ${mapped.join(', ')}${suffix} }`,
                    truncated: Object.keys(value || {}).length > this.MAX_SAMPLE_ITEMS
                };
            }

            const fallback = serialized || String(value);
            return {
                preview: fallback,
                truncated: false
            };
        } catch (error) {
            console.error('Error building data preview', error);
            return {
                preview: serialized || String(value),
                truncated: false
            };
        }
    }

    describeScalar(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';

        const type = typeof value;
        switch (type) {
            case 'string': {
                const snippet = value.length > 60 ? `${value.slice(0, 57)}...` : value;
                return `"${snippet}"`;
            }
            case 'number':
            case 'bigint':
                return String(value);
            case 'boolean':
                return value ? 'true' : 'false';
            case 'function': {
                const name = value.name || 'anonymous';
                const source = this.extractFunctionSource(value).replace(/\s+/g, ' ').trim();
                const snippet = source.length > 48 ? `${source.slice(0, 48)}...` : source;
                return snippet ? `[Function ${name}] ${snippet}` : `[Function ${name}]`;
            }
            default:
                return String(value);
        }
    }

    extractFunctionSource(fn) {
        if (typeof fn !== 'function') {
            return '';
        }
        try {
            return fn.toString();
        } catch (error) {
            console.error('Unable to read function source for vault storage', error);
            return `[Function ${fn.name || 'anonymous'}]`;
        }
    }

    safeSerialize(value) {
        const seen = new WeakSet();

        const replacer = (_key, val) => {
            if (typeof val === 'bigint') {
                return `BigInt(${val.toString()})`;
            }
            if (typeof val === 'function') {
                const source = this.extractFunctionSource(val);
                return {
                    __type: 'Function',
                    name: val.name || 'anonymous',
                    length: typeof val.length === 'number' ? val.length : undefined,
                    source
                };
            }
            if (typeof val === 'object' && val !== null) {
                if (seen.has(val)) {
                    return '[Circular]';
                }
                seen.add(val);
            }
            return val;
        };

        try {
            return JSON.stringify(value, replacer, 2);
        } catch (error) {
            console.error('Vault serialization failed, falling back to string', error);
            try {
                return String(value);
            } catch {
                return '[Unserializable Value]';
            }
        }
    }

    estimateBytes(serialized) {
        if (!serialized) return 0;
        if (this.textEncoder) {
            return this.textEncoder.encode(serialized).length;
        }
        return serialized.length;
    }

    safeDeserialize(serialized, id = null) {
        try {
            return JSON.parse(serialized);
        } catch (error) {
            console.error('Vault deserialization failed', id, error);
            return serialized;
        }
    }

    createRuntimeApi(context = {}) {
        return Object.freeze({
            store: (value, options = {}) => {
                const entry = this.store(value, {
                    ...options,
                    source: options.source || context.source || 'enhanced_runtime',
                    execId: context.execId || options.execId || null
                });
                return entry?.reference || null;
            },
            read: (referenceOrId, mode = 'preview', opts = {}) => {
                const entry = this.resolve(referenceOrId);
                if (!entry) return null;
                if (mode === 'full') {
                    return this.getFull(entry.id);
                }
                const limit = typeof opts.limit === 'number' ? opts.limit : this.PREVIEW_CHAR_LIMIT;
                return this.getPreview(entry.id, { limit });
            },
            info: (referenceOrId) => {
                const entry = this.resolve(referenceOrId);
                if (!entry) return null;
                const { serialized, ...rest } = entry;
                return rest;
            },
            value: (referenceOrId) => {
                const entry = this.resolve(referenceOrId);
                if (!entry) return null;
                return this.getValue(entry.id);
            },
            list: () => this.listEntries().map(entry => {
                const { serialized, ...rest } = entry;
                return rest;
            }),
            drop: (referenceOrId) => {
                const entry = this.resolve(referenceOrId);
                if (!entry) return false;
                this.delete(entry.id);
                return true;
            },
            processText: (text) => {
                return this.processEnhancedTags(text);
            },
            getInstructions: () => {
                return this.generateUsageInstructions();
            }
        });
    }
}

export const enhancedDataVault = new EnhancedDataVault();