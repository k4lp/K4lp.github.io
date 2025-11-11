/**
 * PARALLEL TOOL EXECUTOR
 *
 * Executes multiple tools in parallel instead of sequentially.
 * Dramatically reduces subagent execution time.
 *
 * BEFORE (sequential in sub-agent-orchestrator.js:159-198):
 * ```javascript
 * for (const toolName of tools) {
 *   const data = await runTool(toolName, query); // One at a time!
 *   outputs.push(entry);
 * }
 * ```
 * Time: N tools × avg tool time (e.g., 3 tools × 2s = 6s)
 *
 * AFTER (parallel):
 * ```javascript
 * const results = await ParallelExecutor.executeAll(tools, query);
 * ```
 * Time: max(tool times) (e.g., max(2s, 1.5s, 1.8s) = 2s)
 *
 * SPEEDUP: Up to N× faster (where N = number of tools)
 *
 * FEATURES:
 * - Parallel execution with Promise.allSettled
 * - Error isolation (one failure doesn't stop others)
 * - Timeout protection
 * - Resource pooling
 * - Performance metrics
 */

import { runTool } from './web-tools.js';
import { nowISO } from '../../core/utils.js';

export class ParallelToolExecutor {
    constructor(config = {}) {
        this.maxConcurrent = config.maxConcurrent || 10;
        this.defaultTimeout = config.defaultTimeout || 30000; // 30s
        this.retryCount = config.retryCount || 1;

        // Performance tracking
        this.metrics = {
            totalExecutions: 0,
            parallelExecutions: 0,
            totalTimeSaved: 0,
            averageSpeedup: 0
        };
    }

