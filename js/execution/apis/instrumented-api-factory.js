/**
 * Instrumented API Factory
 *
 * This module wraps execution APIs to track entity accesses.
 * It's completely transparent - the wrapped APIs behave identically
 * but report access attempts to the ApiAccessTracker.
 *
 * This enables silent error recovery for code execution failures.
 */

import { apiAccessTracker } from './api-access-tracker.js';

/**
 * Create an instrumented version of an API that tracks accesses
 * @param {Object} apiInstance - The API instance to wrap
 * @param {string} entityType - Type of entity ('memory', 'tasks', 'goals', 'vault')
 * @returns {Proxy} Instrumented API proxy
 */
export function createInstrumentedAPI(apiInstance, entityType) {
  return new Proxy(apiInstance, {
    get(target, prop) {
      const original = target[prop];

      // Don't wrap non-function properties
      if (typeof original !== 'function') {
        return original;
      }

      // Return wrapped function
      return function(...args) {
        const operation = prop; // get, set, delete, list, search, etc.
        const id = args[0]; // First arg is usually the ID

        let result;
        let error = null;

        try {
          // Call original method
          result = original.apply(target, args);

          // Track the access
          trackAccess(entityType, operation, id, result);

          return result;

        } catch (err) {
          error = err;

          // Track failed access
          trackAccess(entityType, operation, id, null, err);

          // Re-throw the error
          throw err;
        }
      };
    }
  });
}

/**
 * Track an API access
 */
function trackAccess(entityType, operation, id, result, error = null) {
  if (!apiAccessTracker || !apiAccessTracker.isEnabled()) return;

  // Determine if entity exists based on operation and result
  let exists = true;

  if (error) {
    // If there was an error, entity likely doesn't exist
    exists = false;
  } else if (operation === 'get') {
    // get() returns null if not found
    exists = result !== null;
  } else if (operation === 'delete') {
    // delete() returns false if not found
    exists = result !== false;
  } else if (operation === 'getEntry') {
    // getEntry() returns null if not found
    exists = result !== null;
  } else if (operation === 'exists') {
    // exists() explicitly returns boolean
    exists = result === true;
  }

  // Track the access
  apiAccessTracker.track(entityType, operation, id, exists, result);

  // Console logging for debugging (only on failures)
  if (!exists && (operation === 'get' || operation === 'delete' || operation === 'getEntry')) {
    console.log(
      `[${new Date().toISOString()}] API Access Tracking: ` +
      `${entityType}.${operation}("${id}") → NOT FOUND`
    );
  }
}

/**
 * Create a full set of instrumented APIs
 * @param {Object} apis - Object with memory, tasks, goals, vault API instances
 * @returns {Object} Instrumented versions of all APIs
 */
export function createInstrumentedAPIs(apis) {
  return {
    memory: createInstrumentedAPI(apis.memory, 'memory'),
    tasks: createInstrumentedAPI(apis.tasks, 'tasks'),
    goals: createInstrumentedAPI(apis.goals, 'goals'),
    vault: createInstrumentedAPI(apis.vault, 'vault'),
    utils: apis.utils // Utils doesn't need instrumentation
  };
}

export default {
  createInstrumentedAPI,
  createInstrumentedAPIs
};
