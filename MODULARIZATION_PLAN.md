# GDRS Reasoning Chain & Code Execution - Modularization Plan

## Executive Summary

This plan outlines a comprehensive refactoring of the GDRS reasoning chain and code execution environment to achieve:

1. **Extreme Modularity**: Separation of concerns with pluggable components
2. **Advanced Error Handling**: Retry without context pollution, intelligent recovery
3. **Future-Ready**: Easy to add features like context compaction, adaptive strategies
4. **Clean Architecture**: Strategy pattern, state machines, middleware pipelines
5. **Observability**: Rich metrics and monitoring for debugging and optimization

---

## Current Architecture Issues

### 1. Execution System Issues
- **Monolithic Runner**: Execution logic mixed with error handling, context building
- **Limited Retry Logic**: No sophisticated retry strategies
- **Context Pollution**: Errors accumulate in logs, affecting future iterations
- **No Execution Strategies**: Cannot switch between safe mode, aggressive mode, etc.

### 2. Reasoning Chain Issues
- **Tight Coupling**: Loop controller does too much (orchestration + error recovery + state management)
- **Limited Error Recovery**: Only handles reference errors, not syntax/runtime errors
- **No Compaction**: Context grows unbounded
- **No Middleware**: Cannot inject custom processing between stages

### 3. Configuration Issues
- **Scattered Policies**: Retry logic, error handling spread across files
- **Hard to Customize**: Cannot easily change behavior without modifying core code
- **No Runtime Adaptation**: Cannot adjust strategies based on error patterns

---

## New Architecture Overview

### Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│                  (loop-controller.js)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                  Session Management Layer                    │
│     (reasoning-session-manager, session-state-machine)       │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                   Middleware Layer                           │
│   (reasoning-chain-middleware, pre/post processors)          │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                 Core Processing Layer                        │
│   (reasoning-engine, context-builder, parser, pipeline)      │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│              Execution Strategy Layer                        │
│    (execution-strategy-base, retry/safe/standard modes)      │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│             Error Processing Layer                           │
│   (error-classifier, context-cleaner, recovery-pipeline)     │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                   Policy Layer                               │
│    (execution-policy, retry-policy, recovery-policy)         │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                Observability Layer                           │
│       (metrics-collector, tracer, health-monitor)            │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Execution Environment Modularization

### 1.1 Execution State Machine

**File**: `js/execution/core/execution-state-machine.js`

**Purpose**: Formal state transitions for code execution lifecycle

**States**:
```javascript
STATES = {
  PENDING: 'pending',           // Queued, not started
  PREPARING: 'preparing',       // Analyzing code, expanding references
  EXECUTING: 'executing',       // Running code
  COMPLETED: 'completed',       // Success
  FAILED: 'failed',             // Error occurred
  TIMEOUT: 'timeout',           // Execution timed out
  RETRYING: 'retrying',         // Attempting retry
  CANCELLED: 'cancelled'        // Manually cancelled
}

TRANSITIONS = {
  pending -> preparing -> executing -> completed
                       -> failed -> retrying -> preparing
                       -> timeout -> retrying -> preparing
                       -> cancelled
}
```

**API**:
```javascript
class ExecutionStateMachine {
  constructor(executionId)

  transition(toState, metadata) // Validates and transitions
  getCurrentState()
  getStateHistory()             // For debugging
  canTransitionTo(state)        // Validation
  on(state, callback)           // Event listeners
  onAny(callback)               // Listen to all transitions
}
```

**Benefits**:
- **Prevents invalid transitions**: Can't go from completed to executing
- **Audit trail**: Full history of state changes
- **Event hooks**: React to specific state transitions
- **Debugging**: Clear view of execution lifecycle

---

### 1.2 Execution Strategy Pattern

**Base Strategy**: `js/execution/strategies/execution-strategy-base.js`

```javascript
/**
 * Base class for execution strategies
 * Subclasses implement different execution behaviors
 */
class ExecutionStrategyBase {
  constructor(config)

  // Main execution method - must be implemented
  async execute(request, runner)

  // Hooks for customization
  async beforeExecution(request)
  async afterExecution(result)
  async onError(error, request)

  // Strategy configuration
  shouldRetry(error, attemptCount)
  getRetryDelay(attemptCount)
  shouldCleanContext(error)
  getMaxAttempts()
}
```

**Concrete Strategies**:

#### 1.2.1 Standard Execution Strategy
**File**: `js/execution/strategies/standard-execution-strategy.js`

- Single attempt execution
- No retry logic
- Reports all errors
- Default behavior

#### 1.2.2 Retry Execution Strategy
**File**: `js/execution/strategies/retry-execution-strategy.js`

- Configurable max attempts (default: 3)
- Exponential backoff
- Error classification - only retries transient errors
- Context cleaning between retries

```javascript
class RetryExecutionStrategy extends ExecutionStrategyBase {
  constructor(config = {}) {
    super(config);
    this.maxAttempts = config.maxAttempts || 3;
    this.baseDelay = config.baseDelay || 1000;
    this.retryableErrors = config.retryableErrors || [
      'ReferenceError',
      'NetworkError',
      'TimeoutError'
    ];
  }

  shouldRetry(error, attemptCount) {
    if (attemptCount >= this.maxAttempts) return false;
    return this.retryableErrors.includes(error.name);
  }

  getRetryDelay(attemptCount) {
    return this.baseDelay * Math.pow(2, attemptCount - 1);
  }

  async execute(request, runner) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        // Clean context if retrying after error
        if (attempt > 1) {
          await this.cleanExecutionContext(request, lastError);
        }

        const result = await runner.run(request);

        if (result.success) {
          return result;
        }

        lastError = result.error;

        if (!this.shouldRetry(lastError, attempt)) {
          return result;
        }

        await this.sleep(this.getRetryDelay(attempt));

      } catch (error) {
        lastError = error;
        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }
      }
    }

    throw lastError;
  }
}
```

#### 1.2.3 Safe Mode Execution Strategy
**File**: `js/execution/strategies/safe-mode-execution-strategy.js`

- Pre-execution validation
- Sandboxing checks
- Conservative timeouts
- No retries on failure
- Detailed error reporting

```javascript
class SafeModeExecutionStrategy extends ExecutionStrategyBase {
  async beforeExecution(request) {
    // Validate code doesn't contain dangerous patterns
    this.validateCodeSafety(request.code);

    // Check for infinite loop patterns
    this.checkForInfiniteLoops(request.code);

    // Ensure conservative timeout
    request.timeoutMs = Math.min(request.timeoutMs || 10000, 10000);
  }

  validateCodeSafety(code) {
    const dangerousPatterns = [
      /while\s*\(\s*true\s*\)/,
      /for\s*\(\s*;\s*;\s*\)/,
      /\.innerHTML\s*=/,
      /document\.write/,
      /eval\s*\(/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(`Potentially dangerous code pattern detected: ${pattern}`);
      }
    }
  }
}
```

---

### 1.3 Execution Context Manager

