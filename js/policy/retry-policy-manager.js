import { RETRY_POLICIES_CONFIG } from '../config/retry-policies-config.js';

/**
 * RetryPolicyManager
 *
 * Manages retry policies for different error types.
 */
export class RetryPolicyManager {
  constructor() {
    this.policies = this._loadDefaultPolicies();
    this.errorSpecificPolicies = this._loadErrorPolicies();
  }

  _loadDefaultPolicies() {
    return RETRY_POLICIES_CONFIG.policies;
  }

  _loadErrorPolicies() {
    return RETRY_POLICIES_CONFIG.errorPolicies;
  }

  getDefaultPolicy() {
    return this.getPolicy(RETRY_POLICIES_CONFIG.defaultPolicy);
  }

  getPolicy(name) {
    return this.policies[name] || this.policies.none;
  }

  getPolicyForError(errorName) {
    const policyName = this.errorSpecificPolicies[errorName] || RETRY_POLICIES_CONFIG.defaultPolicy;
    return this.getPolicy(policyName);
  }

  registerPolicy(name, policy) {
    this.policies[name] = policy;
  }

  registerErrorPolicy(errorName, policyName) {
    this.errorSpecificPolicies[errorName] = policyName;
  }

  exportPolicies() {
    return {
      default: { ...this.policies },
      perError: { ...this.errorSpecificPolicies }
    };
  }
}

export function createRetryPolicyManager() {
  return new RetryPolicyManager();
}

// Legacy bridge (deprecated)
if (typeof window !== 'undefined') {
  window.RetryPolicyManager = RetryPolicyManager;
}
