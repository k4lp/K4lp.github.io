// vault-tag-processor.js - Modular tag processing engine for enhanced vault system

import { enhancedDataVault } from './data-vault-enhanced.js';

class VaultTagProcessor {
    constructor() {
        this.processors = new Map();
        this.setupDefaultProcessors();
        this.processingHistory = [];
        this.debugMode = false;
    }

    // Register a custom tag processor
    registerProcessor(tagName, processorFn) {
        if (typeof processorFn !== 'function') {
            throw new Error(`Processor for ${tagName} must be a function`);
        }
        this.processors.set(tagName, processorFn);
    }

    // Setup default tag processors
    setupDefaultProcessors() {
        // Vault storage processor
        this.registerProcessor('vault_store', (tag, context) => {
            const { id, label, tags } = tag.attributes;
            const content = tag.content;
            
            if (!id || !content) {
                return {
                    success: false,
                    error: 'vault_store requires id attribute and content',
                    replacement: tag.fullMatch
                };
            }
            
            const vaultEntry = enhancedDataVault.store(content, {
                customId: id,
                label: label || `Stored content: ${id}`,
                tags: tags ? tags.split(',').map(t => t.trim()) : [],
                source: 'tag_processor',
                metadata: { processedAt: new Date().toISOString() }
            });
            
            if (vaultEntry) {
                return {
                    success: true,
                    vaultEntry,
                    replacement: `{{<vault_stored id="${id}" reference="${vaultEntry.reference}" />}}`,
                    message: `Content stored in vault with ID: ${id}`
                };
            } else {
                return {
                    success: false,
                    error: 'Failed to store in vault',
                    replacement: content // Fallback to original content
                };
            }
        });

        // Vault retrieval processor
        this.registerProcessor('vault_retrieve', (tag, context) => {
            const { id, mode = 'preview', limit } = tag.attributes;
            
            if (!id) {
                return {
                    success: false,
                    error: 'vault_retrieve requires id attribute',
                    replacement: '[Error: No vault ID specified]'
                };
            }
            
            const content = enhancedDataVault.retrieveContent(
                id, 
                mode, 
                limit ? parseInt(limit) : undefined
            );
            
            if (content !== null) {
                return {
                    success: true,
                    replacement: content,
                    message: `Retrieved content from vault ID: ${id} (mode: ${mode})`
                };
            } else {
                const availableEntries = enhancedDataVault.listEntries().map(e => ({
                    id: e.id,
                    label: e.label
                }));
                
                return {
                    success: false,
                    error: `Vault entry not found: ${id}`,
                    replacement: `[Error: Vault entry '${id}' not found]`,
                    suggestions: availableEntries.slice(0, 5)
                };
            }
        });

        // Vault reference processor
        this.registerProcessor('vault_ref', (tag, context) => {
            const { id } = tag.attributes;
            
            if (!id) {
                return {
                    success: false,
                    error: 'vault_ref requires id attribute',
                    replacement: '[Error: No vault ID specified]'
                };
            }
            
            const entry = enhancedDataVault.getEntry(id);
            
            if (entry) {
                return {
                    success: true,
                    replacement: entry.reference,
                    message: `Referenced vault entry: ${id}`
                };
            } else {
                return {
                    success: false,
                    error: `Vault entry not found: ${id}`,
                    replacement: `[Ref Error: ${id} not found]`
                };
            }
        });

        // Function definition processor
        this.registerProcessor('function_def', (tag, context) => {
            const { name, params } = tag.attributes;
            const content = tag.content;
            
            if (!name || !content) {
                return {
                    success: false,
                    error: 'function_def requires name attribute and content',
                    replacement: tag.fullMatch
                };
            }
            
            const functionId = `func_${name}_${Date.now()}`;
            const vaultEntry = enhancedDataVault.store(content, {
                customId: functionId,
                label: `Function: ${name}`,
                type: enhancedDataVault.VAULT_TYPES.FUNCTION,
                tags: ['function', 'reusable', name].concat(params ? params.split(',').map(p => p.trim()) : []),
                source: 'function_processor',
                metadata: {
                    functionName: name,
                    parameters: params ? params.split(',').map(p => p.trim()) : [],
                    processedAt: new Date().toISOString()
                }
            });
            
            if (vaultEntry) {
                // Store function in a reusable functions registry
                context.functions = context.functions || new Map();
                context.functions.set(name, {
                    id: functionId,
                    reference: vaultEntry.reference,
                    params: params ? params.split(',').map(p => p.trim()) : []
                });
                
                return {
                    success: true,
                    vaultEntry,
                    replacement: `{{<function_registered name="${name}" id="${functionId}" reference="${vaultEntry.reference}" />}}`,
                    message: `Function '${name}' registered and stored in vault`
                };
            } else {
                return {
                    success: false,
                    error: 'Failed to store function in vault',
                    replacement: content
                };
            }
        });

        // Data structure processor
        this.registerProcessor('data_structure', (tag, context) => {
            const { type, name } = tag.attributes;
            const content = tag.content;
            
            if (!type || !name || !content) {
                return {
                    success: false,
                    error: 'data_structure requires type, name attributes and content',
                    replacement: tag.fullMatch
                };
            }
            
            const dataId = `data_${type}_${name}_${Date.now()}`;
            const vaultEntry = enhancedDataVault.store(content, {
                customId: dataId,
                label: `${type}: ${name}`,
                type: enhancedDataVault.VAULT_TYPES.DATA_STRUCTURE,
                tags: ['data_structure', type, name],
                source: 'data_processor',
                metadata: {
                    dataType: type,
                    dataName: name,
                    processedAt: new Date().toISOString()
                }
            });
            
            if (vaultEntry) {
                // Store data structure reference
                context.dataStructures = context.dataStructures || new Map();
                context.dataStructures.set(name, {
                    id: dataId,
                    reference: vaultEntry.reference,
                    type
                });
                
                return {
                    success: true,
                    vaultEntry,
                    replacement: `{{<data_registered name="${name}" type="${type}" id="${dataId}" reference="${vaultEntry.reference}" />}}`,
                    message: `Data structure '${name}' (${type}) registered and stored in vault`
                };
            } else {
                return {
                    success: false,
                    error: 'Failed to store data structure in vault',
                    replacement: content
                };
            }
        });

        // Reasoning processor with automatic vaulting for large content
        this.registerProcessor('reasoning_text', (tag, context) => {
            const content = tag.content;
            
            if (!content) {
                return {
                    success: false,
                    error: 'reasoning_text requires content',
                    replacement: ''
                };
            }
            
            // Auto-vault if content is large
            if (enhancedDataVault.shouldVault(content)) {
                const reasoningId = `reasoning_${Date.now()}`;
                const vaultEntry = enhancedDataVault.store(content, {
                    customId: reasoningId,
                    label: 'Reasoning text',
                    type: enhancedDataVault.VAULT_TYPES.REASONING,
                    tags: ['reasoning', 'llm-generated'],
                    source: 'reasoning_processor'
                });
                
                if (vaultEntry) {
                    return {
                        success: true,
                        vaultEntry,
                        replacement: `{{<reasoning_vaulted reference="${vaultEntry.reference}" />}}`,
                        message: `Large reasoning text stored in vault: ${vaultEntry.reference}`
                    };
                }
            }
            
            // Return content as-is if not vaulted
            return {
                success: true,
                replacement: content,
                message: 'Reasoning text processed'
            };
        });

        // Code block processor with language-specific handling
        this.registerProcessor('code_block', (tag, context) => {
            const { lang = 'text' } = tag.attributes;
            const content = tag.content;
            
            if (!content) {
                return {
                    success: false,
                    error: 'code_block requires content',
                    replacement: ''
                };
            }
            
            // Auto-vault if content is large or contains complex code
            if (enhancedDataVault.shouldVault(content) || this.isComplexCode(content, lang)) {
                const codeId = `code_${lang}_${Date.now()}`;
                const vaultEntry = enhancedDataVault.store(content, {
                    customId: codeId,
                    label: `${lang} code block`,
                    type: enhancedDataVault.VAULT_TYPES.CODE,
                    tags: ['code', lang, 'block'],
                    source: 'code_processor',
                    metadata: {
                        language: lang,
                        lineCount: content.split('\n').length
                    }
                });
                
                if (vaultEntry) {
                    return {
                        success: true,
                        vaultEntry,
                        replacement: `{{<code_vaulted lang="${lang}" reference="${vaultEntry.reference}" />}}`,
                        message: `Code block (${lang}) stored in vault: ${vaultEntry.reference}`
                    };
                }
            }
            
            // Return formatted code block
            return {
                success: true,
                replacement: `\`\`\`${lang}\n${content}\n\`\`\``,
                message: `Code block processed (${lang})`
            };
        });
    }