**File**: `js/execution/context/execution-context-manager.js`

**Purpose**: Manages execution contexts separately from execution logic

```javascript
class ExecutionContextManager {
  constructor() {
    this.contexts = new Map();
    this.contextSnapshots = new Map();
  }

  /**
   * Create a new execution context
   */
  createContext(executionId, options = {}) {
    const context = {
      id: executionId,
      apis: this.buildApis(options),
      globals: this.buildGlobals(options),
      restrictions: options.restrictions || {},
      createdAt: new Date().toISOString(),
      snapshot: this.createSnapshot()
    };

    this.contexts.set(executionId, context);
    return context;
  }

  /**
   * Get existing context or create new one
   */
  getContext(executionId, options) {
    if (this.contexts.has(executionId)) {
      return this.contexts.get(executionId);
    }
    return this.createContext(executionId, options);
  }

  /**
   * Create snapshot of current state
   * Used for restoring state after failed executions
   */
  createSnapshot() {
    return {
      vault: Storage.getVault(),
      memory: Storage.getMemory(),
      tasks: Storage.getTasks(),
      goals: Storage.getGoals(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Restore context to previous snapshot
   * Used when retrying after error
   */
  restoreSnapshot(executionId) {
    const context = this.contexts.get(executionId);
    if (!context || !context.snapshot) {
      return false;
    }

    Storage.saveVault(context.snapshot.vault);
    Storage.saveMemory(context.snapshot.memory);
    Storage.saveTasks(context.snapshot.tasks);
    Storage.saveGoals(context.snapshot.goals);

    return true;
  }

  /**
   * Clean context - remove error traces
   */
  cleanContext(executionId, error) {
    const context = this.contexts.get(executionId);
    if (!context) return;

    // Remove failed entity access logs
    if (error.name === 'ReferenceError') {
      // Clear API access tracker failed attempts
      window.ApiAccessTracker?.clearFailedAccesses?.();
    }

    // Don't add error to execution log
    // (will be handled separately by error recovery)
  }

  /**
   * Dispose context after execution
   */
  disposeContext(executionId) {
    this.contexts.delete(executionId);
    this.contextSnapshots.delete(executionId);
  }

  buildApis(options) {
    // Delegate to existing execution-context-api.js
    return buildExecutionContext();
  }

  buildGlobals(options) {
    return {
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
      console,
      Promise,
      ...options.additionalGlobals
    };
  }
}
```

---

### 1.4 Execution Result Handler

**File**: `js/execution/results/execution-result-handler.js`

**Purpose**: Uniform processing of execution results

```javascript
class ExecutionResultHandler {
  constructor(config = {}) {
    this.config = config;
    this.transformers = [];
    this.aggregator = new ResultAggregator();
  }

  /**
   * Register result transformer
   */
  registerTransformer(transformer) {
    this.transformers.push(transformer);
  }

  /**
   * Process execution result
   */
  async process(rawResult) {
    let result = rawResult;

    // Apply transformers in order
    for (const transformer of this.transformers) {
      result = await transformer.transform(result);
    }

    // Classify result
    result.classification = this.classifyResult(result);

    // Aggregate metrics
    this.aggregator.add(result);

    // Decide if should be logged
    result.shouldLog = this.shouldLog(result);

    // Decide if should trigger retry
    result.shouldRetry = this.shouldRetry(result);

    return result;
  }

  classifyResult(result) {
    if (result.success) {
      return {
        category: 'success',
        severity: 'info'
      };
    }

    const error = result.error;

    if (error.name === 'SyntaxError') {
      return {
        category: 'syntax_error',
        severity: 'high',
        retryable: false,
        requiresReasoningFix: true
      };
    }

    if (error.name === 'ReferenceError') {
      return {
        category: 'reference_error',
        severity: 'medium',
        retryable: true,
        requiresContextCleaning: true,
        requiresReasoningFix: true
      };
    }

    if (error.message?.includes('timeout')) {
      return {
        category: 'timeout',
        severity: 'medium',
        retryable: true,
        requiresOptimization: true
      };
    }

    return {
      category: 'runtime_error',
      severity: 'medium',
      retryable: false,
      requiresReasoningFix: true
    };
  }

  shouldLog(result) {
    // Don't log intermediate retry attempts
    if (result.isRetry && !result.isFinalAttempt) {
      return false;
    }

    // Always log final results
    return true;
  }

  shouldRetry(result) {
    if (result.success) return false;

    const classification = result.classification;
    return classification.retryable &&
           result.attemptCount < this.config.maxRetries;
  }

  getAggregatedMetrics() {
    return this.aggregator.getMetrics();
  }
}
```

---

## Phase 2: Error Handling & Recovery Modularization

### 2.1 Error Classifier

**File**: `js/execution/error-handling/error-classifier.js`

**Purpose**: Categorize errors and determine handling strategy

```javascript
class ErrorClassifier {
  constructor() {
    this.classificationRules = this.buildClassificationRules();
  }

  /**
   * Classify an error
   */
  classify(error) {
    for (const rule of this.classificationRules) {
      if (rule.matches(error)) {
        return rule.classification;
      }
    }

    return this.getDefaultClassification();
  }

  buildClassificationRules() {
    return [
      // Syntax Errors
      {
        matches: (error) => error.name === 'SyntaxError',
        classification: {
          type: 'SYNTAX_ERROR',
          category: 'compile_time',
          severity: 'high',
          retryable: false,
          requiresReasoning: true,
          cleanContext: false,
          message: 'Code has syntax errors'
        }
      },

      // Reference Errors - Undefined Variables
      {
        matches: (error) =>
          error.name === 'ReferenceError' &&
          /is not defined/.test(error.message),
        classification: {
          type: 'UNDEFINED_REFERENCE',
          category: 'runtime',
          severity: 'medium',
          retryable: true,
          requiresReasoning: true,
          cleanContext: true,
          message: 'Undefined variable or reference'
        }
      },

      // Reference Errors - Entity Not Found (vault, memory, etc.)
      {
        matches: (error) =>
          error.name === 'ReferenceError' &&
          /not found|does not exist/.test(error.message),
        classification: {
          type: 'ENTITY_NOT_FOUND',
          category: 'runtime',
          severity: 'medium',
          retryable: true,
          requiresReasoning: true,
          cleanContext: true,
          message: 'Referenced entity does not exist'
        }
      },

      // Type Errors
      {
        matches: (error) => error.name === 'TypeError',
        classification: {
          type: 'TYPE_ERROR',
          category: 'runtime',
          severity: 'medium',
          retryable: false,
          requiresReasoning: true,
          cleanContext: false,
          message: 'Type mismatch or invalid operation'
        }
      },

      // Timeout Errors
      {
        matches: (error) =>
          error.message?.includes('timeout') ||
          error.message?.includes('timed out'),
        classification: {
          type: 'TIMEOUT',
          category: 'execution',
          severity: 'medium',
          retryable: true,
          requiresReasoning: false,
          cleanContext: true,
          optimizationHint: 'Consider code optimization or longer timeout',
          message: 'Execution exceeded timeout limit'
        }
      },

      // Network Errors (for future API calls)
      {
        matches: (error) =>
          error.name === 'NetworkError' ||
          /network|fetch|xhr/.test(error.message),
        classification: {
          type: 'NETWORK_ERROR',
          category: 'external',
          severity: 'low',
          retryable: true,
          requiresReasoning: false,
          cleanContext: false,
          message: 'Network operation failed'
        }
      }
    ];
  }

  getDefaultClassification() {
    return {
      type: 'UNKNOWN_ERROR',
      category: 'runtime',
      severity: 'high',
      retryable: false,
      requiresReasoning: true,
      cleanContext: false,
      message: 'Unknown error occurred'
    };
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error) {
    return this.classify(error).retryable;
  }

  /**
   * Check if error requires context cleaning
   */
  shouldCleanContext(error) {
    return this.classify(error).cleanContext;
  }

  /**
   * Check if error requires reasoning chain fix
   */
  requiresReasoning(error) {
    return this.classify(error).requiresReasoning;
  }
}
```

