/**
 * GDRS Async Code Detector
 * Professional async detection focusing on what actually requires async context
 */

export const AsyncDetector = {
  /**
   * Detect if code requires async execution context
   * Only top-level await requires async wrapping
   *
   * @param {string} code - JavaScript code to analyze
   * @returns {boolean} True if code needs async wrapper
   */
  isAsyncCode(code) {
    if (!code || typeof code !== 'string') return false;

    // Remove comments and string literals to avoid false positives
    const cleanCode = this.removeCommentsAndStrings(code);

    // The ONLY pattern that requires async wrapping is top-level await
    // Everything else (promises, fetch, etc.) can execute synchronously
    return /\bawait\s+/.test(cleanCode);
  },

  /**
   * Remove comments and string literals to prevent false async detection
   * This ensures we only detect actual code patterns, not patterns in strings/comments
   *
   * @param {string} code - JavaScript code
   * @returns {string} Cleaned code
   */
  removeCommentsAndStrings(code) {
    let result = code;

    // Remove multi-line comments /* ... */
    result = result.replace(/\/\*[\s\S]*?\*\//g, ' ');

    // Remove single-line comments // ...
    result = result.replace(/\/\/.*$/gm, ' ');

    // Remove string literals (double quotes)
    result = result.replace(/"(?:[^"\\]|\\.)*"/g, '""');

    // Remove string literals (single quotes)
    result = result.replace(/'(?:[^'\\]|\\.)*'/g, "''");

    // Remove template literals (including nested expressions)
    result = result.replace(/`(?:[^`\\]|\\.|\$\{[^}]*\})*`/g, '``');

    return result;
  },

  /**
   * Analyze code complexity for monitoring/debugging
   *
   * @param {string} code - JavaScript code
   * @returns {Object} Complexity analysis
   */
  getAsyncComplexity(code) {
    const cleanCode = this.removeCommentsAndStrings(code);

    let complexity = 0;
    let features = [];

    if (/\basync\b/.test(cleanCode)) {
      complexity += 2;
      features.push('async-function');
    }
    if (/\bawait\b/.test(cleanCode)) {
      complexity += 2;
      features.push('await');
    }
    if (/\.then\s*\(/.test(cleanCode)) {
      complexity += 1;
      features.push('promise-chain');
    }
    if (/\bnew\s+Promise\b/.test(cleanCode)) {
      complexity += 1;
      features.push('promise-constructor');
    }
    if (/\bfetch\s*\(/.test(cleanCode)) {
      complexity += 1;
      features.push('fetch-api');
    }

    return {
      score: complexity,
      level: complexity === 0 ? 'sync' :
             complexity <= 2 ? 'simple-async' :
             complexity <= 4 ? 'moderate-async' :
             'complex-async',
      features
    };
  }
};
