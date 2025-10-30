/**
 * Browser Execution Engine
 * Professional implementation of IExecutionEngine for browser-based code execution
 */

import { AsyncDetector } from '../../core/async-detector.js';

/**
 * BrowserExecutionEngine
 * Implements IExecutionEngine interface for executing code in the browser
 * with intelligent async detection and REPL-style implicit returns
 */
export class BrowserExecutionEngine {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000; // 30 seconds default
    this.capturedLogs = [];
    this.originalConsole = null;
  }

  /**
   * Execute code in the browser environment
   *
   * @param {string} code - JavaScript code to execute
   * @param {Object} context - Execution context (variables, vault access, etc.)
   * @returns {Promise<Object>} Execution result with output, logs, errors
   */
  async execute(code, context = {}) {
    const startTime = Date.now();
    this.capturedLogs = [];

    // Capture console output
    this._startConsoleCapture();

    try {
      // Detect if code requires async wrapping (only top-level await does)
      const requiresAsync = AsyncDetector.isAsyncCode(code);
      const complexity = AsyncDetector.getAsyncComplexity(code);

      // Execute with appropriate strategy
      let result;
      if (requiresAsync) {
        // Code has top-level await - must wrap in async function
        result = await this._executeAsync(code, context);
      } else {
        // Code may return a promise, but doesn't need async wrapping
        result = await this._executeSyncOrPromise(code, context);
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result,
        output: result !== undefined ? String(result) : '',
        logs: this.capturedLogs,
        error: null,
        executionTime,
        requiresAsync,
        complexity: complexity.level,
        features: complexity.features,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        result: null,
        output: '',
        logs: this.capturedLogs,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        executionTime,
        requiresAsync: AsyncDetector.isAsyncCode(code),
        timestamp: new Date().toISOString()
      };

    } finally {
      this._stopConsoleCapture();
    }
  }

  /**
   * Execute code that doesn't require async wrapper, but may return a promise
   * Implements REPL-style implicit return with context injection
   *
   * @private
   * @param {string} code - JavaScript code
   * @param {Object} context - Execution context variables
   * @returns {Promise<any>} Execution result
   */
  async _executeSyncOrPromise(code, context) {
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);
    let result;

    // Strategy 1: Try to execute as an expression (implicit return)
    try {
      const fn = new Function(...contextKeys, `return (${code.trim()})`);
      result = fn(...contextValues);
    } catch (expressionError) {
      // Strategy 2: If expression syntax fails, execute as statement block
      try {
        const fn = new Function(...contextKeys, code);
        result = fn(...contextValues);
      } catch (statementError) {
        // If both fail, throw the more relevant error
        throw statementError;
      }
    }

    // If result is a promise, await it with timeout protection
    if (result && typeof result.then === 'function') {
      return await this._withTimeout(result);
    }

    return result;
  }

  /**
   * Execute code that requires async context (has top-level await)
   * Implements REPL-style implicit return in async context with context injection
   *
   * @private
   * @param {string} code - JavaScript code with await
   * @param {Object} context - Execution context variables
   * @returns {Promise<any>} Execution result
   */
  async _executeAsync(code, context) {
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);
    const trimmedCode = code.trim();

    // Strategy 1: Try to execute as expression with implicit return
    try {
      const wrapper = `(async () => { return (${trimmedCode}) })()`;
      const fn = new Function(...contextKeys, `return ${wrapper}`);
      const promise = fn(...contextValues);
      return await this._withTimeout(promise);
    } catch (expressionError) {
      // Strategy 2: Execute as statement block
      try {
        const wrapper = `(async () => { ${code} })()`;
        const fn = new Function(...contextKeys, `return ${wrapper}`);
        const promise = fn(...contextValues);
        return await this._withTimeout(promise);
      } catch (statementError) {
        // If both fail, throw the more relevant error
        throw statementError;
      }
    }
  }

  /**
   * Wrap promise with timeout protection
   *
   * @private
   * @param {Promise} promise - Promise to protect
   * @returns {Promise<any>} Protected promise
   */
  async _withTimeout(promise) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`Execution timeout (${this.timeout}ms)`)),
        this.timeout
      );
    });

    return await Promise.race([promise, timeoutPromise]);
  }

  /**
   * Cleanup resources
   *
   * @returns {Promise<void>}
   */
  async cleanup() {
    this._stopConsoleCapture();
    this.capturedLogs = [];
  }

  /**
   * Check if this engine supports a feature
   *
   * @param {string} feature - Feature name
   * @returns {boolean}
   */
  supports(feature) {
    const supportedFeatures = {
      'async': true,
      'implicit-return': true,
      'context-injection': true,
      'promise-auto-await': true,
      'modules': false, // Browser engine doesn't support ES modules in eval
      'wasm': false,
      'workers': false,
      'console': true,
      'fetch': true,
      'dom': true,
      'timeout': true
    };

    return supportedFeatures[feature] || false;
  }

  /**
   * Start capturing console output
   *
   * @private
   */
  _startConsoleCapture() {
    this.capturedLogs = [];

    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug
    };

    const captureFunction = (type) => (...args) => {
      // Capture for logs
      this.capturedLogs.push({
        type,
        message: args.map(arg => this._formatLogArg(arg)).join(' '),
        timestamp: Date.now()
      });

      // Also output to real console
      this.originalConsole[type](...args);
    };

    console.log = captureFunction('log');
    console.error = captureFunction('error');
    console.warn = captureFunction('warn');
    console.info = captureFunction('info');
    console.debug = captureFunction('debug');
  }

  /**
   * Stop capturing console output
   *
   * @private
   */
  _stopConsoleCapture() {
    if (this.originalConsole) {
      console.log = this.originalConsole.log;
      console.error = this.originalConsole.error;
      console.warn = this.originalConsole.warn;
      console.info = this.originalConsole.info;
      console.debug = this.originalConsole.debug;
      this.originalConsole = null;
    }
  }

  /**
   * Format log argument for capture
   *
   * @private
   * @param {any} arg - Argument to format
   * @returns {string} Formatted argument
   */
  _formatLogArg(arg) {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';

    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }

    return String(arg);
  }

  /**
   * Get engine information
   *
   * @returns {Object}
   */
  getInfo() {
    return {
      name: 'BrowserExecutionEngine',
      environment: 'browser',
      timeout: this.timeout,
      features: {
        async: this.supports('async'),
        'implicit-return': this.supports('implicit-return'),
        'context-injection': this.supports('context-injection'),
        'promise-auto-await': this.supports('promise-auto-await'),
        console: this.supports('console'),
        fetch: this.supports('fetch'),
        dom: this.supports('dom')
      }
    };
  }
}
