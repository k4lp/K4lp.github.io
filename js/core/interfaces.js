/**
 * Interfaces
 *
 * This module defines interface contracts for all major components.
 * These are TypeScript-style interfaces expressed as JSDoc comments.
 *
 * Any new code implementing these interfaces can be "plugged in" to the application
 * by registering it with the Registry at the appropriate ExtensionPoint.
 *
 * Note: JavaScript doesn't have native interfaces, so these serve as documentation
 * and contracts that implementations should follow. Consider adding runtime validation
 * if strict enforcement is needed.
 */

/**
 * @interface IStorageProvider
 * @description Interface for storage backends (localStorage, IndexedDB, cloud, etc.)
 *
 * @example
 * class CloudProvider {
 *   async load(key) { ... }
 *   async save(key, value) { ... }
 *   async delete(key) { ... }
 *   async clear() { ... }
 * }
 * Registry.register(ExtensionPoints.STORAGE_PROVIDERS, 'cloud', CloudProvider);
 */
export const IStorageProvider = {
  /**
   * Load data from storage
   * @param {string} key - Storage key
   * @returns {Promise<*>} The stored value, or null if not found
   */
  load: async (key) => {},

  /**
   * Save data to storage
   * @param {string} key - Storage key
   * @param {*} value - Value to store (will be serialized)
   * @returns {Promise<void>}
   */
  save: async (key, value) => {},

  /**
   * Delete data from storage
   * @param {string} key - Storage key
   * @returns {Promise<void>}
   */
  delete: async (key) => {},

  /**
   * Clear all data from storage
   * @returns {Promise<void>}
   */
  clear: async () => {},

  /**
   * Check if storage is available
   * @returns {Promise<boolean>}
   */
  isAvailable: async () => {}
};

/**
 * @interface IAPIProvider
 * @description Interface for LLM API providers (Gemini, OpenAI, Anthropic, etc.)
 *
 * @example
 * class OpenAIProvider {
 *   constructor(config) { this.apiKey = config.apiKey; }
 *   async generateContent(prompt, options) { ... }
 *   async validateKey(key) { ... }
 *   async listModels() { ... }
 * }
 * Registry.register(ExtensionPoints.API_PROVIDERS, 'openai', OpenAIProvider);
 */
export const IAPIProvider = {
  /**
   * Generate content using the LLM
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Generation options
   * @param {string} options.model - Model to use
   * @param {number} options.maxTokens - Maximum tokens to generate
   * @param {number} options.temperature - Sampling temperature
   * @returns {Promise<Object>} Response object with generated content
   */
  generateContent: async (prompt, options) => {},

  /**
   * Validate an API key
   * @param {string} key - The API key to validate
   * @returns {Promise<boolean>} True if key is valid
   */
  validateKey: async (key) => {},

  /**
   * List available models
   * @returns {Promise<Array<Object>>} Array of model objects
   */
  listModels: async () => {},

  /**
   * Get rate limit information
   * @returns {Promise<Object>} Rate limit info
   */
  getRateLimits: async () => {}
};

/**
 * @interface IExecutionEngine
 * @description Interface for code execution contexts (browser, worker, WASM, etc.)
 *
 * @example
 * class WorkerEngine {
 *   async execute(code, context) { ... }
 *   async cleanup() { ... }
 * }
 * Registry.register(ExtensionPoints.EXECUTION_ENGINES, 'worker', WorkerEngine);
 */
export const IExecutionEngine = {
  /**
   * Execute code in this engine
   * @param {string} code - JavaScript code to execute
   * @param {Object} context - Execution context (variables, vault access, etc.)
   * @returns {Promise<Object>} Execution result with output, logs, errors
   */
  execute: async (code, context) => {},

  /**
   * Cleanup resources used by this engine
   * @returns {Promise<void>}
   */
  cleanup: async () => {},

  /**
   * Check if this engine supports a feature
   * @param {string} feature - Feature name (e.g., 'async', 'modules', 'wasm')
   * @returns {boolean}
   */
  supports: (feature) => {}
};

/**
 * @interface IParser
 * @description Interface for response parsers (XML, JSON, Markdown, etc.)
 *
 * @example
 * class JSONParser {
 *   parse(text) { ... }
 *   extract(text, pattern) { ... }
 * }
 * Registry.register(ExtensionPoints.PARSERS, 'json', JSONParser);
 */
export const IParser = {
  /**
   * Parse text into structured data
   * @param {string} text - Text to parse
   * @returns {Object} Parsed data
   */
  parse: (text) => {},

  /**
   * Extract specific pattern from text
   * @param {string} text - Text to search
   * @param {string|RegExp} pattern - Pattern to extract
   * @returns {*} Extracted data
   */
  extract: (text, pattern) => {},

  /**
   * Validate that text can be parsed
   * @param {string} text - Text to validate
   * @returns {boolean}
   */
  validate: (text) => {}
};

/**
 * @interface IRenderer
 * @description Interface for UI rendering components
 *
 * @example
 * class GoalsRenderer {
 *   constructor(container) { this.container = container; }
 *   render(data) { ... }
 *   update(data) { ... }
 *   destroy() { ... }
 * }
 * Registry.register(ExtensionPoints.RENDERERS, 'goals', GoalsRenderer);
 */
