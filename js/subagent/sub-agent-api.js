import { SubAgentOrchestrator } from './sub-agent-orchestrator.js';
import { Storage } from '../storage/storage.js';
import { eventBus, Events } from '../core/event-bus.js';
import { nowISO } from '../core/utils.js';

export class SubAgentAPI {
  constructor(deps = {}) {
    this.orchestrator = deps.orchestrator || SubAgentOrchestrator;
    this.storage = deps.storage || Storage;
    this.bus = deps.eventBus || eventBus;
  }

  async invoke(query, options = {}) {
    const normalizedQuery = typeof query === 'string' ? query.trim() : '';
    if (!normalizedQuery) {
      throw new Error('Sub-agent requires a non-empty query');
    }

    const agentId = options.agentId || options.id || null;
    const invocationId = `subagent_invocation_${nowISO()}`;
    console.log(`[${nowISO()}] [SubAgentAPI] Invocation ${invocationId} starting (agent=${agentId || 'auto'})`);

    const guardedRun = this._guardPromise(
      this.orchestrator.runSubAgent(agentId, normalizedQuery, options),
      options
    );

    const result = await guardedRun;
    console.log(
      `[${nowISO()}] [SubAgentAPI] Invocation ${invocationId} finished. summaryLength=${result?.content?.length || 0}`
    );

    this.bus.emit(Events.SUBAGENT_STATE_CHANGED, this.storage.loadSubAgentTrace?.());
    return result;
  }

  getLastResult() {
    return this.storage.loadSubAgentLastResult?.() || null;
  }

  getTrace() {
    return this.storage.loadSubAgentTrace?.() || null;
  }

  clear() {
    this.storage.clearSubAgentLastResult?.();
    this.storage.clearSubAgentTrace?.();
    this.bus.emit(Events.SUBAGENT_STATE_CHANGED, null);
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

export function clearSubAgentData() {
  return defaultSubAgentAPI.clear();
}

export function attachSubAgentAPI(target = window, apiInstance = defaultSubAgentAPI) {
  const api = {
    invoke: (query, options = {}) => apiInstance.invoke(query, options),
    lastResult: () => apiInstance.getLastResult(),
    trace: () => apiInstance.getTrace(),
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
  clearSubAgentData,
  attachSubAgentAPI,
  SubAgentAPI,
  subAgentAPI
};
