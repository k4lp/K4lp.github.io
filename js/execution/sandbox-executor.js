/**
 * SandboxExecutor
 *
 * Isolated code execution environment for sub-agents.
 * Does NOT pollute main session state or UI.
 *
 * Key features:
 * - Isolated execution context (no main session tracking)
 * - Console output capture
 * - Timeout protection
 * - WebTools and external API injection
 * - Reuses existing infrastructure (ConsoleCapture, buildExecutionContext)
 *
 * Architecture:
 * - Reuses ConsoleCapture for console interception
 * - Reuses buildExecutionContext for base APIs (vault, memory, tasks, goals, utils)
 * - Uses Function constructor for code execution (same as ExecutionRunner)
 * - Returns structured result compatible with execution infrastructure
 */

import { ConsoleCapture } from './console-capture.js';
import { buildExecutionContext } from './execution-context-api.js';
import { nowISO } from '../core/utils.js';
import { EXECUTION_DEFAULT_TIMEOUT_MS } from '../config/execution-config.js';

export class SandboxExecutor {

  /**
   * Create a new sandbox executor
   * @param {Object} options - Sandbox options
   * @param {Object} options.isolatedContext - Additional context to inject (e.g., WebTools)
   * @param {number} options.timeoutMs - Execution timeout in milliseconds
   * @param {boolean} options.instrumented - Whether to track execution in main session (default: false)
   */
  constructor(options = {}) {
    this.isolatedContext = options.isolatedContext || {};
    this.timeoutMs = Number(options.timeoutMs) > 0
      ? Number(options.timeoutMs)
      : EXECUTION_DEFAULT_TIMEOUT_MS;
    this.instrumented = options.instrumented !== undefined
      ? options.instrumented
      : false; // Default: no main session tracking
    this.consoleCapture = null;
  }

  /**
   * Execute code in isolated sandbox
   * @param {string} code - JavaScript code to execute
   * @returns {Promise<Object>} Execution result
   *
   * Result structure:
   * {
   *   success: boolean,
   *   result: any,              // Return value (if success)
   *   logs: Array,              // Console log entries
   *   consoleOutput: string,    // Formatted console output
   *   error: Object,            // Error info (if failed)
   *   executionTime: number,    // Duration in milliseconds
   *   startedAt: string,        // ISO timestamp
   *   finishedAt: string,       // ISO timestamp
   *   code: string,             // Executed code
   *   analysis: Object          // Code metrics
   * }
   */
  async execute(code) {
    const startedAt = Date.now();
    const analysis = this._analyzeCode(code);

    // Create isolated execution context
    // instrumented: false means no tracking in main session storage
    const baseContext = buildExecutionContext({
      instrumented: this.instrumented
    });

    // Merge base context with isolated context (e.g., WebTools)
    const executionContext = {
      ...baseContext,
      ...this.isolatedContext
    };

    // Start console capture
    this.consoleCapture = new ConsoleCapture();
    this.consoleCapture.start();

    try {
      // Execute with timeout protection
      const result = await this._executeWithTimeout(code, executionContext);
      const duration = Date.now() - startedAt;

      // Stop console capture
      const logs = this.consoleCapture.entries();
      this.consoleCapture.stop();

      return {
        success: true,
        result,
        logs,
        consoleOutput: this._formatLogs(logs),
        executionTime: duration,
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: nowISO(),
        code,
        analysis
      };

    } catch (error) {
      const duration = Date.now() - startedAt;

      // Stop console capture
      const logs = this.consoleCapture ? this.consoleCapture.entries() : [];
      if (this.consoleCapture) {
        this.consoleCapture.stop();
      }

      return {
        success: false,
        error: {
          name: error.name || 'Error',
          message: error.message || String(error),
          stack: error.stack || null
        },
        logs,
        consoleOutput: this._formatLogs(logs),
        executionTime: duration,
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: nowISO(),
        code,
        analysis
      };
    }
  }

  /**
   * Execute code with timeout protection
   * Injects all context APIs into execution environment
   * @private
   */
  async _executeWithTimeout(code, context) {
    // Normalize the code to handle both raw scripts and async IIFEs
    let codeToRun = code.trim();
    const isAsyncIIFE = codeToRun.startsWith('(async ()') && codeToRun.endsWith('})();');

    // If it's NOT an IIFE, wrap it in one so it can be awaited.
    // If it IS an IIFE, we'll just await it directly.
    if (!isAsyncIIFE) {
      codeToRun = '(async () => {\n' +
                  `  ${codeToRun}\n` +
                  '})()';
    }

    // Build parameter lists for Function constructor
    const contextKeys = Object.keys(context);
    const contextValues = contextKeys.map(key => context[key]);

    let runner;
    try {
      // Create function with injected context parameters
      runner = new Function(
        ...contextKeys,
        '"use strict";\n' +
        'return (async () => {\n' +
        `  return await ${codeToRun};\n` +
        '})();'
      );
    } catch (error) {
      error.message = `Compilation failed: ${error.message}`;
      throw error;
    }

    // Execute with context APIs injected
    const promise = runner(...contextValues);

    // Apply timeout if configured
    return this.timeoutMs
      ? await this._runWithTimeout(promise, this.timeoutMs)
      : promise;
  }

  /**
   * Run a promise with timeout enforcement
   * @private
   */
  _runWithTimeout(promise, timeoutMs) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let timer = null;

      const clear = () => {
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
      };

      if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
        timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            reject(new Error(`Sandbox execution timed out after ${timeoutMs}ms`));
          }
        }, timeoutMs);
      }

      promise
        .then((value) => {
          if (!settled) {
            settled = true;
            clear();
            resolve(value);
          }
        })
        .catch((err) => {
          if (!settled) {
            settled = true;
            clear();
            reject(err);
          }
        });
    });
  }

  /**
   * Analyze code for metrics
   * @private
   */
  _analyzeCode(code) {
    const normalized = typeof code === 'string' ? code : '';
    const trimmed = normalized.trim();
    const lineCount = trimmed.length === 0 ? 0 : trimmed.split(/\r?\n/).length;

    return {
      charCount: normalized.length,
      lineCount
    };
  }

  /**
   * Format log entries into readable string
   * @private
   */
  _formatLogs(logs) {
    if (!logs || logs.length === 0) {
      return '';
    }

    return logs
      .map(entry => `[${entry.type.toUpperCase()}] ${entry.message}`)
      .join('\n');
  }
}

/**
 * Convenience function to execute code in sandbox
 * @param {string} code - Code to execute
 * @param {Object} options - Sandbox options
 * @returns {Promise<Object>} Execution result
 *
 * @example
 * const result = await executeSandboxed('console.log("Hello"); return 42;', {
 *   isolatedContext: { WebTools: webToolsAPI },
 *   timeoutMs: 5000
 * });
 */
export async function executeSandboxed(code, options = {}) {
  const sandbox = new SandboxExecutor(options);
  return sandbox.execute(code);
}

export default SandboxExecutor;
