/**
 * Provider Registry System
 *
 * Centralized, intelligent provider registration system that:
 * - Prevents duplicate registrations
 * - Manages provider lifecycle
 * - Supports plugin architecture
 * - Provides validation and error handling
 * - Enables easy extension
 *
 * @module core/provider-registry
 */

import { ExtensionPoints, Registry } from './extension-points.js';

/**
 * Provider registration state
 */
const RegistrationState = Object.freeze({
  UNREGISTERED: 'unregistered',
  REGISTERING: 'registering',
  REGISTERED: 'registered',
  FAILED: 'failed'
});

/**
 * ProviderRegistry
 *
 * Smart registry that coordinates all provider registrations
 * and prevents duplicates through state tracking
 */
export class ProviderRegistry {
  /**
   * Track registration state for each provider
   * Structure: Map<extensionPoint, Map<providerName, state>>
   * @private
   */
  static #registrationState = new Map();

  /**
   * Track provider metadata
   * Structure: Map<extensionPoint, Map<providerName, metadata>>
   * @private
   */
  static #metadata = new Map();

  /**
   * Initialization flag
   * @private
   */
  static #initialized = false;

  /**
   * Debug mode
   * @private
   */
  static #debugMode = false;

  /**
   * Initialize the provider registry
   * Should be called once during application bootstrap
   */
  static initialize() {
    if (this.#initialized) {
      if (this.#debugMode) {
        console.log('[ProviderRegistry] Already initialized');
      }
      return;
    }

    this.#initialized = true;

    // Initialize state tracking for all extension points
    Object.values(ExtensionPoints).forEach(point => {
      this.#registrationState.set(point, new Map());
      this.#metadata.set(point, new Map());
    });

    if (this.#debugMode) {
      console.log('[ProviderRegistry] Initialized for', Object.keys(ExtensionPoints).length, 'extension points');
    }
  }

  /**
   * Register a provider (with duplicate prevention)
   *
   * @param {string} extensionPoint - Extension point (e.g., ExtensionPoints.STORAGE_PROVIDERS)
   * @param {string} name - Provider name
   * @param {*} implementation - Provider implementation (class or factory)
   * @param {Object} options - Registration options
   * @param {boolean} options.force - Force re-registration (default: false)
   * @param {string} options.description - Provider description
   * @param {string} options.version - Provider version
   * @param {string[]} options.dependencies - Provider dependencies
   * @returns {boolean} True if registered successfully
   */
  static register(extensionPoint, name, implementation, options = {}) {
    this.initialize();

    const {
      force = false,
      description = '',
      version = '1.0.0',
      dependencies = []
    } = options;

    // Validate inputs
    if (!this.#validateRegistration(extensionPoint, name, implementation)) {
      return false;
    }

    // Get current state
    const pointState = this.#registrationState.get(extensionPoint);
    const currentState = pointState.get(name);

    // Check if already registered
    if (currentState === RegistrationState.REGISTERED && !force) {
      console.warn(
        `[ProviderRegistry] Provider "${name}" already registered for "${extensionPoint}". ` +
        `Use force: true to re-register.`
      );
      return false;
    }

    // Check if currently registering (prevent race conditions)
    if (currentState === RegistrationState.REGISTERING) {
      console.warn(
        `[ProviderRegistry] Provider "${name}" is currently being registered for "${extensionPoint}"`
      );
      return false;
    }

    try {
      // Mark as registering
      pointState.set(name, RegistrationState.REGISTERING);

      // Register with base Registry
      Registry.register(extensionPoint, name, implementation);

      // Store metadata
      this.#metadata.get(extensionPoint).set(name, {
        description,
        version,
        dependencies,
        registeredAt: Date.now()
      });

      // Mark as registered
      pointState.set(name, RegistrationState.REGISTERED);

      if (this.#debugMode) {
        console.log(
          `[ProviderRegistry] ✅ Successfully registered "${name}" for "${extensionPoint}"`,
          { version, dependencies }
        );
      }

