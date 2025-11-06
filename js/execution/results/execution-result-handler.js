/**
 * ExecutionResultHandler
 *
 * Uniform processing and classification of execution results.
 * Pluggable result transformers for custom processing.
 *
 * Features:
 * - Result classification (success/error types)
 * - Result transformers (middleware for results)
 * - Logging decisions
 * - Retry decisions
 * - Metrics aggregation
 */

class ExecutionResultHandler {
  constructor(config = {}) {
    this.config = {
      maxRetries: config.maxRetries || 3,
      logSuccessful: config.logSuccessful !== false,
      logFailed: config.logFailed !== false,
      logRetries: config.logRetries !== false,
      ...config
    };

    this.transformers = [];
    this.aggregator = new ResultAggregator();

    // Initialize with ErrorClassifier if available
    if (typeof ErrorClassifier !== 'undefined') {
      this.errorClassifier = new ErrorClassifier();
    }
  }

  /**
   * Register result transformer (result middleware!)
   * @param {Function} transformer - Transform function
   * @param {Object} options - Transformer options
   */
  registerTransformer(transformer, options = {}) {
    this.transformers.push({
      transform: transformer,
      name: options.name || `transformer-${this.transformers.length}`,
      enabled: options.enabled !== false,
      priority: options.priority || 100
    });

    // Sort by priority
    this.transformers.sort((a, b) => (a.priority || 100) - (b.priority || 100));
  }

  /**
   * Process execution result
   * @param {Object} rawResult - Raw execution result
   * @returns {Promise<Object>} Processed result
   */
  async process(rawResult) {
    let result = { ...rawResult };

    // Apply transformers
    for (const transformer of this.transformers) {
      if (!transformer.enabled) continue;

      try {
        result = await transformer.transform(result) || result;
      } catch (error) {
        console.error(`Error in result transformer ${transformer.name}:`, error);
      }
    }

    // Classify result
    result.classification = this.classifyResult(result);

    // Aggregate metrics
    this.aggregator.add(result);

    // Make decisions
    result.shouldLog = this.shouldLog(result);
    result.shouldRetry = this.shouldRetry(result);

    return result;
  }

  /**
   * Classify execution result
   * @param {Object} result - Execution result
   * @returns {Object} Classification
   */
  classifyResult(result) {
    if (result.success) {
      return {
        category: 'success',
        severity: 'info',
        retryable: false,
        requiresReasoning: false
      };
    }

    // Use ErrorClassifier if available
    if (this.errorClassifier && result.error) {
      return this.errorClassifier.classify(result.error);
    }

    // Fallback classification
    return this._fallbackClassification(result);
  }

  /**
   * Fallback classification when ErrorClassifier not available
   * @private
   */
  _fallbackClassification(result) {
    const error = result.error;

    if (!error) {
      return {
        category: 'unknown',
        severity: 'medium',
        retryable: false,
        requiresReasoning: true
      };
    }

    if (error.name === 'SyntaxError') {
      return {
        type: 'SYNTAX_ERROR',
        category: 'compile_time',
        severity: 'high',
        retryable: false,
        requiresReasoning: true,
        cleanContext: false
      };
    }

    if (error.name === 'ReferenceError') {
      return {
        type: 'REFERENCE_ERROR',
        category: 'runtime',
        severity: 'medium',
        retryable: true,
        requiresReasoning: true,
        cleanContext: true
      };
    }

    if (error.message?.includes('timeout')) {
      return {
        type: 'TIMEOUT',
        category: 'execution',
        severity: 'medium',
        retryable: true,
        requiresReasoning: false,
        cleanContext: true
      };
    }

    return {
      type: 'UNKNOWN_ERROR',
      category: 'runtime',
      severity: 'high',
      retryable: false,
      requiresReasoning: true,
      cleanContext: false
    };
  }

  /**
   * Decide if result should be logged
   * @param {Object} result - Execution result
   * @returns {boolean} Whether to log
   */
  shouldLog(result) {
    // Don't log intermediate retry attempts
    if (result.isRetry && !result.isFinalAttempt) {
      return this.config.logRetries;
    }

    // Log successful executions
    if (result.success) {
      return this.config.logSuccessful;
    }

    // Log failed executions
    return this.config.logFailed;
  }

  /**
   * Decide if execution should be retried
   * @param {Object} result - Execution result
   * @returns {boolean} Whether to retry
   */
  shouldRetry(result) {
    if (result.success) return false;

    // Check classification
    const classification = result.classification;
    if (!classification || !classification.retryable) {
      return false;
    }

    // Check attempt count
    const attemptCount = result.attemptCount || 1;
    if (attemptCount >= this.config.maxRetries) {
      return false;
    }

    return true;
  }

  /**
   * Get aggregated metrics
   * @returns {Object} Metrics
   */
  getAggregatedMetrics() {
    return this.aggregator.getMetrics();
  }

  /**
   * Get recent results
   * @param {number} count - Number of results
   * @returns {Array} Recent results
   */
  getRecentResults(count) {
    return this.aggregator.getRecentResults(count);
  }

  /**
   * Reset aggregator
   */
  resetMetrics() {
    this.aggregator.reset();
  }

  /**
   * Remove transformer
   * @param {string} name - Transformer name
   */
  removeTransformer(name) {
    this.transformers = this.transformers.filter(t => t.name !== name);
  }

  /**
   * Enable transformer
   * @param {string} name - Transformer name
   */
  enableTransformer(name) {
    const transformer = this.transformers.find(t => t.name === name);
    if (transformer) {
      transformer.enabled = true;
    }
  }

  /**
   * Disable transformer
   * @param {string} name - Transformer name
   */
  disableTransformer(name) {
    const transformer = this.transformers.find(t => t.name === name);
    if (transformer) {
      transformer.enabled = false;
    }
  }

  /**
   * Get transformer names
   * @returns {Array} Transformer names
   */
  getTransformerNames() {
    return this.transformers.map(t => t.name);
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
  window.ExecutionResultHandler = ExecutionResultHandler;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExecutionResultHandler;
}
