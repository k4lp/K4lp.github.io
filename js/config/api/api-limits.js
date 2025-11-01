/**
 * API Limits Configuration
 *
 * Timeouts, rate limits, and API call constraints
 */

/**
 * API request timeout (milliseconds)
 */
export const API_TIMEOUT = 120000; // 2 minutes

/**
 * Rate limit cooldown period (milliseconds)
 */
export const RATE_LIMIT_COOLDOWN = 60000; // 1 minute

/**
 * Default rate limit cooldown when marked (seconds)
 */
export const DEFAULT_RATE_LIMIT_COOLDOWN_SECONDS = 30;

/**
 * Extended rate limit cooldown for rotation (seconds)
 */
export const EXTENDED_RATE_LIMIT_COOLDOWN_SECONDS = 60;

/**
 * Maximum consecutive failures before disabling key
 */
export const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * Maximum concurrent API requests
 */
export const MAX_CONCURRENT_REQUESTS = 3;

/**
 * Request queue size limit
 */
export const MAX_REQUEST_QUEUE_SIZE = 10;

/**
 * Minimum delay between requests to same endpoint (milliseconds)
 */
export const MIN_REQUEST_INTERVAL = 100;

export default {
    API_TIMEOUT,
    RATE_LIMIT_COOLDOWN,
    DEFAULT_RATE_LIMIT_COOLDOWN_SECONDS,
    EXTENDED_RATE_LIMIT_COOLDOWN_SECONDS,
    MAX_CONSECUTIVE_FAILURES,
    MAX_CONCURRENT_REQUESTS,
    MAX_REQUEST_QUEUE_SIZE,
    MIN_REQUEST_INTERVAL,
};
