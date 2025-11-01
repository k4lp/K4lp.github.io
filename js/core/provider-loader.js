/**
 * Provider Loader
 *
 * Plugin-style provider loading system that:
 * - Loads providers from declarative manifest
 * - Supports lazy loading
 * - Handles dependencies
 * - Provides lifecycle hooks
 * - Enables easy addition of new providers
 *
 * @module core/provider-loader
 */

import { ProviderRegistry } from './provider-registry.js';

/**
 * Provider loading state
 */
const LoadingState = Object.freeze({
  PENDING: 'pending',
  LOADING: 'loading',
  LOADED: 'loaded',
  FAILED: 'failed'
});

/**
 * ProviderLoader
 *
 * Manages loading and initialization of providers from manifests
 */
export class ProviderLoader {
  /**
   * Track loading state
   * @private
   */
  static #loadingState = new Map();

  /**
   * Loaded provider modules
   * @private
   */
  static #loadedModules = new Map();

  /**
   * Loading queue
   * @private
   */
  static #loadingQueue = [];

  /**
   * Debug mode
   * @private
   */
  static #debugMode = false;

  /**
   * Load providers from a manifest
   *
   * @param {Object} manifest - Provider manifest
   * @param {Array} manifest.providers - Array of provider definitions
   * @returns {Promise<Object>} Loading results
   */
  static async loadFromManifest(manifest) {
    if (!manifest || !Array.isArray(manifest.providers)) {
      console.error('[ProviderLoader] Invalid manifest format');
      return { loaded: [], failed: [] };
    }

    const results = {
      loaded: [],
      failed: [],
      skipped: []
    };

    // Initialize provider registry
    ProviderRegistry.initialize();

    if (this.#debugMode) {
      console.log('[ProviderLoader] Loading', manifest.providers.length, 'providers from manifest');
    }

    // Process each provider
    for (const providerDef of manifest.providers) {
      const result = await this.#loadProvider(providerDef);

      if (result.success) {
        results.loaded.push(providerDef.name);
      } else if (result.skipped) {
        results.skipped.push(providerDef.name);
      } else {
        results.failed.push(providerDef.name);
      }
    }

    if (this.#debugMode) {
      console.log('[ProviderLoader] Loading complete:', results);
    }

    return results;
  }

  /**
   * Load a single provider
   *
   * @param {Object} providerDef - Provider definition
   * @returns {Promise<Object>} Loading result
   * @private
   */
  static async #loadProvider(providerDef) {
    const {
      name,
      extensionPoint,
      module: modulePath,
      exportName,
      enabled = true,
      lazy = false,
      options = {}
    } = providerDef;

    // Skip if disabled
    if (!enabled) {
      if (this.#debugMode) {
        console.log(`[ProviderLoader] Skipping disabled provider: ${name}`);
      }
      return { success: false, skipped: true };
    }

    // Skip if already registered
    if (ProviderRegistry.isRegistered(extensionPoint, name)) {
      if (this.#debugMode) {
        console.log(`[ProviderLoader] Provider already registered: ${name}`);
      }
      return { success: false, skipped: true };
    }

    // Handle lazy loading
    if (lazy) {
      this.#loadingQueue.push(providerDef);
      if (this.#debugMode) {
        console.log(`[ProviderLoader] Queued for lazy loading: ${name}`);
      }
      return { success: true, lazy: true };
    }

    // Mark as loading
    this.#loadingState.set(name, LoadingState.LOADING);

