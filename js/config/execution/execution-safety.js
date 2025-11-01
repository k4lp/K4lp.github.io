/**
 * Execution Safety Configuration
 *
 * Safety rules, blocked patterns, and execution constraints
 */

/**
 * Enable/disable safety checks
 */
export const SAFETY_CHECKS_ENABLED = true;

/**
 * Blocked patterns in code (for security)
 */
export const BLOCKED_PATTERNS = [
    // These are just examples - adjust based on your security needs
    // /eval\s*\(/gi,              // Uncomment to block eval()
    // /Function\s*\(/gi,          // Uncomment to block Function constructor
    // /import\s*\(/gi,            // Uncomment to block dynamic imports
];

/**
 * Allowed global objects in execution context
 */
export const ALLOWED_GLOBALS = [
    'console',
    'Math',
    'Date',
    'JSON',
    'Object',
    'Array',
    'String',
    'Number',
    'Boolean',
    'Promise',
    'fetch',
    'setTimeout',
    'setInterval',
    'clearTimeout',
    'clearInterval',
    // Execution context APIs
    'vault',
    'memory',
    'tasks',
    'goals',
    'utils',
];

/**
 * Blocked global access
 */
export const BLOCKED_GLOBALS = [
    'localStorage',   // Access through vault API instead
    'sessionStorage', // Access through memory API instead
    // Add more as needed
];

/**
 * Maximum memory usage (approximate, in MB)
 */
export const MAX_MEMORY_USAGE_MB = 100;

/**
 * Maximum recursion depth
 */
export const MAX_RECURSION_DEPTH = 1000;

/**
 * Sandbox mode settings
 */
export const SANDBOX_MODE = {
    enabled: false,  // Set to true to enable strict sandboxing
    allowNetworkAccess: true,
    allowDOMAccess: true,
    allowTimers: true,
};

/**
 * Code analysis settings
 */
export const CODE_ANALYSIS = {
    enabled: true,
    checkComplexity: true,
    maxCyclomaticComplexity: 50,
    checkLineCount: true,
    maxLineCount: 5000,
};

/**
 * Check if code contains blocked patterns
 * @param {string} code - Code to check
 * @returns {Object} { isBlocked: boolean, reason: string }
 */
export function checkBlockedPatterns(code) {
    if (!SAFETY_CHECKS_ENABLED || BLOCKED_PATTERNS.length === 0) {
        return { isBlocked: false, reason: '' };
    }

    for (const pattern of BLOCKED_PATTERNS) {
        if (pattern.test(code)) {
            return {
                isBlocked: true,
                reason: `Code contains blocked pattern: ${pattern.source}`
            };
        }
    }

    return { isBlocked: false, reason: '' };
}

/**
 * Check if global access is allowed
 * @param {string} globalName - Name of global to access
 * @returns {boolean} True if allowed
 */
export function isGlobalAllowed(globalName) {
    if (BLOCKED_GLOBALS.includes(globalName)) return false;
    if (ALLOWED_GLOBALS.includes(globalName)) return true;
    return true; // Allow by default if not explicitly blocked
}

export default {
    SAFETY_CHECKS_ENABLED,
    BLOCKED_PATTERNS,
    ALLOWED_GLOBALS,
    BLOCKED_GLOBALS,
    MAX_MEMORY_USAGE_MB,
    MAX_RECURSION_DEPTH,
    SANDBOX_MODE,
    CODE_ANALYSIS,
    checkBlockedPatterns,
    isGlobalAllowed,
};