---

### 2.2 Error Context Cleaner

**File**: `js/execution/error-handling/error-context-cleaner.js`

**Purpose**: Remove error traces from context before retry

```javascript
class ErrorContextCleaner {
  constructor() {
    this.cleaningStrategies = new Map();
    this.initializeStrategies();
  }

  /**
   * Clean context based on error type
   */
  clean(errorClassification, context) {
    const strategy = this.cleaningStrategies.get(errorClassification.type) ||
                     this.cleaningStrategies.get('DEFAULT');

    return strategy.clean(context);
  }

  initializeStrategies() {
    // Reference Error Cleaning
    this.cleaningStrategies.set('UNDEFINED_REFERENCE', {
      clean: (context) => {
        // Clear failed API accesses
        if (window.ApiAccessTracker) {
          const failedAccesses = window.ApiAccessTracker.getFailedAccesses();

          // Remove from execution log
          const executionLog = Storage.getExecutionLog();
          const cleanedLog = executionLog.filter(entry =>
            !this.hasReferenceErrors(entry)
          );
          Storage.saveExecutionLog(cleanedLog);

          // Clear tracker
          window.ApiAccessTracker.clearFailedAccesses();
        }

        return {
          ...context,
          cleaned: true,
          cleaningType: 'reference_error'
        };
      }
    });

    // Entity Not Found Cleaning
    this.cleaningStrategies.set('ENTITY_NOT_FOUND', {
      clean: (context) => {
        // Similar to reference error
        // Additionally collect valid entity IDs for context enhancement
        const validEntities = {
          vault: Storage.getVault().map(e => e.id),
          memory: Storage.getMemory().map(e => e.key),
          tasks: Storage.getTasks().map(e => e.id),
          goals: Storage.getGoals().map(e => e.id)
        };

        return {
          ...context,
          cleaned: true,
          cleaningType: 'entity_not_found',
          validEntities
        };
      }
    });

    // Timeout Error Cleaning
    this.cleaningStrategies.set('TIMEOUT', {
      clean: (context) => {
        // Remove last execution from log
        const executionLog = Storage.getExecutionLog();
        if (executionLog.length > 0) {
          executionLog.pop();
          Storage.saveExecutionLog(executionLog);
        }

        return {
          ...context,
          cleaned: true,
          cleaningType: 'timeout',
          suggestion: 'Increase timeout or optimize code'
        };
      }
    });

    // Default Cleaning
    this.cleaningStrategies.set('DEFAULT', {
      clean: (context) => {
        // Minimal cleaning - just mark as cleaned
        return {
          ...context,
          cleaned: true,
          cleaningType: 'default'
        };
      }
    });
  }

  hasReferenceErrors(executionEntry) {
    return executionEntry.error &&
           (executionEntry.error.name === 'ReferenceError' ||
            /not found|does not exist/.test(executionEntry.error.message));
  }

  /**
   * Clean reasoning log - remove failed reasoning steps
   */
  cleanReasoningLog() {
    const reasoningLog = Storage.getReasoningLog();

    // Keep only successful reasoning steps
    const cleanedLog = reasoningLog.filter(entry =>
      !this.hasErrors(entry)
    );

    Storage.saveReasoningLog(cleanedLog);
  }

  hasErrors(reasoningEntry) {
    return reasoningEntry.operationsSummary?.errors?.length > 0;
  }
}
```

---

### 2.3 Retry Strategy Manager

**File**: `js/execution/error-handling/retry-strategy-manager.js`

**Purpose**: Manages retry policies and execution

```javascript
class RetryStrategyManager {
  constructor(config = {}) {
    this.config = {
      maxAttempts: config.maxAttempts || 3,
      baseDelayMs: config.baseDelayMs || 1000,
      maxDelayMs: config.maxDelayMs || 10000,
      backoffMultiplier: config.backoffMultiplier || 2,
      jitter: config.jitter !== false // Add random jitter by default
    };

    this.errorClassifier = new ErrorClassifier();
    this.contextCleaner = new ErrorContextCleaner();
  }

  /**
   * Execute with retry logic
   */
  async executeWithRetry(fn, options = {}) {
    const maxAttempts = options.maxAttempts || this.config.maxAttempts;
    let lastError = null;
    let lastResult = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await fn(attempt);

        // Check if result indicates failure
        if (result.success === false) {
          lastResult = result;
          lastError = result.error;

          // Classify error
          const classification = this.errorClassifier.classify(lastError);

          // Check if should retry
          if (!classification.retryable || attempt >= maxAttempts) {
            return result;
          }

          // Clean context if needed
          if (classification.cleanContext) {
            this.contextCleaner.clean(classification, result.context);
          }

          // Wait before retry
          await this.delay(attempt);

          continue;
        }

        // Success
        return result;

      } catch (error) {
        lastError = error;

        // Classify error
        const classification = this.errorClassifier.classify(error);

        // Check if should retry
        if (!classification.retryable || attempt >= maxAttempts) {
          throw error;
        }

        // Wait before retry
        await this.delay(attempt);
      }
    }

    // All attempts failed
    if (lastResult) {
      return lastResult;
    }

    throw lastError;
  }

  /**
   * Calculate delay for retry attempt
   */
  async delay(attemptNumber) {
    let delayMs = this.config.baseDelayMs *
                  Math.pow(this.config.backoffMultiplier, attemptNumber - 1);

    // Cap at max delay
    delayMs = Math.min(delayMs, this.config.maxDelayMs);

    // Add jitter to prevent thundering herd
    if (this.config.jitter) {
      const jitterMs = Math.random() * delayMs * 0.1; // 10% jitter
      delayMs += jitterMs;
    }

    return new Promise(resolve => setTimeout(resolve, delayMs));
  }

  /**
   * Get retry configuration for error type
   */
  getRetryConfigForError(error) {
    const classification = this.errorClassifier.classify(error);

    return {
      shouldRetry: classification.retryable,
      shouldCleanContext: classification.cleanContext,
      requiresReasoning: classification.requiresReasoning,
      maxAttempts: this.getMaxAttemptsForErrorType(classification.type)
    };
  }

  getMaxAttemptsForErrorType(errorType) {
    const customMaxAttempts = {
      'TIMEOUT': 2,              // Only retry once for timeouts
      'NETWORK_ERROR': 3,        // More retries for network issues
      'ENTITY_NOT_FOUND': 1,     // Single retry after context cleaning
      'UNDEFINED_REFERENCE': 1   // Single retry after context cleaning
    };

    return customMaxAttempts[errorType] || this.config.maxAttempts;
  }
}
```

