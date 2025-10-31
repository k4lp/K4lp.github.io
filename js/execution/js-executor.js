/**
 * JS Executor - Bare metal execution
 */

import { VaultManager } from '../storage/vault-manager.js';
import { Storage } from '../storage/storage.js';
import { generateId, nowISO } from '../core/utils.js';

export const JSExecutor = {
  async executeCode(rawCode) {
    const startTime = Date.now();
    const executionId = generateId('exec');

    // Capture console
    const logs = [];
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      const msg = args.map(a => {
        if (typeof a === 'object') {
          try { return JSON.stringify(a, null, 2); } catch { return String(a); }
        }
        return String(a);
      }).join(' ');
      logs.push({ type: 'log', message: msg });
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      const msg = args.map(a => String(a)).join(' ');
      logs.push({ type: 'error', message: msg });
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      const msg = args.map(a => String(a)).join(' ');
      logs.push({ type: 'warn', message: msg });
      originalWarn.apply(console, args);
    };

    try {
      // Resolve vault refs
      const code = VaultManager.resolveVaultRefsInText(rawCode);

      // Execute in async context
      const fn = new Function(`return (async () => { ${code} })()`);
      const result = await fn();

      // Restore console
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;

      const executionResult = {
        id: executionId,
        success: true,
        code: rawCode,
        result,
        logs,
        executionTime: Date.now() - startTime,
        timestamp: nowISO()
      };

      // Store result
      Storage.appendExecutionResult(executionResult);

      // Save as last executed
      Storage.saveLastExecutedCode(rawCode);

      // Update UI immediately
      this._updateUI(executionResult);

      console.log(`✓ Execution completed in ${executionResult.executionTime}ms`);
      return executionResult;

    } catch (error) {
      // Restore console
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;

      const executionResult = {
        id: executionId,
        success: false,
        code: rawCode,
        error: error.message,
        stack: error.stack,
        logs,
        executionTime: Date.now() - startTime,
        timestamp: nowISO()
      };

      Storage.appendExecutionResult(executionResult);
      this._updateUI(executionResult);

      console.error('✗ Execution failed:', error);
      return executionResult;
    }
  },

  _updateUI(result) {
    // Update code input with last executed code
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
        if (result.logs && result.logs.length > 0) {
          result.logs.forEach(l => output.push(`[${l.type.toUpperCase()}] ${l.message}`));
        }
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
