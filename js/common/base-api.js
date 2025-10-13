/**
 * Base API Manager - Core foundation for all API providers
 * Ultra-robust, feature-rich, and future-proof API management system
 * Provides common functionality for authentication, retry logic, and error handling
 */

class BaseApiManager {
    constructor() {
        this.config = {
            MAX_RETRIES: 3,
            RETRY_DELAY: 1000,
            REQUEST_TIMEOUT: 30000,
            AUTH_TIMEOUT: 15000,
            TOKEN_BUFFER: 300000, // 5 minutes
            RATE_LIMIT_DELAY: 1000
        };

        this.requestQueue = new Map();
        this.rateLimiter = new Map();
        this.eventListeners = new Map();
        this.metrics = {
            requests: 0,
            successful: 0,
            failed: 0,
            retries: 0,
            avgResponseTime: 0,
            totalResponseTime: 0
        };
    }

    /**
     * Universal HTTP request with comprehensive error handling and retry logic
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @param {Object} retryConfig - Retry configuration
     * @returns {Promise<Response>} HTTP Response
     */
    async makeRequest(url, options = {}, retryConfig = {}) {
        const config = { ...this.config, ...retryConfig };
        const requestId = this.generateRequestId();
        const startTime = performance.now();

        // Check rate limiting
        await this.enforceRateLimit(url);

        let lastError;
        for (let attempt = 0; attempt <= config.MAX_RETRIES; attempt++) {
            try {
                this.metrics.requests++;
                
                // Create abort controller with timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), config.REQUEST_TIMEOUT);

                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                // Update metrics
                const responseTime = performance.now() - startTime;
                this.updateMetrics(true, responseTime);

                // Log successful request
                this.logRequest(requestId, 'SUCCESS', {
                    url,
                    method: options.method || 'GET',
                    status: response.status,
                    attempt: attempt + 1,
                    responseTime
                });

                return response;

            } catch (error) {
                lastError = error;
                this.metrics.failed++;

                const errorType = error.name === 'AbortError' ? 'TIMEOUT' : 'ERROR';
                this.logRequest(requestId, errorType, {
                    url,
                    method: options.method || 'GET',
                    attempt: attempt + 1,
                    error: error.message
                });

                // Don't retry on certain errors
                if (this.shouldNotRetry(error, attempt, config.MAX_RETRIES)) {
                    break;
                }

                if (attempt < config.MAX_RETRIES) {
                    this.metrics.retries++;
                    const delay = this.calculateBackoffDelay(attempt, config.RETRY_DELAY);
                    await this.sleep(delay);
                    console.log(`Retrying request ${requestId} (attempt ${attempt + 2}/${config.MAX_RETRIES + 1}) in ${delay}ms`);
                }
            }
        }

        this.updateMetrics(false, performance.now() - startTime);
        throw lastError;
    }

    /**
     * Make authenticated JSON request with automatic parsing
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @param {Object} headers - Authentication headers
     * @returns {Promise<Object>} Parsed JSON response
     */
    async makeJsonRequest(url, options = {}, headers = {}) {
        const requestOptions = {
            ...options,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                ...headers,
                ...options.headers
            }
        };

        if (options.data && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
            requestOptions.body = JSON.stringify(options.data);
        }

