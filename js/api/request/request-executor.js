/**
 * Request Executor
 *
 * Executes HTTP requests with timeout and error handling
 */

import { API_TIMEOUT } from '../../config/api/api-limits.js';
import { handleHttpError } from './error-handler.js';
import { parseResponse } from './response-parser.js';

/**
 * Execute HTTP request with timeout
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Object>} Response data
 */
export async function executeRequest(url, options, timeout = API_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            await handleHttpError(response);
        }

        const data = await response.json();
        parseResponse(data); // Validate response

        return data;

    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeout}ms`);
        }

        throw error;
    }
}

/**
 * Execute simple GET request
 * @param {string} url - Request URL
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Object>} Response data
 */
export async function executeGetRequest(url, timeout = API_TIMEOUT) {
    return executeRequest(url, { method: 'GET' }, timeout);
}

/**
 * Execute POST request with JSON body
 * @param {string} url - Request URL
 * @param {Object} payload - Request payload
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Object>} Response data
 */
export async function executePostRequest(url, payload, timeout = API_TIMEOUT) {
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    };

    return executeRequest(url, options, timeout);
}

export default {
    executeRequest,
    executeGetRequest,
    executePostRequest,
};
