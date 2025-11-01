/**
 * API Error Handler
 *
 * Handles and classifies API errors
 */

import {
    getErrorInfo,
    isRecoverableError,
    isInvalidKeyError,
    isRateLimitError
} from '../../config/api/api-error-codes.js';

/**
 * Handle HTTP response error
 * @param {Response} response - Fetch response object
 * @returns {Promise<Error>} Error object
 */
export async function handleHttpError(response) {
    const statusCode = response.status;
    const errorInfo = getErrorInfo(statusCode);

    if (statusCode === 429) {
        throw new Error('Rate limited (429)');
    }

    if (statusCode === 401 || statusCode === 403) {
        throw new Error('Invalid API key (401/403)');
    }

    const errorText = await response.text();
    throw new Error(`HTTP ${statusCode}: ${errorText}`);
}

/**
 * Classify error type
 * @param {Error} error - Error object
 * @returns {string} Error type
 */
export function classifyError(error) {
    const message = error.message.toLowerCase();

    if (message.includes('429') || message.includes('rate limited')) {
        return 'rate_limit';
    }

    if (message.includes('401') || message.includes('403') || message.includes('invalid api key')) {
        return 'invalid_key';
    }

    if (message.includes('empty response')) {
        return 'empty_response';
    }

    if (message.includes('timeout')) {
        return 'timeout';
    }

    if (message.includes('network') || message.includes('fetch')) {
        return 'network_error';
    }

    if (message.includes('500') || message.includes('502') || message.includes('503')) {
        return 'server_error';
    }

    return 'unknown';
}

/**
 * Check if error should trigger key rotation
 * @param {Error} error - Error object
 * @returns {boolean} True if should rotate key
 */
export function shouldRotateKey(error) {
    const errorType = classifyError(error);
    return errorType === 'rate_limit' || errorType === 'invalid_key' || errorType === 'empty_response';
}

/**
 * Check if error is retryable
 * @param {Error} error - Error object
 * @returns {boolean} True if retryable
 */
export function isRetryableError(error) {
    const errorType = classifyError(error);
    return errorType === 'rate_limit' || errorType === 'timeout' ||
           errorType === 'network_error' || errorType === 'server_error' ||
           errorType === 'empty_response';
}

export default {
    handleHttpError,
    classifyError,
    shouldRotateKey,
    isRetryableError,
};
