/**
 * API Error Codes Configuration
 *
 * HTTP status codes and their meanings for API error handling
 */

/**
 * Error severity levels
 */
export const ERROR_SEVERITY = {
    FATAL: 'fatal',           // Cannot recover, stop session
    RECOVERABLE: 'recoverable', // Can retry
    WARNING: 'warning',       // Non-critical issue
};

/**
 * HTTP status code mappings
 */
export const HTTP_STATUS_CODES = {
    // Success codes
    200: { name: 'OK', severity: null, action: 'continue' },
    201: { name: 'Created', severity: null, action: 'continue' },

    // Client errors
    400: {
        name: 'Bad Request',
        severity: ERROR_SEVERITY.FATAL,
        action: 'stop',
        message: 'Invalid request format'
    },
    401: {
        name: 'Unauthorized',
        severity: ERROR_SEVERITY.FATAL,
        action: 'mark_key_invalid',
        message: 'Invalid API key'
    },
    403: {
        name: 'Forbidden',
        severity: ERROR_SEVERITY.FATAL,
        action: 'mark_key_invalid',
        message: 'API key lacks required permissions'
    },
    404: {
        name: 'Not Found',
        severity: ERROR_SEVERITY.FATAL,
        action: 'stop',
        message: 'Resource not found'
    },
    429: {
        name: 'Rate Limited',
        severity: ERROR_SEVERITY.RECOVERABLE,
        action: 'cooldown',
        message: 'Rate limit exceeded'
    },

    // Server errors
    500: {
        name: 'Internal Server Error',
        severity: ERROR_SEVERITY.RECOVERABLE,
        action: 'retry',
        message: 'Server error, retry possible'
    },
    502: {
        name: 'Bad Gateway',
        severity: ERROR_SEVERITY.RECOVERABLE,
        action: 'retry',
        message: 'Gateway error, retry possible'
    },
    503: {
        name: 'Service Unavailable',
        severity: ERROR_SEVERITY.RECOVERABLE,
        action: 'retry',
        message: 'Service temporarily unavailable'
    },
    504: {
        name: 'Gateway Timeout',
        severity: ERROR_SEVERITY.RECOVERABLE,
        action: 'retry',
        message: 'Request timeout'
    },
};

/**
 * Error action types
 */
export const ERROR_ACTIONS = {
    STOP: 'stop',                   // Stop session
    RETRY: 'retry',                 // Retry with backoff
    COOLDOWN: 'cooldown',           // Put key on cooldown
    MARK_KEY_INVALID: 'mark_key_invalid', // Mark key as invalid
    ROTATE_KEY: 'rotate_key',       // Switch to another key
    CONTINUE: 'continue',           // Continue processing
};

/**
 * Get error information by status code
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Error information
 */
export function getErrorInfo(statusCode) {
    return HTTP_STATUS_CODES[statusCode] || {
        name: 'Unknown Error',
        severity: ERROR_SEVERITY.FATAL,
        action: ERROR_ACTIONS.STOP,
        message: `Unknown HTTP status: ${statusCode}`
    };
}

/**
 * Check if error is recoverable
 * @param {number} statusCode - HTTP status code
 * @returns {boolean} True if recoverable
 */
export function isRecoverableError(statusCode) {
    const info = getErrorInfo(statusCode);
    return info.severity === ERROR_SEVERITY.RECOVERABLE;
}

/**
 * Check if error indicates invalid key
 * @param {number} statusCode - HTTP status code
 * @returns {boolean} True if key is invalid
 */
export function isInvalidKeyError(statusCode) {
    return statusCode === 401 || statusCode === 403;
}

/**
 * Check if error is rate limit
 * @param {number} statusCode - HTTP status code
 * @returns {boolean} True if rate limited
 */
export function isRateLimitError(statusCode) {
    return statusCode === 429;
}

export default {
    ERROR_SEVERITY,
    HTTP_STATUS_CODES,
    ERROR_ACTIONS,
    getErrorInfo,
    isRecoverableError,
    isInvalidKeyError,
    isRateLimitError,
};
