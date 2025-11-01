/**
 * Key Failure Configuration
 *
 * Settings for API key failure tracking and management
 */

/**
 * Maximum consecutive failures before temporary disabling
 */
export const MAX_CONSECUTIVE_FAILURES_THRESHOLD = 3;

/**
 * Time window for failure count reset (milliseconds)
 */
export const FAILURE_RESET_TIMEOUT = 600000; // 10 minutes

/**
 * Minimum time between failures to not count as consecutive (milliseconds)
 */
export const NON_CONSECUTIVE_FAILURE_WINDOW = 300000; // 5 minutes

/**
 * Maximum total failures before permanent disabling
 */
export const MAX_TOTAL_FAILURES = 10;

/**
 * Failure severity levels
 */
export const FAILURE_SEVERITY = {
    LOW: 'low',           // Temporary network issue
    MEDIUM: 'medium',     // Rate limit or timeout
    HIGH: 'high',         // Invalid key or auth failure
    CRITICAL: 'critical', // Permanent key failure
};

/**
 * Failure reason categories
 */
export const FAILURE_REASONS = {
    RATE_LIMIT: 'rate_limit',
    INVALID_KEY: 'invalid_key',
    NETWORK_ERROR: 'network_error',
    TIMEOUT: 'timeout',
    EMPTY_RESPONSE: 'empty_response',
    SERVER_ERROR: 'server_error',
    UNKNOWN: 'unknown',
};

/**
 * Map failure reasons to severity
 */
export const FAILURE_SEVERITY_MAP = {
    [FAILURE_REASONS.RATE_LIMIT]: FAILURE_SEVERITY.MEDIUM,
    [FAILURE_REASONS.INVALID_KEY]: FAILURE_SEVERITY.CRITICAL,
    [FAILURE_REASONS.NETWORK_ERROR]: FAILURE_SEVERITY.LOW,
    [FAILURE_REASONS.TIMEOUT]: FAILURE_SEVERITY.MEDIUM,
    [FAILURE_REASONS.EMPTY_RESPONSE]: FAILURE_SEVERITY.MEDIUM,
    [FAILURE_REASONS.SERVER_ERROR]: FAILURE_SEVERITY.LOW,
    [FAILURE_REASONS.UNKNOWN]: FAILURE_SEVERITY.MEDIUM,
};

/**
 * Get failure severity for a reason
 * @param {string} reason - Failure reason
 * @returns {string} Severity level
 */
export function getFailureSeverity(reason) {
    return FAILURE_SEVERITY_MAP[reason] || FAILURE_SEVERITY.MEDIUM;
}

/**
 * Check if failure reason is critical
 * @param {string} reason - Failure reason
 * @returns {boolean} True if critical
 */
export function isCriticalFailure(reason) {
    return getFailureSeverity(reason) === FAILURE_SEVERITY.CRITICAL;
}

export default {
    MAX_CONSECUTIVE_FAILURES_THRESHOLD,
    FAILURE_RESET_TIMEOUT,
    NON_CONSECUTIVE_FAILURE_WINDOW,
    MAX_TOTAL_FAILURES,
    FAILURE_SEVERITY,
    FAILURE_REASONS,
    FAILURE_SEVERITY_MAP,
    getFailureSeverity,
    isCriticalFailure,
};