    /**
     * Execute multiple tools in parallel
     * @param {Array<string>} toolNames - Tool names to execute
     * @param {string} query - Query for all tools
     * @param {Object} options - Execution options
     * @returns {Promise<Array>} Results array
     */
    async executeAll(toolNames, query, options = {}) {
        if (!Array.isArray(toolNames) || toolNames.length === 0) {
            return [];
        }

        const startTime = Date.now();

        // Build execution promises
        const executions = toolNames.map((toolName, index) =>
            this._executeWithRetry(toolName, query, options, index)
        );

        // Execute all in parallel
        const results = await Promise.allSettled(executions);

        // Process results
        const outputs = results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                // Handle rejection
                return {
                    id: toolNames[index],
                    name: toolNames[index],
                    error: result.reason?.message || 'Tool execution failed',
                    retrievedAt: nowISO()
                };
            }
        });

        // Calculate metrics
        const totalTime = Date.now() - startTime;
        const sequentialTime = this._estimateSequentialTime(outputs);
        const timeSaved = sequentialTime - totalTime;

        this.metrics.totalExecutions += toolNames.length;
        this.metrics.parallelExecutions++;
        this.metrics.totalTimeSaved += timeSaved;
        this.metrics.averageSpeedup = this.metrics.totalTimeSaved / this.metrics.parallelExecutions;

        console.log(`[ParallelExecutor] Executed ${toolNames.length} tools in ${totalTime}ms (estimated sequential: ${sequentialTime}ms, saved: ${timeSaved}ms)`);

        return outputs;
    }

    /**
     * Execute tools in batches (for large numbers of tools)
     * @param {Array<string>} toolNames - Tool names
     * @param {string} query - Query
     * @param {Object} options - Options
     * @returns {Promise<Array>} Results
     */
    async executeBatched(toolNames, query, options = {}) {
        if (!Array.isArray(toolNames) || toolNames.length === 0) {
            return [];
        }

        const batches = this._createBatches(toolNames, this.maxConcurrent);
        const allResults = [];

        for (const batch of batches) {
            const batchResults = await this.executeAll(batch, query, options);
            allResults.push(...batchResults);
        }

        return allResults;
    }

    /**
     * Execute with progress callback
     * @param {Array<string>} toolNames - Tool names
     * @param {string} query - Query
     * @param {Object} options - Options
     * @param {Function} onProgress - Progress callback (completed, total)
     * @returns {Promise<Array>} Results
     */
    async executeWithProgress(toolNames, query, options = {}, onProgress) {
        if (!Array.isArray(toolNames) || toolNames.length === 0) {
            return [];
        }

        const total = toolNames.length;
        let completed = 0;

        // Wrap each execution with progress tracking
        const executions = toolNames.map(async (toolName, index) => {
            try {
                const result = await this._executeWithRetry(toolName, query, options, index);
                completed++;
                if (onProgress) {
                    onProgress(completed, total);
                }
                return result;
            } catch (error) {
                completed++;
                if (onProgress) {
                    onProgress(completed, total);
                }
                throw error;
            }
        });

        const results = await Promise.allSettled(executions);

        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                return {
                    id: toolNames[index],
                    name: toolNames[index],
                    error: result.reason?.message || 'Execution failed',
                    retrievedAt: nowISO()
                };
            }
        });
    }

    /**
     * Get performance metrics
     * @returns {Object} Metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            averageSpeedupPercent: this.metrics.averageSpeedup > 0
                ? `${((this.metrics.averageSpeedup / this.metrics.totalExecutions) * 100).toFixed(1)}%`
                : '0%'
        };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            totalExecutions: 0,
            parallelExecutions: 0,
            totalTimeSaved: 0,
            averageSpeedup: 0
        };
    }

    // ==========================================================================
    // PRIVATE METHODS
    // ==========================================================================

    /**
     * Execute single tool with retry
     * @private
     */
    async _executeWithRetry(toolName, query, options, index) {
        let lastError;

        for (let attempt = 0; attempt <= this.retryCount; attempt++) {
            try {
                const startTime = Date.now();

                // Execute with timeout
                const result = await this._executeWithTimeout(
                    toolName,
                    query,
                    options,
                    this.defaultTimeout
                );

                const duration = Date.now() - startTime;

                return {
                    id: toolName,
                    name: options.toolLabels?.[toolName] || toolName,
                    retrievedAt: nowISO(),
                    duration,
                    items: this._normalizeToolItems(toolName, result, options),
                    index
                };

            } catch (error) {
                lastError = error;

                if (attempt < this.retryCount) {
                    console.warn(`[ParallelExecutor] ${toolName} failed (attempt ${attempt + 1}), retrying...`);
                    await this._delay(Math.pow(2, attempt) * 1000); // Exponential backoff
                }
            }
        }

        // All retries failed
        throw new Error(`${toolName} failed after ${this.retryCount + 1} attempts: ${lastError.message}`);
    }

    /**
     * Execute with timeout
     * @private
     */
    async _executeWithTimeout(toolName, query, options, timeout) {
        return Promise.race([
            runTool(toolName, query, options),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), timeout)
            )
        ]);
    }

    /**
     * Normalize tool items
     * @private
     */
    _normalizeToolItems(toolName, data, options) {
        const limit = options.limit || 5;

        const rawItems = Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data)
                ? data
                : data
                    ? [data]
                    : [];

        return rawItems
            .filter(Boolean)
            .slice(0, limit)
            .map((item, index) => ({
                title: item.title || item.heading || `Result ${index + 1}`,
                summary: item.summary || item.snippet || item.extract || item.description || '',
                url: item.url || item.link || item.FirstURL || '',
                source: item.source || toolName,
                retrievedAt: item.retrievedAt || nowISO()
            }));
    }

    /**
     * Create batches for large tool lists
     * @private
     */
    _createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Estimate sequential execution time
     * @private
     */
    _estimateSequentialTime(results) {
        return results.reduce((total, result) => {
            return total + (result.duration || 2000); // Default 2s per tool
        }, 0);
    }

    /**
     * Delay helper
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const parallelExecutor = new ParallelToolExecutor();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Execute tools in parallel (convenience function)
 * @param {Array<string>} toolNames - Tool names
 * @param {string} query - Query
 * @param {Object} options - Options
 * @returns {Promise<Array>} Results
 */
export async function executeToolsParallel(toolNames, query, options = {}) {
    return parallelExecutor.executeAll(toolNames, query, options);
}

/**
 * Execute tools with progress callback
 * @param {Array<string>} toolNames - Tool names
 * @param {string} query - Query
 * @param {Object} options - Options
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Array>} Results
 */
export async function executeToolsWithProgress(toolNames, query, options = {}, onProgress) {
    return parallelExecutor.executeWithProgress(toolNames, query, options, onProgress);
}

export default ParallelToolExecutor;
