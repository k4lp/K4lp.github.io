// vault-llm-procedures.js - Standardized procedures for LLM interaction with vault system

import { enhancedDataVault } from './data-vault-enhanced.js';
import { vaultTagProcessor } from './vault-tag-processor.js';

class VaultLLMProcedures {
    constructor() {
        this.procedures = new Map();
        this.setupStandardProcedures();
        this.usageStats = {
            proceduresExecuted: 0,
            vaultOperations: 0,
            errorCount: 0,
            lastUsed: null
        };
    }

    // Setup standard LLM procedures
    setupStandardProcedures() {
        // Procedure 1: Store large text content
        this.registerProcedure('store_large_content', {
            description: 'Store large text content in vault to avoid token limits',
            usage: '{{<vault_store id="unique_id" label="Description" tags="tag1,tag2">}}Large content here{{</vault_store>}}',
            example: '{{<vault_store id="api_documentation" label="Complete API Documentation" tags="docs,api,reference">}}\n# API Documentation\n\nThis is a very long documentation...\n{{</vault_store>}}',
            when: 'When content exceeds 500 characters or when content will be referenced multiple times',
            processor: async (content, options = {}) => {
                const { id, label, tags = [] } = options;
                
                if (!id) {
                    throw new Error('store_large_content requires an id');
                }
                
                if (!content || content.length < 100) {
                    console.warn('Content may be too small for vaulting');
                }
                
                const result = enhancedDataVault.store(content, {
                    customId: id,
                    label: label || `Stored content: ${id}`,
                    tags: Array.isArray(tags) ? tags : [],
                    source: 'llm_procedure_store_large'
                });
                
                return {
                    success: true,
                    vaultId: result.id,
                    reference: result.reference,
                    message: `Content stored with ID: ${id}`,
                    usage: `Use {{<vault_retrieve id="${id}" />}} to retrieve`
                };
            }
        });

        // Procedure 2: Store reusable functions
        this.registerProcedure('store_function', {
            description: 'Store JavaScript functions for reuse across multiple contexts',
            usage: '{{<function_def name="functionName" params="param1,param2">}}function code here{{</function_def>}}',
            example: '{{<function_def name="calculateTotal" params="items,taxRate">}}\nfunction calculateTotal(items, taxRate) {\n    const subtotal = items.reduce((sum, item) => sum + item.price, 0);\n    return subtotal * (1 + taxRate);\n}\n{{</function_def>}}',
            when: 'When defining functions that will be used multiple times or are complex',
            processor: async (functionCode, options = {}) => {
                const { name, params = [] } = options;
                
                if (!name) {
                    throw new Error('store_function requires a function name');
                }
                
                if (!functionCode.includes('function') && !functionCode.includes('=>')) {
                    console.warn('Content does not appear to contain a function definition');
                }
                
                const functionId = `func_${name}_${Date.now()}`;
                const result = enhancedDataVault.store(functionCode, {
                    customId: functionId,
                    label: `Function: ${name}`,
                    type: enhancedDataVault.VAULT_TYPES.FUNCTION,
                    tags: ['function', 'reusable', name].concat(params),
                    source: 'llm_procedure_store_function',
                    metadata: {
                        functionName: name,
                        parameters: params
                    }
                });
                
                return {
                    success: true,
                    vaultId: result.id,
                    reference: result.reference,
                    functionName: name,
                    message: `Function '${name}' stored with ID: ${functionId}`,
                    usage: `Use {{<vault_retrieve id="${functionId}" />}} to retrieve function`
                };
            }
        });

        // Procedure 3: Store data structures
        this.registerProcedure('store_data_structure', {
            description: 'Store complex data structures like arrays, objects, or JSON data',
            usage: '{{<data_structure type="array|object|json" name="dataName">}}data here{{</data_structure>}}',
            example: '{{<data_structure type="array" name="userProfiles">}}\n[\n    {"id": 1, "name": "John", "role": "admin"},\n    {"id": 2, "name": "Jane", "role": "user"}\n]\n{{</data_structure>}}',
            when: 'When working with large datasets or complex object structures',
            processor: async (dataContent, options = {}) => {
                const { type, name } = options;
                
                if (!type || !name) {
                    throw new Error('store_data_structure requires type and name');
                }
                
                // Validate JSON if type is json/array/object
                if (['json', 'array', 'object'].includes(type)) {
                    try {
                        JSON.parse(dataContent);
                    } catch (error) {
                        console.warn('Data content is not valid JSON');
                    }
                }
                
                const dataId = `data_${type}_${name}_${Date.now()}`;
                const result = enhancedDataVault.store(dataContent, {
                    customId: dataId,
                    label: `${type}: ${name}`,
                    type: enhancedDataVault.VAULT_TYPES.DATA_STRUCTURE,
                    tags: ['data_structure', type, name],
                    source: 'llm_procedure_store_data',
                    metadata: {
                        dataType: type,
                        dataName: name
                    }
                });
                
                return {
                    success: true,
                    vaultId: result.id,
                    reference: result.reference,
                    dataType: type,
                    dataName: name,
                    message: `Data structure '${name}' (${type}) stored with ID: ${dataId}`,
                    usage: `Use {{<vault_retrieve id="${dataId}" />}} to retrieve data`
                };
            }
        });

        // Procedure 4: Efficient content retrieval
        this.registerProcedure('retrieve_content', {
            description: 'Retrieve stored content in different modes (preview, full, summary)',
            usage: '{{<vault_retrieve id="stored_id" mode="preview|full|summary" limit="characters" />}}',
            example: '{{<vault_retrieve id="api_documentation" mode="preview" limit="300" />}}',
            when: 'When you need to access previously stored content',
            processor: async (vaultId, options = {}) => {
                const { mode = 'preview', limit } = options;
                
                if (!vaultId) {
                    throw new Error('retrieve_content requires a vault ID');
                }
                
                const entry = enhancedDataVault.getEntry(vaultId);
                if (!entry) {
                    const available = enhancedDataVault.listEntries().slice(0, 5).map(e => ({
                        id: e.id,
                        label: e.label
                    }));
                    
                    throw new Error(`Vault entry '${vaultId}' not found. Available entries: ${JSON.stringify(available)}`);
                }
                
                const content = enhancedDataVault.retrieveContent(vaultId, mode, limit);
                
                return {
                    success: true,
                    content,
                    vaultId,
                    mode,
                    label: entry.label,
                    message: `Retrieved content from '${vaultId}' in ${mode} mode`
                };
            }
        });

        // Procedure 5: Smart reasoning storage
        this.registerProcedure('store_reasoning', {
            description: 'Store long reasoning chains or analysis that may be referenced later',
            usage: '{{<reasoning_text>}}Long reasoning or analysis{{</reasoning_text>}}',
            example: '{{<reasoning_text>}}\nBased on the user requirements, I need to analyze multiple factors:\n1. Performance considerations...\n2. Security implications...\n3. Scalability requirements...\n{{</reasoning_text>}}',
            when: 'When reasoning is longer than 300 characters or contains structured analysis',
            processor: async (reasoningContent, options = {}) => {
                const { label, tags = ['reasoning'] } = options;
                
                if (!reasoningContent || reasoningContent.length < 50) {
                    return {
                        success: true,
                        stored: false,
                        content: reasoningContent,
                        message: 'Reasoning too short, returned as-is'
                    };
                }
                
                if (reasoningContent.length > 300) {
                    const reasoningId = `reasoning_${Date.now()}`;
                    const result = enhancedDataVault.store(reasoningContent, {
                        customId: reasoningId,
                        label: label || 'Reasoning analysis',
                        type: enhancedDataVault.VAULT_TYPES.REASONING,
                        tags: ['reasoning', 'analysis'].concat(tags),
                        source: 'llm_procedure_store_reasoning'
                    });
                    
                    return {
                        success: true,
                        stored: true,
                        vaultId: result.id,
                        reference: result.reference,
                        message: `Reasoning stored with ID: ${reasoningId}`,
                        summary: reasoningContent.substring(0, 150) + '...'
                    };
                } else {
                    return {
                        success: true,
                        stored: false,
                        content: reasoningContent,
                        message: 'Reasoning returned inline'
                    };
                }
            }
        });

        // Procedure 6: Batch content processing
        this.registerProcedure('process_batch_content', {
            description: 'Process multiple pieces of content with enhanced tags in a single operation',
            usage: 'Call processBatchContent(textWithMultipleTags)',
            example: 'Use when text contains multiple {{<vault_store>}}, {{<function_def>}}, etc. tags',
            when: 'When processing LLM output that contains multiple enhanced tags',
            processor: async (textContent, options = {}) => {
                const { context = {} } = options;
                
                const result = await vaultTagProcessor.processText(textContent, context);
                
                this.usageStats.vaultOperations += result.vaultEntries.length;
                this.usageStats.errorCount += result.errors.length;
                
                return {
                    success: result.errors.length === 0,
                    processedText: result.processedText,
                    vaultEntries: result.vaultEntries,
                    errors: result.errors,
                    results: result.results,
                    message: `Processed ${result.results.length} tags, created ${result.vaultEntries.length} vault entries`
                };
            }
        });
    }

