/**
 * GDRS Async Code Detector
 * Intelligent async pattern detection excluding comments and strings
 */

export const AsyncDetector = {
  /**
   * Detect if code contains async patterns (excluding comments and strings)
   */
  isAsyncCode(code) {
    if (!code || typeof code !== 'string') return false;
    
    // Remove comments and string literals to avoid false positives
    const cleanCode = this.removeCommentsAndStrings(code);
    
    // Comprehensive async patterns
    const asyncPatterns = [
      /\basync\s+function\b/,           // async function
      /\basync\s*\(/,                  // async (
      /\basync\s*=>/,                  // async =>
      /\bawait\s+/,                    // await keyword
      /\.then\s*\(/,                   // .then(
      /\.catch\s*\(/,                  // .catch(
      /\.finally\s*\(/,                // .finally(
      /\bnew\s+Promise\s*\(/,          // new Promise(
      /Promise\.(all|race|resolve|reject)\s*\(/,  // Promise methods
      /\bsetTimeout\s*\(/,             // setTimeout(
      /\bsetInterval\s*\(/,            // setInterval(
      /\bfetch\s*\(/,                  // fetch(
      /\breturn\s+new\s+Promise\b/      // return new Promise
    ];
    
    return asyncPatterns.some(pattern => pattern.test(cleanCode));
  },
  
  /**
   * Remove comments and string literals to prevent false async detection
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
    
    // Remove template literals
    result = result.replace(/`(?:[^`\\]|\\.|\$\{[^}]*\})*`/g, '``');
    
    return result;
  },
  
  /**
   * Analyze async complexity level
   */
  getAsyncComplexity(code) {
    const cleanCode = this.removeCommentsAndStrings(code);
    
    let complexity = 0;
    
    if (/\basync\b/.test(cleanCode)) complexity += 2;
    if (/\bawait\b/.test(cleanCode)) complexity += 2;
    if (/\.then\s*\(/.test(cleanCode)) complexity += 1;
    if (/\bPromise\b/.test(cleanCode)) complexity += 1;
    if (/\bfetch\s*\(/.test(cleanCode)) complexity += 2;
    if (/\bsetTimeout|setInterval\b/.test(cleanCode)) complexity += 1;
    
    return {
      level: complexity === 0 ? 'sync' : complexity <= 2 ? 'simple-async' : complexity <= 4 ? 'complex-async' : 'very-complex-async',
      score: complexity
    };
  }
};