    // Check if code is complex enough to warrant vaulting
    isComplexCode(code, lang) {
        const lines = code.split('\n');
        
        // Vault if more than 10 lines
        if (lines.length > 10) return true;
        
        // Vault if contains function definitions
        if (/function\s+\w+\s*\(/i.test(code)) return true;
        
        // Vault if contains class definitions
        if (/class\s+\w+/i.test(code)) return true;
        
        // Language-specific complexity checks
        switch (lang.toLowerCase()) {
            case 'javascript':
            case 'js':
                return /(?:async\s+function|\=\>|import\s+.*from|export\s+)/i.test(code);
            case 'python':
            case 'py':
                return /(?:def\s+\w+|class\s+\w+|import\s+|from\s+.*import)/i.test(code);
            case 'html':
                return code.includes('<script>') || code.includes('<style>');
            case 'css':
                return lines.length > 5;
            default:
                return false;
        }
    }

    // Process text with all registered tag processors
    async processText(text, context = {}) {
        let processedText = text;
        const results = [];
        const errors = [];
        
        // Extract and process all enhanced tags
        const extractedTags = enhancedDataVault.extractEnhancedTags(text);
        
        // Sort tags by position (reverse order to maintain string positions)
        extractedTags.sort((a, b) => {
            const aPos = text.indexOf(a.fullMatch);
            const bPos = text.indexOf(b.fullMatch);
            return bPos - aPos;
        });
        
        for (const tag of extractedTags) {
            const processor = this.processors.get(tag.type);
            
            if (processor) {
                try {
                    const result = await processor(tag, context);
                    
                    if (result.success) {
                        // Replace tag with processed content
                        processedText = processedText.replace(tag.fullMatch, result.replacement);
                        results.push({
                            tag: tag.type,
                            success: true,
                            message: result.message,
                            vaultEntry: result.vaultEntry
                        });
                    } else {
                        // Handle error case
                        processedText = processedText.replace(tag.fullMatch, result.replacement);
                        errors.push({
                            tag: tag.type,
                            error: result.error,
                            suggestions: result.suggestions
                        });
                    }
                } catch (error) {
                    console.error(`Error processing ${tag.type} tag:`, error);
                    errors.push({
                        tag: tag.type,
                        error: error.message
                    });
                }
            } else {
                // Unknown tag type - leave as-is or log warning
                if (this.debugMode) {
                    console.warn(`No processor found for tag type: ${tag.type}`);
                }
            }
        }
        
        // Store processing history
        this.processingHistory.push({
            timestamp: new Date().toISOString(),
            originalLength: text.length,
            processedLength: processedText.length,
            tagsProcessed: results.length,
            errors: errors.length,
            context: { ...context }
        });
        
        return {
            processedText,
            results,
            errors,
            vaultEntries: results.filter(r => r.vaultEntry).map(r => r.vaultEntry),
            context
        };
    }

    // Generate processing report
    generateReport() {
        const recentHistory = this.processingHistory.slice(-10);
        const totalProcessed = this.processingHistory.length;
        const totalErrors = this.processingHistory.reduce((sum, h) => sum + h.errors, 0);
        
        return {
            totalSessions: totalProcessed,
            totalErrors,
            successRate: totalProcessed > 0 ? ((totalProcessed - totalErrors) / totalProcessed * 100).toFixed(2) : 0,
            recentSessions: recentHistory,
            registeredProcessors: Array.from(this.processors.keys()),
            vaultEntries: enhancedDataVault.listEntries().length
        };
    }

    // Clear processing history
    clearHistory() {
        this.processingHistory = [];
    }

    // Enable/disable debug mode
    setDebugMode(enabled) {
        this.debugMode = !!enabled;
    }

    // Get list of registered processors
    getProcessors() {
        return Array.from(this.processors.keys());
    }

    // Remove a processor
    removeProcessor(tagName) {
        return this.processors.delete(tagName);
    }
}

export const vaultTagProcessor = new VaultTagProcessor();