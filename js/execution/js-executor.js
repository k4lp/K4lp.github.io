/**
 * JS Executor - Pure JS execution, no expression wrapping
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
      logs.push({ type: 'log', message: args.map(a => String(a)).join(' ') });
      originalLog.apply(console, args);
    };
    console.error = (...args) => {
      logs.push({ type: 'error', message: args.map(a => String(a)).join(' ') });
      originalError.apply(console, args);
    };
    console.warn = (...args) => {
      logs.push({ type: 'warn', message: args.map(a => String(a)).join(' ') });
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

      Storage.appendExecutionResult(executionResult);

      // Update UI
      const execOutput = document.querySelector('#execOutput');
      if (execOutput) {
        const output = [];
        logs.forEach(l => output.push(`[${l.type.toUpperCase()}] ${l.message}`));
        if (result !== undefined) {
          output.push(`[RETURN] ${JSON.stringify(result, null, 2)}`);
        }
        execOutput.textContent = output.join('\n') || 'No output';
      }

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

      const execOutput = document.querySelector('#execOutput');
      if (execOutput) {
        execOutput.textContent = `[ERROR] ${error.message}\n${error.stack || ''}`;
      }

      console.error('Execution failed:', error);
      return executionResult;
    }
  }
};