    // Register a new procedure
    registerProcedure(name, procedureConfig) {
        if (!procedureConfig.processor || typeof procedureConfig.processor !== 'function') {
            throw new Error(`Procedure '${name}' must have a processor function`);
        }
        
        this.procedures.set(name, {
            ...procedureConfig,
            registeredAt: new Date().toISOString()
        });
    }

    // Execute a procedure
    async executeProcedure(name, ...args) {
        const procedure = this.procedures.get(name);
        
        if (!procedure) {
            throw new Error(`Procedure '${name}' not found. Available: ${Array.from(this.procedures.keys()).join(', ')}`);
        }
        
        try {
            this.usageStats.proceduresExecuted++;
            this.usageStats.lastUsed = new Date().toISOString();
            
            const result = await procedure.processor(...args);
            
            return {
                procedure: name,
                ...result
            };
        } catch (error) {
            this.usageStats.errorCount++;
            throw new Error(`Procedure '${name}' failed: ${error.message}`);
        }
    }

    // Generate comprehensive LLM instructions
    generateLLMInstructions() {
        const procedures = Array.from(this.procedures.entries());
        
        let instructions = `
# Data Vault System - LLM Usage Guide

## Overview
The Data Vault system helps you manage large content efficiently by storing it in a persistent vault and referencing it with short tokens. This prevents token limit issues and enables content reuse.

## Enhanced Tag System
Use these tags with double curly braces and angle brackets: \{\{<tag>\}\}content\{\{</tag>\}\}

## Standard Procedures

`;

        procedures.forEach(([name, config], index) => {
            instructions += `### ${index + 1}. ${name.replace(/_/g, ' ').toUpperCase()}
`;
            instructions += `**Purpose:** ${config.description}\n\n`;
            instructions += `**Usage:** \`${config.usage}\`\n\n`;
            instructions += `**Example:**\n\`\`\`\n${config.example}\n\`\`\`\n\n`;
            instructions += `**When to use:** ${config.when}\n\n`;
            instructions += `---\n\n`;
        });

        instructions += `
## Workflow Guidelines

### 1. Before Writing Large Content
- If content will be > 500 characters, use \{\{<vault_store>\}\}
- Choose descriptive IDs: "user_auth_system", "api_client_v2"
- Add relevant tags for categorization

### 2. When Defining Reusable Components
- Functions: Use \{\{<function_def>\}\}
- Data structures: Use \{\{<data_structure>\}\}
- Complex logic: Use \{\{<reasoning_text>\}\}

### 3. When Retrieving Content
- Preview mode: Quick overview (default)
- Full mode: Complete content
- Summary mode: Brief description
- Use limit parameter to control size

### 4. Content Organization
- Use consistent naming: \"category_purpose_version\"
- Tag with: type, language, purpose, version
- Include meaningful labels for human readability

## Error Handling
- If vault storage fails, content appears inline
- If retrieval fails, error message with suggestions appears
- Always check vault operations success in development

## Best Practices

### DO:
- Store functions, large text, complex data
- Use descriptive IDs and labels
- Tag content appropriately
- Retrieve in appropriate mode for context

### DON'T:
- Store very short content (< 100 chars)
- Use generic IDs like "data1", "func2"
- Store temporary debugging content
- Retrieve full content when preview suffices

## Content Types Suitable for Vaulting

1. **API Documentation** - Large reference materials
2. **Code Classes** - Complete class definitions
3. **Data Sets** - Arrays, objects, JSON structures
4. **Configuration Files** - Settings, options, parameters
5. **Templates** - HTML, email, document templates
6. **Analysis Results** - Long reasoning chains
7. **Function Libraries** - Reusable utility functions

## Example Workflow

\`\`\`
1. Store a utility function:
\{\{<function_def name="validateEmail" params="email">\}\}
function validateEmail(email) {
    const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return regex.test(email);
}
\{\{</function_def>\}\}

2. Later reference it:
\{\{<vault_retrieve id="func_validateEmail_..." mode="full" />\}\}

3. Store analysis:
\{\{<reasoning_text>\}\}
User requirements analysis:
1. Authentication needed
2. Data validation required
3. Performance considerations...
\{\{</reasoning_text>\}\}
\`\`\`

## Monitoring
- Vault entries are persistent across sessions
- Use meaningful labels for easy identification
- Regular cleanup of temporary entries recommended
- Monitor vault size for large deployments

Remember: Users see the final processed content, not the vault mechanics. The system is transparent to end users.
`;

        return instructions;
    }

