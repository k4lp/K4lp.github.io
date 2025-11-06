import { serviceContainer } from '../core/service-container.js';
import { ExecutionPolicyManager, createExecutionPolicyManager } from '../policy/execution-policy-manager.js';
import { RetryPolicyManager, createRetryPolicyManager } from '../policy/retry-policy-manager.js';
import { ErrorClassifier } from './error-handling/error-classifier.js';
import { ErrorContextCleaner } from './error-handling/error-context-cleaner.js';
import { RetryStrategyManager } from './error-handling/retry-strategy-manager.js';
import { ExecutionErrorHandler } from './error-handling/execution-error-handler.js';
import { ExecutionContextManager } from './context/execution-context-manager.js';
import { ExecutionResultHandler } from './results/execution-result-handler.js';
import { ExecutionMetricsCollector } from './monitoring/execution-metrics-collector.js';

export const EXECUTION_SERVICE_IDS = {
  policyManager: 'execution.policyManager',
  retryPolicyManager: 'execution.retryPolicyManager',
  errorClassifier: 'execution.errorClassifier',
  errorContextCleaner: 'execution.errorContextCleaner',
  retryStrategyManager: 'execution.retryStrategyManager',
  errorHandler: 'execution.errorHandler',
  contextManager: 'execution.contextManager',
  resultHandler: 'execution.resultHandler',
  metricsCollector: 'execution.metricsCollector'
};

export function createExecutionServiceInstances(overrides = {}) {
  const retryPolicyManager = overrides.retryPolicyManager || createRetryPolicyManager();
  const executionPolicyManager = overrides.executionPolicyManager || createExecutionPolicyManager();
  const errorClassifier = overrides.errorClassifier || new ErrorClassifier();
  const errorContextCleaner = overrides.errorContextCleaner || new ErrorContextCleaner();
  const retryStrategyManager = overrides.retryStrategyManager || new RetryStrategyManager({
    maxAttempts: overrides.maxAttempts || 3
  });
  const executionErrorHandler = overrides.executionErrorHandler ||
    new ExecutionErrorHandler({
      errorClassifier,
      contextCleaner: errorContextCleaner,
      retryManager: retryStrategyManager
    });
  const executionContextManager = overrides.executionContextManager || new ExecutionContextManager();
  const executionResultHandler = overrides.executionResultHandler ||
    new ExecutionResultHandler(
      overrides.resultHandlerConfig || {},
      { errorClassifier }
    );
  const executionMetricsCollector = overrides.executionMetricsCollector || new ExecutionMetricsCollector();

  return {
    policyManager: executionPolicyManager,
    retryPolicyManager,
    errorClassifier,
    errorContextCleaner,
    retryStrategyManager,
    errorHandler: executionErrorHandler,
    contextManager: executionContextManager,
    resultHandler: executionResultHandler,
    metricsCollector: executionMetricsCollector
  };
}

export function registerExecutionServices(container = serviceContainer, overrides = {}) {
  const instances = createExecutionServiceInstances(overrides);

  Object.entries(instances).forEach(([key, instance]) => {
    const id = EXECUTION_SERVICE_IDS[key];
    container.registerService(id, instance);
  });

  return instances;
}

export function resolveExecutionServices(container = serviceContainer) {
  return {
    policyManager: container.resolveService(EXECUTION_SERVICE_IDS.policyManager),
    retryPolicyManager: container.resolveService(EXECUTION_SERVICE_IDS.retryPolicyManager),
    errorClassifier: container.resolveService(EXECUTION_SERVICE_IDS.errorClassifier),
    errorContextCleaner: container.resolveService(EXECUTION_SERVICE_IDS.errorContextCleaner),
    retryStrategyManager: container.resolveService(EXECUTION_SERVICE_IDS.retryStrategyManager),
    errorHandler: container.resolveService(EXECUTION_SERVICE_IDS.errorHandler),
    contextManager: container.resolveService(EXECUTION_SERVICE_IDS.contextManager),
    resultHandler: container.resolveService(EXECUTION_SERVICE_IDS.resultHandler),
    metricsCollector: container.resolveService(EXECUTION_SERVICE_IDS.metricsCollector)
  };
}

export async function whenExecutionServicesReady(container = serviceContainer) {
  const services = await container.whenServicesReady(Object.values(EXECUTION_SERVICE_IDS));
  const mapping = {};
  Object.keys(EXECUTION_SERVICE_IDS).forEach((key, index) => {
    mapping[key] = services[index];
  });
  return mapping;
}

export function ensureExecutionServicesRegistered(container = serviceContainer) {
  const missing = Object.values(EXECUTION_SERVICE_IDS).filter(id => !container.tryResolveService(id));
  if (missing.length === 0) return false;

  registerExecutionServices(container);
  return true;
}

// Convenience getter for callers who don't want to import the container directly.
export function getExecutionServices() {
  ensureExecutionServicesRegistered();
  return resolveExecutionServices();
}

