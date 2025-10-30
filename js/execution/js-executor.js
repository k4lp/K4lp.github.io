/**
 * GDRS JavaScript Executor
 * Simple execution - all code treated as async, focus on getting output
 */

import { VaultManager } from '../storage/vault-manager.js';
import { Storage } from '../storage/storage.js';
import { generateId, nowISO } from '../core/utils.js';

export const JSExecutor = {
  /**
   * Execute JavaScript code - all wrapped in async context
   */
  async executeCode(rawCode) {
    const startTime = Date.now();
    const executionId = generateId('exec');

    const originalConsole = this._captureConsole();

    try {
      const expandedCode = VaultManager.resolveVaultRefsInText(rawCode);
      const vaultRefsUsed = this._extractVaultRefs(rawCode);

      const result = await this._execute(expandedCode);

      const executionTime = Date.now() - startTime;

      const executionResult = {
        id: executionId,
        success: true,
        code: rawCode,
        expandedCode,
        result,
        logs: this._getCaptureLogs(),
        executionTime,
        vaultRefsUsed,
        timestamp: nowISO()
      };

      this._persistExecution(executionResult);
      this._updateUI(executionResult);

      return executionResult;

    } catch (error) {
      return this._handleExecutionError(error, rawCode, executionId, startTime);
    } finally {
      this._restoreConsole(originalConsole);
    }
  },

  /**
   * Execute code with smart implicit return handling
   */
  async _execute(code) {
    // Wrap in async IIFE with smart return handling
    // This handles both expressions and multi-statement code
    const wrapper = `
      (async () => {
        let __result__;
        try {
          // Try to capture as expression
          __result__ = (${code.trim()});
          return __result__;
        } catch (__exprError__) {
          // Execute as statements
          ${code}
        }
      })()
    `;

    const fn = new Function(`return ${wrapper}`);
    const promise = fn();
    return await this._withTimeout(promise);
  },

  /**
   * Wrap promise with timeout protection
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

    const createCapture = (type) => (...args) => {
      const message = args.map(this._formatArg).join(' ');
      this._captureLogs.push({ type, message });
      original[type].apply(console, args);
    };

    console.log = createCapture('log');
    console.error = createCapture('error');
    console.warn = createCapture('warn');
    console.info = createCapture('info');
    console.debug = createCapture('debug');

    return original;
  },

  _restoreConsole(original) {
    Object.assign(console, original);
  },

  _getCaptureLogs() {
    return [...(this._captureLogs || [])];
  },

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

  _extractVaultRefs(code) {
    const refs = [];
    const regex = /{{<vaultref\s+id=["']([^"']+)["']\s*\/>}}/g;
    let match;
    while ((match = regex.exec(code)) !== null) {
      refs.push(match[1]);
    }
    return refs;
  },

  _persistExecution(result) {
    Storage.appendExecutionResult(result);
    Storage.appendToolActivity({
      type: 'js_execute',
      action: 'execute',
      id: result.id,
      status: 'success',
      executionTime: result.executionTime,
      codeSize: result.code.length,
      vaultRefsUsed: result.vaultRefsUsed.length
    });

    const logEntries = Storage.loadReasoningLog();
    const resultStr = result.result !== undefined ?
      JSON.stringify(result.result, null, 2) : 'undefined';
    const logsStr = result.logs.map(l => `[${l.type.toUpperCase()}] ${l.message}`).join('\n');

    logEntries.push(
      `=== JAVASCRIPT EXECUTION ===\n` +
      `ID: ${result.id}\n` +
      `TIME: ${result.executionTime}ms\n` +
      `LOGS:\n${logsStr || '(no logs)'}\n` +
      `RESULT: ${resultStr}`
    );
    Storage.saveReasoningLog(logEntries);
  },

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
    console.error('✗ Execution failed:', error);
    return executionResult;
  },

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
