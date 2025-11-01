/**
 * Storage Provider Manager
 *
 * Manages storage providers and provides a unified interface
 * Allows switching between different storage backends
 *
 * NOTE: Does NOT register providers - registration is handled by
 * the centralized ProviderRegistry system in core/provider-registry.js
 */

import { Registry, ExtensionPoints } from '../../core/extension-points.js';

/**
 * StorageProviderManager
 * Manages and coordinates storage providers
 */
export class StorageProviderManager {
  constructor(options = {}) {
    this.currentProviderName = null;
    this.currentProvider = null;
    this.autoInitialize = options.autoInitialize !== false;
  }

  /**
   * Initialize with a specific provider
   * @param {string} providerName - Name of the provider to use (default: 'localStorage')
   * @returns {boolean} True if initialized successfully
   */
  initialize(providerName = 'localStorage') {
    if (!this.autoInitialize && this.currentProvider) {
      console.log('[StorageProviderManager] Already initialized');
      return true;
    }

    return this.setProvider(providerName);
  }

  /**
   * Set the active storage provider
   * @param {string} providerName - Name of the registered provider
   * @param {Object} options - Options to pass to provider constructor
   * @returns {boolean} True if provider was set successfully
   */
  setProvider(providerName, options = {}) {
    try {
      const ProviderClass = Registry.get(ExtensionPoints.STORAGE_PROVIDERS, providerName);

      if (!ProviderClass) {
        console.error(`[StorageProviderManager] Provider "${providerName}" not found`);
        return false;
      }

      // Instantiate provider
      this.currentProvider = new ProviderClass(options);
      this.currentProviderName = providerName;

      console.log(`[StorageProviderManager] Active provider: ${providerName}`);
      return true;
    } catch (error) {
      console.error(`[StorageProviderManager] Error setting provider "${providerName}":`, error);
      return false;
    }
  }

  /**
   * Get the current provider instance
   * @returns {Object} Current provider
   */
  getProvider() {
    return this.currentProvider;
  }

  /**
   * Get the current provider name
   * @returns {string} Current provider name
   */
  getProviderName() {
    return this.currentProviderName;
  }

  /**
   * List all available providers
   * @returns {string[]} Array of provider names
   */
  listProviders() {
    return Registry.list(ExtensionPoints.STORAGE_PROVIDERS);
  }

  /**
   * Load data using current provider
   * @param {string} key - Storage key
   * @returns {Promise<*>}
   */
  async load(key) {
    if (!this.currentProvider) {
      throw new Error('No storage provider set');
    }
    return this.currentProvider.load(key);
  }

  /**
   * Save data using current provider
   * @param {string} key - Storage key
   * @param {*} value - Value to save
   * @returns {Promise<void>}
   */
  async save(key, value) {
    if (!this.currentProvider) {
      throw new Error('No storage provider set');
    }
    return this.currentProvider.save(key, value);
  }

  /**
   * Delete data using current provider
   * @param {string} key - Storage key
   * @returns {Promise<void>}
   */
  async delete(key) {
    if (!this.currentProvider) {
      throw new Error('No storage provider set');
    }
    return this.currentProvider.delete(key);
  }

  /**
   * Clear all data using current provider
   * @returns {Promise<void>}
   */
  async clear() {
    if (!this.currentProvider) {
      throw new Error('No storage provider set');
    }
    return this.currentProvider.clear();
  }

  /**
   * Check if current provider is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    if (!this.currentProvider) {
      return false;
    }
    return this.currentProvider.isAvailable();
  }

  /**
   * Get storage statistics from current provider
   * @returns {Promise<Object>}
   */
  async getStats() {
    if (!this.currentProvider) {
      return { error: 'No provider set' };
    }

    if (typeof this.currentProvider.getStats === 'function') {
      return this.currentProvider.getStats();
    }

    return { provider: this.currentProviderName, statsNotAvailable: true };
  }

  /**
   * Export all data from current provider
   * @returns {Promise<Object>}
   */
  async exportAll() {
    if (!this.currentProvider) {
      return {};
    }

    if (typeof this.currentProvider.exportAll === 'function') {
      return this.currentProvider.exportAll();
    }

    console.warn('[StorageProviderManager] Export not supported by current provider');
    return {};
  }

  /**
   * Import data into current provider
   * @param {Object} data - Data to import
   * @returns {Promise<void>}
   */
  async importAll(data) {
    if (!this.currentProvider) {
      throw new Error('No storage provider set');
    }

    if (typeof this.currentProvider.importAll === 'function') {
      return this.currentProvider.importAll(data);
    }

    console.warn('[StorageProviderManager] Import not supported by current provider');
  }

  /**
   * Migrate data from one provider to another
   * @param {string} fromProvider - Source provider name
   * @param {string} toProvider - Destination provider name
   * @returns {Promise<boolean>} True if migration succeeded
   */
  async migrateProvider(fromProvider, toProvider) {
    try {
      console.log(`[StorageProviderManager] Migrating ${fromProvider} → ${toProvider}`);

      // Set source provider
      this.setProvider(fromProvider);
      const data = await this.exportAll();

      // Set destination provider
      this.setProvider(toProvider);
      await this.importAll(data);

      console.log(`[StorageProviderManager] Migration complete: ${Object.keys(data).length} items migrated`);
      return true;
    } catch (error) {
      console.error('[StorageProviderManager] Migration failed:', error);
      return false;
    }
  }
}

/**
 * Create singleton instance
 *
 * NOTE: Provider registration happens in main.js via ProviderLoader.
 * This manager only handles switching between registered providers.
 */
export const storageProviderManager = new StorageProviderManager({
  autoInitialize: false  // Don't auto-initialize, let main.js coordinate
});
