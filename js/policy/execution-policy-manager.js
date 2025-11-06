/**
 * ExecutionPolicyManager
 *
 * Centralized management of execution policies.
 * Switch between execution modes dynamically.
 *
 * Features:
 * - Policy registration and selection
 * - Default policies (standard, retry, safe, debug)
 * - Custom policy support
 * - Runtime policy switching
 */

class ExecutionPolicyManager {
  constructor() {
    this.policies = this._loadDefaultPolicies();
    this.customPolicies = new Map();
    this.currentPolicyName = 'default';
  }

  /**
   * Load default policies from config
   * @private
   */
  _loadDefaultPolicies() {
    // Use config if available, otherwise inline defaults
    const config = typeof EXECUTION_STRATEGIES_CONFIG !== 'undefined'
      ? EXECUTION_STRATEGIES_CONFIG
      : this._getInlineDefaults();

    return {
      default: {
        strategy: 'retry',
        timeoutMs: 15000,
        enableRetry: true,
        maxRetries: 3,
        cleanContextOnRetry: true,
        logAllAttempts: false
      },

      safe: {
        strategy: 'safe',
        timeoutMs: 10000,
        enableRetry: false,
        maxRetries: 0,
        validateCodeSafety: true,
        logAllAttempts: true
      },

      aggressive: {
        strategy: 'retry',
        timeoutMs: 30000,
        enableRetry: true,
        maxRetries: 5,
        cleanContextOnRetry: true,
        logAllAttempts: false
      },

      debug: {
        strategy: 'standard',
        timeoutMs: 60000,
        enableRetry: false,
        maxRetries: 0,
        logAllAttempts: true,
        verboseErrors: true
      }
    };
  }

  /**
   * Get inline defaults (fallback)
   * @private
   */
  _getInlineDefaults() {
    return {
      defaultStrategy: 'retry',
      manualStrategy: 'standard'
    };
  }

  /**
   * Get policy by name
   * @param {string} policyName - Policy name
   * @returns {Object} Policy configuration
   */
  getPolicy(policyName) {
    return this.policies[policyName] ||
           this.customPolicies.get(policyName) ||
           this.policies.default;
  }

  /**
   * Register custom policy
   * @param {string} name - Policy name
   * @param {Object} policy - Policy configuration
   */
  registerPolicy(name, policy) {
    this.customPolicies.set(name, policy);
  }

  /**
   * Remove custom policy
   * @param {string} name - Policy name
   */
  removePolicy(name) {
    this.customPolicies.delete(name);
  }

  /**
   * Get current active policy
   * @returns {Object} Current policy
   */
  getCurrentPolicy() {
    // Check storage for saved preference
    if (typeof Storage !== 'undefined') {
      const savedPolicy = Storage.getConfig?.('executionPolicy');
      if (savedPolicy) {
        this.currentPolicyName = savedPolicy;
      }
    }

    return this.getPolicy(this.currentPolicyName);
  }

  /**
   * Set active policy
   * @param {string} policyName - Policy name
   * @throws {Error} If policy doesn't exist
   */
  setCurrentPolicy(policyName) {
    if (!this.policies[policyName] && !this.customPolicies.has(policyName)) {
      throw new Error(`Unknown policy: ${policyName}`);
    }

    this.currentPolicyName = policyName;

    // Save to storage if available
    if (typeof Storage !== 'undefined' && Storage.saveConfig) {
      Storage.saveConfig('executionPolicy', policyName);
    }

    // Emit event
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('POLICY_CHANGED', {
        type: 'execution',
        oldPolicy: this.currentPolicyName,
        newPolicy: policyName
      });
    }
  }

  /**
   * Get all policy names
   * @returns {Array} Policy names
   */
  getPolicyNames() {
    return [
      ...Object.keys(this.policies),
      ...Array.from(this.customPolicies.keys())
    ];
  }

  /**
   * Check if policy exists
   * @param {string} name - Policy name
   * @returns {boolean}
   */
  hasPolicy(name) {
    return !!this.policies[name] || this.customPolicies.has(name);
  }

  /**
   * Export policies
   * @returns {Object} All policies
   */
  exportPolicies() {
    return {
      default: this.policies,
      custom: Object.fromEntries(this.customPolicies)
    };
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.ExecutionPolicyManager = ExecutionPolicyManager;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExecutionPolicyManager;
}
