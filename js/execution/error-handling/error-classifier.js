/**
 * ErrorClassifier
 *
 * Rule-based error classification system with pluggable rules.
 * Provides TOTAL CONTROL over error categorization and handling decisions.
 *
 * Features:
 * - Pluggable classification rules (mount/unmount like train adapters!)
 * - Priority-based rule execution
 * - Extensible error type system
 * - Rich classification metadata
 *
 * Users can:
 * - Add custom rules
 * - Override default rules
 * - Define custom error types
 * - Control retry/cleaning decisions per error type
 */

export class ErrorClassifier {
  /**
   * Standard error types (extensible)
   */
  static ERROR_TYPES = {
    SYNTAX_ERROR: 'SYNTAX_ERROR',
    UNDEFINED_REFERENCE: 'UNDEFINED_REFERENCE',
    ENTITY_NOT_FOUND: 'ENTITY_NOT_FOUND',
    TYPE_ERROR: 'TYPE_ERROR',
    TIMEOUT: 'TIMEOUT',
    NETWORK_ERROR: 'NETWORK_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
  };

  /**
   * Error categories
   */
  static ERROR_CATEGORIES = {
    COMPILE_TIME: 'compile_time',
    RUNTIME: 'runtime',
    EXECUTION: 'execution',
    EXTERNAL: 'external'
  };