      return true;
    } catch (error) {
      // Mark as failed
      pointState.set(name, RegistrationState.FAILED);

      console.error(
        `[ProviderRegistry] ❌ Failed to register "${name}" for "${extensionPoint}":`,
        error
      );

      return false;
    }
  }

  /**
   * Register multiple providers at once
   *
   * @param {Array<Object>} providers - Array of provider configs
   * @returns {Object} Registration results
   */
  static registerBatch(providers) {
    const results = {
      successful: [],
      failed: [],
      skipped: []
    };

    providers.forEach(({ extensionPoint, name, implementation, options }) => {
      const success = this.register(extensionPoint, name, implementation, options);

      if (success) {
        results.successful.push(name);
      } else {
        const state = this.getState(extensionPoint, name);
        if (state === RegistrationState.REGISTERED) {
          results.skipped.push(name);
        } else {
          results.failed.push(name);
        }
      }
    });

    if (this.#debugMode) {
      console.log('[ProviderRegistry] Batch registration complete:', results);
    }

    return results;
  }

  /**
   * Check if a provider is registered
   *
   * @param {string} extensionPoint - Extension point
   * @param {string} name - Provider name
   * @returns {boolean} True if registered
   */
  static isRegistered(extensionPoint, name) {
    const pointState = this.#registrationState.get(extensionPoint);
    if (!pointState) return false;

    return pointState.get(name) === RegistrationState.REGISTERED;
  }

  /**
   * Get registration state of a provider
   *
   * @param {string} extensionPoint - Extension point
   * @param {string} name - Provider name
   * @returns {string} Registration state
   */
  static getState(extensionPoint, name) {
    const pointState = this.#registrationState.get(extensionPoint);
    return pointState?.get(name) || RegistrationState.UNREGISTERED;
  }

  /**
   * Get provider metadata
   *
   * @param {string} extensionPoint - Extension point
   * @param {string} name - Provider name
   * @returns {Object|null} Provider metadata
   */
  static getMetadata(extensionPoint, name) {
    const pointMetadata = this.#metadata.get(extensionPoint);
    return pointMetadata?.get(name) || null;
  }

  /**
   * Unregister a provider
   *
   * @param {string} extensionPoint - Extension point
   * @param {string} name - Provider name
   * @returns {boolean} True if unregistered
   */
  static unregister(extensionPoint, name) {
    const pointState = this.#registrationState.get(extensionPoint);
    const pointMetadata = this.#metadata.get(extensionPoint);

    if (!pointState) return false;

    // Unregister from base Registry
    const success = Registry.unregister(extensionPoint, name);

    if (success) {
      // Clear state and metadata
      pointState.set(name, RegistrationState.UNREGISTERED);
      pointMetadata.delete(name);

      if (this.#debugMode) {
        console.log(`[ProviderRegistry] Unregistered "${name}" from "${extensionPoint}"`);
      }
    }

    return success;
  }

  /**
   * Get all registered providers for an extension point
   *
   * @param {string} extensionPoint - Extension point
   * @returns {Array<Object>} Array of provider info
   */
  static listProviders(extensionPoint) {
    const pointState = this.#registrationState.get(extensionPoint);
    const pointMetadata = this.#metadata.get(extensionPoint);

    if (!pointState) return [];

    const providers = [];

    for (const [name, state] of pointState.entries()) {
      if (state === RegistrationState.REGISTERED) {
        providers.push({
          name,
          state,
          metadata: pointMetadata.get(name) || {}
        });
      }
    }

    return providers;
  }

  /**
   * Get statistics about all registrations
   *
   * @returns {Object} Registration statistics
   */
  static getStats() {
    const stats = {
      extensionPoints: {},
      totals: {
        registered: 0,
        failed: 0,
        unregistered: 0
      }
    };

    for (const [point, stateMap] of this.#registrationState.entries()) {
      const pointStats = {
        registered: 0,
        failed: 0,
        unregistered: 0,
        providers: []
      };

      for (const [name, state] of stateMap.entries()) {
        pointStats.providers.push({ name, state });

        if (state === RegistrationState.REGISTERED) {
          pointStats.registered++;
          stats.totals.registered++;
        } else if (state === RegistrationState.FAILED) {
          pointStats.failed++;
          stats.totals.failed++;
        } else if (state === RegistrationState.UNREGISTERED) {
          pointStats.unregistered++;
          stats.totals.unregistered++;
        }
      }

      stats.extensionPoints[point] = pointStats;
    }

    return stats;
  }

  /**
   * Enable debug mode
   */
  static enableDebug() {
    this.#debugMode = true;
    console.log('[ProviderRegistry] Debug mode enabled');
  }

  /**
   * Disable debug mode
   */
  static disableDebug() {
    this.#debugMode = false;
  }

  /**
   * Reset the registry (useful for testing)
   */
  static reset() {
    this.#registrationState.clear();
    this.#metadata.clear();
    this.#initialized = false;
    Registry.clearAll();

    console.log('[ProviderRegistry] Registry reset');
  }

  /**
   * Validate registration inputs
   * @private
   */
  static #validateRegistration(extensionPoint, name, implementation) {
    if (!extensionPoint || typeof extensionPoint !== 'string') {
      console.error('[ProviderRegistry] Invalid extension point:', extensionPoint);
      return false;
    }

    if (!name || typeof name !== 'string') {
      console.error('[ProviderRegistry] Invalid provider name:', name);
      return false;
    }

    if (!implementation) {
      console.error('[ProviderRegistry] Invalid implementation for', name);
      return false;
    }

    // Check if extension point is valid
    if (!Object.values(ExtensionPoints).includes(extensionPoint)) {
      console.warn(
        `[ProviderRegistry] Extension point "${extensionPoint}" not found in ExtensionPoints. ` +
        `Available: ${Object.values(ExtensionPoints).join(', ')}`
      );
    }

    return true;
  }

  /**
   * Debug: Print full registry state
   */
  static debug() {
    console.group('[ProviderRegistry] Full State');

    console.log('Initialized:', this.#initialized);
    console.log('Debug Mode:', this.#debugMode);
    console.log('\nStatistics:', this.getStats());

    console.group('Registration Details');
    for (const [point, stateMap] of this.#registrationState.entries()) {
      if (stateMap.size > 0) {
        console.group(point);
        for (const [name, state] of stateMap.entries()) {
          const metadata = this.#metadata.get(point).get(name);
          console.log(`${name}:`, { state, metadata });
        }
        console.groupEnd();
      }
    }
    console.groupEnd();

    console.groupEnd();
  }
}

// Make available for browser console debugging
if (typeof window !== 'undefined') {
  window.ProviderRegistry = ProviderRegistry;
  window.RegistrationState = RegistrationState;
}