export const IRenderer = {
  /**
   * Render data to the container
   * @param {*} data - Data to render
   * @param {HTMLElement} container - DOM container
   * @returns {void}
   */
  render: (data, container) => {},

  /**
   * Update existing render with new data
   * @param {*} data - New data
   * @returns {void}
   */
  update: (data) => {},

  /**
   * Clean up and destroy renderer
   * @returns {void}
   */
  destroy: () => {}
};

/**
 * @interface IMiddleware
 * @description Interface for middleware functions
 *
 * Middleware follows the chain-of-responsibility pattern.
 * Each middleware can:
 * - Process the context before calling next()
 * - Call next() to pass control to the next middleware
 * - Process the context after next() returns
 * - Skip calling next() to short-circuit the chain
 *
 * @example
 * const loggingMiddleware = async (context, next) => {
 *   console.log('Before:', context);
 *   await next();
 *   console.log('After:', context);
 * };
 * APIClient.use(loggingMiddleware);
 */
export const IMiddleware = {
  /**
   * Execute middleware
   * @param {Object} context - Context object (mutable)
   * @param {Function} next - Call to invoke next middleware in chain
   * @returns {Promise<void>}
   */
  execute: async (context, next) => {}
};

/**
 * @interface IValidator
 * @description Interface for validation logic
 *
 * @example
 * class APIKeyValidator {
 *   validate(value) { return /^[A-Za-z0-9_-]{39}$/.test(value); }
 *   getErrors() { return this.errors; }
 * }
 * Registry.register(ExtensionPoints.VALIDATORS, 'api-key', APIKeyValidator);
 */
export const IValidator = {
  /**
   * Validate a value
   * @param {*} value - Value to validate
   * @returns {boolean} True if valid
   */
  validate: (value) => {},

  /**
   * Get validation error messages
   * @returns {string[]} Array of error messages
   */
  getErrors: () => {},

  /**
   * Get validation schema/rules
   * @returns {Object} Validation schema
   */
  getSchema: () => {}
};

/**
 * @interface ITransformer
 * @description Interface for data transformation logic
 *
 * @example
 * class MarkdownTransformer {
 *   transform(input) { return marked.parse(input); }
 *   reverse(output) { return turndownService.turndown(output); }
 * }
 * Registry.register(ExtensionPoints.TRANSFORMERS, 'markdown', MarkdownTransformer);
 */
export const ITransformer = {
  /**
   * Transform input data
   * @param {*} input - Input data
   * @param {Object} options - Transformation options
   * @returns {*} Transformed data
   */
  transform: (input, options) => {},

  /**
   * Reverse transformation (if applicable)
   * @param {*} output - Transformed data
   * @param {Object} options - Transformation options
   * @returns {*} Original data
   */
  reverse: (output, options) => {}
};

/**
 * @interface IEventEmitter
 * @description Interface for event emitters
 *
 * @example
 * class CustomEmitter {
 *   on(event, handler) { ... }
 *   emit(event, data) { ... }
 *   off(event, handler) { ... }
 * }
 */
export const IEventEmitter = {
  /**
   * Register event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @returns {Function} Unsubscribe function
   */
  on: (event, handler) => {},

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @returns {void}
   */
  emit: (event, data) => {},

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler to remove
   * @returns {void}
   */
  off: (event, handler) => {},

  /**
   * Register one-time event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @returns {Function} Unsubscribe function
   */
  once: (event, handler) => {}
};

/**
 * Utility function to validate that an object implements an interface
 *
 * @param {Object} implementation - The object to validate
 * @param {Object} interfaceDefinition - The interface to validate against
 * @param {string} name - Name for error messages
 * @returns {boolean} True if valid
 * @throws {Error} If implementation is missing required methods
 */
export function validateImplementation(implementation, interfaceDefinition, name = 'Implementation') {
  const missing = [];

  for (const [methodName, methodSignature] of Object.entries(interfaceDefinition)) {
    if (typeof implementation[methodName] !== 'function') {
      missing.push(methodName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `${name} does not implement required methods: ${missing.join(', ')}`
    );
  }

  return true;
}

/**
 * Utility to create a proxy that enforces interface at runtime
 *
 * @param {Object} implementation - The implementation to wrap
 * @param {Object} interfaceDefinition - The interface to enforce
 * @param {string} name - Name for error messages
 * @returns {Proxy} Proxied implementation
 */
export function enforceInterface(implementation, interfaceDefinition, name = 'Implementation') {
  validateImplementation(implementation, interfaceDefinition, name);

  return new Proxy(implementation, {
    get(target, prop) {
      if (prop in interfaceDefinition && typeof target[prop] !== 'function') {
        throw new Error(`${name}.${String(prop)} is not implemented`);
      }
      return target[prop];
    }
  });
}

// Export all interfaces as a single object for convenience
export const Interfaces = {
  IStorageProvider,
  IAPIProvider,
  IExecutionEngine,
  IParser,
  IRenderer,
  IMiddleware,
  IValidator,
  ITransformer,
  IEventEmitter
};
