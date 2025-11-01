/**
 * API Retry Configuration
 *
 * Retry strategies, backoff settings, and retry limits
 */

/**
 * Maximum retry attempts for failed API calls
 */
export const MAX_RETRY_ATTEMPTS = 3;

/**
 * Base delay for retry attempts (milliseconds)
 */
export const RETRY_BASE_DELAY = 1000;

/**
 * Delay before retrying after empty response (milliseconds)
 */
export const EMPTY_RESPONSE_RETRY_DELAY = 1000;

/**
 * Multiplier for error retry delay in loop controller
 */
export const ERROR_RETRY_DELAY_MULTIPLIER = 2;

/**
 * Backoff strategy types
 */
export const BACKOFF_STRATEGIES = {
    LINEAR: 'linear',       // Fixed delay
    EXPONENTIAL: 'exponential', // Exponential backoff (2^attempt * base)
    FIBONACCI: 'fibonacci', // Fibonacci sequence
};

/**
 * Current backoff strategy
 */
export const CURRENT_BACKOFF_STRATEGY = BACKOFF_STRATEGIES.LINEAR;

/**
 * Exponential backoff multiplier
 */
export const EXPONENTIAL_BACKOFF_BASE = 2;

/**
 * Maximum backoff delay (milliseconds)
 */
export const MAX_BACKOFF_DELAY = 30000; // 30 seconds

/**
 * Calculate retry delay based on attempt number and strategy
 * @param {number} attemptNumber - Current attempt number (0-indexed)
 * @param {string} strategy - Backoff strategy
 * @returns {number} Delay in milliseconds
 */
export function calculateRetryDelay(attemptNumber, strategy = CURRENT_BACKOFF_STRATEGY) {
    let delay;

    switch (strategy) {
        case BACKOFF_STRATEGIES.LINEAR:
            delay = RETRY_BASE_DELAY;
            break;

        case BACKOFF_STRATEGIES.EXPONENTIAL:
            delay = RETRY_BASE_DELAY * Math.pow(EXPONENTIAL_BACKOFF_BASE, attemptNumber);
            break;

        case BACKOFF_STRATEGIES.FIBONACCI:
            delay = RETRY_BASE_DELAY * fibonacci(attemptNumber + 1);
            break;

        default:
            delay = RETRY_BASE_DELAY;
    }

    return Math.min(delay, MAX_BACKOFF_DELAY);
}

/**
 * Calculate fibonacci number
 * @param {number} n - Position in sequence
 * @returns {number} Fibonacci number
 */
function fibonacci(n) {
    if (n <= 1) return 1;
    let a = 1, b = 1;
    for (let i = 2; i <= n; i++) {
        [a, b] = [b, a + b];
    }
    return b;
}

/**
 * Check if should retry based on attempt count
 * @param {number} attemptNumber - Current attempt number (0-indexed)
 * @returns {boolean} True if should retry
 */
export function shouldRetry(attemptNumber) {
    return attemptNumber < MAX_RETRY_ATTEMPTS - 1;
}

export default {
    MAX_RETRY_ATTEMPTS,
    RETRY_BASE_DELAY,
    EMPTY_RESPONSE_RETRY_DELAY,
    ERROR_RETRY_DELAY_MULTIPLIER,
    BACKOFF_STRATEGIES,
    CURRENT_BACKOFF_STRATEGY,
    EXPONENTIAL_BACKOFF_BASE,
    MAX_BACKOFF_DELAY,
    calculateRetryDelay,
    shouldRetry,
};
