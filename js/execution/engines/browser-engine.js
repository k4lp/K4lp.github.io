/**
 * Browser Execution Engine
 *
 * Implementation of IExecutionEngine for browser-based code execution
 */

import { AsyncDetector } from '../../core/async-detector.js';

/**
 * BrowserExecutionEngine
 * Implements IExecutionEngine interface for executing code in the browser
 */
export class BrowserExecutionEngine {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000; // 30 seconds default
    this.capturedLogs = [];
    this.originalConsole = null;
  }

  /**
   * Execute code in the browser environment
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
      // Detect if code is async
      const isAsync = AsyncDetector.isAsyncCode(code);
      const complexity = AsyncDetector.getAsyncComplexity(code);

      // Execute with appropriate handler
      const result = isAsync ?
        await this._executeAsync(code, context) :
        this._executeSync(code, context);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result,
        output: result !== undefined ? String(result) : '',
        logs: this.capturedLogs,
        error: null,
        executionTime,
        wasAsync: isAsync,
        complexity: complexity.level,
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
        wasAsync: AsyncDetector.isAsyncCode(code),
        timestamp: new Date().toISOString()
      };

    } finally {
      this._stopConsoleCapture();
    }
  }

  /**
   * Cleanup resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    this._stopConsoleCapture();
    this.capturedLogs = [];
  }

  /**
   * Check if this engine supports a feature
   * @param {string} feature - Feature name
   * @returns {boolean}
   */
  supports(feature) {
    const supportedFeatures = {
      'async': true,
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
   * Execute synchronous code
   * @private
   */
  _executeSync(code, context) {
    // Inject context variables
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);

    // Create function with context
    const fn = new Function(...contextKeys, code);
    return fn(...contextValues);
  }

  /**
   * Execute asynchronous code
   * @private
   */
  async _executeAsync(code, context) {
    // Inject context variables
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);

    // Smart async wrapper that preserves returns
    const hasExplicitReturn = /\breturn\b/.test(code);

    const wrapper = `
      (async () => {
        ${code}
        ${hasExplicitReturn ? '' : '\n        return undefined;'}
      })()
    `;

    // Create function with context
    const fn = new Function(...contextKeys, `return ${wrapper}`);
    const promise = fn(...contextValues);

    // Timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`Async execution timeout (${this.timeout}ms)`)),
        this.timeout
      );
    });

    return await Promise.race([promise, timeoutPromise]);
  }

  /**
   * Start capturing console output
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
   * @private
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
   * @returns {Object}
   */
  getInfo() {
    return {
      name: 'BrowserExecutionEngine',
      environment: 'browser',
      timeout: this.timeout,
      features: {
        async: this.supports('async'),
        console: this.supports('console'),
        fetch: this.supports('fetch'),
        dom: this.supports('dom')
      }
    };
  }
}
