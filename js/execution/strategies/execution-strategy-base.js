/**
 * ExecutionStrategyBase
 *
 * Abstract base class for execution strategies.
 * Provides pluggable execution behavior with hooks for customization.
 *
 * Subclasses MUST implement:
 * - execute(request, runner): Main execution logic
 *
 * Subclasses CAN override:
 * - beforeExecution(request): Pre-execution hook
 * - afterExecution(result): Post-execution hook
 * - onError(error, request): Error handling hook
 * - shouldRetry(error, attemptCount): Retry decision logic
 * - getRetryDelay(attemptCount): Retry delay calculation
 * - shouldCleanContext(error): Context cleaning decision
 * - getMaxAttempts(): Maximum retry attempts
 *
 * This design allows TOTAL CONTROL over execution behavior.
 * Mount different strategies like train adapters!
 */

export class ExecutionStrategyBase {
  /**
   * Create execution strategy
   * @param {Object} config - Strategy configuration
   */
  constructor(config = {}) {
    this.config = {
      maxAttempts: 1,
      enableRetry: false,
      cleanContext: false,
      timeoutMs: 15000,
      logAllAttempts: false,
      ...config
    };
  }

  /**
   * Execute code with strategy-specific behavior
   * MUST be implemented by subclasses
   *
   * @param {Object} request - Execution request
   * @param {Object} runner - Execution runner instance
   * @returns {Promise<Object>} Execution result
   * @abstract
   */
  async execute(request, runner) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Hook: Before execution starts
   * Override to add custom pre-execution logic
   *
   * @param {Object} request - Execution request
   * @returns {Promise<Object>} Modified request or original
   */
  async beforeExecution(request) {
    return request;
  }

  /**
   * Hook: After execution completes
   * Override to add custom post-execution logic
   *
   * @param {Object} result - Execution result
   * @returns {Promise<Object>} Modified result or original
   */
  async afterExecution(result) {
    return result;
  }

  /**
   * Hook: When error occurs
   * Override to add custom error handling logic
   *
   * @param {Error} error - Error that occurred
   * @param {Object} request - Execution request
   * @returns {Promise<void>}
   */
  async onError(error, request) {
    // Default: no action
  }

  /**
   * Decide if execution should be retried
   * Override to customize retry logic
   *
   * @param {Error} error - Error that occurred
   * @param {number} attemptCount - Current attempt number (1-based)
   * @returns {boolean} Whether to retry
   */
  shouldRetry(error, attemptCount) {
    return false; // Default: no retry
  }

  /**
   * Calculate delay before retry
   * Override to customize retry timing
   *
   * @param {number} attemptCount - Current attempt number (1-based)
   * @returns {number} Delay in milliseconds
   */
  getRetryDelay(attemptCount) {
    return 0; // Default: no delay
  }

  /**
   * Decide if context should be cleaned before retry
   * Override to customize context cleaning
   *
   * @param {Error} error - Error that occurred
   * @returns {boolean} Whether to clean context
   */
  shouldCleanContext(error) {
    return this.config.cleanContext;
  }

  /**
   * Get maximum retry attempts
   * Override to customize max attempts
   *
   * @returns {number} Maximum attempts
   */
  getMaxAttempts() {
    return this.config.maxAttempts;
  }

  /**
   * Check if strategy supports retries
   * @returns {boolean}
   */
  supportsRetry() {
    return this.config.enableRetry;
  }

  /**
   * Get strategy configuration
   * @returns {Object} Config object
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update strategy configuration
   * @param {Object} updates - Config updates
   */
  updateConfig(updates) {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get strategy name
   * @returns {string} Strategy name
   */
  getName() {
    return this.constructor.name;
  }

  /**
   * Get strategy metadata
   * @returns {Object} Strategy metadata
   */
  getMetadata() {
    return {
      name: this.getName(),
      supportsRetry: this.supportsRetry(),
      maxAttempts: this.getMaxAttempts(),
      config: this.getConfig()
    };
  }

  /**
   * Utility: Sleep for specified duration
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility: Validate request
   * @param {Object} request - Request to validate
   * @throws {Error} If request is invalid
   */
  validateRequest(request) {
    if (!request) {
      throw new Error('Request is required');
    }
    if (!request.code) {
      throw new Error('Request must contain code');
    }
  }

  /**
   * Utility: Create request metadata
   * @param {Object} request - Original request
   * @param {number} attemptCount - Attempt number
   * @returns {Object} Request with metadata
   */
  enrichRequest(request, attemptCount = 1) {
    return {
      ...request,
      metadata: {
        ...request.metadata,
        strategyName: this.getName(),
        attemptCount,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Utility: Create result metadata
   * @param {Object} result - Original result
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Result with metadata
   */
  enrichResult(result, metadata = {}) {
    return {
      ...result,
      strategyMetadata: {
        strategyName: this.getName(),
        ...metadata
      }
    };
  }
}

// Legacy bridge (deprecated)
if (typeof window !== 'undefined') {
  window.ExecutionStrategyBase = ExecutionStrategyBase;
}
