/**
 * SUBAGENT TOOL REGISTRY
 *
 * Manages tool execution for autonomous subagents.
 * Provides access to all tools except attachments (as per requirements).
 *
 * AVAILABLE TOOL CATEGORIES:
 * ✅ Web search (Wikipedia, DuckDuckGo, Groq compound search)
 * ✅ Data structures (access to vault, memory, tasks, goals)
 * ✅ Code execution (JavaScript evaluation in sandbox)
 * ❌ Attachments (explicitly excluded for subagents)
 *
 * FEATURES:
 * - Tool registration and discovery
 * - Execution with context isolation
 * - Error handling and retries
 * - Result caching
 * - Usage tracking
 */

import { runTool } from '../../tools/web-tools.js';

export class SubAgentToolRegistry {
    constructor(config = {}) {
        this.tools = new Map();
        this.executionCount = new Map();
        this.errorCount = new Map();

        // Register default tools
        this._registerDefaultTools();

        // Configuration
        this.enableCache = config.enableCache !== false;
        this.maxRetries = config.maxRetries || 2;
    }

    /**
     * Execute a tool
     * @param {string} toolName - Tool name
     * @param {string} query - Tool query/input
     * @param {Object} context - Execution context
     * @returns {Promise<*>} Tool result
     */
    async executeTool(toolName, query, context) {
        // Validate tool exists
        if (!this.tools.has(toolName)) {
            throw new Error(`Unknown tool: ${toolName}. Available: ${this.getAvailableToolNames().join(', ')}`);
        }

        // Check cache first
        if (this.enableCache && context) {
            const cached = context.getCachedToolResult(toolName, query);
            if (cached !== null) {
                return cached;
            }
        }

        const tool = this.tools.get(toolName);

        // Track execution
        this.executionCount.set(toolName, (this.executionCount.get(toolName) || 0) + 1);

        // Execute with retries
        let lastError;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const result = await tool.execute(query, context);
                return result;
            } catch (error) {
                lastError = error;
                console.warn(`[SubAgentToolRegistry] ${toolName} failed (attempt ${attempt + 1}):`, error.message);

                if (attempt < this.maxRetries) {
                    await this._delay(Math.pow(2, attempt) * 1000); // Exponential backoff
                }
            }
        }

        // All retries failed
        this.errorCount.set(toolName, (this.errorCount.get(toolName) || 0) + 1);
        throw new Error(`Tool ${toolName} failed after ${this.maxRetries + 1} attempts: ${lastError.message}`);
    }

    /**
     * Register a tool
     * @param {string} name - Tool name
     * @param {Object} tool - Tool definition
     */
    registerTool(name, tool) {
        if (!tool.execute || typeof tool.execute !== 'function') {
            throw new Error(`Tool ${name} must have an execute function`);
        }

        this.tools.set(name, {
            name,
            description: tool.description || 'No description',
            category: tool.category || 'general',
            execute: tool.execute
        });

        console.log(`[SubAgentToolRegistry] Registered tool: ${name}`);
    }

    /**
     * Unregister a tool
     * @param {string} name - Tool name
     */
    unregisterTool(name) {
        this.tools.delete(name);
        console.log(`[SubAgentToolRegistry] Unregistered tool: ${name}`);
    }

    /**
     * Get all available tool names
     * @returns {Array<string>} Tool names
     */
    getAvailableToolNames() {
        return Array.from(this.tools.keys());
    }

    /**
     * Get all available tools with metadata
     * @returns {Array<Object>} Tools
     */
    getAvailableTools() {
        return Array.from(this.tools.values()).map(tool => ({
            name: tool.name,
            description: tool.description,
            category: tool.category
        }));
    }

    /**
     * Get tool by name
     * @param {string} name - Tool name
     * @returns {Object|null} Tool or null
     */
    getTool(name) {
        return this.tools.get(name) || null;
    }

    /**
     * Get execution statistics
     * @returns {Object} Statistics
     */
    getStatistics() {
        const stats = {
            totalTools: this.tools.size,
            totalExecutions: 0,
            totalErrors: 0,
            byTool: {}
        };

        this.tools.forEach((tool, name) => {
            const executions = this.executionCount.get(name) || 0;
            const errors = this.errorCount.get(name) || 0;

            stats.totalExecutions += executions;
            stats.totalErrors += errors;

            stats.byTool[name] = {
                executions,
                errors,
                successRate: executions > 0 ? ((executions - errors) / executions * 100).toFixed(2) + '%' : 'N/A'
            };
        });

        return stats;
    }

    /**
     * Reset statistics
     */
    resetStatistics() {
        this.executionCount.clear();
        this.errorCount.clear();
    }

    // ==========================================================================
    // PRIVATE METHODS
    // ==========================================================================

    /**
     * Register default tools
     * @private
     */
    _registerDefaultTools() {
        // Web Search Tools
        this.registerTool('wikipediaSearch', {
            description: 'Search Wikipedia for articles matching a query',
            category: 'web',
            execute: async (query) => {
                return await runTool('wikipediaSearch', query);
            }
        });

        this.registerTool('wikipediaSummary', {
            description: 'Get summary of a specific Wikipedia page',
            category: 'web',
            execute: async (query) => {
                return await runTool('wikipediaSummary', query);
            }
        });

        this.registerTool('duckDuckGoInstant', {
            description: 'Get instant answers from DuckDuckGo',
            category: 'web',
            execute: async (query) => {
                return await runTool('duckDuckGoInstant', query);
            }
        });

        this.registerTool('groqCompoundSearch', {
            description: 'Perform compound web search using Groq API',
            category: 'web',
            execute: async (query) => {
                return await runTool('groqCompoundSearch', query);
            }
        });

        // Data Structure Tools
        this.registerTool('readVault', {
            description: 'Read data from vault by identifier',
            category: 'data',
            execute: async (identifier, context) => {
                const { Storage } = await import('../../storage/storage.js');
                const vault = Storage.loadVault();
                const entry = vault.find(v => v.identifier === identifier);

                if (!entry) {
                    throw new Error(`Vault entry not found: ${identifier}`);
                }

                return {
                    identifier: entry.identifier,
                    type: entry.type,
                    description: entry.description,
                    content: entry.content
                };
            }
        });

        this.registerTool('listVault', {
            description: 'List all vault entries with identifiers',
            category: 'data',
            execute: async () => {
                const { Storage } = await import('../../storage/storage.js');
                const vault = Storage.loadVault();

                return vault.map(v => ({
                    identifier: v.identifier,
                    type: v.type,
                    description: v.description
                }));
            }
        });

        this.registerTool('readMemory', {
            description: 'Read memory entries',
            category: 'data',
            execute: async () => {
                const { Storage } = await import('../../storage/storage.js');
                return Storage.loadMemory();
            }
        });

        this.registerTool('readTasks', {
            description: 'Read current tasks',
            category: 'data',
            execute: async () => {
                const { Storage } = await import('../../storage/storage.js');
                return Storage.loadTasks();
            }
        });

        this.registerTool('readGoals', {
            description: 'Read current goals',
            category: 'data',
            execute: async () => {
                const { Storage } = await import('../../storage/storage.js');
                return Storage.loadGoals();
            }
        });

        // Code Execution Tool (sandboxed)
        this.registerTool('executeCode', {
            description: 'Execute JavaScript code in a sandbox (use for calculations, transformations, analysis)',
            category: 'execution',
            execute: async (code, context) => {
                try {
                    // Create isolated sandbox
                    const sandbox = {
                        console: {
                            log: (...args) => args.join(' ')
                        },
                        Math,
                        Date,
                        JSON,
                        Array,
                        Object,
                        String,
                        Number,
                        Boolean
                    };

                    // Execute in sandbox
                    const func = new Function(...Object.keys(sandbox), `"use strict"; return (${code})`);
                    const result = func(...Object.values(sandbox));

                    return {
                        success: true,
                        result: result
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message
                    };
                }
            }
        });

        console.log('[SubAgentToolRegistry] Registered default tools');
    }

    /**
     * Delay helper for retries
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default SubAgentToolRegistry;
