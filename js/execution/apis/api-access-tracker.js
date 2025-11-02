/**
 * API Access Tracker
 *
 * This module instruments the execution APIs (memory, tasks, goals, vault)
 * to track all entity access attempts, both successful and failed.
 *
 * When code execution fails, we can check if any attempted accesses
 * were to non-existent entities and trigger silent recovery.
 *
 * This is the "clever" part of silent error recovery for code blocks.
 */

class ApiAccessTracker {
  constructor() {
    this.reset();
  }

  /**
   * Reset tracking for new execution
   */
  reset() {
    this.accesses = {
      memory: [],
      tasks: [],
      goals: [],
      vault: []
    };
    this.enabled = true;
  }

  /**
   * Track an entity access attempt
   * @param {string} entityType - 'memory', 'tasks', 'goals', or 'vault'
   * @param {string} operation - 'get', 'set', 'delete', 'list', 'search', etc.
   * @param {string} id - Entity identifier (if applicable)
   * @param {boolean} exists - Whether the entity was found
   * @param {*} result - The result of the operation
   */
  track(entityType, operation, id, exists, result) {
    if (!this.enabled) return;

    const access = {
      entityType,
      operation,
      id,
      exists,
      result: result !== undefined ? (result === null ? 'null' : 'value') : 'undefined',
      timestamp: new Date().toISOString()
    };

    if (this.accesses[entityType]) {
      this.accesses[entityType].push(access);
    }
  }

  /**
   * Get all failed accesses (where entity was not found)
   * @returns {Array} Array of failed access attempts
   */
  getFailedAccesses() {
    const failed = [];

    for (const entityType in this.accesses) {
      const typeAccesses = this.accesses[entityType];

      typeAccesses.forEach(access => {
        // Failed access = tried to get/delete something that doesn't exist
        if ((access.operation === 'get' || access.operation === 'delete') && !access.exists) {
          failed.push(access);
        }
      });
    }

    return failed;
  }

  /**
   * Get all attempted entity IDs
   * @returns {Object} Map of entity type to attempted IDs
   */
  getAttemptedIds() {
    const attempted = {
      memory: [],
      tasks: [],
      goals: [],
      vault: []
    };

    for (const entityType in this.accesses) {
      const typeAccesses = this.accesses[entityType];
      const ids = new Set();

      typeAccesses.forEach(access => {
        if (access.id) {
          ids.add(access.id);
        }
      });

      attempted[entityType] = Array.from(ids);
    }

    return attempted;
  }

  /**
   * Check if there were any reference errors
   * @returns {boolean} True if any accesses failed
   */
  hasReferenceErrors() {
    return this.getFailedAccesses().length > 0;
  }

  /**
   * Get detailed error report
   * @returns {Object} Error report with details
   */
  getErrorReport() {
    const failed = this.getFailedAccesses();

    if (failed.length === 0) {
      return null;
    }

    return {
      hasErrors: true,
      failedAccesses: failed,
      attemptedIds: this.getAttemptedIds(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Enable/disable tracking
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  /**
   * Get all tracking data
   */
  getAll() {
    return {
      accesses: this.accesses,
      failed: this.getFailedAccesses(),
      attempted: this.getAttemptedIds(),
      hasErrors: this.hasReferenceErrors()
    };
  }
}

// Create global singleton instance
window.ApiAccessTracker = window.ApiAccessTracker || new ApiAccessTracker();

// Expose utility for debugging
window.getApiAccessReport = () => window.ApiAccessTracker.getAll();

console.log('[API Access Tracker] Module loaded and ready');
