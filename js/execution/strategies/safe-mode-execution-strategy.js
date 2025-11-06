/**
 * SafeModeExecutionStrategy
 *
 * Conservative execution with pre-execution validation and safety checks.
 * Use when executing untrusted or potentially dangerous code.
 *
 * Features:
 * - Pre-execution code validation
 * - Dangerous pattern detection
 * - Infinite loop detection
 * - Conservative timeouts
 * - No retry (fail fast)
 */

class SafeModeExecutionStrategy extends ExecutionStrategyBase {
  constructor(config = {}) {
    super({
      maxAttempts: 1,
      enableRetry: false,
      cleanContext: false,
      timeoutMs: 10000, // Conservative 10s timeout
      validateCodeSafety: true,
      checkInfiniteLoops: true,
      ...config
    });

    // Dangerous code patterns
    this.dangerousPatterns = [
      {
        pattern: /while\s*\(\s*true\s*\)/,
        message: 'Infinite while loop detected'
      },
      {
        pattern: /for\s*\(\s*;\s*;\s*\)/,
        message: 'Infinite for loop detected'
      },
      {
        pattern: /\.innerHTML\s*=/,
        message: 'Direct innerHTML manipulation not allowed'
      },
      {
        pattern: /document\.write/,
        message: 'document.write() not allowed'
      },
      {
        pattern: /eval\s*\(/,
        message: 'eval() not allowed'
      },
      {
        pattern: /Function\s*\(/,
        message: 'Function constructor not allowed'
      },
      {
        pattern: /setTimeout.*eval|setInterval.*eval/,
        message: 'eval in timer not allowed'
      }
    ];
  }

  /**
   * Execute with safety validation
   * @param {Object} request - Execution request
   * @param {Object} runner - Execution runner
   * @returns {Promise<Object>} Execution result
   */
  async execute(request, runner) {
    // Validate request
    this.validateRequest(request);

    // Enrich request
    const enrichedRequest = this.enrichRequest(request, 1);

    // Apply conservative timeout
    enrichedRequest.timeoutMs = Math.min(
      enrichedRequest.timeoutMs || this.config.timeoutMs,
      this.config.timeoutMs
    );

    // Run before-execution hook (includes safety checks)
    let modifiedRequest;
    try {
      modifiedRequest = await this.beforeExecution(enrichedRequest);
    } catch (error) {
      // Safety check failed
      return this.enrichResult({
        success: false,
        error: {
          name: 'SafetyCheckError',
          message: error.message,
          stack: error.stack
        },
        code: enrichedRequest.code,
        id: enrichedRequest.id || `exec-${Date.now()}`,
        finishedAt: new Date().toISOString(),
        safetyCheckFailed: true
      }, {
        attemptCount: 1,
        retried: false,
        safeMode: true
      });
    }

    try {
      // Execute code
      const result = await runner.run(modifiedRequest);

      // Run after-execution hook
      const finalResult = await this.afterExecution(result);

      return this.enrichResult(finalResult, {
        attemptCount: 1,
        retried: false,
        safeMode: true
      });

    } catch (error) {
      // Run error hook
      await this.onError(error, modifiedRequest);

      return this.enrichResult({
        success: false,
        error: {
          name: error.name || 'Error',
          message: error.message || String(error),
          stack: error.stack
        },
        code: modifiedRequest.code,
        id: modifiedRequest.id || `exec-${Date.now()}`,
        finishedAt: new Date().toISOString()
      }, {
        attemptCount: 1,
        retried: false,
        safeMode: true
      });
    }
  }

  /**
   * Before execution: Validate code safety
   * @override
   */
  async beforeExecution(request) {
    if (this.config.validateCodeSafety) {
      this.validateCodeSafety(request.code);
    }

    if (this.config.checkInfiniteLoops) {
      this.checkForInfiniteLoops(request.code);
    }

    return request;
  }

  /**
   * Validate code doesn't contain dangerous patterns
   * @throws {Error} If dangerous pattern found
   */
  validateCodeSafety(code) {
    for (const { pattern, message } of this.dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(`Safety check failed: ${message}`);
      }
    }
  }

  /**
   * Check for potential infinite loops
   * Basic heuristic check - not foolproof
   */
  checkForInfiniteLoops(code) {
    // Check for while(true) without break
    const whileTruePattern = /while\s*\(\s*true\s*\)\s*{([^}]*)}/g;
    let match;

    while ((match = whileTruePattern.exec(code)) !== null) {
      const loopBody = match[1];
      if (!/break|return/.test(loopBody)) {
        throw new Error('Potential infinite loop detected: while(true) without break');
      }
    }

    // Check for for(;;) without break
    const forEverPattern = /for\s*\(\s*;\s*;\s*\)\s*{([^}]*)}/g;

    while ((match = forEverPattern.exec(code)) !== null) {
      const loopBody = match[1];
      if (!/break|return/.test(loopBody)) {
        throw new Error('Potential infinite loop detected: for(;;) without break');
      }
    }
  }

  /**
   * Register custom dangerous pattern
   * @param {RegExp} pattern - Pattern to detect
   * @param {string} message - Error message
   */
  registerDangerousPattern(pattern, message) {
    this.dangerousPatterns.push({ pattern, message });
  }

  /**
   * Remove dangerous pattern
   * @param {string} message - Message of pattern to remove
   */
  removeDangerousPattern(message) {
    this.dangerousPatterns = this.dangerousPatterns.filter(
      p => p.message !== message
    );
  }

  /**
   * Get registered patterns
   * @returns {Array} Dangerous patterns
   */
  getDangerousPatterns() {
    return this.dangerousPatterns.map(p => ({
      pattern: p.pattern.source,
      message: p.message
    }));
  }

  /**
   * Safe mode never retries
   * @override
   */
  shouldRetry(error, attemptCount) {
    return false;
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.SafeModeExecutionStrategy = SafeModeExecutionStrategy;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SafeModeExecutionStrategy;
}
