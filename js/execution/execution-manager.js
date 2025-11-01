/**
 * ExecutionManager
 *
 * Coordinates JavaScript execution requests through a single queue so every
 * run (manual or automatic) flows through the same lifecycle. This eliminates
 * the previous dual-path behaviour and provides consistent state handling.
 */

import { ExecutionRunner } from './execution-runner.js';
import { Storage } from '../storage/storage.js';
import { eventBus, Events } from '../core/event-bus.js';
import { generateId, nowISO } from '../core/utils.js';
import { EXECUTION_DEFAULT_SOURCE } from '../config/execution-config.js';

class ExecutionManager {
  constructor() {
    this.queue = [];
    this.current = null;
    this.state = 'idle';
    this.runner = null;
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
   * Internal: process the next item if the manager is idle.
   * @private
   */
  async _drain() {
    if (this.current || this.queue.length === 0) {
      return;
    }

    this.current = this.queue.shift();
    this.state = 'running';
    this._emitQueueChange();

    eventBus.emit(Events.JS_EXECUTION_START, {
      id: this.current.id,
      source: this.current.source,
      queueLength: this.queue.length
    });

    try {
      const runner = new ExecutionRunner({ timeoutMs: this.current.timeoutMs });
      const outcome = await runner.run(this.current);
      const result = buildResult(this.current, outcome, this.queue.length);

      persistResult(result);
      notifyToolActivity(result);

      this.current._resolve(result);
    } catch (error) {
      const failedOutcome = buildResult(this.current, {
        success: false,
        error,
        logs: [],
        resolvedCode: this.current.code,
        analysis: {
          charCount: this.current.code.length,
          lineCount: this.current.code.split(/\r?\n/).length,
          vaultRefs: []
        },
        duration: 0,
        finishedAt: nowISO(),
        startedAt: nowISO()
      }, this.queue.length);

      persistResult(failedOutcome);
      notifyToolActivity(failedOutcome);

      this.current._resolve(failedOutcome);
    } finally {
      this.current = null;
      this.state = 'idle';
      this._emitQueueChange();

      if (this.queue.length > 0) {
        // Process next task in microtask queue to avoid deep recursion.
        queueMicrotask(() => this._drain());
      }
    }
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
 * Transform the runner outcome + request metadata into a persistable result.
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
    result: success ? serializeValue(outcome.value) : undefined,
    resolvedCode: outcome.resolvedCode,
    logs: normalizedLogs,
    error: !success ? serializeError(outcome.error) : undefined,
    analysis: outcome.analysis,
    executionTime: outcome.duration,
    startedAt: outcome.startedAt,
    finishedAt: outcome.finishedAt,
    queueLengthOnFinish
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
