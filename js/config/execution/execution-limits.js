/**
 * Execution Limits Configuration
 *
 * Timeouts, thresholds, and limits for code execution
 */

/**
 * Default timeout for code execution (milliseconds)
 */
export const EXECUTION_DEFAULT_TIMEOUT_MS = 15000; // 15 seconds

/**
 * Maximum timeout allowed for code execution (milliseconds)
 */
export const EXECUTION_MAX_TIMEOUT_MS = 60000; // 1 minute

/**
 * Minimum timeout allowed for code execution (milliseconds)
 */
export const EXECUTION_MIN_TIMEOUT_MS = 1000; // 1 second

/**
 * Status reset delay after execution (milliseconds)
 */
export const EXECUTION_STATUS_RESET_DELAY_MS = 2500; // 2.5 seconds

/**
 * Maximum execution queue size
 */
export const MAX_EXECUTION_QUEUE_SIZE = 10;

/**
 * Maximum code size for execution (characters)
 */
export const MAX_CODE_SIZE = 500000; // 500KB

/**
 * Maximum console output size (characters)
 */
export const MAX_CONSOLE_OUTPUT_SIZE = 100000; // 100KB

/**
 * Maximum number of console.log calls
 */
export const MAX_CONSOLE_LOG_CALLS = 1000;

/**
 * Execution priority levels
 */
export const EXECUTION_PRIORITY = {
    LOW: 0,
    NORMAL: 1,
    HIGH: 2,
    CRITICAL: 3,
};

/**
 * Default execution source label
 */
export const EXECUTION_DEFAULT_SOURCE = 'auto';

/**
 * Execution result limits
 */
export const EXECUTION_RESULT_LIMITS = {
    maxResultSize: 50000,      // Maximum size of execution result
    maxErrorMessageSize: 5000, // Maximum size of error message
    maxStackTraceLines: 50,    // Maximum stack trace lines
};

/**
 * Calculate timeout based on code size
 * @param {number} codeSize - Size of code in characters
 * @returns {number} Timeout in milliseconds
 */
export function calculateExecutionTimeout(codeSize) {
    // Base timeout + additional time for larger code
    const additionalTime = Math.floor(codeSize / 1000) * 100;
    const timeout = EXECUTION_DEFAULT_TIMEOUT_MS + additionalTime;

    return Math.min(
        Math.max(timeout, EXECUTION_MIN_TIMEOUT_MS),
        EXECUTION_MAX_TIMEOUT_MS
    );
}

export default {
    EXECUTION_DEFAULT_TIMEOUT_MS,
    EXECUTION_MAX_TIMEOUT_MS,
    EXECUTION_MIN_TIMEOUT_MS,
    EXECUTION_STATUS_RESET_DELAY_MS,
    MAX_EXECUTION_QUEUE_SIZE,
    MAX_CODE_SIZE,
    MAX_CONSOLE_OUTPUT_SIZE,
    MAX_CONSOLE_LOG_CALLS,
    EXECUTION_PRIORITY,
    EXECUTION_DEFAULT_SOURCE,
    EXECUTION_RESULT_LIMITS,
    calculateExecutionTimeout,
};