---

### 2.4 Execution Error Handler

**File**: `js/execution/error-handling/execution-error-handler.js`

**Purpose**: Centralized error handling for execution system

```javascript
class ExecutionErrorHandler {
  constructor() {
    this.errorClassifier = new ErrorClassifier();
    this.contextCleaner = new ErrorContextCleaner();
    this.retryManager = new RetryStrategyManager();
    this.errorHandlers = new Map();

    this.initializeHandlers();
  }

  /**
   * Handle execution error
   */
  async handle(error, executionContext) {
    // Classify error
    const classification = this.errorClassifier.classify(error);

    // Get handler
    const handler = this.errorHandlers.get(classification.type) ||
                    this.errorHandlers.get('DEFAULT');

    // Execute handler
    const handlerResult = await handler.handle(error, classification, executionContext);

    return {
      classification,
      handlerResult,
      shouldRetry: handlerResult.shouldRetry,
      shouldNotifyReasoning: classification.requiresReasoning
    };
  }

  initializeHandlers() {
    // Syntax Error Handler
    this.errorHandlers.set('SYNTAX_ERROR', {
      handle: async (error, classification, context) => {
        // Syntax errors cannot be retried - need reasoning fix
        return {
          shouldRetry: false,
          requiresReasoningFix: true,
          message: 'Code has syntax errors and needs to be rewritten',
          details: {
            error: error.message,
            suggestion: 'Ask reasoning chain to fix syntax'
          }
        };
      }
    });

    // Reference Error Handler
    this.errorHandlers.set('UNDEFINED_REFERENCE', {
      handle: async (error, classification, context) => {
        // Clean context
        const cleanedContext = this.contextCleaner.clean(classification, context);

        return {
          shouldRetry: true,
          maxRetries: 1,
          cleanedContext,
          requiresReasoningFix: true,
          message: 'Reference error - cleaned context for retry',
          details: {
            error: error.message
          }
        };
      }
    });

    // Entity Not Found Handler
    this.errorHandlers.set('ENTITY_NOT_FOUND', {
      handle: async (error, classification, context) => {
        // Clean context and provide valid entities
        const cleanedContext = this.contextCleaner.clean(classification, context);

        return {
          shouldRetry: true,
          maxRetries: 1,
          cleanedContext,
          requiresReasoningFix: true,
          message: 'Entity not found - provide valid entities for reasoning',
          details: {
            error: error.message,
            validEntities: cleanedContext.validEntities
          }
        };
      }
    });

    // Timeout Handler
    this.errorHandlers.set('TIMEOUT', {
      handle: async (error, classification, context) => {
        // Clean context
        const cleanedContext = this.contextCleaner.clean(classification, context);

        return {
          shouldRetry: true,
          maxRetries: 1,
          cleanedContext,
          requiresOptimization: true,
          message: 'Execution timed out - consider optimization',
          details: {
            error: error.message,
            suggestion: 'Increase timeout or optimize code'
          }
        };
      }
    });

    // Default Handler
    this.errorHandlers.set('DEFAULT', {
      handle: async (error, classification, context) => {
        return {
          shouldRetry: false,
          requiresReasoningFix: true,
          message: 'Unhandled error type',
          details: {
            error: error.message,
            type: error.name
          }
        };
      }
    });
  }

  /**
   * Register custom error handler
   */
  registerHandler(errorType, handler) {
    this.errorHandlers.set(errorType, handler);
  }
}
```

---

## Phase 3: Reasoning Chain Modularization

### 3.1 Reasoning Session Manager

**File**: `js/reasoning/session/reasoning-session-manager.js`

**Purpose**: Manages reasoning session lifecycle separately from loop

```javascript
class ReasoningSessionManager {
  constructor() {
    this.activeSessions = new Map();
    this.sessionStateMachine = null;
    this.iterationStateManager = null;
  }

  /**
   * Create new reasoning session
   */
  createSession(query, options = {}) {
    const sessionId = this.generateSessionId();

    const session = {
      id: sessionId,
      query,
      options,
      startedAt: new Date().toISOString(),
      stateMachine: new SessionStateMachine(sessionId),
      iterationManager: new IterationStateManager(sessionId),
      middleware: new ReasoningChainMiddleware(),
      metrics: {
        iterations: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        errors: [],
        contextCleanings: 0
      }
    };

    this.activeSessions.set(sessionId, session);

    // Transition to active
    session.stateMachine.transition('ACTIVE');

    return session;
  }

  /**
   * Get active session
   */
  getSession(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Stop session
   */
  stopSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.stateMachine.transition('STOPPED');
    session.endedAt = new Date().toISOString();

    // Archive session
    this.archiveSession(session);

    this.activeSessions.delete(sessionId);
  }

  /**
   * Pause session
   */
  pauseSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.stateMachine.transition('PAUSED');
  }

  /**
   * Resume session
   */
  resumeSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.stateMachine.transition('ACTIVE');
  }

  /**
   * Check if should continue session
   */
  shouldContinue(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    // Check state
    const state = session.stateMachine.getCurrentState();
    if (state === 'STOPPED' || state === 'COMPLETED' || state === 'FAILED') {
      return false;
    }

    // Check iteration limit
    if (session.metrics.iterations >= (session.options.maxIterations || 30)) {
      return false;
    }

    // Check error threshold
    const recentErrors = session.metrics.errors.slice(-5).length;
    if (recentErrors >= 5) {
      return false;
    }

    return true;
  }

  /**
   * Record iteration
   */
  recordIteration(sessionId, iterationData) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.metrics.iterations++;

    if (iterationData.hasErrors) {
      session.metrics.errors.push({
        iteration: session.metrics.iterations,
        errors: iterationData.errors,
        timestamp: new Date().toISOString()
      });
    }

    if (iterationData.executionResults) {
      iterationData.executionResults.forEach(result => {
        if (result.success) {
          session.metrics.successfulExecutions++;
        } else {
          session.metrics.failedExecutions++;
        }
      });
    }
  }

  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  archiveSession(session) {
    // Store in localStorage or indexedDB for history
    const archive = {
      id: session.id,
      query: session.query,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      metrics: session.metrics,
      finalState: session.stateMachine.getCurrentState()
    };

    const archivedSessions = JSON.parse(
      localStorage.getItem('gdrs_archived_sessions') || '[]'
    );
    archivedSessions.push(archive);

    // Keep only last 50 sessions
    if (archivedSessions.length > 50) {
      archivedSessions.shift();
    }

    localStorage.setItem('gdrs_archived_sessions', JSON.stringify(archivedSessions));
  }
}
```