  /**
   * Severity levels
   */
  static SEVERITY_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  };

  constructor() {
    this.classificationRules = [];
    this.customErrorTypes = new Map();
    this._initializeDefaultRules();
  }

  /**
   * Classify error using rule chain
   * @param {Error} error - Error to classify
   * @returns {Object} Classification result
   */
  classify(error) {
    if (!error) {
      return this._getDefaultClassification();
    }

    // Try each rule in priority order
    for (const rule of this.classificationRules) {
      if (rule.matches(error)) {
        return {
          ...rule.classification,
          matchedRule: rule.name,
          error: {
            name: error.name,
            message: error.message
          }
        };
      }
    }

    // No rule matched - use default
    return this._getDefaultClassification(error);
  }

  /**
   * Register custom classification rule
   * Rules are train adapters - mount them as needed!
   *
   * @param {Object} rule - Classification rule
   * @param {string} rule.name - Rule name
   * @param {Function} rule.matches - Match function (error) => boolean
   * @param {Object} rule.classification - Classification to return
   * @param {number} rule.priority - Priority (lower = higher priority)
   */
  registerRule(rule) {
    this._validateRule(rule);

    // Remove existing rule with same name
    this.unregisterRule(rule.name);

    // Add rule
    this.classificationRules.push(rule);

    // Sort by priority
    this.classificationRules.sort((a, b) => {
      return (a.priority || 100) - (b.priority || 100);
    });
  }

  /**
   * Remove classification rule
   * @param {string} ruleName - Name of rule to remove
   */
  unregisterRule(ruleName) {
    this.classificationRules = this.classificationRules.filter(
      rule => rule.name !== ruleName
    );
  }

  /**
   * Register custom error type
   * @param {string} typeName - Error type name
   * @param {Object} typeDefinition - Type definition
   */
  registerErrorType(typeName, typeDefinition) {
    this.customErrorTypes.set(typeName, typeDefinition);
  }

  /**
   * Get all registered rules
   * @returns {Array} Classification rules
   */
  getRules() {
    return [...this.classificationRules];
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean}
   */
  isRetryable(error) {
    return this.classify(error).retryable || false;
  }

  /**
   * Check if error requires context cleaning
   * @param {Error} error - Error to check
   * @returns {boolean}
   */
  shouldCleanContext(error) {
    return this.classify(error).cleanContext || false;
  }

  /**
   * Check if error requires reasoning fix
   * @param {Error} error - Error to check
   * @returns {boolean}
   */
  requiresReasoning(error) {
    return this.classify(error).requiresReasoning || false;
  }

  /**
   * Initialize default classification rules
   * @private
   */
  _initializeDefaultRules() {
    // Rule: Syntax Errors
    this.registerRule({
      name: 'syntax-error',
      priority: 10,
      matches: (error) => error.name === 'SyntaxError',
      classification: {
        type: ErrorClassifier.ERROR_TYPES.SYNTAX_ERROR,
        category: ErrorClassifier.ERROR_CATEGORIES.COMPILE_TIME,
        severity: ErrorClassifier.SEVERITY_LEVELS.HIGH,
        retryable: false,
        requiresReasoning: true,
        cleanContext: false,
        message: 'Code has syntax errors'
      }
    });

    // Rule: Undefined Reference Errors
    this.registerRule({
      name: 'undefined-reference',
      priority: 20,
      matches: (error) =>
        error.name === 'ReferenceError' &&
        /is not defined/.test(error.message),
      classification: {
        type: ErrorClassifier.ERROR_TYPES.UNDEFINED_REFERENCE,
        category: ErrorClassifier.ERROR_CATEGORIES.RUNTIME,
        severity: ErrorClassifier.SEVERITY_LEVELS.MEDIUM,
        retryable: true,
        requiresReasoning: true,
        cleanContext: true,
        message: 'Undefined variable or reference'
      }
    });

    // Rule: Entity Not Found Errors
    this.registerRule({
      name: 'entity-not-found',
      priority: 21,
      matches: (error) =>
        error.name === 'ReferenceError' &&
        /not found|does not exist/.test(error.message),
      classification: {
        type: ErrorClassifier.ERROR_TYPES.ENTITY_NOT_FOUND,
        category: ErrorClassifier.ERROR_CATEGORIES.RUNTIME,
        severity: ErrorClassifier.SEVERITY_LEVELS.MEDIUM,
        retryable: true,
        requiresReasoning: true,
        cleanContext: true,
        provideValidEntities: true,
        message: 'Referenced entity does not exist'
      }
    });

    // Rule: Type Errors
    this.registerRule({
      name: 'type-error',
      priority: 30,
      matches: (error) => error.name === 'TypeError',
      classification: {
        type: ErrorClassifier.ERROR_TYPES.TYPE_ERROR,
        category: ErrorClassifier.ERROR_CATEGORIES.RUNTIME,
        severity: ErrorClassifier.SEVERITY_LEVELS.MEDIUM,
        retryable: false,
        requiresReasoning: true,
        cleanContext: false,
        message: 'Type mismatch or invalid operation'
      }
    });

    // Rule: Timeout Errors
    this.registerRule({
      name: 'timeout-error',
      priority: 40,
      matches: (error) =>
        /timeout|timed out/i.test(error.message || ''),
      classification: {
        type: ErrorClassifier.ERROR_TYPES.TIMEOUT,
        category: ErrorClassifier.ERROR_CATEGORIES.EXECUTION,
        severity: ErrorClassifier.SEVERITY_LEVELS.MEDIUM,
        retryable: true,
        requiresReasoning: false,
        cleanContext: true,
        optimizationHint: 'Consider code optimization or longer timeout',
        message: 'Execution exceeded timeout limit'
      }
    });

    // Rule: Network Errors
    this.registerRule({
      name: 'network-error',
      priority: 50,
      matches: (error) =>
        error.name === 'NetworkError' ||
        /network|fetch|xhr/i.test(error.message || ''),
      classification: {
        type: ErrorClassifier.ERROR_TYPES.NETWORK_ERROR,
        category: ErrorClassifier.ERROR_CATEGORIES.EXTERNAL,
        severity: ErrorClassifier.SEVERITY_LEVELS.LOW,
        retryable: true,
        requiresReasoning: false,
        cleanContext: false,
        message: 'Network operation failed'
      }
    });
  }

  /**
   * Get default classification for unmatched errors
   * @private
   */
  _getDefaultClassification(error) {
    return {
      type: ErrorClassifier.ERROR_TYPES.UNKNOWN_ERROR,
      category: ErrorClassifier.ERROR_CATEGORIES.RUNTIME,
      severity: ErrorClassifier.SEVERITY_LEVELS.HIGH,
      retryable: false,
      requiresReasoning: true,
      cleanContext: false,
      message: error ? `Unknown error: ${error.message}` : 'Unknown error occurred',
      matchedRule: 'default',
      error: error ? {
        name: error.name,
        message: error.message
      } : null
    };
  }

  /**
   * Validate rule structure
   * @private
   */
  _validateRule(rule) {
    if (!rule.name) {
      throw new Error('Rule must have a name');
    }
    if (typeof rule.matches !== 'function') {
      throw new Error('Rule must have a matches function');
    }
    if (!rule.classification) {
      throw new Error('Rule must have a classification');
    }
    if (!rule.classification.type) {
      throw new Error('Rule classification must have a type');
    }
  }

  /**
   * Export classification rules for backup/sharing
   * @returns {Array} Serialized rules
   */
  exportRules() {
    return this.classificationRules.map(rule => ({
      name: rule.name,
      priority: rule.priority,
      classification: rule.classification,
      // Note: Can't serialize match function, only metadata
    }));
  }

  /**
   * Reset to default rules
   */
  resetToDefaults() {
    this.classificationRules = [];
    this.customErrorTypes.clear();
    this._initializeDefaultRules();
  }
}

// Legacy bridge (deprecated)
if (typeof window !== 'undefined') {
  window.ErrorClassifier = ErrorClassifier;
}
