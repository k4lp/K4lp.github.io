/**
 * ExecutionStrategiesConfig
 *
 * Configuration for execution strategies.
 * Defines strategy selection and behavior.
 */

export const EXECUTION_STRATEGIES_CONFIG = {
  // Default strategy for automatic executions (from reasoning chain)
  defaultStrategy: 'retry',

  // Strategy for manual executions (from UI)
  manualStrategy: 'standard',

  // Strategy definitions
  strategies: {
    // Standard: Single-attempt execution, no retry
    standard: {
      className: 'StandardExecutionStrategy',
      config: {
        maxAttempts: 1,
        enableRetry: false,
        cleanContext: false,
        timeoutMs: 150000,
        logAllAttempts: true
      }
    },

    // Retry: Multi-attempt with exponential backoff
    retry: {
      className: 'RetryExecutionStrategy',
      config: {
        maxAttempts: 3,
        enableRetry: true,
        cleanContext: true,
        timeoutMs: 150000,
        baseDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 10000,
        jitter: true,
        logAllAttempts: false,
        retryableErrors: ['ReferenceError', 'TimeoutError']
      }
    },

    // Safe: Conservative execution with validation
    safe: {
      className: 'SafeModeExecutionStrategy',
      config: {
        maxAttempts: 1,
        enableRetry: false,
        cleanContext: false,
        timeoutMs: 10000,
        validateCodeSafety: true,
        checkInfiniteLoops: true,
        conservativeTimeout: true,
        logAllAttempts: true
      }
    }
  }
};

export function getStrategyDefinition(name) {
  return EXECUTION_STRATEGIES_CONFIG.strategies[name] || null;
}

// Legacy bridge (deprecated)
if (typeof window !== 'undefined') {
  window.EXECUTION_STRATEGIES_CONFIG = EXECUTION_STRATEGIES_CONFIG;
}