        const response = await this.makeRequest(url, requestOptions);
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            const error = new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
            error.status = response.status;
            error.response = response;
            throw error;
        }

        return await response.json();
    }

    /**
     * OAuth2 authentication helper
     * @param {string} tokenUrl - Token endpoint URL
     * @param {Object} credentials - OAuth credentials
     * @returns {Promise<Object>} Token data
     */
    async authenticateOAuth2(tokenUrl, credentials) {
        const authStartTime = performance.now();
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.AUTH_TIMEOUT);

            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'User-Agent': 'K4LP-Engineering-Tools/1.0'
                },
                body: new URLSearchParams(credentials),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: errorText || response.statusText };
                }
                
                const error = new Error(`Authentication failed: ${errorData.ErrorMessage || errorData.error_description || errorData.error || 'Unknown error'}`);
                error.status = response.status;
                error.details = errorData;
                throw error;
            }

            const tokenData = await response.json();
            
            if (!tokenData.access_token) {
                throw new Error('Invalid token response: Missing access_token');
            }

            this.logAuthentication('SUCCESS', {
                tokenUrl,
                expiresIn: tokenData.expires_in,
                responseTime: performance.now() - authStartTime
            });

            return tokenData;

        } catch (error) {
            this.logAuthentication('ERROR', {
                tokenUrl,
                error: error.message,
                responseTime: performance.now() - authStartTime
            });
            throw error;
        }
    }

    /**
     * Enforce rate limiting per domain
     * @param {string} url - Request URL
     * @returns {Promise<void>}
     */
    async enforceRateLimit(url) {
        const domain = new URL(url).hostname;
        const lastRequest = this.rateLimiter.get(domain);
        
        if (lastRequest) {
            const timeSinceLastRequest = Date.now() - lastRequest;
            if (timeSinceLastRequest < this.config.RATE_LIMIT_DELAY) {
                const delay = this.config.RATE_LIMIT_DELAY - timeSinceLastRequest;
                await this.sleep(delay);
            }
        }
        
        this.rateLimiter.set(domain, Date.now());
    }

    /**
     * Calculate exponential backoff delay
     * @param {number} attempt - Current attempt number
     * @param {number} baseDelay - Base delay in milliseconds
     * @returns {number} Calculated delay
     */
    calculateBackoffDelay(attempt, baseDelay) {
        const jitter = Math.random() * 0.1; // 10% jitter
        return Math.floor(baseDelay * Math.pow(2, attempt) * (1 + jitter));
    }

    /**
     * Determine if request should not be retried
     * @param {Error} error - Request error
     * @param {number} attempt - Current attempt
     * @param {number} maxRetries - Maximum retry attempts
     * @returns {boolean} Should not retry
     */
    shouldNotRetry(error, attempt, maxRetries) {
        // Don't retry on final attempt
        if (attempt >= maxRetries) return true;
        
        // Don't retry on certain HTTP status codes
        if (error.status) {
            const nonRetryableStatuses = [400, 401, 403, 404, 422, 429];
            return nonRetryableStatuses.includes(error.status);
        }
        
        // Don't retry on certain error types
        if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
            return false; // Network errors should be retried
        }
        
        return false;
    }

    /**
     * Event system for API status changes
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Emit event to all listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        const listeners = this.eventListeners.get(event) || [];
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Event listener error for ${event}:`, error);
            }
        });
        
        // Also emit to window for global listeners
        window.dispatchEvent(new CustomEvent(event, { detail: data }));
    }

    /**
     * Update performance metrics
     * @param {boolean} success - Request success
     * @param {number} responseTime - Response time in ms
     */
    updateMetrics(success, responseTime) {
        if (success) {
            this.metrics.successful++;
        }
        
        this.metrics.totalResponseTime += responseTime;
        this.metrics.avgResponseTime = this.metrics.totalResponseTime / this.metrics.requests;
    }

    /**
     * Get current performance metrics
     * @returns {Object} Performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            successRate: this.metrics.requests > 0 ? (this.metrics.successful / this.metrics.requests) * 100 : 0,
            errorRate: this.metrics.requests > 0 ? (this.metrics.failed / this.metrics.requests) * 100 : 0
        };
    }

    /**
     * Log request details
     * @param {string} requestId - Unique request ID
     * @param {string} status - Request status
     * @param {Object} details - Request details
     */
    logRequest(requestId, status, details) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            requestId,
            status,
            ...details
        };
        
        if (status === 'ERROR' || status === 'TIMEOUT') {
            console.error(`[${timestamp}] API Request ${status}:`, logEntry);
        } else {
            console.log(`[${timestamp}] API Request ${status}:`, logEntry);
        }
    }

    /**
     * Log authentication attempts
     * @param {string} status - Auth status
     * @param {Object} details - Auth details
     */
    logAuthentication(status, details) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            status,
            ...details
        };
        
        if (status === 'ERROR') {
            console.error(`[${timestamp}] Authentication ${status}:`, logEntry);
        } else {
            console.log(`[${timestamp}] Authentication ${status}:`, logEntry);
        }
    }

    /**
     * Generate unique request ID
     * @returns {string} Unique request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Sleep utility for delays
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Reset all metrics
     */
    resetMetrics() {
        this.metrics = {
            requests: 0,
            successful: 0,
            failed: 0,
            retries: 0,
            avgResponseTime: 0,
            totalResponseTime: 0
        };
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.requestQueue.clear();
        this.rateLimiter.clear();
        this.eventListeners.clear();
        this.resetMetrics();
    }
}

// Export for module use
window.BaseApiManager = BaseApiManager;