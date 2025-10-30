/**
 * Extension Points
 *
 * This module defines all the extension points in the application where
 * new features can be "plugged in" by writing new code modules.
 *
 * Usage:
 *   1. Write a class that implements the corresponding interface
 *   2. Register it using the Registry
 *   3. Retrieve and use it when needed
 *
 * Example:
 *   // Add a new API provider
 *   class OpenAIProvider { ... }
 *   Registry.register(ExtensionPoints.API_PROVIDERS, 'openai', OpenAIProvider);
 *   const Provider = Registry.get(ExtensionPoints.API_PROVIDERS, 'openai');
 */

/**
 * Extension Points - Well-defined locations where new features can be added
 * @readonly
 * @enum {string}
 */
export const ExtensionPoints = Object.freeze({
  /**
   * API Providers - Add support for different LLM APIs
   * Interface: IAPIProvider
   * Examples: 'gemini', 'openai', 'anthropic', 'ollama'
   */
  API_PROVIDERS: 'api.providers',

  /**
   * Storage Providers - Add different storage backends
   * Interface: IStorageProvider
   * Examples: 'localStorage', 'indexedDB', 'cloud', 'memory'
   */
  STORAGE_PROVIDERS: 'storage.providers',

  /**
   * Execution Engines - Add different code execution contexts
   * Interface: IExecutionEngine
   * Examples: 'browser', 'worker', 'wasm', 'sandbox'
   */
  EXECUTION_ENGINES: 'execution.engines',

  /**
   * Parsers - Add support for different response formats
   * Interface: IParser
   * Examples: 'xml', 'json', 'markdown', 'custom'
   */
  PARSERS: 'parsers',

  /**
   * Renderers - Add new UI rendering components
   * Interface: IRenderer
   * Examples: 'keys', 'goals', 'memory', 'tasks', 'vault', 'output'
   */
  RENDERERS: 'renderers',

  /**
   * Middleware - Add interceptors for data transformation
   * Interface: IMiddleware
   * Examples: 'retry', 'cache', 'logging', 'encryption'
   */
  MIDDLEWARE: 'middleware',

  /**
   * Validators - Add validation logic
   * Interface: IValidator
   * Examples: 'input', 'output', 'config', 'api-response'
   */
  VALIDATORS: 'validators',

  /**
   * Transformers - Add data transformation logic
   * Interface: ITransformer
   * Examples: 'markdown', 'syntax-highlight', 'sanitize'
   */
  TRANSFORMERS: 'transformers'
});

/**
 * Registry - Manages registered implementations for extension points
 *
 * This is a simple registry that allows you to:
 * - Register implementations for extension points
 * - Retrieve implementations by name
 * - List all registered implementations for an extension point
 */
export class Registry {
  /**
   * Storage for all registered implementations
   * Structure: Map<extensionPoint, Map<name, implementation>>
   * @private
   */
  static #implementations = new Map();

  /**
   * Register an implementation for an extension point
   *
   * @param {string} extensionPoint - The extension point (from ExtensionPoints)
   * @param {string} name - Unique name for this implementation
   * @param {*} implementation - The implementation (class, function, or object)
   * @throws {Error} If extensionPoint or name is invalid
   *
   * @example
   * // Register a new API provider
   * Registry.register(ExtensionPoints.API_PROVIDERS, 'openai', OpenAIProvider);
   */
  static register(extensionPoint, name, implementation) {
    if (!extensionPoint || typeof extensionPoint !== 'string') {
      throw new Error('Extension point must be a non-empty string');
    }

    if (!name || typeof name !== 'string') {
      throw new Error('Name must be a non-empty string');
    }

    if (!implementation) {
      throw new Error('Implementation cannot be null or undefined');
    }

    // Initialize extension point map if it doesn't exist
    if (!this.#implementations.has(extensionPoint)) {
      this.#implementations.set(extensionPoint, new Map());
    }

    const pointImplementations = this.#implementations.get(extensionPoint);

    // Warn if overwriting existing implementation
    if (pointImplementations.has(name)) {
      console.warn(`[Registry] Overwriting existing implementation "${name}" for extension point "${extensionPoint}"`);
    }

    pointImplementations.set(name, implementation);
    console.log(`[Registry] Registered "${name}" for extension point "${extensionPoint}"`);
  }

