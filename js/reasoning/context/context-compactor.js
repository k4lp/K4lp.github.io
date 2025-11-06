/**
 * ContextCompactor
 *
 * Compresses and optimizes reasoning context to prevent unbounded growth.
 * Pluggable compaction strategies for different context elements.
 *
 * Features:
 * - Reasoning log compaction
 * - Execution log compaction
 * - Memory compaction
 * - Configurable limits
 * - Summarization strategies
 */

export class ContextCompactor {
  constructor(config = {}) {
    this.config = {
      maxReasoningSteps: config.maxReasoningSteps || 5,
      maxExecutionLogs: config.maxExecutionLogs || 3,
      maxMemoryEntries: config.maxMemoryEntries || 10,
      summarizeOldSteps: config.summarizeOldSteps !== false,
      preserveImportant: config.preserveImportant !== false,
      ...config
    };

    this.compactionStrategies = new Map();
    this._initializeDefaultStrategies();
  }

  /**
   * Compact context
   * @param {Object} context - Context to compact
   * @returns {Promise<Object>} Compacted context
   */
  async compact(context) {
    if (!context) return context;

    const compacted = { ...context };

    // Apply compaction strategies
    for (const [key, strategy] of this.compactionStrategies) {
      if (strategy.enabled && compacted[key]) {
        try {
          compacted[key] = await strategy.compact(compacted[key], this.config);
        } catch (error) {
          console.error(`Error in compaction strategy ${key}:`, error);
        }
      }
    }

    return compacted;
  }

  /**
   * Register custom compaction strategy
   * @param {string} name - Strategy name
   * @param {Function} compactFn - Compaction function
   * @param {Object} options - Strategy options
   */
  registerStrategy(name, compactFn, options = {}) {
    this.compactionStrategies.set(name, {
      compact: compactFn,
      enabled: options.enabled !== false
    });
  }

  /**
   * Remove strategy
   * @param {string} name - Strategy name
   */
  removeStrategy(name) {
    this.compactionStrategies.delete(name);
  }

  /**
   * Enable strategy
   * @param {string} name - Strategy name
   */
  enableStrategy(name) {
    const strategy = this.compactionStrategies.get(name);
    if (strategy) {
      strategy.enabled = true;
    }
  }

  /**
   * Disable strategy
   * @param {string} name - Strategy name
   */
  disableStrategy(name) {
    const strategy = this.compactionStrategies.get(name);
    if (strategy) {
      strategy.enabled = false;
    }
  }

  /**
   * Initialize default compaction strategies
   * @private
   */
  _initializeDefaultStrategies() {
    // Reasoning log compaction
    this.registerStrategy('reasoningLog', async (reasoningLog, config) => {
      if (!Array.isArray(reasoningLog)) return reasoningLog;

      if (reasoningLog.length <= config.maxReasoningSteps) {
        return reasoningLog;
      }

      const recentSteps = reasoningLog.slice(-config.maxReasoningSteps);

      if (!config.summarizeOldSteps) {
        return recentSteps;
      }

      // Create summary of old steps
      const oldSteps = reasoningLog.slice(0, -config.maxReasoningSteps);
      if (oldSteps.length === 0) {
        return recentSteps;
      }

      const summary = {
        type: 'summary',
        content: `[Summarized ${oldSteps.length} earlier reasoning steps]`,
        operations: this._summarizeOperations(oldSteps),
        timestamp: oldSteps[0].timestamp
      };

      return [summary, ...recentSteps];
    });

    // Execution log compaction
    this.registerStrategy('executionLog', async (executionLog, config) => {
      if (!Array.isArray(executionLog)) return executionLog;

      if (executionLog.length <= config.maxExecutionLogs) {
        return executionLog;
      }

      return executionLog.slice(-config.maxExecutionLogs);
    });

    // Memory compaction
    this.registerStrategy('memory', async (memory, config) => {
      if (!Array.isArray(memory)) return memory;

      if (memory.length <= config.maxMemoryEntries) {
        return memory;
      }

      if (!config.preserveImportant) {
        return memory.slice(-config.maxMemoryEntries);
      }

      // Keep important memories + recent ones
      const important = memory.filter(m => m.important);
      const regular = memory.filter(m => !m.important);
      const regularToKeep = Math.max(0, config.maxMemoryEntries - important.length);

      return [
        ...important,
        ...regular.slice(-regularToKeep)
      ];
    });

    // Vault summary (don't compact, just summarize)
    this.registerStrategy('vault', async (vault, config) => {
      if (!Array.isArray(vault)) return vault;

      // Don't remove vault entries, just provide summary metadata
      return vault.map(entry => ({
        ...entry,
        __compacted: false
      }));
    });
  }

  /**
   * Summarize operations from multiple reasoning steps
   * @private
   */
  _summarizeOperations(steps) {
    const summary = {
      totalSteps: steps.length,
      operations: {
        vault: 0,
        memory: 0,
        tasks: 0,
        goals: 0,
        executions: 0
      },
      errors: 0
    };

    steps.forEach(step => {
      if (step.operationsSummary) {
        const ops = step.operationsSummary;
        summary.operations.vault += ops.vault || 0;
        summary.operations.memory += ops.memory || 0;
        summary.operations.tasks += ops.tasks || 0;
        summary.operations.goals += ops.goals || 0;
        summary.operations.executions += ops.executions || 0;
        summary.errors += ops.errors?.length || 0;
      }
    });

    return summary;
  }

  /**
   * Update configuration
   * @param {Object} updates - Config updates
   */
  updateConfig(updates) {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get configuration
   * @returns {Object} Current config
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Get compaction statistics
   * @param {Object} before - Context before compaction
   * @param {Object} after - Context after compaction
   * @returns {Object} Compaction stats
   */
  getStats(before, after) {
    return {
      reasoningLog: {
        before: before.reasoningLog?.length || 0,
        after: after.reasoningLog?.length || 0,
        reduction: this._calculateReduction(
          before.reasoningLog?.length,
          after.reasoningLog?.length
        )
      },
      executionLog: {
        before: before.executionLog?.length || 0,
        after: after.executionLog?.length || 0,
        reduction: this._calculateReduction(
          before.executionLog?.length,
          after.executionLog?.length
        )
      },
      memory: {
        before: before.memory?.length || 0,
        after: after.memory?.length || 0,
        reduction: this._calculateReduction(
          before.memory?.length,
          after.memory?.length
        )
      }
    };
  }

  /**
   * Calculate reduction percentage
   * @private
   */
  _calculateReduction(before, after) {
    if (!before || before === 0) return 0;
    return Math.round(((before - after) / before) * 100);
  }
}

if (typeof window !== 'undefined') {
  window.ContextCompactor = ContextCompactor;
}