    // Get procedure documentation
    getProcedureDoc(name) {
        const procedure = this.procedures.get(name);
        if (!procedure) return null;
        
        return {
            name,
            description: procedure.description,
            usage: procedure.usage,
            example: procedure.example,
            when: procedure.when,
            registeredAt: procedure.registeredAt
        };
    }

    // List all procedures
    listProcedures() {
        return Array.from(this.procedures.keys());
    }

    // Get usage statistics
    getUsageStats() {
        return {
            ...this.usageStats,
            vaultSize: enhancedDataVault.listEntries().length,
            proceduresRegistered: this.procedures.size
        };
    }

    // Reset usage statistics
    resetStats() {
        this.usageStats = {
            proceduresExecuted: 0,
            vaultOperations: 0,
            errorCount: 0,
            lastUsed: null
        };
    }

    // Generate quick reference card
    generateQuickReference() {
        return `
# Data Vault Quick Reference

## Store Content
\{\{<vault_store id="my_id" label="Description">\}\}content\{\{</vault_store>\}\}

## Retrieve Content  
\{\{<vault_retrieve id="my_id" mode="preview" />\}\}

## Store Function
\{\{<function_def name="funcName" params="a,b">\}\}code\{\{</function_def>\}\}

## Store Data
\{\{<data_structure type="array" name="dataName">\}\}json\{\{</data_structure>\}\}

## Store Reasoning
\{\{<reasoning_text>\}\}analysis\{\{</reasoning_text>\}\}

## Reference Vault Entry
\{\{<vault_ref id="my_id" />\}\}

Modes: preview (default), full, summary
Tags: Comma-separated for organization
IDs: Use descriptive names like "user_auth_system"
`;
    }
}

export const vaultLLMProcedures = new VaultLLMProcedures();