---

### 3.2 Session State Machine

**File**: `js/reasoning/session/session-state-machine.js`

**Purpose**: Formal state management for reasoning sessions

```javascript
class SessionStateMachine {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.currentState = 'CREATED';
    this.stateHistory = [];
    this.listeners = new Map();

    this.validTransitions = this.buildTransitionRules();

    this.recordState('CREATED');
  }

  buildTransitionRules() {
    return {
      'CREATED': ['ACTIVE'],
      'ACTIVE': ['PAUSED', 'STOPPED', 'COMPLETED', 'FAILED'],
      'PAUSED': ['ACTIVE', 'STOPPED'],
      'STOPPED': [],
      'COMPLETED': [],
      'FAILED': []
    };
  }

  /**
   * Transition to new state
   */
  transition(toState, metadata = {}) {
    // Validate transition
    const validNextStates = this.validTransitions[this.currentState];
    if (!validNextStates || !validNextStates.includes(toState)) {
      throw new Error(
        `Invalid transition from ${this.currentState} to ${toState}`
      );
    }

    const fromState = this.currentState;
    this.currentState = toState;

    this.recordState(toState, metadata);

    // Emit transition event
    this.emitTransition(fromState, toState, metadata);

    return true;
  }

  getCurrentState() {
    return this.currentState;
  }

  getStateHistory() {
    return this.stateHistory;
  }

  canTransitionTo(state) {
    const validNextStates = this.validTransitions[this.currentState];
    return validNextStates && validNextStates.includes(state);
  }

  recordState(state, metadata = {}) {
    this.stateHistory.push({
      state,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Register listener for state transition
   */
  on(state, callback) {
    if (!this.listeners.has(state)) {
      this.listeners.set(state, []);
    }
    this.listeners.get(state).push(callback);
  }

  /**
   * Register listener for any transition
   */
  onAny(callback) {
    this.on('*', callback);
  }

  emitTransition(fromState, toState, metadata) {
    // Call specific state listeners
    const stateListeners = this.listeners.get(toState) || [];
    stateListeners.forEach(callback => {
      callback(fromState, toState, metadata);
    });

    // Call wildcard listeners
    const wildcardListeners = this.listeners.get('*') || [];
    wildcardListeners.forEach(callback => {
      callback(fromState, toState, metadata);
    });
  }
}
```

---

### 3.3 Iteration State Manager

**File**: `js/reasoning/session/iteration-state-manager.js`

**Purpose**: Track and manage individual iteration states

```javascript
class IterationStateManager {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.iterations = [];
    this.currentIteration = null;
  }

  /**
   * Start new iteration
   */
  startIteration(iterationNumber) {
    this.currentIteration = {
      number: iterationNumber,
      startedAt: new Date().toISOString(),
      state: 'STARTED',
      phases: [],
      errors: [],
      metrics: {}
    };

    this.iterations.push(this.currentIteration);

    return this.currentIteration;
  }

  /**
   * Record phase completion
   */
  recordPhase(phaseName, data) {
    if (!this.currentIteration) return;

    this.currentIteration.phases.push({
      name: phaseName,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record error
   */
  recordError(error) {
    if (!this.currentIteration) return;

    this.currentIteration.errors.push({
      error,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Complete iteration
   */
  completeIteration(result) {
    if (!this.currentIteration) return;

    this.currentIteration.state = result.success ? 'COMPLETED' : 'FAILED';
    this.currentIteration.completedAt = new Date().toISOString();
    this.currentIteration.result = result;

    const current = this.currentIteration;
    this.currentIteration = null;

    return current;
  }

  /**
   * Get iteration history
   */
  getIterations() {
    return this.iterations;
  }

  /**
   * Get current iteration
   */
  getCurrentIteration() {
    return this.currentIteration;
  }

  /**
   * Get metrics for all iterations
   */
  getMetrics() {
    return {
      totalIterations: this.iterations.length,
      successful: this.iterations.filter(i => i.state === 'COMPLETED').length,
      failed: this.iterations.filter(i => i.state === 'FAILED').length,
      totalErrors: this.iterations.reduce((sum, i) => sum + i.errors.length, 0),
      averageDuration: this.calculateAverageDuration()
    };
  }

  calculateAverageDuration() {
    const completedIterations = this.iterations.filter(i => i.completedAt);
    if (completedIterations.length === 0) return 0;

    const totalDuration = completedIterations.reduce((sum, iteration) => {
      const start = new Date(iteration.startedAt);
      const end = new Date(iteration.completedAt);
      return sum + (end - start);
    }, 0);

    return totalDuration / completedIterations.length;
  }
}
```

---

### 3.4 Reasoning Chain Middleware

**File**: `js/reasoning/chain/reasoning-chain-middleware.js`

**Purpose**: Pluggable middleware system for reasoning chain processing

```javascript
class ReasoningChainMiddleware {
  constructor() {
    this.middlewares = [];
  }

  /**
   * Register middleware
   */
  use(middleware) {
    this.middlewares.push(middleware);
  }

  /**
   * Run all pre-iteration middleware
   */
  async runPreIteration(context) {
    let modifiedContext = context;

    for (const middleware of this.middlewares) {
      if (middleware.preIteration) {
        modifiedContext = await middleware.preIteration(modifiedContext);
      }
    }

    return modifiedContext;
  }

  /**
   * Run all post-iteration middleware
   */
  async runPostIteration(context, result) {
    let modifiedResult = result;

    for (const middleware of this.middlewares) {
      if (middleware.postIteration) {
        modifiedResult = await middleware.postIteration(context, modifiedResult);
      }
    }

    return modifiedResult;
  }

  /**
   * Run all pre-execution middleware
   */
  async runPreExecution(context, code) {
    let modifiedCode = code;

    for (const middleware of this.middlewares) {
      if (middleware.preExecution) {
        modifiedCode = await middleware.preExecution(context, modifiedCode);
      }
    }

    return modifiedCode;
  }

  /**
   * Run all post-execution middleware
   */
  async runPostExecution(context, executionResult) {
    let modifiedResult = executionResult;

    for (const middleware of this.middlewares) {
      if (middleware.postExecution) {
        modifiedResult = await middleware.postExecution(context, modifiedResult);
      }
    }

    return modifiedResult;
  }

  /**
   * Run all error middleware
   */
  async runOnError(context, error) {
    for (const middleware of this.middlewares) {
      if (middleware.onError) {
        await middleware.onError(context, error);
      }
    }
  }
}
```

**Example Middleware - Context Compaction**:

```javascript
// Future implementation
const contextCompactionMiddleware = {
  preIteration: async (context) => {
    // Check context size
    const contextSize = JSON.stringify(context).length;

    if (contextSize > 50000) {
      // Compact context
      context = await compactContext(context);
    }

    return context;
  }
};

// Register
middleware.use(contextCompactionMiddleware);
```

---

### 3.5 Context Compactor (Placeholder for Future)

**File**: `js/reasoning/context/context-compactor.js`

**Purpose**: Compress and optimize reasoning context

```javascript
class ContextCompactor {
  constructor(config = {}) {
    this.config = {
      maxReasoningSteps: config.maxReasoningSteps || 5,
      maxExecutionLogs: config.maxExecutionLogs || 3,
      summarizeOldSteps: config.summarizeOldSteps !== false,
      ...config
    };
  }

  /**
   * Compact context to reduce size
   */
  async compact(context) {
    const compacted = { ...context };

    // Limit reasoning steps
    if (compacted.reasoningLog && compacted.reasoningLog.length > this.config.maxReasoningSteps) {
      compacted.reasoningLog = this.compactReasoningLog(compacted.reasoningLog);
    }

    // Limit execution logs
    if (compacted.executionLog && compacted.executionLog.length > this.config.maxExecutionLogs) {
      compacted.executionLog = compacted.executionLog.slice(-this.config.maxExecutionLogs);
    }

    // Summarize old memory entries
    if (compacted.memory && compacted.memory.length > 10) {
      compacted.memory = this.compactMemory(compacted.memory);
    }

    return compacted;
  }

  compactReasoningLog(reasoningLog) {
    const recentSteps = reasoningLog.slice(-this.config.maxReasoningSteps);

    if (!this.config.summarizeOldSteps) {
      return recentSteps;
    }

    // Summarize older steps
    const oldSteps = reasoningLog.slice(0, -this.config.maxReasoningSteps);
    if (oldSteps.length === 0) {
      return recentSteps;
    }

    const summary = {
      type: 'summary',
      content: `[Summarized ${oldSteps.length} earlier reasoning steps]`,
      timestamp: oldSteps[0].timestamp
    };

    return [summary, ...recentSteps];
  }

  compactMemory(memory) {
    // Keep all important memories, limit less important ones
    const importantMemory = memory.filter(m => m.important);
    const regularMemory = memory.filter(m => !m.important).slice(-5);

    return [...importantMemory, ...regularMemory];
  }
}
```

---

## Phase 4: Configuration & Control Layer

### 4.1 Execution Policy Manager

**File**: `js/policy/execution-policy-manager.js`

**Purpose**: Centralized execution policy configuration

```javascript
class ExecutionPolicyManager {
  constructor() {
    this.policies = this.loadPolicies();
    this.customPolicies = new Map();
  }

  loadPolicies() {
    return {
      default: {
        strategy: 'standard',
        timeoutMs: 15000,
        enableRetry: true,
        maxRetries: 3,
        cleanContextOnRetry: true,
        logAllAttempts: false
      },

      safe: {
        strategy: 'safe',
        timeoutMs: 10000,
        enableRetry: false,
        maxRetries: 0,
        validateCodeSafety: true,
        logAllAttempts: true
      },

      aggressive: {
        strategy: 'retry',
        timeoutMs: 30000,
        enableRetry: true,
        maxRetries: 5,
        cleanContextOnRetry: true,
        logAllAttempts: false
      },

      debug: {
        strategy: 'standard',
        timeoutMs: 60000,
        enableRetry: false,
        maxRetries: 0,
        logAllAttempts: true,
        verboseErrors: true
      }
    };
  }

  /**
   * Get policy by name
   */
  getPolicy(policyName) {
    return this.policies[policyName] ||
           this.customPolicies.get(policyName) ||
           this.policies.default;
  }

  /**
   * Register custom policy
   */
  registerPolicy(name, policy) {
    this.customPolicies.set(name, policy);
  }

  /**
   * Get current active policy
   */
  getCurrentPolicy() {
    const policyName = Storage.getConfig('executionPolicy') || 'default';
    return this.getPolicy(policyName);
  }

  /**
   * Set active policy
   */
  setCurrentPolicy(policyName) {
    if (!this.policies[policyName] && !this.customPolicies.has(policyName)) {
      throw new Error(`Unknown policy: ${policyName}`);
    }

    Storage.saveConfig('executionPolicy', policyName);
  }
}
```

---

### 4.2 Retry Policy Manager

**File**: `js/policy/retry-policy-manager.js`

**Purpose**: Centralized retry policy configuration

```javascript
class RetryPolicyManager {
  constructor() {
    this.policies = this.loadPolicies();
  }

  loadPolicies() {
    return {
      immediate: {
        maxAttempts: 2,
        delayMs: 0,
        backoffMultiplier: 1
      },

      exponential: {
        maxAttempts: 3,
        baseDelayMs: 1000,
        backoffMultiplier: 2,
        maxDelayMs: 10000,
        jitter: true
      },

      aggressive: {
        maxAttempts: 5,
        baseDelayMs: 500,
        backoffMultiplier: 1.5,
        maxDelayMs: 5000,
        jitter: true
      },

      conservative: {
        maxAttempts: 2,
        baseDelayMs: 2000,
        backoffMultiplier: 2,
        maxDelayMs: 15000,
        jitter: false
      }
    };
  }

  getPolicy(policyName) {
    return this.policies[policyName] || this.policies.exponential;
  }

  getCurrentPolicy() {
    const policyName = Storage.getConfig('retryPolicy') || 'exponential';
    return this.getPolicy(policyName);
  }
}
```

---

## Phase 5: Monitoring & Observability

### 5.1 Execution Metrics Collector

**File**: `js/execution/monitoring/execution-metrics-collector.js`

**Purpose**: Collect detailed metrics for analysis