    try {
      // Dynamically import the provider module
      if (this.#debugMode) {
        console.log(`[ProviderLoader] Loading module: ${modulePath}`);
      }

      const module = await import(modulePath);

      // Get the exported provider class/factory
      const ProviderImplementation = exportName ? module[exportName] : module.default;

      if (!ProviderImplementation) {
        throw new Error(`Export "${exportName || 'default'}" not found in ${modulePath}`);
      }

      // Store loaded module
      this.#loadedModules.set(name, {
        module,
        implementation: ProviderImplementation,
        definition: providerDef
      });

      // Register the provider
      const registered = ProviderRegistry.register(
        extensionPoint,
        name,
        ProviderImplementation,
        options
      );

      if (!registered) {
        throw new Error('Registration failed');
      }

      // Mark as loaded
      this.#loadingState.set(name, LoadingState.LOADED);

      if (this.#debugMode) {
        console.log(`[ProviderLoader] ✅ Loaded and registered: ${name}`);
      }

      return { success: true };
    } catch (error) {
      // Mark as failed
      this.#loadingState.set(name, LoadingState.FAILED);

      console.error(`[ProviderLoader] ❌ Failed to load provider "${name}":`, error);

      return { success: false, error };
    }
  }

  /**
   * Load a specific provider by name
   *
   * @param {string} name - Provider name
   * @returns {Promise<boolean>} True if loaded successfully
   */
  static async loadProvider(name) {
    // Check if in lazy loading queue
    const queuedProvider = this.#loadingQueue.find(p => p.name === name);

    if (!queuedProvider) {
      console.warn(`[ProviderLoader] Provider "${name}" not found in queue`);
      return false;
    }

    const result = await this.#loadProvider(queuedProvider);

    // Remove from queue
    this.#loadingQueue = this.#loadingQueue.filter(p => p.name !== name);

    return result.success;
  }

  /**
   * Load all queued providers
   *
   * @returns {Promise<Object>} Loading results
   */
  static async loadQueued() {
    const results = {
      loaded: [],
      failed: []
    };

    const queue = [...this.#loadingQueue];
    this.#loadingQueue = [];

    for (const providerDef of queue) {
      const result = await this.#loadProvider(providerDef);

      if (result.success) {
        results.loaded.push(providerDef.name);
      } else {
        results.failed.push(providerDef.name);
      }
    }

    return results;
  }

  /**
   * Get loading state of a provider
   *
   * @param {string} name - Provider name
   * @returns {string} Loading state
   */
  static getLoadingState(name) {
    return this.#loadingState.get(name) || LoadingState.PENDING;
  }

  /**
   * Get loaded module for a provider
   *
   * @param {string} name - Provider name
   * @returns {Object|null} Loaded module info
   */
  static getLoadedModule(name) {
    return this.#loadedModules.get(name) || null;
  }

  /**
   * Check if a provider is loaded
   *
   * @param {string} name - Provider name
   * @returns {boolean} True if loaded
   */
  static isLoaded(name) {
    return this.#loadingState.get(name) === LoadingState.LOADED;
  }

  /**
   * Get all loading states
   *
   * @returns {Object} Loading states
   */
  static getAllStates() {
    const states = {};

    for (const [name, state] of this.#loadingState.entries()) {
      states[name] = state;
    }

    return states;
  }

  /**
   * Get loading statistics
   *
   * @returns {Object} Loading stats
   */
  static getStats() {
    const stats = {
      loaded: 0,
      failed: 0,
      pending: 0,
      loading: 0,
      queued: this.#loadingQueue.length,
      providers: []
    };

    for (const [name, state] of this.#loadingState.entries()) {
      stats.providers.push({ name, state });

      if (state === LoadingState.LOADED) stats.loaded++;
      else if (state === LoadingState.FAILED) stats.failed++;
      else if (state === LoadingState.PENDING) stats.pending++;
      else if (state === LoadingState.LOADING) stats.loading++;
    }

    return stats;
  }

  /**
   * Enable debug mode
   */
  static enableDebug() {
    this.#debugMode = true;
    ProviderRegistry.enableDebug();
    console.log('[ProviderLoader] Debug mode enabled');
  }

  /**
   * Disable debug mode
   */
  static disableDebug() {
    this.#debugMode = false;
    ProviderRegistry.disableDebug();
  }

  /**
   * Reset loader state
   */
  static reset() {
    this.#loadingState.clear();
    this.#loadedModules.clear();
    this.#loadingQueue = [];
    console.log('[ProviderLoader] Loader reset');
  }

  /**
   * Debug: Print loader state
   */
  static debug() {
    console.group('[ProviderLoader] State');
    console.log('Statistics:', this.getStats());
    console.log('Loading Queue:', this.#loadingQueue.map(p => p.name));
    console.log('Loaded Modules:', Array.from(this.#loadedModules.keys()));
    console.log('\nAll States:', this.getAllStates());
    console.groupEnd();
  }
}

// Make available for browser console debugging
if (typeof window !== 'undefined') {
  window.ProviderLoader = ProviderLoader;
  window.LoadingState = LoadingState;
}
