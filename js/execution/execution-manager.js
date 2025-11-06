/**
 * ExecutionManager (MODULAR ARCHITECTURE)
 *
 * Coordinates JavaScript execution requests using pluggable execution strategies.
 * OLD CODE REMOVED - Now uses modular architecture exclusively.
 *
 * Integrates:
 * - ExecutionPolicyManager for strategy selection
 * - ExecutionStrategy implementations (Standard/Retry/SafeMode)
 * - ExecutionResultHandler for result processing
 * - ExecutionMetricsCollector for metrics
 */

import { ExecutionRunner } from './execution-runner.js';
import { Storage } from '../storage/storage.js';
import { eventBus, Events } from '../core/event-bus.js';
import { generateId, nowISO } from '../core/utils.js';
import { EXECUTION_DEFAULT_SOURCE } from '../config/execution-config.js';
import { whenExecutionServicesReady } from './services.js';
import { getModularInitialization } from '../core/modular-system-init.js';

class ExecutionManager {
  constructor() {
    this.queue = [];
    this.current = null;
    this.state = 'idle';
    this.runner = null;

    // Modular service bindings
    this.policyManager = null;
    this.resultHandler = null;
    this.metricsCollector = null;
    this._servicesReadyPromise = this._bindExecutionServices();
  }

  async _bindExecutionServices() {
    try {
      await getModularInitialization();
      const services = await whenExecutionServicesReady();
      this.policyManager = services.policyManager;
      this.resultHandler = services.resultHandler;
      this.metricsCollector = services.metricsCollector;
      this.retryPolicyManager = services.retryPolicyManager;
      this.retryStrategyManager = services.retryStrategyManager;
      this.errorHandler = services.errorHandler;
      this.contextManager = services.contextManager;
      this.errorClassifier = services.errorClassifier;
      this.errorContextCleaner = services.errorContextCleaner;
      return services;
    } catch (error) {
      console.error('[ExecutionManager] Failed to bind execution services', error);
      throw error;
    }
  }

  async _ensureServicesReady() {
    if (!this._servicesReadyPromise) {
      this._servicesReadyPromise = this._bindExecutionServices();
    }
    return this._servicesReadyPromise;
  }

  /**
   * Submit code for execution. Returns a promise that resolves with the
   * execution result object (success flag + metadata).
   */
  enqueue(options) {
    const request = createRequest(options);

    const promise = new Promise((resolve) => {
      request._resolve = resolve;
    });

    this.queue.push(request);
    this._emitQueueChange();
    this._drain();

    return promise;
  }

  /**
   * Current queue snapshot.
   */
  getState() {
    return {
      state: this.state,
      current: this.current ? { id: this.current.id, source: this.current.source } : null,
      queueLength: this.queue.length
    };
  }

  /**
   * NEW MODULAR ARCHITECTURE: Process execution using strategy pattern.
   * OLD direct execution code REMOVED.
   * @private
   */
  async _drain() {
    if (this.current || this.queue.length === 0) {
      return;
    }

    await this._ensureServicesReady();

    this.current = this.queue.shift();
    this.state = 'running';
    this._emitQueueChange();

    eventBus.emit(Events.JS_EXECUTION_START, {
      id: this.current.id,
      source: this.current.source,
      queueLength: this.queue.length
    });

    try {
      // === NEW MODULAR ARCHITECTURE ===

      // 1. Get execution policy
      const policy = this.policyManager.getCurrentPolicy();

      // 2. Get strategy class
      const strategyName = policy.strategy || 'standard';
      const StrategyClass = this._getStrategyClass(strategyName);

      if (!StrategyClass) {
        throw new Error(`Unknown execution strategy: ${strategyName}`);
      }

      // 3. Create strategy instance
      const strategy = new StrategyClass(policy);

      // 4. Create runner
      const runner = new ExecutionRunner({ timeoutMs: this.current.timeoutMs || policy.timeoutMs });

      // 5. Execute with strategy (handles retry, context cleaning, etc.)
      const strategyResult = await strategy.execute(this.current, runner);

      // 6. Build result
      const result = buildResult(this.current, strategyResult, this.queue.length);

      // 7. Process result through result handler
      const processedResult = await this.resultHandler.process(result);

      // 8. Record metrics
      this.metricsCollector.recordExecution(processedResult);

      // 9. Persist if should log
      if (processedResult.shouldLog !== false) {
        persistResult(processedResult);
        notifyToolActivity(processedResult);
      }

      // 10. Resolve promise
      this.current._resolve(processedResult);

    } catch (error) {
      // Handle catastrophic errors
      const failedResult = buildResult(this.current, {
        success: false,
        error: {
          name: error.name || 'Error',
          message: error.message || String(error),
          stack: error.stack
        },
        logs: [],
        resolvedCode: this.current.code,
        analysis: {
          charCount: this.current.code.length,
          lineCount: this.current.code.split(/\r?\n/).length,
          vaultRefs: []
        },
        executionTime: 0,
        finishedAt: nowISO(),
        startedAt: nowISO()
      }, this.queue.length);

      persistResult(failedResult);
      notifyToolActivity(failedResult);

      this.current._resolve(failedResult);
    } finally {
      this.current = null;
      this.state = 'idle';
      this._emitQueueChange();

      if (this.queue.length > 0) {
        queueMicrotask(() => this._drain());
      }
    }
  }