```javascript
class ExecutionMetricsCollector {
  constructor() {
    this.metrics = {
      executions: [],
      aggregates: {
        total: 0,
        successful: 0,
        failed: 0,
        timeouts: 0,
        retries: 0
      },
      errorCounts: new Map(),
      performanceMetrics: []
    };
  }

  /**
   * Record execution
   */
  recordExecution(result) {
    this.metrics.executions.push({
      id: result.id,
      success: result.success,
      duration: result.executionTime,
      error: result.error?.name,
      timestamp: result.finishedAt
    });

    // Update aggregates
    this.metrics.aggregates.total++;
    if (result.success) {
      this.metrics.aggregates.successful++;
    } else {
      this.metrics.aggregates.failed++;

      if (result.error) {
        const errorType = result.error.name;
        const count = this.metrics.errorCounts.get(errorType) || 0;
        this.metrics.errorCounts.set(errorType, count + 1);
      }

      if (result.error?.message?.includes('timeout')) {
        this.metrics.aggregates.timeouts++;
      }
    }

    if (result.attemptCount > 1) {
      this.metrics.aggregates.retries += (result.attemptCount - 1);
    }

    // Record performance
    this.recordPerformance(result);
  }

  recordPerformance(result) {
    this.metrics.performanceMetrics.push({
      duration: result.executionTime,
      codeSize: result.analysis.charCount,
      timestamp: result.finishedAt
    });

    // Keep only last 100
    if (this.metrics.performanceMetrics.length > 100) {
      this.metrics.performanceMetrics.shift();
    }
  }

  /**
   * Get metrics summary
   */
  getSummary() {
    return {
      ...this.metrics.aggregates,
      successRate: (this.metrics.aggregates.successful / this.metrics.aggregates.total * 100).toFixed(2) + '%',
      errorBreakdown: Object.fromEntries(this.metrics.errorCounts),
      averageExecutionTime: this.calculateAverageExecutionTime(),
      medianExecutionTime: this.calculateMedianExecutionTime()
    };
  }

  calculateAverageExecutionTime() {
    if (this.metrics.performanceMetrics.length === 0) return 0;

    const total = this.metrics.performanceMetrics.reduce((sum, m) => sum + m.duration, 0);
    return (total / this.metrics.performanceMetrics.length).toFixed(2);
  }

  calculateMedianExecutionTime() {
    if (this.metrics.performanceMetrics.length === 0) return 0;

    const sorted = this.metrics.performanceMetrics
      .map(m => m.duration)
      .sort((a, b) => a - b);

    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      executions: [],
      aggregates: { total: 0, successful: 0, failed: 0, timeouts: 0, retries: 0 },
      errorCounts: new Map(),
      performanceMetrics: []
    };
  }
}
```

---

### 5.2 Reasoning Chain Observer

**File**: `js/reasoning/monitoring/chain-health-monitor.js`

**Purpose**: Monitor reasoning chain health

```javascript
class ChainHealthMonitor {
  constructor() {
    this.healthMetrics = {
      iterations: [],
      issues: [],
      status: 'healthy'
    };

    this.thresholds = {
      maxConsecutiveErrors: 3,
      maxErrorRate: 0.5,
      minProgressRate: 0.1
    };
  }

  /**
   * Record iteration
   */
  recordIteration(iterationData) {
    this.healthMetrics.iterations.push({
      number: iterationData.number,
      hasErrors: iterationData.errors.length > 0,
      errorCount: iterationData.errors.length,
      progress: iterationData.progress || 0,
      timestamp: new Date().toISOString()
    });

    // Analyze health
    this.analyzeHealth();
  }

  /**
   * Analyze reasoning chain health
   */
  analyzeHealth() {
    const recentIterations = this.healthMetrics.iterations.slice(-5);

    // Check consecutive errors
    const consecutiveErrors = this.countConsecutiveErrors(recentIterations);
    if (consecutiveErrors >= this.thresholds.maxConsecutiveErrors) {
      this.reportIssue('CONSECUTIVE_ERRORS', {
        count: consecutiveErrors,
        severity: 'high'
      });
    }

    // Check error rate
    const errorRate = recentIterations.filter(i => i.hasErrors).length / recentIterations.length;
    if (errorRate > this.thresholds.maxErrorRate) {
      this.reportIssue('HIGH_ERROR_RATE', {
        rate: errorRate,
        severity: 'medium'
      });
    }

    // Check progress
    const progressRate = this.calculateProgressRate(recentIterations);
    if (progressRate < this.thresholds.minProgressRate) {
      this.reportIssue('LOW_PROGRESS', {
        rate: progressRate,
        severity: 'low'
      });
    }

    // Update overall status
    this.updateStatus();
  }

  countConsecutiveErrors(iterations) {
    let count = 0;
    for (let i = iterations.length - 1; i >= 0; i--) {
      if (iterations[i].hasErrors) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  calculateProgressRate(iterations) {
    if (iterations.length === 0) return 0;

    const totalProgress = iterations.reduce((sum, i) => sum + (i.progress || 0), 0);
    return totalProgress / iterations.length;
  }

  reportIssue(type, details) {
    this.healthMetrics.issues.push({
      type,
      details,
      timestamp: new Date().toISOString()
    });

    // Keep only last 20 issues
    if (this.healthMetrics.issues.length > 20) {
      this.healthMetrics.issues.shift();
    }
  }

  updateStatus() {
    const recentIssues = this.healthMetrics.issues.slice(-5);
    const highSeverityIssues = recentIssues.filter(i => i.details.severity === 'high');

    if (highSeverityIssues.length > 0) {
      this.healthMetrics.status = 'critical';
    } else if (recentIssues.length > 3) {
      this.healthMetrics.status = 'degraded';
    } else {
      this.healthMetrics.status = 'healthy';
    }
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    return {
      status: this.healthMetrics.status,
      recentIssues: this.healthMetrics.issues.slice(-5),
      metrics: {
        totalIterations: this.healthMetrics.iterations.length,
        errorRate: this.calculateOverallErrorRate(),
        consecutiveErrors: this.countConsecutiveErrors(
          this.healthMetrics.iterations.slice(-5)
        )
      }
    };
  }

  calculateOverallErrorRate() {
    if (this.healthMetrics.iterations.length === 0) return 0;

    const errorsCount = this.healthMetrics.iterations.filter(i => i.hasErrors).length;
    return (errorsCount / this.healthMetrics.iterations.length * 100).toFixed(2) + '%';
  }
}
```

---

## Integration & Migration Plan

### Step 1: Create New Modules (No Breaking Changes)
1. Create all new files in their respective directories
2. Export classes as global variables for compatibility
3. Don't modify existing files yet

### Step 2: Wire Up New Systems
1. Instantiate managers in app initialization
2. Connect to existing event bus
3. Add event listeners

### Step 3: Refactor Execution System
1. Update `execution-manager.js` to use strategies
2. Update `execution-runner.js` to use context manager
3. Update `js-executor.js` to use error handler
4. Keep backward compatibility

### Step 4: Refactor Reasoning System
1. Update `loop-controller.js` to use session manager
2. Add middleware support to reasoning engine
3. Wire up health monitoring
4. Keep backward compatibility

### Step 5: Configuration Migration
1. Create new config files
2. Update existing configs to reference policy managers
3. Provide migration utility

### Step 6: Testing & Validation
1. Test each module independently
2. Integration testing
3. Performance testing
4. User acceptance testing

---

## Configuration Files

### Execution Strategies Config

**File**: `js/config/execution-strategies-config.js`

```javascript
export const EXECUTION_STRATEGIES_CONFIG = {
  // Default strategy for automatic executions
  defaultStrategy: 'retry',

  // Strategy for manual executions
  manualStrategy: 'standard',

  // Strategy definitions
  strategies: {
    standard: {
      className: 'StandardExecutionStrategy',
      config: {}
    },

    retry: {
      className: 'RetryExecutionStrategy',
      config: {
        maxAttempts: 3,
        baseDelay: 1000,
        retryableErrors: ['ReferenceError', 'TimeoutError']
      }
    },

    safe: {
      className: 'SafeModeExecutionStrategy',
      config: {
        validateCode: true,
        conservativeTimeout: true
      }
    }
  }
};
```

### Retry Policies Config

