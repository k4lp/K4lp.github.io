/**
 * Provider Manifest
 *
 * Declarative configuration for all providers in the system.
 * Makes it easy to:
 * - Add new providers without touching initialization code
 * - Enable/disable providers
 * - Configure lazy loading
 * - Manage provider metadata
 * - See all available providers at a glance
 *
 * To add a new provider:
 * 1. Create the provider module (e.g., js/storage/providers/indexeddb-provider.js)
 * 2. Add entry to this manifest
 * 3. That's it! No other code changes needed.
 *
 * @module core/provider-manifest
 */

import { ExtensionPoints } from './extension-points.js';

/**
 * Provider Manifest
 *
 * Each provider definition includes:
 * - name: Unique identifier for the provider
 * - extensionPoint: Where the provider plugs in
 * - module: Path to the provider module
 * - exportName: Named export from the module
 * - enabled: Whether to load this provider
 * - lazy: Load on-demand vs. at startup
 * - options: Registration options (description, version, dependencies)
 */
export const PROVIDER_MANIFEST = {
  version: '1.0.0',

  /**
   * All providers in the system
   */
  providers: [
    // ==========================================
    // STORAGE PROVIDERS
    // ==========================================
    {
      name: 'localStorage',
      extensionPoint: ExtensionPoints.STORAGE_PROVIDERS,
      module: '../storage/providers/localstorage-provider.js',
      exportName: 'LocalStorageProvider',
      enabled: true,
      lazy: false,
      options: {
        description: 'Browser localStorage storage provider',
        version: '1.0.0',
        dependencies: []
      }
    },

    // Example: Future storage provider
    // Uncomment when ready to add IndexedDB support
    /*
    {
      name: 'indexedDB',
      extensionPoint: ExtensionPoints.STORAGE_PROVIDERS,
      module: '../storage/providers/indexeddb-provider.js',
      exportName: 'IndexedDBProvider',
      enabled: false,
      lazy: true,
      options: {
        description: 'IndexedDB storage provider for large data',
        version: '1.0.0',
        dependencies: []
      }
    },
    */

    // Example: Cloud storage provider
    /*
    {
      name: 'cloudStorage',
      extensionPoint: ExtensionPoints.STORAGE_PROVIDERS,
      module: '../storage/providers/cloud-storage-provider.js',
      exportName: 'CloudStorageProvider',
      enabled: false,
      lazy: true,
      options: {
        description: 'Cloud storage provider',
        version: '1.0.0',
        dependencies: []
      }
    },
    */

    // ==========================================
    // API PROVIDERS
    // ==========================================
    {
      name: 'gemini',
      extensionPoint: ExtensionPoints.API_PROVIDERS,
      module: '../api/providers/gemini-provider.js',
      exportName: 'GeminiProvider',
      enabled: true,
      lazy: false,
      options: {
        description: 'Google Gemini API provider',
        version: '1.0.0',
        dependencies: []
      }
    },

    // Example: OpenAI provider
    /*
    {
      name: 'openai',
      extensionPoint: ExtensionPoints.API_PROVIDERS,
      module: '../api/providers/openai-provider.js',
      exportName: 'OpenAIProvider',
      enabled: false,
      lazy: true,
      options: {
        description: 'OpenAI API provider',
        version: '1.0.0',
        dependencies: []
      }
    },
    */

    // Example: Anthropic Claude provider
    /*
    {
      name: 'anthropic',
      extensionPoint: ExtensionPoints.API_PROVIDERS,
      module: '../api/providers/anthropic-provider.js',
      exportName: 'AnthropicProvider',
      enabled: false,
      lazy: true,
      options: {
        description: 'Anthropic Claude API provider',
        version: '1.0.0',
        dependencies: []
      }
    },
    */

    // Example: Ollama local provider
    /*
    {
      name: 'ollama',
      extensionPoint: ExtensionPoints.API_PROVIDERS,
      module: '../api/providers/ollama-provider.js',
      exportName: 'OllamaProvider',
      enabled: false,
      lazy: true,
      options: {
        description: 'Ollama local LLM provider',
        version: '1.0.0',
        dependencies: []
      }
    },
    */

    // ==========================================
    // EXECUTION ENGINES
    // ==========================================
    // Example: WebWorker execution engine
    /*
    {
      name: 'webWorker',
      extensionPoint: ExtensionPoints.EXECUTION_ENGINES,
      module: '../execution/engines/webworker-engine.js',
      exportName: 'WebWorkerEngine',
      enabled: false,
      lazy: true,
      options: {
        description: 'Execute code in Web Workers for isolation',
        version: '1.0.0',
        dependencies: []
      }
    },
    */

    // ==========================================
    // PARSERS
    // ==========================================
    // Example: JSON parser
    /*
    {
      name: 'json',
      extensionPoint: ExtensionPoints.PARSERS,
      module: '../reasoning/parsers/json-parser.js',
      exportName: 'JSONParser',
      enabled: false,
      lazy: true,
      options: {
        description: 'Parse JSON-formatted responses',
        version: '1.0.0',
        dependencies: []
      }
    },
    */

    // ==========================================
    // MIDDLEWARE
    // ==========================================
    // Example: Retry middleware
    /*
    {
      name: 'retry',
      extensionPoint: ExtensionPoints.MIDDLEWARE,
      module: '../middleware/retry-middleware.js',
      exportName: 'RetryMiddleware',
      enabled: false,
      lazy: true,
      options: {
        description: 'Retry failed API requests',
        version: '1.0.0',
        dependencies: []
      }
    },
    */

    // Example: Cache middleware
    /*
    {
      name: 'cache',
      extensionPoint: ExtensionPoints.MIDDLEWARE,
      module: '../middleware/cache-middleware.js',
      exportName: 'CacheMiddleware',
      enabled: false,
      lazy: true,
      options: {
        description: 'Cache API responses',
        version: '1.0.0',
        dependencies: []
      }
    },
    */
  ],

  /**
   * Provider groups for easier management
   */
  groups: {
    storage: ['localStorage', 'indexedDB', 'cloudStorage'],
    api: ['gemini', 'openai', 'anthropic', 'ollama'],
    execution: ['webWorker'],
    parsers: ['json'],
    middleware: ['retry', 'cache']
  },

  /**
   * Default providers for each extension point
   */
  defaults: {
    [ExtensionPoints.STORAGE_PROVIDERS]: 'localStorage',
    [ExtensionPoints.API_PROVIDERS]: 'gemini'
  }
};

