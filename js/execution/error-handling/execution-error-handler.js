/**
 * ExecutionErrorHandler
 *
 * Centralized error handling for execution system.
 * Coordinates error classification, context cleaning, and recovery decisions.
 *
 * Features:
 * - Error classification via ErrorClassifier
 * - Context cleaning via ErrorContextCleaner
 * - Retry decision logic
 * - Pluggable error handlers per error type
 * - Recovery strategy recommendations
 */

class ExecutionErrorHandler {
  constructor() {
    this.errorClassifier = new ErrorClassifier();
    this.contextCleaner = new ErrorContextCleaner();
    this.retryManager = new RetryStrategyManager();
    this.errorHandlers = new Map();

    this._initializeHandlers();
  }

  /**
   * Handle execution error
   * @param {Error} error - Error that occurred
   * @param {Object} executionContext - Execution context
   * @returns {Promise<Object>} Handler result with recommendations
   */
  async handle(error, executionContext = {}) {
    // Classify error
    const classification = this.errorClassifier.classify(error);

    // Get handler for error type
    const handler = this.errorHandlers.get(classification.type) ||
                    this.errorHandlers.get('DEFAULT');

    // Execute handler
    const handlerResult = await handler.handle(error, classification, executionContext);

    // Emit event
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('EXECUTION_ERROR_HANDLED', {
        error,
        classification,
        handlerResult
      });
    }

    return {
      classification,
      handlerResult,
      shouldRetry: handlerResult.shouldRetry || false,
      shouldNotifyReasoning: classification.requiresReasoning || false
    };
  }

  /**
   * Initialize default error handlers
   * @private
   */
  _initializeHandlers() {
    // Syntax Error Handler
    this.registerHandler('SYNTAX_ERROR', {
      handle: async (error, classification, context) => {
        // Syntax errors cannot be retried - need reasoning fix
        return {
          shouldRetry: false,
          requiresReasoningFix: true,
          severity: 'high',
          message: 'Code has syntax errors and needs to be rewritten',
          details: {
            error: error.message,
            suggestion: 'Ask reasoning chain to fix syntax'
          }
        };
      }
    });

    // Undefined Reference Handler
    this.registerHandler('UNDEFINED_REFERENCE', {
      handle: async (error, classification, context) => {
        // Clean context
        const cleanedContext = this.contextCleaner.clean(classification, context);

        return {
          shouldRetry: true,
          maxRetries: 1,
          cleanedContext,
          requiresReasoningFix: true,
          severity: 'medium',
          message: 'Reference error - cleaned context for retry',
          details: {
            error: error.message
          }
        };
      }
    });

    // Entity Not Found Handler
    this.registerHandler('ENTITY_NOT_FOUND', {
      handle: async (error, classification, context) => {
        // Clean context and provide valid entities
        const cleanedContext = this.contextCleaner.clean(classification, context);

        return {
          shouldRetry: true,
          maxRetries: 1,
          cleanedContext,
          requiresReasoningFix: true,
          severity: 'medium',
          message: 'Entity not found - provide valid entities for reasoning',
          details: {
            error: error.message,
            validEntities: cleanedContext.validEntities
          }
        };
      }
    });

    // Type Error Handler
    this.registerHandler('TYPE_ERROR', {
      handle: async (error, classification, context) => {
        return {
          shouldRetry: false,
          requiresReasoningFix: true,
          severity: 'medium',
          message: 'Type error - reasoning fix needed',
          details: {
            error: error.message
          }
        };
      }
    });

    // Timeout Handler
    this.registerHandler('TIMEOUT', {
      handle: async (error, classification, context) => {
        // Clean context
        const cleanedContext = this.contextCleaner.clean(classification, context);

        return {
          shouldRetry: true,
          maxRetries: 1,
          cleanedContext,
          requiresOptimization: true,
          severity: 'medium',
          message: 'Execution timed out - consider optimization',
          details: {
            error: error.message,
            suggestion: 'Increase timeout or optimize code'
          }
        };
      }
    });

    // Network Error Handler
    this.registerHandler('NETWORK_ERROR', {
      handle: async (error, classification, context) => {
        return {
          shouldRetry: true,
          maxRetries: 3,
          requiresReasoningFix: false,
          severity: 'low',
          message: 'Network error - will retry',
          details: {
            error: error.message
          }
        };
      }
    });

    // Default Handler
    this.registerHandler('DEFAULT', {
      handle: async (error, classification, context) => {
        return {
          shouldRetry: false,
          requiresReasoningFix: true,
          severity: 'high',
          message: 'Unhandled error type',
          details: {
            error: error.message,
            type: error.name
          }
        };
      }
    });
  }

  /**
   * Register custom error handler
   * @param {string} errorType - Error type
   * @param {Object} handler - Handler object with handle method
   */
  registerHandler(errorType, handler) {
    this.errorHandlers.set(errorType, handler);
  }

  /**
   * Remove error handler
   * @param {string} errorType - Error type
   */
  removeHandler(errorType) {
    this.errorHandlers.delete(errorType);
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} Whether error is retryable
   */
  isRetryable(error) {
    const classification = this.errorClassifier.classify(error);
    return classification.retryable || false;
  }

  /**
   * Get recovery recommendation
   * @param {Error} error - Error object
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Recovery recommendation
   */
  async getRecoveryRecommendation(error, context) {
    const result = await this.handle(error, context);

    return {
      shouldRetry: result.shouldRetry,
      shouldCleanContext: result.handlerResult.cleanedContext !== undefined,
      shouldNotifyReasoning: result.shouldNotifyReasoning,
      maxRetries: result.handlerResult.maxRetries || 0,
      severity: result.handlerResult.severity,
      message: result.handlerResult.message,
      details: result.handlerResult.details
    };
  }

  /**
   * Get registered handler types
   * @returns {Array} Handler type names
   */
  getHandlerTypes() {
    return Array.from(this.errorHandlers.keys());
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.ExecutionErrorHandler = ExecutionErrorHandler;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExecutionErrorHandler;
}
