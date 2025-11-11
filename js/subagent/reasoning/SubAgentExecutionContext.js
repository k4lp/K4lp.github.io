/**
 * SUBAGENT EXECUTION CONTEXT
 *
 * Provides completely isolated state management for autonomous subagent reasoning.
 * Ensures zero interference with main thread state.
 *
 * KEY FEATURES:
 * - Isolated state storage (no shared references with main thread)
 * - Iteration history tracking
 * - Tool result caching
 * - Context summarization for prompts
 * - Memory-efficient pruning
 *
 * ISOLATION GUARANTEES:
 * - Separate object instances (deep clones)
 * - No access to main Storage
 * - Independent cache
 * - Isolated memory space
 */

export class SubAgentExecutionContext {
    constructor(config = {}) {
        // Identity
        this.agentId = config.agentId;
        this.query = config.query;
        this.sessionId = this._generateSessionId();

        // Isolated state
        this.iterationHistory = [];
        this.toolResults = new Map();
        this.workingMemory = {};
        this.availableTools = config.availableTools || [];

        // Limits for memory management
        this.maxHistorySize = config.maxHistorySize || 20;
        this.maxToolCacheSize = config.maxToolCacheSize || 100;

        // Metadata
        this.createdAt = new Date().toISOString();
        this.lastUpdated = this.createdAt;
    }

    /**
     * Add iteration result to history
     * @param {Object} iteration - Iteration result
     */
    addIterationResult(iteration) {
        // Deep clone to prevent external modifications
        const clonedIteration = this._deepClone(iteration);

        this.iterationHistory.push({
            ...clonedIteration,
            addedAt: new Date().toISOString()
        });

        // Cache tool results
        if (iteration.toolResults) {
            iteration.toolResults.forEach(result => {
                const cacheKey = this._getToolCacheKey(result.toolName, result.query);
                this.toolResults.set(cacheKey, {
                    ...result,
                    cachedAt: new Date().toISOString()
                });
            });
        }

        // Prune if needed
        this._pruneHistory();
        this._pruneToolCache();

        this.lastUpdated = new Date().toISOString();
    }

    /**
     * Get context summary for prompt building
     * @returns {string} Context summary
     */
    getSummary() {
        if (this.iterationHistory.length === 0) {
            return '';
        }

        const parts = [];

        // Show last N iterations
        const recentIterations = this.iterationHistory.slice(-5);

        recentIterations.forEach((iter, index) => {
            const iterNum = iter.number || (this.iterationHistory.length - recentIterations.length + index + 1);

            parts.push(`## Iteration ${iterNum}`);

            // Include thinking summary (truncated)
            if (iter.thinking) {
                const thinkingSummary = this._truncateText(iter.thinking, 500);
                parts.push(`**Reasoning:** ${thinkingSummary}`);
            }

            // Include tool results
            if (iter.toolResults && iter.toolResults.length > 0) {
                parts.push('**Tools Used:**');
                iter.toolResults.forEach(result => {
                    if (result.success) {
                        const resultSummary = this._truncateText(JSON.stringify(result.result), 200);
                        parts.push(`- ${result.toolName}: ${resultSummary}`);
                    } else {
                        parts.push(`- ${result.toolName}: ❌ ${result.error}`);
                    }
                });
            }

            parts.push('');
        });

        return parts.join('\n');
    }

    /**
     * Get detailed summary with full history
     * @returns {Object} Detailed summary
     */
    getDetailedSummary() {
        return {
            agentId: this.agentId,
            sessionId: this.sessionId,
            query: this.query,
            iterationCount: this.iterationHistory.length,
            toolResultsCount: this.toolResults.size,
            iterations: this.iterationHistory.map(iter => ({
                number: iter.number,
                timestamp: iter.addedAt,
                hadToolCalls: iter.toolCalls?.length > 0,
                toolCount: iter.toolCalls?.length || 0,
                converged: iter.converged,
                goalAchieved: iter.goalAchieved
            })),
            toolUsage: this._getToolUsageStats(),
            createdAt: this.createdAt,
            lastUpdated: this.lastUpdated
        };
    }

    /**
     * Check if tool result is cached
     * @param {string} toolName - Tool name
     * @param {string} query - Tool query
     * @returns {Object|null} Cached result or null
     */
    getCachedToolResult(toolName, query) {
        const cacheKey = this._getToolCacheKey(toolName, query);
        const cached = this.toolResults.get(cacheKey);

        if (cached) {
            console.log(`[SubAgentExecutionContext] Cache hit for ${toolName}`);
            return cached.result;
        }

        return null;
    }

