import { SubAgentOrchestrator } from './sub-agent-orchestrator.js';
import { Storage } from '../storage/storage.js';
import { eventBus, Events } from '../core/event-bus.js';
import { nowISO } from '../core/utils.js';

const ALLOWED_ORIGINS = new Set(['reasoning-loop', 'system']);

export class SubAgentAPI {
  constructor(deps = {}) {
    this.orchestrator = deps.orchestrator || SubAgentOrchestrator;
    this.storage = deps.storage || Storage;
    this.bus = deps.eventBus || eventBus;
    this.activeRun = null;
    this.runtimeState = this.storage.loadSubAgentRuntimeState?.() || { status: 'idle' };
  }

  async invoke(query, options = {}) {
    const normalizedQuery = typeof query === 'string' ? query.trim() : '';
    if (!normalizedQuery) {
      throw new Error('Sub-agent requires a non-empty query');
    }

    const agentId = options.agentId || options.id || null;
    const origin = options.origin || 'unknown';
    this._assertOrigin(origin);
    await this._waitForIdle();

    const invocationId = `subagent_invocation_${nowISO()}`;
    console.log(`[${nowISO()}] [SubAgentAPI] Invocation ${invocationId} starting (agent=${agentId || 'auto'})`);

    const agentOptions = { ...options };
    delete agentOptions.origin;

    const guardedRun = this._guardPromise(
      this.orchestrator.runSubAgent(agentId, normalizedQuery, agentOptions),
      agentOptions
    );

    this.activeRun = guardedRun;
    this._markRuntimeState({
      status: 'running',
      query: normalizedQuery,
      agentId: agentId || undefined,
      origin,
      startedAt: nowISO(),
      iteration: agentOptions.iteration || null
    });

    try {
      const result = await guardedRun;
      console.log(
        `[${nowISO()}] [SubAgentAPI] Invocation ${invocationId} finished. summaryLength=${result?.content?.length || 0}`
      );

      this._markRuntimeState({
        status: 'idle',
        agentId: agentId || undefined,
        lastCompletedAt: nowISO(),
        lastResultId: result?.id || null
      });

      this.bus.emit(Events.SUBAGENT_STATE_CHANGED, this.storage.loadSubAgentTrace?.());
      return result;
    } catch (error) {
      this._markRuntimeState({
        status: 'error',
        agentId: agentId || undefined,
        error: error.message || String(error),
        failedAt: nowISO()
      });
      throw error;
    } finally {
      this.activeRun = null;
    }
  }

  async waitForIdle() {
    await this._waitForIdle();
    return this.getRuntimeState();
  }

  getLastResult() {
    return this.storage.loadSubAgentLastResult?.() || null;
  }

  getTrace() {
    return this.storage.loadSubAgentTrace?.() || null;
  }

  getRuntimeState() {
    return this.storage.loadSubAgentRuntimeState?.() || this.runtimeState || { status: 'idle' };
  }

  clear() {
    this.storage.clearSubAgentLastResult?.();
    this.storage.clearSubAgentTrace?.();
    this.storage.clearSubAgentRuntimeState?.();
    this.runtimeState = { status: 'idle', updatedAt: nowISO() };
    this.bus.emit(Events.SUBAGENT_STATE_CHANGED, null);
  }

  _assertOrigin(origin) {
    if (!ALLOWED_ORIGINS.has(origin)) {
      throw new Error('Sub-agent invocation is restricted to the main reasoning loop.');
    }
  }

  async _waitForIdle() {
    if (!this.activeRun) {
      return;
    }
    try {
      await this.activeRun;
    } catch {
      // Swallow underlying error; runtime state will reflect failure.
    }
  }

  _markRuntimeState(state = {}) {
    const payload = {
      status: state.status || 'idle',
      updatedAt: nowISO(),
      ...state
    };

    if (typeof this.storage.saveSubAgentRuntimeState === 'function') {
      this.storage.saveSubAgentRuntimeState(payload);
    } else {
      this.runtimeState = payload;
    }

    this.bus.emit(Events.SUBAGENT_STATE_CHANGED, this.storage.loadSubAgentTrace?.());
    return payload;
  }

  _guardPromise(promise, { timeoutMs, signal } = {}) {
    let guarded = promise;
    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      guarded = this._withTimeout(guarded, timeoutMs);
    }
    if (signal) {
      guarded = this._withAbort(guarded, signal);
    }
    return guarded;
  }

  _withTimeout(promise, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Sub-agent invocation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }

  _withAbort(promise, signal) {
    if (signal.aborted) {
      return Promise.reject(signal.reason || new Error('Sub-agent invocation aborted'));
    }

    return new Promise((resolve, reject) => {
      const onAbort = () => {
        signal.removeEventListener('abort', onAbort);
        reject(signal.reason || new Error('Sub-agent invocation aborted'));
      };

      signal.addEventListener('abort', onAbort, { once: true });

      promise.then(
        (value) => {
          signal.removeEventListener('abort', onAbort);
          resolve(value);
        },
        (error) => {
          signal.removeEventListener('abort', onAbort);
          reject(error);
        }
      );
    });
  }
}

const defaultSubAgentAPI = new SubAgentAPI();

export function invokeSubAgent(query, options = {}) {
  return defaultSubAgentAPI.invoke(query, options);
}

export function getLastResult() {
  return defaultSubAgentAPI.getLastResult();
}

export function getTrace() {
  return defaultSubAgentAPI.getTrace();
}

export function getRuntimeState() {
  return defaultSubAgentAPI.getRuntimeState();
}

export function clearSubAgentData() {
  return defaultSubAgentAPI.clear();
}

export function attachSubAgentAPI(target = window, apiInstance = defaultSubAgentAPI) {
  const api = {
    invoke: (query, options = {}) => apiInstance.invoke(query, options),
    lastResult: () => apiInstance.getLastResult(),
    trace: () => apiInstance.getTrace(),
    runtimeState: () => apiInstance.getRuntimeState(),
    clear: () => apiInstance.clear()
  };

  if (target) {
    target.SubAgent = api;
  }

  return api;
}

export const subAgentAPI = defaultSubAgentAPI;

export default {
  invokeSubAgent,
  getLastResult,
  getTrace,
  getRuntimeState,
  clearSubAgentData,
  attachSubAgentAPI,
  SubAgentAPI,
  subAgentAPI
};
