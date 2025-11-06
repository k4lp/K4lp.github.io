/**
 * RetryStrategyManager
 *
 * Manages retry logic with configurable policies and error-specific behavior.
 * Coordinates retry attempts, delays, and context cleaning.
 *
 * Features:
 * - Exponential backoff with jitter
 * - Error-specific retry policies
 * - Context cleaning between retries
 * - Configurable max attempts
 * - Smart retry decision logic
 */

class RetryStrategyManager {
  constructor(config = {}) {
    this.config = {
      maxAttempts: config.maxAttempts || 3,
      baseDelayMs: config.baseDelayMs || 1000,
      maxDelayMs: config.maxDelayMs || 10000,
      backoffMultiplier: config.backoffMultiplier || 2,
      jitter: config.jitter !== false, // Default true
      ...config
    };

    // Initialize dependencies
    this.errorClassifier = new ErrorClassifier();
    this.contextCleaner = new ErrorContextCleaner();
    this.retryPolicyManager = typeof RetryPolicyManager !== 'undefined'
      ? new RetryPolicyManager()
      : null;
  }

  /**
   * Execute function with retry logic
   * @param {Function} fn - Function to execute (receives attempt number)
   * @param {Object} options - Retry options
   * @returns {Promise<*>} Result from function
   */
  async executeWithRetry(fn, options = {}) {
    const maxAttempts = options.maxAttempts || this.config.maxAttempts;
    let lastError = null;
    let lastResult = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await fn(attempt);

        // Check if result indicates failure
        if (result && result.success === false) {
          lastResult = result;
          lastError = result.error;

          // Classify error
          const classification = this.errorClassifier.classify(lastError);

          // Check if should retry
          if (!this._shouldRetry(classification, attempt, maxAttempts)) {
            return result;
          }

          // Clean context if needed
          if (classification.cleanContext) {
            const cleanedContext = this.contextCleaner.clean(classification, result.context);
            result.cleanedContext = cleanedContext;
          }

          // Emit retry event
          if (typeof EventBus !== 'undefined') {
            EventBus.emit('EXECUTION_RETRY_ATTEMPT', {
              executionId: result.id,
              attempt,
              maxAttempts,
              error: lastError
            });
          }

          // Wait before retry
          if (attempt < maxAttempts) {
            await this.delay(attempt);
          }

          continue;
        }

        // Success
        return result;

      } catch (error) {
        lastError = error;

        // Classify error
        const classification = this.errorClassifier.classify(error);

        // Check if should retry
        if (!this._shouldRetry(classification, attempt, maxAttempts)) {
          throw error;
        }

        // Wait before retry
        if (attempt < maxAttempts) {
          await this.delay(attempt);
        }
      }
    }

    // All attempts failed
    if (lastResult) {
      return lastResult;
    }

    throw lastError;
  }

  /**
   * Calculate delay for retry attempt
   * @param {number} attemptNumber - Current attempt (1-based)
   * @returns {Promise<void>}
   */
  async delay(attemptNumber) {
    let delayMs = this.config.baseDelayMs *
                  Math.pow(this.config.backoffMultiplier, attemptNumber - 1);

    // Cap at max delay
    delayMs = Math.min(delayMs, this.config.maxDelayMs);

    // Add jitter to prevent thundering herd
    if (this.config.jitter) {
      const jitterMs = Math.random() * delayMs * 0.1; // 10% jitter
      delayMs += jitterMs;
    }

    return new Promise(resolve => setTimeout(resolve, Math.round(delayMs)));
  }

  /**
   * Get retry configuration for specific error
   * @param {Error} error - Error object
   * @returns {Object} Retry configuration
   */
  getRetryConfigForError(error) {
    const classification = this.errorClassifier.classify(error);

    // Use retry policy manager if available
    let policy = null;
    if (this.retryPolicyManager) {
      policy = this.retryPolicyManager.getPolicyForError(classification.type);
    }

    return {
      shouldRetry: classification.retryable || false,
      shouldCleanContext: classification.cleanContext || false,
      requiresReasoning: classification.requiresReasoning || false,
      maxAttempts: policy ? policy.maxAttempts : this.config.maxAttempts,
      policy: policy || this.config
    };
  }

  /**
   * Check if should retry based on classification
   * @private
   */
  _shouldRetry(classification, attemptNumber, maxAttempts) {
    // Check if error is retryable
    if (!classification.retryable) {
      return false;
    }

    // Check attempt count
    if (attemptNumber >= maxAttempts) {
      return false;
    }

    // Get error-specific max attempts
    const errorMaxAttempts = this._getMaxAttemptsForErrorType(classification.type);
    if (attemptNumber >= errorMaxAttempts) {
      return false;
    }

    return true;
  }

  /**
   * Get max attempts for error type
   * @private
   */
  _getMaxAttemptsForErrorType(errorType) {
    // Use retry policy manager if available
    if (this.retryPolicyManager) {
      const policy = this.retryPolicyManager.getPolicyForError(errorType);
      if (policy && policy.maxAttempts) {
        return policy.maxAttempts;
      }
    }

    // Default max attempts by error type
    const customMaxAttempts = {
      'TIMEOUT': 2,              // Only retry once for timeouts
      'NETWORK_ERROR': 3,        // More retries for network issues
      'ENTITY_NOT_FOUND': 1,     // Single retry after context cleaning
      'UNDEFINED_REFERENCE': 1,  // Single retry after context cleaning
      'SYNTAX_ERROR': 0,         // Never retry syntax errors
      'TYPE_ERROR': 0            // Never retry type errors
    };

    return customMaxAttempts[errorType] || this.config.maxAttempts;
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
}

// Export to window
if (typeof window !== 'undefined') {
  window.RetryStrategyManager = RetryStrategyManager;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RetryStrategyManager;
}
