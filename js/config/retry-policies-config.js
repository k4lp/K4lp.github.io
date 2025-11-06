/**
 * RetryPoliciesConfig
 *
 * Configuration for retry policies.
 * Defines retry behavior for different error types.
 */

export const RETRY_POLICIES_CONFIG = {
  // Default retry policy
  defaultPolicy: 'exponential',

  // Error-specific policies
  errorPolicies: {
    'ReferenceError': 'immediate',
    'TimeoutError': 'conservative',
    'NetworkError': 'aggressive',
    'TypeError': 'none',
    'SyntaxError': 'none'
  },

  // Policy definitions
  policies: {
    // No retry
    none: {
      maxAttempts: 1,
      enabled: false
    },

    // Immediate retry (no delay)
    immediate: {
      maxAttempts: 2,
      baseDelayMs: 0,
      backoffMultiplier: 1,
      maxDelayMs: 0,
      jitter: false,
      cleanContext: true
    },

    // Exponential backoff (default)
    exponential: {
      maxAttempts: 3,
      baseDelayMs: 1000,
      backoffMultiplier: 2,
      maxDelayMs: 10000,
      jitter: true,
      cleanContext: true
    },

    // Aggressive retry
    aggressive: {
      maxAttempts: 5,
      baseDelayMs: 500,
      backoffMultiplier: 1.5,
      maxDelayMs: 5000,
      jitter: true,
      cleanContext: true
    },

    // Conservative retry
    conservative: {
      maxAttempts: 2,
      baseDelayMs: 2000,
      backoffMultiplier: 2,
      maxDelayMs: 15000,
      jitter: false,
      cleanContext: true
    }
  }
};

export function getRetryPolicy(name) {
  return RETRY_POLICIES_CONFIG.policies[name] || null;
}

// Legacy bridge (deprecated)
if (typeof window !== 'undefined') {
  window.RETRY_POLICIES_CONFIG = RETRY_POLICIES_CONFIG;
}
