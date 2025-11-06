/**
 * ErrorContextCleaner
 *
 * Removes error traces from context before retry to prevent context pollution.
 * Pluggable cleaning strategies per error type.
 *
 * Features:
 * - Error-specific cleaning strategies
 * - Storage cleanup (execution log, reasoning log)
 * - API tracker cleanup
 * - Valid entity collection
 * - Context snapshot restoration
 */

class ErrorContextCleaner {
  constructor() {
    this.cleaningStrategies = new Map();
    this._initializeStrategies();
  }

  /**
   * Clean context based on error classification
   * @param {Object} errorClassification - Error classification from ErrorClassifier
   * @param {Object} context - Execution context
   * @returns {Object} Cleaned context with metadata
   */
  clean(errorClassification, context = {}) {
    const errorType = errorClassification.type || 'UNKNOWN_ERROR';

    // Get cleaning strategy
    const strategy = this.cleaningStrategies.get(errorType) ||
                     this.cleaningStrategies.get('DEFAULT');

    // Execute cleaning
    const cleanedContext = strategy.clean(context, errorClassification);

    return {
      ...cleanedContext,
      cleaned: true,
      cleanedAt: new Date().toISOString(),
      errorType
    };
  }

  /**
   * Register custom cleaning strategy
   * @param {string} errorType - Error type
   * @param {Function} cleanFn - Cleaning function
   */
  registerStrategy(errorType, cleanFn) {
    this.cleaningStrategies.set(errorType, {
      clean: cleanFn
    });
  }

  /**
   * Initialize default cleaning strategies
   * @private
   */
  _initializeStrategies() {
    // Strategy: Undefined Reference
    this.registerStrategy('UNDEFINED_REFERENCE', (context, classification) => {
      // Clear API access tracker failed accesses
      if (typeof window !== 'undefined' && window.ApiAccessTracker) {
        const failedAccesses = window.ApiAccessTracker.getFailedAccesses();

        if (failedAccesses.length > 0) {
          // Remove failed executions from execution log
          if (typeof Storage !== 'undefined') {
            const executionLog = Storage.getExecutionLog();
            const cleanedLog = executionLog.filter(entry =>
              !this._hasReferenceErrors(entry)
            );
            Storage.saveExecutionLog(cleanedLog);
          }

          // Clear tracker
          window.ApiAccessTracker.clearFailedAccesses();
        }
      }

      return {
        ...context,
        cleaningType: 'undefined_reference',
        message: 'Cleared undefined reference error traces'
      };
    });

    // Strategy: Entity Not Found
    this.registerStrategy('ENTITY_NOT_FOUND', (context, classification) => {
      // Clear API tracker
      if (typeof window !== 'undefined' && window.ApiAccessTracker) {
        window.ApiAccessTracker.clearFailedAccesses();

        // Remove failed execution from log
        if (typeof Storage !== 'undefined') {
          const executionLog = Storage.getExecutionLog();
          const cleanedLog = executionLog.filter(entry =>
            !this._hasReferenceErrors(entry)
          );
          Storage.saveExecutionLog(cleanedLog);
        }
      }

      // Collect valid entity IDs
      const validEntities = this._collectValidEntities();

      return {
        ...context,
        cleaningType: 'entity_not_found',
        validEntities,
        message: 'Cleared entity not found errors and collected valid entities'
      };
    });

    // Strategy: Timeout
    this.registerStrategy('TIMEOUT', (context, classification) => {
      // Remove last execution from log
      if (typeof Storage !== 'undefined') {
        const executionLog = Storage.getExecutionLog();
        if (executionLog.length > 0) {
          executionLog.pop();
          Storage.saveExecutionLog(executionLog);
        }
      }

      return {
        ...context,
        cleaningType: 'timeout',
        suggestion: 'Increase timeout or optimize code',
        message: 'Removed timed out execution from log'
      };
    });

    // Strategy: Network Error
    this.registerStrategy('NETWORK_ERROR', (context, classification) => {
      // Minimal cleaning for network errors
      return {
        ...context,
        cleaningType: 'network_error',
        message: 'Network error - minimal cleaning'
      };
    });

    // Strategy: Syntax Error (no cleaning needed)
    this.registerStrategy('SYNTAX_ERROR', (context, classification) => {
      // Syntax errors don't need context cleaning
      return {
        ...context,
        cleaningType: 'syntax_error',
        message: 'Syntax error - no context cleaning needed'
      };
    });

    // Strategy: Type Error (no cleaning needed)
    this.registerStrategy('TYPE_ERROR', (context, classification) => {
      return {
        ...context,
        cleaningType: 'type_error',
        message: 'Type error - no context cleaning needed'
      };
    });

    // Default Strategy
    this.registerStrategy('DEFAULT', (context, classification) => {
      return {
        ...context,
        cleaningType: 'default',
        message: 'Default cleaning applied'
      };
    });
  }

  /**
   * Check if execution entry has reference errors
   * @private
   */
  _hasReferenceErrors(executionEntry) {
    if (!executionEntry.error) return false;

    return executionEntry.error.name === 'ReferenceError' ||
           /not found|does not exist|is not defined/.test(executionEntry.error.message || '');
  }

  /**
   * Collect valid entity IDs from storage
   * @private
   */
  _collectValidEntities() {
    if (typeof Storage === 'undefined') {
      return {
        vault: [],
        memory: [],
        tasks: [],
        goals: []
      };
    }

    return {
      vault: (Storage.getVault() || []).map(e => e.id),
      memory: (Storage.getMemory() || []).map(e => e.key),
      tasks: (Storage.getTasks() || []).map(e => e.id),
      goals: (Storage.getGoals() || []).map(e => e.id)
    };
  }

  /**
   * Clean reasoning log (remove failed reasoning steps)
   */
  cleanReasoningLog() {
    if (typeof Storage === 'undefined') return;

    const reasoningLog = Storage.getReasoningLog();

    // Keep only successful reasoning steps
    const cleanedLog = reasoningLog.filter(entry =>
      !this._hasErrors(entry)
    );

    Storage.saveReasoningLog(cleanedLog);
  }

  /**
   * Check if reasoning entry has errors
   * @private
   */
  _hasErrors(reasoningEntry) {
    return reasoningEntry.operationsSummary?.errors?.length > 0;
  }

  /**
   * Clean specific execution from log
   * @param {string} executionId - Execution ID to remove
   */
  cleanExecution(executionId) {
    if (typeof Storage === 'undefined') return;

    const executionLog = Storage.getExecutionLog();
    const cleanedLog = executionLog.filter(e => e.id !== executionId);
    Storage.saveExecutionLog(cleanedLog);
  }

  /**
   * Get cleaning statistics
   * @returns {Object} Cleaning stats
   */
  getStats() {
    const stats = {
      strategiesRegistered: this.cleaningStrategies.size,
      strategies: Array.from(this.cleaningStrategies.keys())
    };

    return stats;
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.ErrorContextCleaner = ErrorContextCleaner;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorContextCleaner;
}
