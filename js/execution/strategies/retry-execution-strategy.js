import { ExecutionStrategyBase } from './execution-strategy-base.js';
import { RetryStrategyManager } from '../error-handling/retry-strategy-manager.js';
import { ErrorClassifier } from '../error-handling/error-classifier.js';
import { ExecutionContextManager } from '../context/execution-context-manager.js';
import { eventBus } from '../../core/event-bus.js';

/**
 * RetryExecutionStrategy
 *
 * Multi-attempt execution with intelligent retry logic.
 * Integrates context cleaning, error classification, and exponential backoff.
 */
export class RetryExecutionStrategy extends ExecutionStrategyBase {
  constructor(config = {}) {
    super({
      maxAttempts: config.maxAttempts || 3,
      enableRetry: true,
      cleanContext: true,
      baseDelay: config.baseDelay || 1000,
      backoffMultiplier: config.backoffMultiplier || 2,
      maxDelay: config.maxDelay || 10000,
      jitter: config.jitter !== false,
      retryableErrors: config.retryableErrors || ['ReferenceError', 'TimeoutError'],
      ...config
    });

    // Initialize retry manager
    this.retryManager = new RetryStrategyManager({
      maxAttempts: this.config.maxAttempts,
      baseDelayMs: this.config.baseDelay,
      maxDelayMs: this.config.maxDelay,
      backoffMultiplier: this.config.backoffMultiplier,
      jitter: this.config.jitter
    });

    // Initialize error classifier
    this.errorClassifier = new ErrorClassifier();

    // Initialize context manager
    this.contextManager = new ExecutionContextManager();
  }

  /**
   * Execute with retry logic
   * @param {Object} request - Execution request
   * @param {Object} runner - Execution runner
   * @returns {Promise<Object>} Execution result
   */
  async execute(request, runner) {
    // Validate request
    this.validateRequest(request);

    const executionId = request.id || `exec-${Date.now()}`;
    let lastError = null;

    // Create context with snapshot for rollback
    const context = this.contextManager.createContext(executionId, {
      ...request.contextOptions
    });

    // Retry logic
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        // Enrich request
        const enrichedRequest = this.enrichRequest(request, attempt);
        enrichedRequest.id = executionId;

        // Run before-execution hook
        const modifiedRequest = await this.beforeExecution(enrichedRequest);

        // Execute code
        const result = await runner.run(modifiedRequest);

        // Check if execution succeeded
        if (result.success) {
          // Run after-execution hook
          const finalResult = await this.afterExecution(result);

          // Dispose context
          this.contextManager.disposeContext(executionId);

          return this.enrichResult(finalResult, {
            attemptCount: attempt,
            retried: attempt > 1,
            maxAttempts: this.config.maxAttempts
          });
        }

        // Execution failed - classify error
        lastError = result.error;
        const classification = this.errorClassifier.classify(lastError);

        // Check if should retry
        if (!this._shouldRetry(classification, attempt)) {
          // No retry - dispose context and return
          this.contextManager.disposeContext(executionId);

          return this.enrichResult(result, {
            attemptCount: attempt,
            retried: attempt > 1,
            maxAttempts: this.config.maxAttempts,
            classification
          });
        }

        // Clean context before retry
        if (classification.cleanContext) {
          await this.cleanExecutionContext(enrichedRequest, lastError, context);
        }

        // Run error hook
        await this.onError(lastError, enrichedRequest);

        // Emit retry event
        eventBus.emit?.('EXECUTION_RETRY_ATTEMPT', {
          executionId,
          attempt,
          maxAttempts: this.config.maxAttempts,
          error: lastError
        });

        // Wait before retry (except on last attempt)
        if (attempt < this.config.maxAttempts) {
          await this.retryManager.delay(attempt);
        }

      } catch (error) {
        lastError = error;

        // Classify error
        const classification = this.errorClassifier.classify(error);

        // Check if should retry
        if (!this._shouldRetry(classification, attempt)) {
          // Dispose context
          this.contextManager.disposeContext(executionId);

          throw error;
        }

        // Clean context
        if (classification.cleanContext) {
          await this.cleanExecutionContext(request, error, context);
        }

        // Wait before retry
        if (attempt < this.config.maxAttempts) {
          await this.retryManager.delay(attempt);
        }
      }
    }

    // All attempts failed - dispose context
    this.contextManager.disposeContext(executionId);

    // Return final failed result
    return this.enrichResult({
      success: false,
      error: {
        name: lastError?.name || 'Error',
        message: lastError?.message || String(lastError),
        stack: lastError?.stack
      },
      code: request.code,
      id: executionId,
      finishedAt: new Date().toISOString()
    }, {
      attemptCount: this.config.maxAttempts,
      retried: true,
      maxAttempts: this.config.maxAttempts,
      allAttemptsFailed: true
    });
  }

  /**
   * Check if should retry based on classification
   * @private
   */
  _shouldRetry(classification, attemptCount) {
    // Check if error is retryable
    if (!classification.retryable) {
      return false;
    }

    // Check attempt count
    if (attemptCount >= this.config.maxAttempts) {
      return false;
    }

    // Check if error type is in retryable list
    if (this.config.retryableErrors && this.config.retryableErrors.length > 0) {
      const errorType = classification.type || classification.error?.name;
      if (!this.config.retryableErrors.includes(errorType)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Clean execution context before retry
   * @param {Object} request - Execution request
   * @param {Error} error - Error that occurred
   * @param {Object} context - Execution context
   */
  async cleanExecutionContext(request, error, context) {
    // Restore snapshot (rollback state changes)
    this.contextManager.restoreSnapshot(request.id || context.id);

    // Clean context traces
    this.contextManager.cleanContext(request.id || context.id, error);

    // Emit cleaning event
    eventBus.emit?.('EXECUTION_CONTEXT_CLEANED', {
      executionId: request.id || context.id,
      errorType: error?.name,
      cleaningType: 'retry'
    });
  }

  /**
   * Retry strategy supports retry
   * @override
   */
  shouldRetry(error, attemptCount) {
    const classification = this.errorClassifier.classify(error);
    return this._shouldRetry(classification, attemptCount);
  }

  /**
   * Get retry delay
   * @override
   */
  getRetryDelay(attemptCount) {
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attemptCount - 1);
    delay = Math.min(delay, this.config.maxDelay);

    if (this.config.jitter) {
      delay += Math.random() * delay * 0.1;
    }

    return Math.round(delay);
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Legacy bridge (deprecated)
if (typeof window !== 'undefined') {
  window.RetryExecutionStrategy = RetryExecutionStrategy;
}
