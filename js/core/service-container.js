/**
 * ServiceContainer
 *
 * Lightweight inversion-of-control registry for the browser.
 * Allows modules to register lazily constructed services and
 * lets consumers await them without depending on global timing.
 */

const registry = new Map();
const waiters = new Map();

function normalizeProvider(provider, options = {}) {
  if (provider === null || provider === undefined) {
    throw new Error('Cannot register null/undefined service');
  }

  if (typeof provider === 'function') {
    return {
      factory: provider,
      instance: undefined,
      tags: options.tags || [],
      singleton: options.singleton !== false
    };
  }

  return {
    factory: options.singleton === false ? () => provider : undefined,
    instance: provider,
    tags: options.tags || [],
    singleton: options.singleton !== false
  };
}

function instantiate(name, entry) {
  if (!entry) {
    throw new Error(`Service '${name}' is not registered`);
  }

  if (entry.singleton) {
    if (!entry.instance) {
      entry.instance = entry.factory ? entry.factory() : entry.instance;
      notifyWaiters(name, entry.instance);
    }
    return entry.instance;
  }

  const instance = entry.factory ? entry.factory() : entry.instance;
  notifyWaiters(name, instance);
  return instance;
}

function notifyWaiters(name, instance) {
  const pending = waiters.get(name);
  if (!pending || pending.length === 0) return;
  waiters.delete(name);

  pending.forEach((resolver) => {
    try {
      resolver(instance);
    } catch (error) {
      console.error(`[ServiceContainer] waiter for '${name}' threw`, error);
    }
  });
}

export function registerService(name, provider, options = {}) {
  if (!name || typeof name !== 'string') {
    throw new Error('Service name must be a non-empty string');
  }

  const normalized = normalizeProvider(provider, options);
  registry.set(name, normalized);

  if (normalized.instance) {
    notifyWaiters(name, normalized.instance);
  } else if (!normalized.singleton) {
    // Non-singleton factories should still resolve waiters immediately with a fresh instance.
    notifyWaiters(name, normalized.factory());
  }
}

export function registerFactory(name, factory, options = {}) {
  if (typeof factory !== 'function') {
    throw new Error(`Factory for '${name}' must be a function`);
  }
  registerService(name, factory, { ...options, singleton: options.singleton !== false });
}

export function resolveService(name) {
  const entry = registry.get(name);
  if (!entry) {
    throw new Error(`Service '${name}' is not registered`);
  }
  return instantiate(name, entry);
}

export function tryResolveService(name) {
  const entry = registry.get(name);
  if (!entry) return undefined;
  try {
    return instantiate(name, entry);
  } catch {
    return undefined;
  }
}

export function whenServiceReady(name) {
  if (registry.has(name)) {
    return Promise.resolve(resolveService(name));
  }

  return new Promise((resolve) => {
    const pending = waiters.get(name) || [];
    pending.push(resolve);
    waiters.set(name, pending);
  });
}

export function whenServicesReady(names) {
  return Promise.all(names.map((name) => whenServiceReady(name)));
}

export function listRegisteredServices() {
  return Array.from(registry.keys());
}

export const serviceContainer = {
  registerService,
  registerFactory,
  resolveService,
  tryResolveService,
  whenServiceReady,
  whenServicesReady,
  listRegisteredServices
};

// Optional global bridge for debugging / legacy hooks
if (typeof window !== 'undefined') {
  window.GDRS = window.GDRS || {};
  window.GDRS.ServiceContainer = serviceContainer;
}

export default serviceContainer;