    /**
     * Store data in working memory
     * @param {string} key - Memory key
     * @param {*} value - Value to store
     */
    setMemory(key, value) {
        this.workingMemory[key] = this._deepClone(value);
        this.lastUpdated = new Date().toISOString();
    }

    /**
     * Retrieve data from working memory
     * @param {string} key - Memory key
     * @returns {*} Stored value or undefined
     */
    getMemory(key) {
        return this.workingMemory[key];
    }

    /**
     * Clear all working memory
     */
    clearMemory() {
        this.workingMemory = {};
        this.lastUpdated = new Date().toISOString();
    }

    /**
     * Get all available tool names
     * @returns {Array<string>} Tool names
     */
    getAvailableToolNames() {
        return this.availableTools.map(tool => tool.name);
    }

    /**
     * Check if a tool is available
     * @param {string} toolName - Tool name
     * @returns {boolean} True if available
     */
    hasToolAvailable(toolName) {
        return this.availableTools.some(tool => tool.name === toolName);
    }

    /**
     * Reset context (useful for retries)
     */
    reset() {
        this.iterationHistory = [];
        this.toolResults.clear();
        this.workingMemory = {};
        this.lastUpdated = new Date().toISOString();
    }

    // ==========================================================================
    // PRIVATE METHODS
    // ==========================================================================

    /**
     * Generate unique session ID
     * @private
     */
    _generateSessionId() {
        return `${this.agentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Deep clone object to ensure isolation
     * @private
     */
    _deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }

        if (obj instanceof Array) {
            return obj.map(item => this._deepClone(item));
        }

        if (obj instanceof Map) {
            const clonedMap = new Map();
            obj.forEach((value, key) => {
                clonedMap.set(key, this._deepClone(value));
            });
            return clonedMap;
        }

        if (obj instanceof Set) {
            const clonedSet = new Set();
            obj.forEach(value => {
                clonedSet.add(this._deepClone(value));
            });
            return clonedSet;
        }

        // Plain object
        const clonedObj = {};
        Object.keys(obj).forEach(key => {
            clonedObj[key] = this._deepClone(obj[key]);
        });
        return clonedObj;
    }

    /**
     * Truncate text for summaries
     * @private
     */
    _truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Get tool cache key
     * @private
     */
    _getToolCacheKey(toolName, query) {
        // Simple hash for cache key
        const queryHash = this._simpleHash(query || '');
        return `${toolName}:${queryHash}`;
    }

    /**
     * Simple hash function
     * @private
     */
    _simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Prune history to stay within limits
     * @private
     */
    _pruneHistory() {
        if (this.iterationHistory.length > this.maxHistorySize) {
            const removeCount = this.iterationHistory.length - this.maxHistorySize;
            this.iterationHistory.splice(0, removeCount);
            console.log(`[SubAgentExecutionContext] Pruned ${removeCount} old iterations`);
        }
    }

    /**
     * Prune tool cache to stay within limits
     * @private
     */
    _pruneToolCache() {
        if (this.toolResults.size > this.maxToolCacheSize) {
            // Remove oldest entries (FIFO)
            const removeCount = this.toolResults.size - this.maxToolCacheSize;
            const keysToRemove = Array.from(this.toolResults.keys()).slice(0, removeCount);

            keysToRemove.forEach(key => {
                this.toolResults.delete(key);
            });

            console.log(`[SubAgentExecutionContext] Pruned ${removeCount} cached tool results`);
        }
    }

    /**
     * Get tool usage statistics
     * @private
     */
    _getToolUsageStats() {
        const stats = {};

        this.iterationHistory.forEach(iter => {
            if (iter.toolResults) {
                iter.toolResults.forEach(result => {
                    if (!stats[result.toolName]) {
                        stats[result.toolName] = {
                            calls: 0,
                            successes: 0,
                            failures: 0
                        };
                    }

                    stats[result.toolName].calls++;
                    if (result.success) {
                        stats[result.toolName].successes++;
                    } else {
                        stats[result.toolName].failures++;
                    }
                });
            }
        });

        return stats;
    }
}

export default SubAgentExecutionContext;
