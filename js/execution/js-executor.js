/**
 * GDRS JavaScript Executor
 * Clean, modular async execution with intelligent detection
 */

import { VaultManager } from '../storage/vault-manager.js';
import { Storage } from '../storage/storage.js';
import { AsyncDetector } from '../core/async-detector.js';
import { generateId, nowISO } from '../core/utils.js';

export const JSExecutor = {
  /**
   * Execute JavaScript code with intelligent async detection
   */
  async executeCode(rawCode) {
    const startTime = Date.now();
    const executionId = generateId('exec');
    
    const originalConsole = this._captureConsole();
    const logs = [];
    
    try {
      // Resolve vault references
      const expandedCode = VaultManager.resolveVaultRefsInText(rawCode);
      const vaultRefsUsed = this._extractVaultRefs(rawCode);
      
      // Intelligent async detection (excluding comments/strings)
      const isAsync = AsyncDetector.isAsyncCode(expandedCode);
      const complexity = AsyncDetector.getAsyncComplexity(expandedCode);
      
      console.log(`\ud83d\udd04 Executing ${isAsync ? 'async' : 'sync'} code (complexity: ${complexity.level})`);
      
      // Execute with proper async handling
      const result = isAsync ? 
        await this._executeAsync(expandedCode) : 
        this._executeSync(expandedCode);
      
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
        wasAsync: isAsync,
        complexity: complexity.level,
        timestamp: nowISO()
      };
      
      this._persistExecution(executionResult);
      this._updateUI(executionResult);
      
      console.log(`\u2713 Execution completed (${executionTime}ms, ${isAsync ? 'async' : 'sync'})`);
      return executionResult;
      
    } catch (error) {
      return this._handleExecutionError(error, rawCode, executionId, startTime);
    } finally {
      this._restoreConsole(originalConsole);
    }
  },
  
  /**
   * Execute synchronous code
   */
  _executeSync(code) {
    const fn = new Function(code);
    return fn();
  },
  
  /**
   * Execute asynchronous code with proper wrapping
   */
  async _executeAsync(code) {
    // Smart async wrapper that preserves returns
    const hasExplicitReturn = /\breturn\b/.test(code);
    
    const wrapper = `
      (async () => {
        ${code}
        ${hasExplicitReturn ? '' : '\n        return undefined;'}
      })()
    `;
    
    const fn = new Function(`return ${wrapper}`);
    const promise = fn();
    
    // Timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Async execution timeout (30s)')), 30000);
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
      warn: console.warn
    };
    
    this._captureLogs = [];
    
    console.log = (...args) => {
      const message = args.map(this._formatArg).join(' ');
      this._captureLogs.push({ type: 'log', message });
      original.log.apply(console, args);
    };
    
    console.error = (...args) => {
      const message = args.map(this._formatArg).join(' ');
      this._captureLogs.push({ type: 'error', message });
      original.error.apply(console, args);
    };
    
    console.warn = (...args) => {
      const message = args.map(this._formatArg).join(' ');
      this._captureLogs.push({ type: 'warn', message });
      original.warn.apply(console, args);
    };
    
    return original;
  },
  
  /**
   * Restore original console
   */
  _restoreConsole(original) {
    Object.assign(console, original);
  },
  
  /**
   * Get captured logs
   */
  _getCaptureLogs() {
    return [...(this._captureLogs || [])];
  },
  
  /**
   * Format console arguments
   */
  _formatArg(arg) {
    if (typeof arg === 'object') {
      try { return JSON.stringify(arg, null, 2); } catch { return String(arg); }
    }
    return String(arg);
  },
  
  /**
   * Extract vault references from code
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
      wasAsync: result.wasAsync,
      complexity: result.complexity
    });
    
    // Add to reasoning log
    const logEntries = Storage.loadReasoningLog();
    logEntries.push(`=== JAVASCRIPT EXECUTION ===\nID: ${result.id}\nTYPE: ${result.wasAsync ? 'Async' : 'Sync'} (${result.complexity})\nTIME: ${result.executionTime}ms\nOUTPUT: ${result.logs.map(l => `[${l.type.toUpperCase()}] ${l.message}`).join('\n')}\nRESULT: ${result.result !== undefined ? JSON.stringify(result.result, null, 2) : 'undefined'}`);
    Storage.saveReasoningLog(logEntries);
  },
  
  /**
   * Handle execution errors
   */
  _handleExecutionError(error, rawCode, executionId, startTime) {
    const executionTime = Date.now() - startTime;
    
    const executionResult = {
      id: executionId,
      success: false,
      code: rawCode,
      error: error.message,
      stack: error.stack,
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
    logEntries.push(`=== JAVASCRIPT EXECUTION ERROR ===\nID: ${executionId}\nERROR: ${error.message}\nSTACK: ${error.stack || 'No stack trace'}`);
    Storage.saveReasoningLog(logEntries);
    
    this._updateUI({ error: error.message, stack: error.stack });
    console.error('\u2717 JavaScript execution failed:', error);
    return executionResult;
  },
  
  /**
   * Update UI with execution results
   */
  _updateUI(result) {
    setTimeout(() => {
      const execOutput = document.querySelector('#execOutput');
      if (execOutput) {
        if (result.error) {
          execOutput.textContent = `[ERROR] ${result.error}\n${result.stack || ''}`;
        } else if (result.logs) {
          const outputText = [
            ...result.logs.map(l => `[${l.type.toUpperCase()}] ${l.message}`),
            result.result !== undefined ? `[RETURN] ${JSON.stringify(result.result, null, 2)}` : ''
          ].filter(Boolean).join('\n');
          execOutput.textContent = outputText || 'No output';
        }
      }
    }, 50);
  }
};
