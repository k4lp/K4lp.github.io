import { serviceContainer } from '../core/service-container.js';
import { ReasoningSessionManager } from './session/reasoning-session-manager.js';
import { ChainHealthMonitor } from './monitoring/chain-health-monitor.js';

export const REASONING_SERVICE_IDS = {
  sessionManager: 'reasoning.sessionManager',
  chainHealthMonitor: 'reasoning.chainHealthMonitor'
};

export function createReasoningServiceInstances(overrides = {}) {
  const chainHealthMonitor = overrides.chainHealthMonitor || new ChainHealthMonitor(overrides.thresholds);
  const sessionManager = overrides.sessionManager || new ReasoningSessionManager();

  return {
    sessionManager,
    chainHealthMonitor
  };
}

export function registerReasoningServices(container = serviceContainer, overrides = {}) {
  const instances = createReasoningServiceInstances(overrides);
  Object.entries(instances).forEach(([key, instance]) => {
    container.registerService(REASONING_SERVICE_IDS[key], instance);
  });
  return instances;
}

export function resolveReasoningServices(container = serviceContainer) {
  return {
    sessionManager: container.resolveService(REASONING_SERVICE_IDS.sessionManager),
    chainHealthMonitor: container.resolveService(REASONING_SERVICE_IDS.chainHealthMonitor)
  };
}

export function ensureReasoningServicesRegistered(container = serviceContainer) {
  const missing = Object.values(REASONING_SERVICE_IDS).filter(id => !container.tryResolveService(id));
  if (missing.length === 0) return false;
  registerReasoningServices(container);
  return true;
}

export function getReasoningServices() {
  ensureReasoningServicesRegistered();
  return resolveReasoningServices();
}