**File**: `js/config/retry-policies-config.js`

```javascript
export const RETRY_POLICIES_CONFIG = {
  // Default retry policy
  defaultPolicy: 'exponential',

  // Error-specific policies
  errorPolicies: {
    'ReferenceError': 'immediate',
    'TimeoutError': 'conservative',
    'NetworkError': 'aggressive'
  },

  // Policy definitions
  policies: {
    immediate: {
      maxAttempts: 2,
      delayMs: 0,
      cleanContext: true
    },

    exponential: {
      maxAttempts: 3,
      baseDelayMs: 1000,
      backoffMultiplier: 2,
      maxDelayMs: 10000,
      jitter: true,
      cleanContext: true
    },

    aggressive: {
      maxAttempts: 5,
      baseDelayMs: 500,
      backoffMultiplier: 1.5,
      maxDelayMs: 5000,
      jitter: true,
      cleanContext: true
    },

    conservative: {
      maxAttempts: 2,
      baseDelayMs: 2000,
      backoffMultiplier: 2,
      maxDelayMs: 15000,
      jitter: false,
      cleanContext: true
    }
  }
};
```

### Error Recovery Config

**File**: `js/config/error-recovery-config.js`

```javascript
export const ERROR_RECOVERY_CONFIG = {
  // Enable automatic error recovery
  enableRecovery: true,

  // Error types that trigger recovery
  recoverableErrors: [
    'ReferenceError',
    'TimeoutError'
  ],

  // Error types that don't trigger recovery
  nonRecoverableErrors: [
    'SyntaxError'
  ],

  // Context cleaning settings
  contextCleaning: {
    enabled: true,
    cleanExecutionLog: true,
    cleanReasoningLog: false, // Don't clean by default
    cleanApiTracker: true
  },

  // Recovery attempt limits
  maxRecoveryAttempts: 2,

  // Reasoning-based recovery settings
  reasoningRecovery: {
    enabled: true,
    provideValidEntities: true,
    providePreviousReasoning: true,
    provideErrorContext: true
  }
};
```

### Monitoring Config

**File**: `js/config/monitoring-config.js`

```javascript
export const MONITORING_CONFIG = {
  // Enable metrics collection
  enableMetrics: true,

  // Enable health monitoring
  enableHealthMonitoring: true,

  // Metrics collection settings
  metrics: {
    collectExecutionMetrics: true,
    collectReasoningMetrics: true,
    maxStoredExecutions: 100,
    maxStoredIterations: 50
  },

  // Health monitoring thresholds
  health: {
    maxConsecutiveErrors: 3,
    maxErrorRate: 0.5,
    minProgressRate: 0.1
  },

  // Export settings
  export: {
    enableAutoExport: false,
    exportInterval: 300000, // 5 minutes
    exportFormat: 'json'
  }
};
```

---

## Usage Examples

### Example 1: Using Execution Strategies

```javascript
// In loop-controller.js or execution-manager.js

// Get policy manager
const policyManager = new ExecutionPolicyManager();
const currentPolicy = policyManager.getCurrentPolicy();

// Get strategy
const strategyClass = window[currentPolicy.strategy + 'ExecutionStrategy'];
const strategy = new strategyClass(currentPolicy);

// Execute with strategy
const result = await strategy.execute(request, executionRunner);
```

### Example 2: Middleware Usage

```javascript
// Create middleware
const loggingMiddleware = {
  preIteration: async (context) => {
    console.log('Starting iteration', context.iterationNumber);
    return context;
  },

  postIteration: async (context, result) => {
    console.log('Iteration complete', result);
    return result;
  }
};

// Register middleware
const middleware = new ReasoningChainMiddleware();
middleware.use(loggingMiddleware);
middleware.use(contextCompactionMiddleware);

// Use in loop controller
const modifiedContext = await middleware.runPreIteration(context);
// ... do iteration ...
const modifiedResult = await middleware.runPostIteration(context, result);
```

### Example 3: Error Handling

```javascript
// In execution code
try {
  const result = await executeCode(code);

  if (!result.success) {
    // Handle error
    const errorHandler = new ExecutionErrorHandler();
    const handlerResult = await errorHandler.handle(result.error, context);

    if (handlerResult.shouldRetry) {
      // Retry with cleaned context
      const retryResult = await executeCode(code, handlerResult.cleanedContext);
    } else if (handlerResult.requiresReasoningFix) {
      // Ask reasoning chain to fix
      await requestReasoningFix(result.error, handlerResult.classification);
    }
  }
} catch (error) {
  // Handle unexpected errors
}
```

---

## Benefits Summary

### 1. Modularity
- ✅ Each component has single responsibility
- ✅ Easy to test in isolation
- ✅ Easy to replace or upgrade individual components
- ✅ Clear boundaries between layers

### 2. Extensibility
- ✅ Add new execution strategies without modifying core
- ✅ Add middleware for custom processing
- ✅ Register custom error handlers
- ✅ Plug in custom policies

### 3. Error Handling
- ✅ Sophisticated error classification
- ✅ Automatic context cleaning
- ✅ Intelligent retry strategies
- ✅ No context pollution

### 4. Observability
- ✅ Detailed metrics collection
- ✅ Health monitoring
- ✅ Debugging information
- ✅ Performance insights

### 5. Future-Ready
- ✅ Context compaction support
- ✅ Adaptive strategies
- ✅ Machine learning integration points
- ✅ Advanced optimization opportunities

---

## Timeline

### Phase 1 (Execution) - 2 days
- Day 1: Core execution modules (state machine, strategies, context manager)
- Day 2: Error handling modules (classifier, cleaner, retry manager)

### Phase 2 (Reasoning) - 2 days
- Day 1: Session and state management
- Day 2: Middleware and monitoring

### Phase 3 (Policy & Config) - 1 day
- Policy managers and configuration

### Phase 4 (Integration) - 2 days
- Day 1: Wire up new systems
- Day 2: Refactor existing code

### Phase 5 (Testing) - 1 day
- Integration testing and validation

**Total: ~8 days**

---

## Migration Checklist

- [ ] Create all new module files
- [ ] Add exports to window global
- [ ] Create configuration files
- [ ] Update execution-manager.js
- [ ] Update execution-runner.js
- [ ] Update loop-controller.js
- [ ] Update reasoning-engine.js
- [ ] Wire up event listeners
- [ ] Add initialization code
- [ ] Test execution strategies
- [ ] Test error handling
- [ ] Test middleware system
- [ ] Test state machines
- [ ] Performance testing
- [ ] Documentation update
- [ ] User acceptance testing

---

## End of Plan

This modularization plan provides a robust, extensible architecture that will make it easy to:
1. Add features like context compaction
2. Handle errors without context pollution
3. Implement sophisticated retry strategies
4. Monitor and debug the system
5. Optimize performance
6. Extend functionality without breaking existing code

The architecture follows industry best practices with clear separation of concerns, dependency injection, strategy patterns, middleware pipelines, and observability built-in.
