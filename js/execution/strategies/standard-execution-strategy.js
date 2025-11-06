/**
 * StandardExecutionStrategy
 *
 * Simple single-attempt execution with no retry logic.
 * Use for manual executions or when retry is not desired.
 *
 * Features:
 * - Single execution attempt
 * - No retry
 * - Full error reporting
 * - Straightforward flow
 */

import { ExecutionStrategyBase } from './execution-strategy-base.js';

export class StandardExecutionStrategy extends ExecutionStrategyBase {
  constructor(config = {}) {
    super({
      maxAttempts: 1,
      enableRetry: false,
      cleanContext: false,
      ...config
    });
  }

  /**
   * Execute code without retry
   * @param {Object} request - Execution request
   * @param {Object} runner - Execution runner instance
   * @returns {Promise<Object>} Execution result
   */
  async execute(request, runner) {
    // Validate request
    this.validateRequest(request);

    // Enrich request with metadata
    const enrichedRequest = this.enrichRequest(request, 1);

    // Run before-execution hook
    const modifiedRequest = await this.beforeExecution(enrichedRequest);

    try {
      // Execute code
      const result = await runner.run(modifiedRequest);

      // Run after-execution hook
      const finalResult = await this.afterExecution(result);

      // Enrich result with strategy metadata
      return this.enrichResult(finalResult, {
        attemptCount: 1,
        retried: false
      });

    } catch (error) {
      // Run error hook
      await this.onError(error, modifiedRequest);

      // Return error result
      return this.enrichResult({
        success: false,
        error: {
          name: error.name || 'Error',
          message: error.message || String(error),
          stack: error.stack
        },
        code: modifiedRequest.code,
        id: modifiedRequest.id || `exec-${Date.now()}`,
        finishedAt: new Date().toISOString()
      }, {
        attemptCount: 1,
        retried: false
      });
    }
  }

  /**
   * Standard strategy never retries
   * @override
   */
  shouldRetry(error, attemptCount) {
    return false;
  }
}

// Legacy bridge (deprecated)
if (typeof window !== 'undefined') {
  window.StandardExecutionStrategy = StandardExecutionStrategy;
}
