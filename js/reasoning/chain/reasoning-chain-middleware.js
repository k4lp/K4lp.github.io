/**
 * ReasoningChainMiddleware
 *
 * Pluggable middleware system for reasoning chain processing.
 * TRAIN ADAPTER CONCEPT: Mount/unmount middleware like train cars!
 *
 * Features:
 * - Pre/post iteration hooks
 * - Pre/post execution hooks
 * - Error handling hooks
 * - Priority-based execution order
 * - Async support
 * - Context transformation
 *
 * Users have TOTAL CONTROL:
 * - Add custom middleware
 * - Remove middleware
 * - Reorder middleware
 * - Short-circuit execution
 */

class ReasoningChainMiddleware {
  constructor() {
    this.middlewares = [];
    this.enabled = true;
  }

  /**
   * Register middleware (train adapter!)
   * @param {Object|Function} middleware - Middleware object or function
   * @param {Object} options - Options
   */
  use(middleware, options = {}) {
    const middlewareWrapper = this._wrapMiddleware(middleware, options);
    this.middlewares.push(middlewareWrapper);

    // Sort by priority if specified
    if (options.priority !== undefined) {
      this.middlewares.sort((a, b) => (a.priority || 100) - (b.priority || 100));
    }
  }

  /**
   * Remove middleware by name
   * @param {string} name - Middleware name
   */
  remove(name) {
    this.middlewares = this.middlewares.filter(mw => mw.name !== name);
  }

  /**
   * Clear all middleware
   */
  clear() {
    this.middlewares = [];
  }

  /**
   * Enable middleware system
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable middleware system
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Get all middleware names
   * @returns {Array} Middleware names
   */
  getMiddlewareNames() {
    return this.middlewares.map(mw => mw.name);
  }

  /**
   * Run pre-iteration middleware
   * @param {Object} context - Iteration context
   * @returns {Promise<Object>} Modified context
   */
  async runPreIteration(context) {
    if (!this.enabled) return context;

    let modifiedContext = context;

    for (const middleware of this.middlewares) {
      if (!middleware.enabled || !middleware.preIteration) continue;

      try {
        const result = await middleware.preIteration(modifiedContext);

        // Check if middleware wants to short-circuit
        if (result && result.__shortCircuit) {
          return result.context;
        }

        modifiedContext = result || modifiedContext;
      } catch (error) {
        console.error(`Error in middleware ${middleware.name} (preIteration):`, error);
        if (middleware.required) {
          throw error;
        }
      }
    }

    return modifiedContext;
  }

  /**
   * Run post-iteration middleware
   * @param {Object} context - Iteration context
   * @param {Object} result - Iteration result
   * @returns {Promise<Object>} Modified result
   */
  async runPostIteration(context, result) {
    if (!this.enabled) return result;

    let modifiedResult = result;

    for (const middleware of this.middlewares) {
      if (!middleware.enabled || !middleware.postIteration) continue;

      try {
        const newResult = await middleware.postIteration(context, modifiedResult);

        if (newResult && newResult.__shortCircuit) {
          return newResult.result;
        }

        modifiedResult = newResult || modifiedResult;
      } catch (error) {
        console.error(`Error in middleware ${middleware.name} (postIteration):`, error);
        if (middleware.required) {
          throw error;
        }
      }
    }

    return modifiedResult;
  }

  /**
   * Run pre-execution middleware
   * @param {Object} context - Execution context
   * @param {string} code - Code to execute
   * @returns {Promise<string>} Modified code
   */
  async runPreExecution(context, code) {
    if (!this.enabled) return code;

    let modifiedCode = code;

    for (const middleware of this.middlewares) {
      if (!middleware.enabled || !middleware.preExecution) continue;

      try {
        const result = await middleware.preExecution(context, modifiedCode);

        if (result && result.__shortCircuit) {
          return result.code;
        }

        modifiedCode = result || modifiedCode;
      } catch (error) {
        console.error(`Error in middleware ${middleware.name} (preExecution):`, error);
        if (middleware.required) {
          throw error;
        }
      }
    }

    return modifiedCode;
  }

