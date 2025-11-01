import { userQueryProvider } from './user-query-provider.js';
import { tasksProvider } from './tasks-provider.js';
import { goalsProvider } from './goals-provider.js';
import { memoryProvider } from './memory-provider.js';
import { vaultSummaryProvider } from './vault-summary-provider.js';
import { recentExecutionsProvider } from './recent-executions-provider.js';
import { recentReasoningProvider } from './recent-reasoning-provider.js';

export class ContextProviderRegistry {
  constructor(providers = []) {
    this._providers = new Map();
    providers.forEach((provider) => this.register(provider));
  }

  register(provider) {
    if (!provider || !provider.id) {
      throw new Error('Context providers must define a unique id');
    }
    this._providers.set(provider.id, provider);
  }

  get(id) {
    return this._providers.get(id) || null;
  }

  has(id) {
    return this._providers.has(id);
  }

  entries() {
    return Array.from(this._providers.values());
  }
}

export const defaultContextProviderRegistry = new ContextProviderRegistry([
  userQueryProvider,
  tasksProvider,
  goalsProvider,
  memoryProvider,
  vaultSummaryProvider,
  recentExecutionsProvider,
  recentReasoningProvider
]);

export function createDefaultContextProviders() {
  return new ContextProviderRegistry(defaultContextProviderRegistry.entries());
}

export {
  userQueryProvider,
  tasksProvider,
  goalsProvider,
  memoryProvider,
  vaultSummaryProvider,
  recentExecutionsProvider,
  recentReasoningProvider
};

export default defaultContextProviderRegistry;
