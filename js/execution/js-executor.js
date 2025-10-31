/**
 * JS Executor - Production-grade execution engine
 * Stateless, isolated, robust execution with proper async handling
 */

import { VaultManager } from '../storage/vault-manager.js';
import { Storage } from '../storage/storage.js';
import { generateId, nowISO } from '../core/utils.js';

/**
 * Console capture manager - ensures proper cleanup
 */
class ConsoleCapture {
  constructor() {
    this.logs = [];
    this.originalConsole = null;
  }

  start() {
    this.logs = [];
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn
    };

    const capture = (type) => (...args) => {
      const msg = args.map(a => {
        if (typeof a === 'object' && a !== null) {
          try { return JSON.stringify(a, null, 2); }
          catch { return String(a); }
        }
        return String(a);
      }).join(' ');

      this.logs.push({ type, message: msg });
      this.originalConsole[type].apply(console, args);
    };

    console.log = capture('log');
    console.error = capture('error');
    console.warn = capture('warn');
  }

  stop() {
    if (this.originalConsole) {
      console.log = this.originalConsole.log;
      console.error = this.originalConsole.error;
      console.warn = this.originalConsole.warn;
      this.originalConsole = null;
    }
  }

  getLogs() {
    return [...this.logs];
  }
}

/**
 * Code executor - handles sync and async code properly
 */
class CodeRunner {
  async execute(code) {
    // Detect if code contains await (requires async wrapper)
    const needsAsync = /\bawait\s/.test(code);

    if (needsAsync) {
      return await this.executeAsync(code);
    } else {
      return await this.executeSync(code);
    }
  }

  async executeSync(code) {
    // Execute in async context to handle promises
    const fn = new Function(`
      return (async () => {
        ${code}
      })();
    `);
    return await fn();
  }

  async executeAsync(code) {
    // Code has await - wrap in async function
    const fn = new Function(`
      return (async () => {
        ${code}
      })();
    `);
    return await fn();
  }
}

/**
 * Main executor
 */
export const JSExecutor = {
  /**
   * Execute JavaScript code with full isolation and error handling
   */
  async executeCode(rawCode) {
    const startTime = Date.now();
    const executionId = generateId('exec');

    // Create isolated instances
    const consoleCapture = new ConsoleCapture();
    const codeRunner = new CodeRunner();

    try {
      // Start console capture
      consoleCapture.start();

      // Resolve vault references
      const code = VaultManager.resolveVaultRefsInText(rawCode);

      // Execute code
      let result;
      try {
        result = await codeRunner.execute(code);
      } catch (execError) {
        // Stop console capture before throwing
        consoleCapture.stop();
        throw execError;
      }

      // Stop console capture
      consoleCapture.stop();

      const executionTime = Date.now() - startTime;
      const logs = consoleCapture.getLogs();

      // Build success result
      const executionResult = {
        id: executionId,
        success: true,
        code: rawCode,
        result,
        logs,
        executionTime,
        timestamp: nowISO()
      };

      // Persist
      this._persist(executionResult);

      // Update UI
      this._updateUI(executionResult);

      console.log(`✓ Execution ${executionId} completed in ${executionTime}ms`);
      return executionResult;

    } catch (error) {
      // Ensure console is restored
      consoleCapture.stop();

      const executionTime = Date.now() - startTime;
      const logs = consoleCapture.getLogs();

      // Build error result
      const executionResult = {
        id: executionId,
        success: false,
        code: rawCode,
        error: error.message,
        stack: error.stack,
        logs,
        executionTime,
        timestamp: nowISO()
      };

      // Persist error
      this._persist(executionResult);

      // Update UI with error
      this._updateUI(executionResult);

      console.error(`✗ Execution ${executionId} failed:`, error.message);
      return executionResult;
    }
  },

  /**
   * Persist execution result
   */
  _persist(result) {
    // Store execution result
    Storage.appendExecutionResult(result);

    // Save as last executed code
    if (result.success) {
      Storage.saveLastExecutedCode(result.code);
    }

    // Add to reasoning log for LLM
    const reasoningLog = Storage.loadReasoningLog();

    if (result.success) {
      const resultStr = result.result !== undefined
        ? JSON.stringify(result.result, null, 2)
        : 'undefined';
      const logsStr = result.logs.map(l => `[${l.type.toUpperCase()}] ${l.message}`).join('\n');

      reasoningLog.push(
        `=== JAVASCRIPT EXECUTION ===\n` +
        `ID: ${result.id}\n` +
        `TIME: ${result.executionTime}ms\n` +
        `CODE:\n${result.code}\n` +
        `CONSOLE OUTPUT:\n${logsStr || '(no output)'}\n` +
        `RETURN VALUE: ${resultStr}`
      );
    } else {
      reasoningLog.push(
        `=== JAVASCRIPT EXECUTION ERROR ===\n` +
        `ID: ${result.id}\n` +
        `CODE:\n${result.code}\n` +
        `ERROR: ${result.error}\n` +
        `STACK: ${result.stack || 'No stack trace'}`
      );
    }

    Storage.saveReasoningLog(reasoningLog);
  },

  /**
   * Update UI elements
   */
  _updateUI(result) {
    // Update code input
    const codeInput = document.querySelector('#codeInput');
    if (codeInput) {
      codeInput.value = result.code;
    }

    // Update execution output
    const execOutput = document.querySelector('#execOutput');
    if (execOutput) {
      if (result.error) {
        execOutput.textContent = `[ERROR] ${result.error}\n${result.stack || ''}`;
      } else {
        const output = [];

        // Add console logs
        if (result.logs && result.logs.length > 0) {
          result.logs.forEach(l => {
            output.push(`[${l.type.toUpperCase()}] ${l.message}`);
          });
        }

        // Add return value
        if (result.result !== undefined) {
          try {
            output.push(`[RETURN] ${JSON.stringify(result.result, null, 2)}`);
          } catch {
            output.push(`[RETURN] ${String(result.result)}`);
          }
        }

        execOutput.textContent = output.join('\n') || 'No output';
      }
    }

    // Update status pill
    const execStatus = document.querySelector('#execStatus');
    if (execStatus) {
      if (result.error) {
        execStatus.textContent = 'ERROR';
        execStatus.style.background = '#f48771';
        execStatus.style.color = 'white';
      } else {
        execStatus.textContent = 'AUTO-EXEC';
        execStatus.style.background = '#4CAF50';
        execStatus.style.color = 'white';

        // Reset after 3 seconds
        setTimeout(() => {
          execStatus.textContent = 'READY';
          execStatus.style.background = '';
          execStatus.style.color = '';
        }, 3000);
      }
    }
  }
};