  /**
   * Run post-execution middleware
   * @param {Object} context - Execution context
   * @param {Object} executionResult - Execution result
   * @returns {Promise<Object>} Modified result
   */
  async runPostExecution(context, executionResult) {
    if (!this.enabled) return executionResult;

    let modifiedResult = executionResult;

    for (const middleware of this.middlewares) {
      if (!middleware.enabled || !middleware.postExecution) continue;

      try {
        const result = await middleware.postExecution(context, modifiedResult);

        if (result && result.__shortCircuit) {
          return result.executionResult;
        }

        modifiedResult = result || modifiedResult;
      } catch (error) {
        console.error(`Error in middleware ${middleware.name} (postExecution):`, error);
        if (middleware.required) {
          throw error;
        }
      }
    }

    return modifiedResult;
  }

  /**
   * Run error middleware
   * @param {Object} context - Context
   * @param {Error} error - Error that occurred
   * @returns {Promise<void>}
   */
  async runOnError(context, error) {
    if (!this.enabled) return;

    for (const middleware of this.middlewares) {
      if (!middleware.enabled || !middleware.onError) continue;

      try {
        await middleware.onError(context, error);
      } catch (err) {
        console.error(`Error in middleware ${middleware.name} (onError):`, error);
        // Don't throw - error handlers shouldn't break the chain
      }
    }

    if (typeof EventBus !== 'undefined') {
      EventBus.emit('MIDDLEWARE_ERROR', {
        context,
        error
      });
    }
  }

  /**
   * Wrap middleware for consistent interface
   * @private
   */
  _wrapMiddleware(middleware, options) {
    // If function, convert to object
    if (typeof middleware === 'function') {
      middleware = { preIteration: middleware };
    }

    return {
      name: options.name || middleware.name || `middleware-${Date.now()}`,
      enabled: options.enabled !== false,
      required: options.required || false,
      priority: options.priority || 100,
      preIteration: middleware.preIteration,
      postIteration: middleware.postIteration,
      preExecution: middleware.preExecution,
      postExecution: middleware.postExecution,
      onError: middleware.onError
    };
  }

  /**
   * Enable specific middleware
   * @param {string} name - Middleware name
   */
  enableMiddleware(name) {
    const middleware = this.middlewares.find(mw => mw.name === name);
    if (middleware) {
      middleware.enabled = true;
    }
  }

  /**
   * Disable specific middleware
   * @param {string} name - Middleware name
   */
  disableMiddleware(name) {
    const middleware = this.middlewares.find(mw => mw.name === name);
    if (middleware) {
      middleware.enabled = false;
    }
  }

  /**
   * Check if middleware exists
   * @param {string} name - Middleware name
   * @returns {boolean}
   */
  hasMiddleware(name) {
    return this.middlewares.some(mw => mw.name === name);
  }

  /**
   * Get middleware count
   * @returns {number}
   */
  getMiddlewareCount() {
    return this.middlewares.length;
  }

  /**
   * Get enabled middleware count
   * @returns {number}
   */
  getEnabledMiddlewareCount() {
    return this.middlewares.filter(mw => mw.enabled).length;
  }

  /**
   * Export middleware configuration
   * @returns {Array} Middleware config
   */
  exportConfig() {
    return this.middlewares.map(mw => ({
      name: mw.name,
      enabled: mw.enabled,
      required: mw.required,
      priority: mw.priority
    }));
  }

  /**
   * Create short-circuit result (stop middleware chain early)
   * @param {*} value - Value to return
   * @returns {Object} Short-circuit result
   */
  static shortCircuit(value) {
    return {
      __shortCircuit: true,
      context: value,
      result: value,
      code: value,
      executionResult: value
    };
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.ReasoningChainMiddleware = ReasoningChainMiddleware;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReasoningChainMiddleware;
}
