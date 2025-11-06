import { Storage } from '../storage/storage.js';
import { EXECUTION_STRATEGIES_CONFIG } from '../config/execution-strategies-config.js';
import { eventBus } from '../core/event-bus.js';

/**
 * ExecutionPolicyManager
 *
 * Centralized management of execution policies.
 * Switch between execution modes dynamically.
 */
export class ExecutionPolicyManager {
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
    const config = EXECUTION_STRATEGIES_CONFIG || this._getInlineDefaults();

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
   */
  getPolicy(policyName) {
    return this.policies[policyName] ||
           this.customPolicies.get(policyName) ||
           this.policies.default;
  }

  /**
   * Register custom policy
   */
  registerPolicy(name, policy) {
    this.customPolicies.set(name, policy);
  }

  /**
   * Remove custom policy
   */
  removePolicy(name) {
    this.customPolicies.delete(name);
  }

  /**
   * Get current active policy
   */
  getCurrentPolicy() {
    const savedPolicy = Storage.getConfig?.('executionPolicy');
    if (savedPolicy) {
      this.currentPolicyName = savedPolicy;
    }
    return this.getPolicy(this.currentPolicyName);
  }

  /**
   * Set active policy
   */
  setCurrentPolicy(policyName) {
    if (!this.policies[policyName] && !this.customPolicies.has(policyName)) {
      throw new Error(`Unknown policy: ${policyName}`);
    }

    const previous = this.currentPolicyName;
    this.currentPolicyName = policyName;

    Storage.saveConfig?.('executionPolicy', policyName);

    eventBus.emit?.('POLICY_CHANGED', {
      type: 'execution',
      oldPolicy: previous,
      newPolicy: policyName
    });
  }

  /**
   * Get all policy names
   */
  getPolicyNames() {
    return [
      ...Object.keys(this.policies),
      ...Array.from(this.customPolicies.keys())
    ];
  }

  /**
   * Check if policy exists
   */
  hasPolicy(name) {
    return !!this.policies[name] || this.customPolicies.has(name);
  }

  /**
   * Export policies for persistence
   */
  exportPolicies() {
    return {
      default: this.policies,
      custom: Object.fromEntries(this.customPolicies)
    };
  }
}

export function createExecutionPolicyManager() {
  return new ExecutionPolicyManager();
}

// Legacy bridge (deprecated)
if (typeof window !== 'undefined') {
  window.ExecutionPolicyManager = ExecutionPolicyManager;
}