/**
 * Helper: Get enabled providers only
 */
export function getEnabledProviders() {
  return PROVIDER_MANIFEST.providers.filter(p => p.enabled);
}

/**
 * Helper: Get providers by extension point
 */
export function getProvidersByExtensionPoint(extensionPoint) {
  return PROVIDER_MANIFEST.providers.filter(p => p.extensionPoint === extensionPoint);
}

/**
 * Helper: Get provider by name
 */
export function getProviderByName(name) {
  return PROVIDER_MANIFEST.providers.find(p => p.name === name);
}

/**
 * Helper: Get providers by group
 */
export function getProvidersByGroup(group) {
  const providerNames = PROVIDER_MANIFEST.groups[group] || [];
  return PROVIDER_MANIFEST.providers.filter(p => providerNames.includes(p.name));
}

/**
 * Helper: Enable a provider
 */
export function enableProvider(name) {
  const provider = getProviderByName(name);
  if (provider) {
    provider.enabled = true;
    console.log(`[Manifest] Enabled provider: ${name}`);
    return true;
  }
  return false;
}

/**
 * Helper: Disable a provider
 */
export function disableProvider(name) {
  const provider = getProviderByName(name);
  if (provider) {
    provider.enabled = false;
    console.log(`[Manifest] Disabled provider: ${name}`);
    return true;
  }
  return false;
}

// Make available for debugging
if (typeof window !== 'undefined') {
  window.PROVIDER_MANIFEST = PROVIDER_MANIFEST;
  window.getEnabledProviders = getEnabledProviders;
  window.getProviderByName = getProviderByName;
}
