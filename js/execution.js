/**
 * GDRS EXECUTION ENGINE - JavaScript execution environment for LLM-generated code
 * Handles secure execution with vault integration and result capture
 */

(function() {
  'use strict';

  /**
   * Advanced JavaScript Execution Engine
   */
  class ExecutionEngine {
    constructor() {
      this.executionHistory = [];
      this.maxHistorySize = 50;
    }

    /**
     * Execute JavaScript code with comprehensive error handling and result capture
     */
    async executeCode(code, options = {}) {
      const executionId = generateId('exec');
      const startTime = Date.now();
      
      const result = {
        id: executionId,
        timestamp: nowISO(),
        code: code,
        success: false,
        result: null,
        logs: [],
        errors: [],
        warnings: [],
        executionTime: 0,
        memoryUsage: this.getMemoryUsage()
      };

      try {
        // Resolve vault references
        const resolvedCode = this.resolveVaultReferences(code);
        result.resolvedCode = resolvedCode;

        // Create execution context
        const context = this.createExecutionContext(result);
        
        // Execute with timeout
        const timeout = options.timeout || 30000; // 30 seconds default
        const executionPromise = this.executeInContext(resolvedCode, context);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Execution timeout')), timeout);
        });

        const executionResult = await Promise.race([executionPromise, timeoutPromise]);
        
        result.success = true;
        result.result = executionResult;
        result.executionTime = Date.now() - startTime;

        logWithTime(`✓ JavaScript execution completed (${result.executionTime}ms)`, 'info');
        
      } catch (error) {
        result.success = false;
        result.error = error.message;
        result.stack = error.stack;
        result.executionTime = Date.now() - startTime;
        
        logWithTime(`✗ JavaScript execution failed: ${error.message}`, 'error');
      }

      // Store in history
      this.addToHistory(result);
      
      // Store in localStorage for LLM feedback
      this.persistExecution(result);
      
      return result;
    }

    /**
     * Resolve vault references in code
     */
    resolveVaultReferences(code) {
      if (typeof window.GDRS !== 'undefined' && window.GDRS.VaultManager) {
        return window.GDRS.VaultManager.resolveVaultRefsInText(code);
      }
      return resolveAllVaultReferences(code);
    }

    /**
     * Create secure execution context
     */
    createExecutionContext(result) {
      const capturedLogs = result.logs;
      const capturedErrors = result.errors;
      const capturedWarnings = result.warnings;
      
      return {
        // Console methods with capture
        console: {
          log: (...args) => {
            const message = args.map(arg => this.formatLogArgument(arg)).join(' ');
            capturedLogs.push({ level: 'log', message, timestamp: nowISO() });
            console.log('[EXECUTION]', ...args);
          },
          error: (...args) => {
            const message = args.map(arg => this.formatLogArgument(arg)).join(' ');
            capturedErrors.push({ message, timestamp: nowISO() });
            console.error('[EXECUTION ERROR]', ...args);
          },
          warn: (...args) => {
            const message = args.map(arg => this.formatLogArgument(arg)).join(' ');
            capturedWarnings.push({ message, timestamp: nowISO() });
            console.warn('[EXECUTION WARN]', ...args);
          },
          debug: (...args) => {
            const message = args.map(arg => this.formatLogArgument(arg)).join(' ');
            capturedLogs.push({ level: 'debug', message, timestamp: nowISO() });
            console.debug('[EXECUTION DEBUG]', ...args);
          },
          info: (...args) => {
            const message = args.map(arg => this.formatLogArgument(arg)).join(' ');
            capturedLogs.push({ level: 'info', message, timestamp: nowISO() });
            console.info('[EXECUTION INFO]', ...args);
          }
        },
        
        // Web APIs
        fetch: fetch.bind(window),
        localStorage: localStorage,
        sessionStorage: sessionStorage,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        setInterval: setInterval,
        clearInterval: clearInterval,
        
        // JavaScript built-ins
        JSON: JSON,
        Date: Date,
        Math: Math,
        String: String,
        Number: Number,
        Boolean: Boolean,
        Array: Array,
        Object: Object,
        RegExp: RegExp,
        Promise: Promise,
        
        // GDRS utilities
        generateId: generateId,
        nowISO: nowISO,
        safeStringify: safeStringify,
        safeJSONParse: safeJSONParse,
        
        // Vault access
        getVault: () => window.GDRS?.Storage?.loadVault() || [],
        getTasks: () => window.GDRS?.Storage?.loadTasks() || [],
        getMemory: () => window.GDRS?.Storage?.loadMemory() || [],
        getGoals: () => window.GDRS?.Storage?.loadGoals() || []
      };
    }

    /**
     * Execute code in context
     */
    async executeInContext(code, context) {
      // Create function with context as parameters
      const contextKeys = Object.keys(context);
      const contextValues = Object.values(context);
      
      const wrappedCode = `
        (async function() {
          try {
            ${code}
          } catch (error) {
            throw error;
          }
        })()
      `;
      
      // Create and execute function
      const fn = new Function(...contextKeys, `return ${wrappedCode}`);
      return await fn(...contextValues);
    }

    /**
     * Format log arguments for display
     */
    formatLogArgument(arg) {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'string') return arg;
      if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
      if (typeof arg === 'function') return `[Function: ${arg.name || 'anonymous'}]`;
      
      try {
        return JSON.stringify(arg, null, 2);
      } catch (error) {
        return `[Object: ${arg.constructor?.name || 'unknown'}]`;
      }
    }

    /**
     * Get memory usage information
     */
    getMemoryUsage() {
      if ('memory' in performance) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    }

    /**
     * Add execution to history
     */
    addToHistory(result) {
      this.executionHistory.unshift(result);
      if (this.executionHistory.length > this.maxHistorySize) {
        this.executionHistory = this.executionHistory.slice(0, this.maxHistorySize);
      }
    }

    /**
     * Persist execution result for LLM feedback
     */
    persistExecution(result) {
      try {
        if (window.GDRS?.Storage?.appendExecutionResult) {
          window.GDRS.Storage.appendExecutionResult(result);
        } else {
          // Fallback to localStorage
          const key = 'gdrs_execution_log';
          const log = safeJSONParse(localStorage.getItem(key), []);
          log.push(result);
          if (log.length > 100) log.splice(0, log.length - 100); // Keep last 100
          localStorage.setItem(key, JSON.stringify(log));
        }
      } catch (error) {
        console.error('Failed to persist execution result:', error);
      }
    }

    /**
     * Get execution history
     */
    getHistory() {
      return [...this.executionHistory];
    }

    /**
     * Clear execution history
     */
    clearHistory() {
      this.executionHistory = [];
    }

    /**
     * Get execution statistics
     */
    getStats() {
      const total = this.executionHistory.length;
      const successful = this.executionHistory.filter(r => r.success).length;
      const failed = total - successful;
      const avgExecutionTime = total > 0 ? 
        this.executionHistory.reduce((sum, r) => sum + r.executionTime, 0) / total : 0;
      
      return {
        total,
        successful,
        failed,
        successRate: total > 0 ? (successful / total) * 100 : 0,
        avgExecutionTime: Math.round(avgExecutionTime)
      };
    }
  }

  /**
   * Global execution engine instance
   */
  const executionEngine = new ExecutionEngine();

  /**
   * Enhanced JavaScript Executor for integration with main system
   */
  const EnhancedJSExecutor = {
    /**
     * Execute code using the advanced engine
     */
    async executeCode(code, options = {}) {
      return await executionEngine.executeCode(code, options);
    },

    /**
     * Execute multiple code blocks in sequence
     */
    async executeSequence(codeBlocks, options = {}) {
      const results = [];
      
      for (const code of codeBlocks) {
        const result = await this.executeCode(code, options);
        results.push(result);
        
        // Stop on first error unless continueOnError is true
        if (!result.success && !options.continueOnError) {
          break;
        }
      }
      
      return results;
    },

    /**
     * Get execution history
     */
    getHistory() {
      return executionEngine.getHistory();
    },

    /**
     * Get execution statistics
     */
    getStats() {
      return executionEngine.getStats();
    },

    /**
     * Clear execution history
     */
    clearHistory() {
      executionEngine.clearHistory();
    }
  };

  // Export to global scope
  if (typeof window !== 'undefined') {
    window.ExecutionEngine = ExecutionEngine;
    window.executionEngine = executionEngine;
    window.EnhancedJSExecutor = EnhancedJSExecutor;
    
    // Add to GDRS namespace
    window.GDRS = window.GDRS || {};
    Object.assign(window.GDRS, {
      ExecutionEngine,
      executionEngine,
      EnhancedJSExecutor
    });
  }

  logWithTime('Enhanced JavaScript Execution Engine initialized', 'info');
  
  // Export for module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ExecutionEngine, EnhancedJSExecutor };
  }
})();