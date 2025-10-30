/**
 * GDRS JavaScript Executor
 * Professional async execution with intelligent implicit return support
 */

import { VaultManager } from '../storage/vault-manager.js';
import { Storage } from '../storage/storage.js';
import { AsyncDetector } from '../core/async-detector.js';
import { generateId, nowISO } from '../core/utils.js';

export const JSExecutor = {
  /**
   * Execute JavaScript code with intelligent async/sync detection and implicit returns
   *
   * @param {string} rawCode - Raw JavaScript code to execute
   * @returns {Promise<Object>} Execution result
   */
  async executeCode(rawCode) {
    const startTime = Date.now();
    const executionId = generateId('exec');

    const originalConsole = this._captureConsole();

    try {
      // Resolve vault references
      const expandedCode = VaultManager.resolveVaultRefsInText(rawCode);
      const vaultRefsUsed = this._extractVaultRefs(rawCode);

      // Detect if code requires async wrapping (only top-level await does)
      const requiresAsync = AsyncDetector.isAsyncCode(expandedCode);
      const complexity = AsyncDetector.getAsyncComplexity(expandedCode);

      console.log(`🔄 Executing ${requiresAsync ? 'async' : 'sync/promise'} code (${complexity.level})`);

      // Execute with appropriate strategy
      let result;
      if (requiresAsync) {
        // Code has top-level await - must wrap in async function
        result = await this._executeAsync(expandedCode);
      } else {
        // Code may return a promise, but doesn't need async wrapping
        result = await this._executeSyncOrPromise(expandedCode);
      }

      const executionTime = Date.now() - startTime;

      // Build execution result
      const executionResult = {
        id: executionId,
        success: true,
        code: rawCode,
        expandedCode,
        result,
        logs: this._getCaptureLogs(),
        executionTime,
        vaultRefsUsed,
        requiresAsync,
        complexity: complexity.level,
        features: complexity.features,
        timestamp: nowISO()
      };

      this._persistExecution(executionResult);
      this._updateUI(executionResult);

      console.log(`✓ Execution completed in ${executionTime}ms`);
      return executionResult;

    } catch (error) {
      return this._handleExecutionError(error, rawCode, executionId, startTime);
    } finally {
      this._restoreConsole(originalConsole);
    }
  },

  /**
   * Execute code that doesn't require async wrapper, but may return a promise
   * Implements REPL-style implicit return
   *
   * @private
   * @param {string} code - JavaScript code
   * @returns {Promise<any>} Execution result
   */
  async _executeSyncOrPromise(code) {
    let result;

    // Strategy 1: Try to execute as an expression (implicit return)
    try {
      const fn = new Function(`return (${code.trim()})`);
      result = fn();
    } catch (expressionError) {
      // Strategy 2: If expression syntax fails, execute as statement block
      try {
        const fn = new Function(code);
        result = fn();
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
  },

  /**
   * Execute code that requires async context (has top-level await)
   * Implements REPL-style implicit return in async context
   *
   * @private
   * @param {string} code - JavaScript code with await
   * @returns {Promise<any>} Execution result
   */
  async _executeAsync(code) {
    const trimmedCode = code.trim();

    // Strategy 1: Try to execute as expression with implicit return
    try {
      const wrapper = `(async () => { return (${trimmedCode}) })()`;
      const fn = new Function(`return ${wrapper}`);
      const promise = fn();
      return await this._withTimeout(promise);
    } catch (expressionError) {
      // Strategy 2: Execute as statement block
      try {
        const wrapper = `(async () => { ${code} })()`;
        const fn = new Function(`return ${wrapper}`);
        const promise = fn();
        return await this._withTimeout(promise);
      } catch (statementError) {
        // If both fail, throw the more relevant error
        throw statementError;
      }
    }
  },

  /**
   * Wrap promise with timeout protection
   *
   * @private
   * @param {Promise} promise - Promise to protect
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<any>} Protected promise
   */
  async _withTimeout(promise, timeout = 30000) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`Execution timeout (${timeout}ms)`)),
        timeout
      );
    });

    return await Promise.race([promise, timeoutPromise]);
  },

  /**
   * Capture console output
   *
   * @private
   * @returns {Object} Original console methods
   */
  _captureConsole() {
    const original = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug
    };

    this._captureLogs = [];

    const createCaptureFunction = (type) => (...args) => {
      const message = args.map(this._formatArg).join(' ');
      this._captureLogs.push({ type, message, timestamp: Date.now() });
      original[type].apply(console, args);
    };

    console.log = createCaptureFunction('log');
    console.error = createCaptureFunction('error');
    console.warn = createCaptureFunction('warn');
    console.info = createCaptureFunction('info');
    console.debug = createCaptureFunction('debug');

    return original;
  },

  /**
   * Restore original console
   *
   * @private
   * @param {Object} original - Original console methods
   */
  _restoreConsole(original) {
    Object.assign(console, original);
  },

  /**
   * Get captured logs
   *
   * @private
   * @returns {Array} Captured log entries
   */
  _getCaptureLogs() {
    return [...(this._captureLogs || [])];
  },

  /**
   * Format console arguments
   *
   * @private
   * @param {any} arg - Argument to format
   * @returns {string} Formatted argument
   */
  _formatArg(arg) {
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
  },

  /**
   * Extract vault references from code
   *
   * @private
   * @param {string} code - JavaScript code
   * @returns {Array<string>} Vault reference IDs
   */
  _extractVaultRefs(code) {
    const refs = [];
    const regex = /{{<vaultref\s+id=["']([^"']+)["']\s*\/>}}/g;
    let match;
    while ((match = regex.exec(code)) !== null) {
      refs.push(match[1]);
    }
    return refs;
  },

  /**
   * Persist execution result
   *
   * @private
   * @param {Object} result - Execution result
   */
  _persistExecution(result) {
    Storage.appendExecutionResult(result);
    Storage.appendToolActivity({
      type: 'js_execute',
      action: 'execute',
      id: result.id,
      status: 'success',
      executionTime: result.executionTime,
      codeSize: result.code.length,
      vaultRefsUsed: result.vaultRefsUsed.length,
      requiresAsync: result.requiresAsync,
      complexity: result.complexity,
      features: result.features
    });

    // Add to reasoning log
    const logEntries = Storage.loadReasoningLog();
    const resultStr = result.result !== undefined ?
      JSON.stringify(result.result, null, 2) : 'undefined';
    const logsStr = result.logs.map(l => `[${l.type.toUpperCase()}] ${l.message}`).join('\n');

    logEntries.push(
      `=== JAVASCRIPT EXECUTION ===\n` +
      `ID: ${result.id}\n` +
      `TYPE: ${result.requiresAsync ? 'Async' : 'Sync/Promise'} (${result.complexity})\n` +
      `FEATURES: ${result.features.join(', ') || 'none'}\n` +
      `TIME: ${result.executionTime}ms\n` +
      `LOGS:\n${logsStr || '(no logs)'}\n` +
      `RESULT: ${resultStr}`
    );
    Storage.saveReasoningLog(logEntries);
  },

  /**
   * Handle execution errors
   *
   * @private
   * @param {Error} error - Error object
   * @param {string} rawCode - Original code
   * @param {string} executionId - Execution ID
   * @param {number} startTime - Execution start time
   * @returns {Object} Error result
   */
  _handleExecutionError(error, rawCode, executionId, startTime) {
    const executionTime = Date.now() - startTime;

    const executionResult = {
      id: executionId,
      success: false,
      code: rawCode,
      error: error.message,
      stack: error.stack,
      logs: this._getCaptureLogs(),
      executionTime,
      timestamp: nowISO()
    };

    Storage.appendExecutionResult(executionResult);
    Storage.appendToolActivity({
      type: 'js_execute',
      action: 'execute',
      id: executionId,
      status: 'error',
      error: error.message,
      executionTime,
      codeSize: rawCode.length
    });

    const logEntries = Storage.loadReasoningLog();
    logEntries.push(
      `=== JAVASCRIPT EXECUTION ERROR ===\n` +
      `ID: ${executionId}\n` +
      `ERROR: ${error.message}\n` +
      `STACK: ${error.stack || 'No stack trace'}`
    );
    Storage.saveReasoningLog(logEntries);

    this._updateUI({ error: error.message, stack: error.stack });
    console.error('✗ JavaScript execution failed:', error);
    return executionResult;
  },

  /**
   * Update UI with execution results
   *
   * @private
   * @param {Object} result - Execution result
   */
  _updateUI(result) {
    setTimeout(() => {
      const execOutput = document.querySelector('#execOutput');
      if (execOutput) {
        if (result.error) {
          execOutput.textContent = `[ERROR] ${result.error}\n${result.stack || ''}`;
        } else if (result.logs || result.result !== undefined) {
          const logLines = (result.logs || []).map(l => `[${l.type.toUpperCase()}] ${l.message}`);

          if (result.result !== undefined) {
            logLines.push(`[RETURN] ${JSON.stringify(result.result, null, 2)}`);
          }

          execOutput.textContent = logLines.join('\n') || 'No output';
        }
      }
    }, 50);
  }
};
