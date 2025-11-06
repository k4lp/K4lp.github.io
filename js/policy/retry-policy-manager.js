/**
 * RetryPolicyManager
 *
 * Manages retry policies for different error types.
 * Provides error-specific retry configurations.
 */

class RetryPolicyManager {
  constructor() {
    this.policies = this._loadDefaultPolicies();
    this.errorSpecificPolicies = this._loadErrorPolicies();
  }

  /**
   * Load default policies
   * @private
   */
  _loadDefaultPolicies() {
    // Use config if available
    if (typeof RETRY_POLICIES_CONFIG !== 'undefined') {
      return RETRY_POLICIES_CONFIG.policies;
    }

    // Fallback inline policies
    return {
      none: {
        maxAttempts: 1,
        enabled: false
      },

      immediate: {
        maxAttempts: 2,
        baseDelayMs: 0,
        backoffMultiplier: 1,
        maxDelayMs: 0,
        jitter: false,
        cleanContext: true
      },

      exponential: {
        maxAttempts: 3,
        baseDelayMs: 1000,
        backoffMultiplier: 2,
        maxDelayMs: 10000,
        jitter: true,
        cleanContext: true
      },

      aggressive: {
        maxAttempts: 5,
        baseDelayMs: 500,
        backoffMultiplier: 1.5,
        maxDelayMs: 5000,
        jitter: true,
        cleanContext: true
      },

      conservative: {
        maxAttempts: 2,
        baseDelayMs: 2000,
        backoffMultiplier: 2,
        maxDelayMs: 15000,
        jitter: false,
        cleanContext: true
      }
    };
  }

  /**
   * Load error-specific policies
   * @private
   */
  _loadErrorPolicies() {
    if (typeof RETRY_POLICIES_CONFIG !== 'undefined') {
      return RETRY_POLICIES_CONFIG.errorPolicies;
    }

    return {
      'ReferenceError': 'immediate',
      'TimeoutError': 'conservative',
      'NetworkError': 'aggressive',
      'TypeError': 'none',
      'SyntaxError': 'none'
    };
  }

  /**
   * Get policy by name
   * @param {string} policyName - Policy name
   * @returns {Object} Policy configuration
   */
  getPolicy(policyName) {
    return this.policies[policyName] || this.policies.exponential;
  }

  /**
   * Get policy for specific error type
   * @param {string} errorType - Error type
   * @returns {Object} Policy configuration
   */
  getPolicyForError(errorType) {
    const policyName = this.errorSpecificPolicies[errorType] || 'exponential';
    return this.getPolicy(policyName);
  }

  /**
   * Get current policy (default)
   * @returns {Object} Current policy
   */
  getCurrentPolicy() {
    const policyName = typeof RETRY_POLICIES_CONFIG !== 'undefined'
      ? RETRY_POLICIES_CONFIG.defaultPolicy
      : 'exponential';

    return this.getPolicy(policyName);
  }

  /**
   * Set error-specific policy
   * @param {string} errorType - Error type
   * @param {string} policyName - Policy name
   */
  setErrorPolicy(errorType, policyName) {
    if (!this.policies[policyName]) {
      throw new Error(`Unknown policy: ${policyName}`);
    }

    this.errorSpecificPolicies[errorType] = policyName;
  }

  /**
   * Get all policy names
   * @returns {Array} Policy names
   */
  getPolicyNames() {
    return Object.keys(this.policies);
  }

  /**
   * Get error policy mappings
   * @returns {Object} Error to policy mappings
   */
  getErrorPolicyMappings() {
    return { ...this.errorSpecificPolicies };
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.RetryPolicyManager = RetryPolicyManager;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RetryPolicyManager;
}
