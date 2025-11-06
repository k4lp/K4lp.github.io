/**
 * ExecutionContextManager
 *
 * Manages execution contexts with snapshot/restore capabilities.
 * Provides isolated contexts with API injection and rollback support.
 *
 * Features:
 * - Context creation with API injection
 * - Snapshot creation for rollback
 * - Context restoration after errors
 * - Context cleaning
 * - Lifecycle management
 */

class ExecutionContextManager {
  constructor() {
    this.contexts = new Map();
    this.contextSnapshots = new Map();
  }

  /**
   * Create new execution context
   * @param {string} executionId - Execution ID
   * @param {Object} options - Context options
   * @returns {Object} Execution context
   */
  createContext(executionId, options = {}) {
    const context = {
      id: executionId,
      apis: this.buildApis(options),
      globals: this.buildGlobals(options),
      restrictions: options.restrictions || {},
      createdAt: new Date().toISOString(),
      snapshot: this.createSnapshot()
    };

    this.contexts.set(executionId, context);
    return context;
  }

  /**
   * Get existing context or create new one
   * @param {string} executionId - Execution ID
   * @param {Object} options - Context options
   * @returns {Object} Execution context
   */
  getContext(executionId, options) {
    if (this.contexts.has(executionId)) {
      return this.contexts.get(executionId);
    }
    return this.createContext(executionId, options);
  }

  /**
   * Create snapshot of current storage state
   * Used for restoring state after failed executions
   * @returns {Object} State snapshot
   */
  createSnapshot() {
    if (typeof Storage === 'undefined') {
      return null;
    }

    return {
      vault: this._deepClone(Storage.loadVault()),
      memory: this._deepClone(Storage.loadMemory()),
      tasks: this._deepClone(Storage.loadTasks()),
      goals: this._deepClone(Storage.loadGoals()),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Restore context to previous snapshot
   * Used when retrying after error
   * @param {string} executionId - Execution ID
   * @returns {boolean} Success status
   */
  restoreSnapshot(executionId) {
    const context = this.contexts.get(executionId);
    if (!context || !context.snapshot || typeof Storage === 'undefined') {
      return false;
    }

    Storage.saveVault(context.snapshot.vault);
    Storage.saveMemory(context.snapshot.memory);
    Storage.saveTasks(context.snapshot.tasks);
    Storage.saveGoals(context.snapshot.goals);

    return true;
  }

  /**
   * Clean context - remove error traces
   * @param {string} executionId - Execution ID
   * @param {Error} error - Error that occurred
   */
  cleanContext(executionId, error) {
    const context = this.contexts.get(executionId);
    if (!context) return;

    // Remove failed entity access logs
    if (error && error.name === 'ReferenceError') {
      if (typeof window !== 'undefined' && window.ApiAccessTracker) {
        window.ApiAccessTracker.clearFailedAccesses?.();
      }
    }

    // Don't add error to execution log during retry
    // (will be handled separately by error recovery)
  }

  /**
   * Dispose context after execution
   * @param {string} executionId - Execution ID
   */
  disposeContext(executionId) {
    this.contexts.delete(executionId);
    this.contextSnapshots.delete(executionId);
  }

  /**
   * Build execution APIs
   * @param {Object} options - API options
   * @returns {Object} API objects
   */
  buildApis(options) {
    // Delegate to existing execution-context-api.js if available
    if (typeof buildExecutionContext !== 'undefined') {
      return buildExecutionContext();
    }

    // Fallback: Create basic APIs
    return this._buildBasicApis();
  }

  /**
   * Build basic APIs (fallback)
   * @private
   */
  _buildBasicApis() {
    const apis = {};

    // Vault API
    if (typeof VaultAPI !== 'undefined') {
      apis.vault = new VaultAPI();
    }

    // Memory API
    if (typeof MemoryAPI !== 'undefined') {
      apis.memory = new MemoryAPI();
    }

    // Tasks API
    if (typeof TasksAPI !== 'undefined') {
      apis.tasks = new TasksAPI();
    }

    // Goals API
    if (typeof GoalsAPI !== 'undefined') {
      apis.goals = new GoalsAPI();
    }

    // Utils
    apis.utils = {
      generateId: (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      now: () => new Date().toISOString(),
      sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
    };

    return apis;
  }

  /**
   * Build global objects
   * @param {Object} options - Global options
   * @returns {Object} Global objects
   */
  buildGlobals(options) {
    return {
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
      console,
      Promise,
      Date,
      Math,
      JSON,
      ...options.additionalGlobals
    };
  }

  /**
   * Deep clone object
   * @private
   */
  _deepClone(obj) {
    if (!obj) return obj;

    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      console.error('Error cloning object:', error);
      return obj;
    }
  }

  /**
   * Get all active contexts
   * @returns {Array} Active context IDs
   */
  getActiveContexts() {
    return Array.from(this.contexts.keys());
  }

  /**
   * Clear all contexts
   */
  clearAll() {
    this.contexts.clear();
    this.contextSnapshots.clear();
  }

  /**
   * Get context count
   * @returns {number} Number of active contexts
   */
  getContextCount() {
    return this.contexts.size;
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.ExecutionContextManager = ExecutionContextManager;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExecutionContextManager;
}