  /**
   * Get an implementation by name
   *
   * @param {string} extensionPoint - The extension point
   * @param {string} name - Name of the implementation
   * @returns {*} The implementation, or undefined if not found
   *
   * @example
   * const Provider = Registry.get(ExtensionPoints.API_PROVIDERS, 'openai');
   * const api = new Provider({ apiKey: 'your-key' });
   */
  static get(extensionPoint, name) {
    const pointImplementations = this.#implementations.get(extensionPoint);

    if (!pointImplementations) {
      console.warn(`[Registry] No implementations registered for extension point "${extensionPoint}"`);
      return undefined;
    }

    const implementation = pointImplementations.get(name);

    if (!implementation) {
      console.warn(`[Registry] Implementation "${name}" not found for extension point "${extensionPoint}"`);
    }

    return implementation;
  }

  /**
   * Check if an implementation exists
   *
   * @param {string} extensionPoint - The extension point
   * @param {string} name - Name of the implementation
   * @returns {boolean} True if implementation exists
   */
  static has(extensionPoint, name) {
    const pointImplementations = this.#implementations.get(extensionPoint);
    return pointImplementations ? pointImplementations.has(name) : false;
  }

  /**
   * List all registered implementation names for an extension point
   *
   * @param {string} extensionPoint - The extension point
   * @returns {string[]} Array of implementation names
   *
   * @example
   * const providers = Registry.list(ExtensionPoints.API_PROVIDERS);
   * console.log('Available providers:', providers); // ['gemini', 'openai', ...]
   */
  static list(extensionPoint) {
    const pointImplementations = this.#implementations.get(extensionPoint);
    return pointImplementations ? Array.from(pointImplementations.keys()) : [];
  }

  /**
   * Unregister an implementation
   *
   * @param {string} extensionPoint - The extension point
   * @param {string} name - Name of the implementation to remove
   * @returns {boolean} True if implementation was removed
   */
  static unregister(extensionPoint, name) {
    const pointImplementations = this.#implementations.get(extensionPoint);

    if (!pointImplementations) {
      return false;
    }

    const removed = pointImplementations.delete(name);

    if (removed) {
      console.log(`[Registry] Unregistered "${name}" from extension point "${extensionPoint}"`);
    }

    return removed;
  }

  /**
   * Clear all implementations for an extension point
   *
   * @param {string} extensionPoint - The extension point to clear
   */
  static clear(extensionPoint) {
    if (this.#implementations.has(extensionPoint)) {
      this.#implementations.get(extensionPoint).clear();
      console.log(`[Registry] Cleared all implementations for extension point "${extensionPoint}"`);
    }
  }

  /**
   * Clear all registered implementations (use with caution!)
   */
  static clearAll() {
    this.#implementations.clear();
    console.log('[Registry] Cleared all registered implementations');
  }

  /**
   * Get all extension points that have registered implementations
   *
   * @returns {string[]} Array of extension point names
   */
  static getExtensionPoints() {
    return Array.from(this.#implementations.keys());
  }

  /**
   * Get statistics about registered implementations
   *
   * @returns {Object} Statistics object
   */
  static getStats() {
    const stats = {};

    for (const [extensionPoint, implementations] of this.#implementations) {
      stats[extensionPoint] = {
        count: implementations.size,
        names: Array.from(implementations.keys())
      };
    }

    return stats;
  }

  /**
   * Debug: Print all registered implementations
   */
  static debug() {
    console.group('[Registry] All Registered Implementations');

    for (const [extensionPoint, implementations] of this.#implementations) {
      console.group(`Extension Point: ${extensionPoint}`);

      for (const [name, implementation] of implementations) {
        console.log(`  - ${name}:`, implementation);
      }

      console.groupEnd();
    }

    console.groupEnd();
  }
}

// Make Registry available for debugging in browser console
if (typeof window !== 'undefined') {
  window.Registry = Registry;
  window.ExtensionPoints = ExtensionPoints;
}