  /**
   * Get strategy class by name
   * @private
   */
  _getStrategyClass(strategyName) {
    const strategyMap = {
      'standard': window.StandardExecutionStrategy,
      'retry': window.RetryExecutionStrategy,
      'safe': window.SafeModeExecutionStrategy
    };

    return strategyMap[strategyName.toLowerCase()] || window.StandardExecutionStrategy;
  }

  /**
   * Emit queue status updates through the event bus.
   * @private
   */
  _emitQueueChange() {
    eventBus.emit(Events.JS_EXECUTION_QUEUE_CHANGED, this.getState());
  }
}

/**
 * Build a normalized request object.
 */
function createRequest(options = {}) {
  const code = typeof options.code === 'string' ? options.code : '';

  return {
    id: options.id || generateId('exec'),
    code,
    source: options.source || EXECUTION_DEFAULT_SOURCE,
    submittedAt: nowISO(),
    timeoutMs: Number.isFinite(options.timeoutMs) ? Number(options.timeoutMs) : undefined,
    context: options.context ? { ...options.context } : {},
    metadata: options.metadata ? { ...options.metadata } : {}
  };
}

/**
 * Transform the strategy result + request metadata into a persistable result.
 */
function buildResult(request, outcome, queueLengthOnFinish) {
  const success = !!outcome.success && !outcome.error;
  const normalizedLogs = sanitizeLogs(outcome.logs || []);

  const resultPayload = {
    id: request.id,
    code: request.code,
    source: request.source,
    context: request.context,
    metadata: request.metadata,
    submittedAt: request.submittedAt,
    success,
    result: success ? serializeValue(outcome.value || outcome.result) : undefined,
    resolvedCode: outcome.resolvedCode,
    logs: normalizedLogs,
    error: !success ? serializeError(outcome.error) : undefined,
    analysis: outcome.analysis,
    executionTime: outcome.duration || outcome.executionTime,
    startedAt: outcome.startedAt,
    finishedAt: outcome.finishedAt,
    queueLengthOnFinish,
    // NEW: Include strategy metadata
    attemptCount: outcome.attemptCount,
    retried: outcome.retried,
    classification: outcome.classification
  };

  return resultPayload;
}

/**
 * Persist execution result and related bookkeeping.
 */
function persistResult(result) {
  Storage.appendExecutionResult(result);

  if (result.success) {
    Storage.saveLastExecutedCode(result.code);
  }
}

/**
 * Record execution activity for the reasoning log / activity feeds.
 */
function notifyToolActivity(result) {
  Storage.appendToolActivity({
    type: 'js_execute',
    action: result.source === 'manual' ? 'manual_run' : 'auto_run',
    status: result.success ? 'success' : 'error',
    executionTime: result.executionTime,
    codeSize: result.analysis?.charCount || (result.code?.length ?? 0),
    vaultRefsUsed: result.analysis?.vaultRefs?.length || 0,
    queueLengthOnFinish: result.queueLengthOnFinish,
    error: result.error?.message,
    id: result.id
  });

  if (!result.success) {
    eventBus.emit(Events.JS_EXECUTION_ERROR, {
      id: result.id,
      error: result.error
    });
  }
}

/**
 * Convert arbitrary values into something JSON friendly.
 */
function serializeValue(value) {
  if (value === undefined) return undefined;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

function serializeError(error) {
  if (!error) return undefined;
  return {
    message: error.message || String(error),
    stack: error.stack || null,
    name: error.name || 'Error'
  };
}

function sanitizeLogs(logs) {
  return logs.map((entry) => ({
    type: entry.type,
    message: entry.message,
    timestamp: entry.timestamp
  }));
}

export const executionManager = new ExecutionManager();
