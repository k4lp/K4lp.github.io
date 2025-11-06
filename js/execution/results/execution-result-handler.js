import { ErrorClassifier } from '../error-handling/error-classifier.js';
import { ResultAggregator } from './result-aggregator.js';

/**
 * ExecutionResultHandler
 *
 * Uniform processing and classification of execution results.
 * Pluggable result transformers for custom processing.
 */
export class ExecutionResultHandler {
  constructor(config = {}, deps = {}) {
    this.config = {
      maxRetries: config.maxRetries || 3,
      logSuccessful: config.logSuccessful !== false,
      logFailed: config.logFailed !== false,
      logRetries: config.logRetries !== false,
      ...config
    };

    this.transformers = [];
    this.aggregator = deps.aggregator || new ResultAggregator();
    this.errorClassifier = deps.errorClassifier || new ErrorClassifier();
  }

  registerTransformer(transformer, options = {}) {
    this.transformers.push({
      transform: transformer,
      name: options.name || `transformer-${this.transformers.length}`,
      enabled: options.enabled !== false,
      priority: options.priority || 100
    });

    this.transformers.sort((a, b) => (a.priority || 100) - (b.priority || 100));
  }

  async process(rawResult) {
    let result = { ...rawResult };

    for (const transformer of this.transformers) {
      if (!transformer.enabled) continue;
      try {
        result = (await transformer.transform(result)) || result;
      } catch (error) {
        console.error(`Error in result transformer ${transformer.name}:`, error);
      }
    }

    result.classification = this.classifyResult(result);
    this.aggregator.add(result);
    result.shouldLog = this.shouldLog(result);
    result.shouldRetry = this.shouldRetry(result);

    return result;
  }

  classifyResult(result) {
    if (result.success) {
      return {
        category: 'success',
        severity: 'info',
        retryable: false,
        requiresReasoning: false
      };
    }

    if (this.errorClassifier && result.error) {
      return this.errorClassifier.classify(result.error);
    }

    return this._fallbackClassification(result);
  }

  _fallbackClassification(result) {
    const error = result.error;

    if (!error) {
      return {
        category: 'unknown',
        severity: 'medium',
        retryable: false,
        requiresReasoning: true
      };
    }

    if (error.name === 'SyntaxError') {
      return {
        type: 'SYNTAX_ERROR',
        category: 'compile_time',
        severity: 'high',
        retryable: false,
        requiresReasoning: true,
        cleanContext: false
      };
    }

    if (error.name === 'ReferenceError') {
      return {
        type: 'REFERENCE_ERROR',
        category: 'runtime',
        severity: 'medium',
        retryable: true,
        requiresReasoning: true,
        cleanContext: true
      };
    }

    if (error.message?.includes('timeout')) {
      return {
        type: 'TIMEOUT',
        category: 'execution',
        severity: 'medium',
        retryable: true,
        requiresReasoning: false,
        cleanContext: true
      };
    }

    return {
      type: 'UNKNOWN_ERROR',
      category: 'runtime',
      severity: 'high',
      retryable: false,
      requiresReasoning: true,
      cleanContext: false
    };
  }

  shouldLog(result) {
    if (result.isRetry && !result.isFinalAttempt) {
      return this.config.logRetries;
    }

    if (result.success) {
      return this.config.logSuccessful;
    }

    return this.config.logFailed;
  }

  shouldRetry(result) {
    if (result.success) return false;

    const classification = result.classification;
    if (!classification || !classification.retryable) {
      return false;
    }

    const attemptCount = result.attemptCount || 1;
    if (attemptCount >= this.config.maxRetries) {
      return false;
    }

    return true;
  }

  getAggregatedMetrics() {
    return this.aggregator.getMetrics();
  }

  getRecentResults(count) {
    return this.aggregator.getRecentResults(count);
  }

  resetMetrics() {
    this.aggregator.reset();
  }

  removeTransformer(name) {
    this.transformers = this.transformers.filter(t => t.name !== name);
  }

  enableTransformer(name) {
    const transformer = this.transformers.find(t => t.name === name);
    if (transformer) {
      transformer.enabled = true;
    }
  }

  disableTransformer(name) {
    const transformer = this.transformers.find(t => t.name === name);
    if (transformer) {
      transformer.enabled = false;
    }
  }

  getTransformerNames() {
    return this.transformers.map(t => t.name);
  }

  updateConfig(updates) {
    this.config = { ...this.config, ...updates };
  }

  getConfig() {
    return { ...this.config };
  }
}

export function createExecutionResultHandler(config) {
  return new ExecutionResultHandler(config);
}

// Legacy bridge (deprecated)
if (typeof window !== 'undefined') {
  window.ExecutionResultHandler = ExecutionResultHandler;
}
