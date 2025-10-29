/**
 * GDRS JavaScript Executor
 * Auto JavaScript execution from LLM responses
 */

import { VaultManager } from '../storage/vault-manager.js';
import { Storage } from '../storage/storage.js';
import { generateId, nowISO } from '../core/utils.js';

export const JSExecutor = {
  executeCode(rawCode) {
    const startTime = Date.now();
    const executionId = generateId('exec');
    
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    try {
      // Resolve vault references in the code
      const expandedCode = VaultManager.resolveVaultRefsInText(rawCode);
      
      // Track vault references used
      const vaultRefsUsed = [];
      const vaultRefRegex = /{{<vaultref\s+id=["']([^"']+)["']\s*\/>}}/g;
      let vaultMatch;
      while ((vaultMatch = vaultRefRegex.exec(rawCode)) !== null) {
        vaultRefsUsed.push(vaultMatch[1]);
      }
      
      // Capture console output
      const logs = [];
      
      console.log = (...args) => {
        const message = args.map(arg => {
          if (typeof arg === 'object') {
            try { return JSON.stringify(arg, null, 2); } catch { return String(arg); }
          }
          return String(arg);
        }).join(' ');
        logs.push({ type: 'log', message });
        originalLog.apply(console, args);
      };
      
      console.error = (...args) => {
        const message = args.map(arg => String(arg)).join(' ');
        logs.push({ type: 'error', message });
        originalError.apply(console, args);
      };
      
      console.warn = (...args) => {
        const message = args.map(arg => String(arg)).join(' ');
        logs.push({ type: 'warn', message });
        originalWarn.apply(console, args);
      };

      // Execute the code
      const fn = new Function(expandedCode);
      const result = fn();
      const executionTime = Date.now() - startTime;
      
      // Store execution result
      const executionResult = {
        id: executionId,
        success: true,
        code: rawCode,
        expandedCode: expandedCode,
        result: result,
        logs: logs,
        executionTime: executionTime,
        vaultRefsUsed: vaultRefsUsed,
        timestamp: nowISO()
      };
      
      Storage.appendExecutionResult(executionResult);
      Storage.appendToolActivity({
        type: 'js_execute',
        action: 'execute',
        id: executionId,
        status: 'success',
        executionTime: executionTime,
        codeSize: rawCode.length,
        vaultRefsUsed: vaultRefsUsed.length,
        logsCount: logs.length
      });
      
      // Add execution result to reasoning log
      const logEntries = Storage.loadReasoningLog();
      const executionSummary = `=== JAVASCRIPT EXECUTION RESULT ===\nSUCCESS: true\nCONSOLE OUTPUT:\n${logs.map(l => `[${l.type.toUpperCase()}] ${l.message}`).join('\n')}\nRETURN VALUE:\n${result ? JSON.stringify(result, null, 2) : 'undefined'}`;
      logEntries.push(executionSummary);
      Storage.saveReasoningLog(logEntries);
      
      // Update the console output in the UI
      setTimeout(() => {
        const execOutput = document.querySelector('#execOutput');
        if (execOutput) {
          const outputText = [
            ...logs.map(l => `[${l.type.toUpperCase()}] ${l.message}`),
            result !== undefined ? `[RETURN] ${JSON.stringify(result, null, 2)}` : ''
          ].filter(Boolean).join('\n');
          execOutput.textContent = outputText || 'No output';
        }
      }, 50);
      
      console.log(`✓ JavaScript execution completed successfully (${executionTime}ms)`);
      return executionResult;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      const executionResult = {
        id: executionId,
        success: false,
        code: rawCode,
        error: error.message,
        stack: error.stack,
        executionTime: executionTime,
        timestamp: nowISO()
      };
      
      Storage.appendExecutionResult(executionResult);
      Storage.appendToolActivity({
        type: 'js_execute',
        action: 'execute',
        id: executionId,
        status: 'error',
        error: error.message,
        executionTime: executionTime,
        codeSize: rawCode.length
      });
      
      // Add to reasoning log for LLM feedback
      const logEntries = Storage.loadReasoningLog();
      logEntries.push(`=== JAVASCRIPT EXECUTION RESULT ===\nSUCCESS: false\nERROR: ${error.message}\nSTACK: ${error.stack}`);
      Storage.saveReasoningLog(logEntries);
      
      // Update the console output in the UI
      setTimeout(() => {
        const execOutput = document.querySelector('#execOutput');
        if (execOutput) {
          execOutput.textContent = `[ERROR] ${error.message}\n${error.stack || ''}`;
        }
      }, 50);
      
      console.error('✗ JavaScript execution failed:', error);
      return executionResult;
    } finally {
      // Always restore console functions
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    }
  }
};