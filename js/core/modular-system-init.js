import { serviceContainer } from './service-container.js';
import { eventBus } from './event-bus.js';
import {
  registerExecutionServices,
  resolveExecutionServices,
  EXECUTION_SERVICE_IDS
} from '../execution/services.js';
import {
  registerReasoningServices,
  resolveReasoningServices,
  REASONING_SERVICE_IDS
} from '../reasoning/services.js';

let initializationPromise = null;

function exposeLegacyGlobals(execution, reasoning) {
  if (typeof window === 'undefined') return;

  window.GDRS_ExecutionPolicyManager = execution.policyManager;
  window.GDRS_RetryPolicyManager = execution.retryPolicyManager;
  window.GDRS_ErrorClassifier = execution.errorClassifier;
  window.GDRS_ErrorContextCleaner = execution.errorContextCleaner;
  window.GDRS_RetryStrategyManager = execution.retryStrategyManager;
  window.GDRS_ExecutionErrorHandler = execution.errorHandler;
  window.GDRS_ExecutionContextManager = execution.contextManager;
  window.GDRS_ExecutionResultHandler = execution.resultHandler;
  window.GDRS_ExecutionMetricsCollector = execution.metricsCollector;

  window.GDRS_ReasoningSessionManager = reasoning.sessionManager;
  window.GDRS_ChainHealthMonitor = reasoning.chainHealthMonitor;
}

function exposeModularApi(execution, reasoning) {
  if (typeof window === 'undefined') return;

  window.GDRS_Modular = {
    setExecutionPolicy: (policyName) => {
      execution.policyManager.setCurrentPolicy(policyName);
      console.log(`[Policy] Switched to execution policy: ${policyName}`);
    },
    getCurrentExecutionPolicy: () => execution.policyManager.getCurrentPolicy(),
    getExecutionMetrics: () => execution.metricsCollector.getSummary(),
    getSessionMetrics: (sessionId) => reasoning.sessionManager.getSessionMetrics(sessionId),
    getSessionHealth: (sessionId) => reasoning.sessionManager.getSessionHealth(sessionId),
    enableDebugMode: () => {
      execution.policyManager.setCurrentPolicy('debug');
      console.log('[Debug] Debug mode enabled');
    },
    enableSafeMode: () => {
      execution.policyManager.setCurrentPolicy('safe');
      console.log('[SafeMode] Safe mode enabled');
    },
    getSystemInfo: () => ({
      executionPolicy: execution.policyManager.getCurrentPolicy(),
      retryPolicy: execution.retryPolicyManager.getPolicy(
        execution.retryPolicyManager.getDefaultPolicy?.() ? execution.retryPolicyManager.getDefaultPolicy().name : 'default'
      ),
      activeContexts: execution.contextManager.getContextCount(),
      activeSessions: reasoning.sessionManager.getActiveSessionCount(),
      metrics: execution.metricsCollector.getSummary(),
      registeredServices: serviceContainer.listRegisteredServices()
    })
  };
}

function registerEventLogging() {
  eventBus.on?.('EXECUTION_STATE_CHANGED', (data) => {
    console.log(`[ExecutionState] ${data.fromState} -> ${data.toState}`);
  });

  eventBus.on?.('SESSION_STATE_CHANGED', (data) => {
    console.log(`[SessionState] ${data.fromState} -> ${data.toState}`);
  });

  eventBus.on?.('EXECUTION_RETRY_ATTEMPT', (data) => {
    console.log(`[Retry] Attempt ${data.attempt}/${data.maxAttempts} for execution ${data.executionId}`);
  });

  eventBus.on?.('EXECUTION_CONTEXT_CLEANED', (data) => {
    console.log(`[ContextCleaning] Cleaned context for ${data.executionId} (${data.errorType})`);
  });

  eventBus.on?.('SESSION_HEALTH_DEGRADED', (data) => {
    console.warn(`[Health] Session health degraded: ${data.status}`);
  });
}

function markInitialized(execution, reasoning) {
  if (typeof window !== 'undefined') {
    window.GDRS_ModularSystemInitialized = true;
    exposeLegacyGlobals(execution, reasoning);
    exposeModularApi(execution, reasoning);

    if (typeof window.CustomEvent === 'function') {
      document.dispatchEvent(new CustomEvent('gdrs:modular-system-initialized'));
    }
  }
}

export function initializeModularSystem() {
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    console.log('[ModularSystem] Initializing modular architecture...');

    const execution = registerExecutionServices(serviceContainer);
    console.log('[ModularSystem] ✅ Execution system initialized');

    const reasoning = registerReasoningServices(serviceContainer);
    console.log('[ModularSystem] ✅ Reasoning system initialized');

    registerEventLogging();
    markInitialized(execution, reasoning);

    console.log('[ModularSystem] ✅ Global API exposed at window.GDRS_Modular');
    console.log('[ModularSystem] ✅ Initialization complete!');
    console.log('[ModularSystem] Try: GDRS_Modular.getSystemInfo()');

    return { execution, reasoning };
  })();

  return initializationPromise;
}

export function getModularInitialization() {
  return initializationPromise ?? initializeModularSystem();
}

export function ensureModularServices() {
  const executionKeys = Object.values(EXECUTION_SERVICE_IDS);
  const reasoningKeys = Object.values(REASONING_SERVICE_IDS);
  const missing = [...executionKeys, ...reasoningKeys].filter((id) => !serviceContainer.tryResolveService(id));
  if (missing.length > 0) {
    initializeModularSystem();
  }
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeModularSystem();
    });
  } else {
    initializeModularSystem();
  }
}

export function getExecutionServices() {
  ensureModularServices();
  return resolveExecutionServices(serviceContainer);
}

export function getReasoningServices() {
  ensureModularServices();
  return resolveReasoningServices(serviceContainer);
}

