/**
 * Digikey API Provider - Ultra-robust Digikey integration
 * Feature-rich, production-ready, and future-proof
 * Handles OAuth2, rate limiting, caching, and comprehensive error handling
 */

class DigikeyApiProvider extends BaseApiManager {
    constructor() {
        super();
        
        this.config = {
            ...this.config,
            PRODUCTION: {
                BASE_URL: 'https://api.digikey.com',
                TOKEN_URL: 'https://api.digikey.com/v1/oauth2/token'
            },
            SANDBOX: {
                BASE_URL: 'https://sandbox-api.digikey.com',
                TOKEN_URL: 'https://sandbox-api.digikey.com/v1/oauth2/token'
            },
            DEFAULT_LOCALE: {
                site: 'US',
                language: 'en',
                currency: 'USD'
            },
            API_RATE_LIMIT: 1000, // 1 second between requests
            CACHE_TTL: 300000 // 5 minutes cache
        };
        
        this.credentials = {
            clientId: null,
            clientSecret: null,
            environment: 'production',
            locale: { ...this.config.DEFAULT_LOCALE }
        };
        
        this.authentication = {
            token: null,
            tokenType: 'Bearer',
            expiresAt: null,
            isAuthenticating: false,
            lastAuthError: null
        };
        
        this.cache = new Map();
        this.status = 'inactive';
    }

    /**
     * Set Digikey credentials
     * @param {Object} creds - Credentials object
     * @param {string} creds.clientId - Client ID
     * @param {string} creds.clientSecret - Client Secret
     * @param {string} creds.environment - 'production' or 'sandbox'
     * @param {Object} creds.locale - Locale settings
     */
    setCredentials(creds) {
        this.credentials = {
            clientId: creds.clientId?.trim() || null,
            clientSecret: creds.clientSecret?.trim() || null,
            environment: creds.environment || 'production',
            locale: { ...this.config.DEFAULT_LOCALE, ...creds.locale }
        };
        
        // Clear existing authentication
        this.clearAuthentication();
        
        console.log(`Digikey credentials set for ${this.credentials.environment} environment`);
    }

    /**
     * Test connection with comprehensive validation
     * @returns {Promise<boolean>} Connection test result
     */
    async testConnection() {
        if (!this.hasValidCredentials()) {
            this.setStatus('inactive', 'No credentials provided');
            return false;
        }

        try {
            this.setStatus('connecting', 'Testing connection...');
            
            // Step 1: Test authentication
            const authResult = await this.authenticate();
            if (!authResult) {
                this.setStatus('error', 'Authentication failed');
                return false;
            }
            
            // Step 2: Test API endpoint
            const apiResult = await this.testApiEndpoint();
            if (!apiResult) {
                this.setStatus('error', 'API endpoint test failed');
                return false;
            }
            
            this.setStatus('active', 'Connection successful');
            return true;
            
        } catch (error) {
            console.error('Digikey connection test failed:', error);
            this.setStatus('error', `Connection failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Authenticate with Digikey OAuth2
     * @returns {Promise<boolean>} Authentication result
     */
    async authenticate() {
        if (this.authentication.isAuthenticating) {
            console.log('Digikey authentication already in progress');
            return false;
        }
        
        if (!this.hasValidCredentials()) {
            throw new Error('Invalid credentials: Missing clientId or clientSecret');
        }
        
        this.authentication.isAuthenticating = true;
        
        try {
            const config = this.getEnvironmentConfig();
            
            console.log(`Authenticating with Digikey ${this.credentials.environment} environment...`);
            
            const tokenData = await this.authenticateOAuth2(config.TOKEN_URL, {
                'client_id': this.credentials.clientId,
                'client_secret': this.credentials.clientSecret,
                'grant_type': 'client_credentials'
            });
            
            // Store authentication data
            this.authentication = {
                token: tokenData.access_token,
                tokenType: tokenData.token_type || 'Bearer',
                expiresAt: Date.now() + ((tokenData.expires_in - 60) * 1000), // 1 min buffer
                isAuthenticating: false,
                lastAuthError: null
            };
            
            console.log(`✓ Digikey authenticated successfully (expires in ${Math.floor(tokenData.expires_in/60)}m)`);
            
            this.emit('authenticationSuccess', {
                provider: 'digikey',
                environment: this.credentials.environment,
                expiresIn: tokenData.expires_in
            });
            
            return true;
            
        } catch (error) {
            this.authentication = {
                ...this.authentication,
                token: null,
                expiresAt: null,
                isAuthenticating: false,
                lastAuthError: error.message
            };
            
            this.emit('authenticationError', {
                provider: 'digikey',
                error: error.message
            });
            
            throw error;
        }
    }

    /**
     * Test API endpoint with authenticated request
     * @returns {Promise<boolean>} API test result
     */
    async testApiEndpoint() {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }
        
        const config = this.getEnvironmentConfig();
        
        try {
            // Test with manufacturers endpoint (should return 200)
            const url = `${config.BASE_URL}/products/v4/manufacturers`;
            const headers = this.getAuthHeaders();
            
            const response = await this.makeRequest(url, {
                method: 'GET',
                headers
            });
            
            if (response.ok) {
                console.log('✓ Digikey API endpoint test successful');
                return true;
            } else {
                console.error('Digikey API endpoint test failed:', response.status, response.statusText);
                return false;
            }
            
        } catch (error) {
            console.error('Digikey API endpoint test error:', error);
            return false;
        }
    }

    /**
     * Search products by keyword
     * @param {string} keyword - Search keyword
     * @param {Object} options - Search options
     * @returns {Promise<Object>} Search results
     */
    async searchProducts(keyword, options = {}) {
        await this.ensureAuthenticated();
        
        const config = this.getEnvironmentConfig();
        const url = `${config.BASE_URL}/products/v4/search/keyword`;
        
        const searchPayload = {
            Keywords: keyword,
            RecordCount: options.recordCount || 20,
            RecordStartPosition: options.startPosition || 0,
            Filters: options.filters || {},
            Sort: options.sort || {
                Option: "SortByManu",
                Direction: "Ascending",
                SortParameterId: 0
            }
        };
        
        return await this.makeJsonRequest(url, {
            method: 'POST',
            data: searchPayload
        }, this.getAuthHeaders());
    }

    /**
     * Get product details by MPN
     * @param {string} mpn - Manufacturer Part Number
     * @returns {Promise<Object>} Product details
     */
    async getProductDetails(mpn) {
        await this.ensureAuthenticated();
        
        // Check cache first
        const cacheKey = `product_${mpn}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        const config = this.getEnvironmentConfig();
        const url = `${config.BASE_URL}/products/v4/search/${encodeURIComponent(mpn)}/productdetails`;
        
        try {
            const result = await this.makeJsonRequest(url, {
                method: 'GET'
            }, this.getAuthHeaders());
            
            // Cache successful result
            this.setCache(cacheKey, result);
            
            return result;
            
        } catch (error) {
            // If 404, try keyword search as fallback
            if (error.status === 404) {
                console.log(`Product ${mpn} not found, trying keyword search...`);
                return await this.searchProducts(mpn, { recordCount: 1 });
            }
            throw error;
        }
    }

    /**
     * Get manufacturers list
     * @returns {Promise<Object>} Manufacturers list
     */
    async getManufacturers() {
        await this.ensureAuthenticated();
        
        const cacheKey = 'manufacturers';
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        const config = this.getEnvironmentConfig();
        const url = `${config.BASE_URL}/products/v4/manufacturers`;
        
        const result = await this.makeJsonRequest(url, {
            method: 'GET'
        }, this.getAuthHeaders());
        
        // Cache for longer period (1 hour)
        this.setCache(cacheKey, result, 3600000);
        
        return result;
    }

    /**
     * Batch product lookup
     * @param {Array<string>} mpns - Array of MPNs
     * @param {Object} options - Batch options
     * @returns {Promise<Array>} Batch results
     */
    async batchProductLookup(mpns, options = {}) {
        const results = [];
        const batchSize = options.batchSize || 10;
        const concurrency = options.concurrency || 3;
        
        for (let i = 0; i < mpns.length; i += batchSize) {
            const batch = mpns.slice(i, i + batchSize);
            const batchPromises = batch.map(async (mpn, index) => {
                try {
                    // Add delay to respect rate limits
                    await this.sleep(index * (this.config.API_RATE_LIMIT / concurrency));
                    return await this.getProductDetails(mpn);
                } catch (error) {
                    return { error: error.message, mpn };
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Progress callback
            if (options.onProgress) {
                options.onProgress({
                    completed: i + batch.length,
                    total: mpns.length,
                    percentage: Math.round(((i + batch.length) / mpns.length) * 100)
                });
            }
        }
        
        return results;
    }

    /**
     * Get valid authentication token (refresh if needed)
     * @returns {Promise<string|null>} Access token
     */
    async getValidToken() {
        if (!this.authentication.token) {
            return null;
        }
        
        // Check if token is expired or about to expire
        if (Date.now() >= (this.authentication.expiresAt - this.config.TOKEN_BUFFER)) {
            console.log('Digikey token expired, refreshing...');
            const refreshed = await this.authenticate();
            if (!refreshed) {
                return null;
            }
        }
        
        return this.authentication.token;
    }

    /**
     * Ensure valid authentication
     * @returns {Promise<void>}
     */
    async ensureAuthenticated() {
        if (!this.isAuthenticated()) {
            const result = await this.authenticate();
            if (!result) {
                throw new Error('Authentication failed');
            }
        }
    }

    /**
     * Get authentication headers
     * @returns {Object} Auth headers
     */
    getAuthHeaders() {
        const token = this.authentication.token;
        if (!token) {
            throw new Error('No authentication token available');
        }
        
        return {
            'Authorization': `${this.authentication.tokenType} ${token}`,
            'X-DIGIKEY-Client-Id': this.credentials.clientId,
            'X-DIGIKEY-Locale-Site': this.credentials.locale.site,
            'X-DIGIKEY-Locale-Language': this.credentials.locale.language,
            'X-DIGIKEY-Locale-Currency': this.credentials.locale.currency
        };
    }

    /**
     * Get environment configuration
     * @returns {Object} Environment config
     */
    getEnvironmentConfig() {
        return this.credentials.environment === 'sandbox' ? 
               this.config.SANDBOX : this.config.PRODUCTION;
    }

    /**
     * Check if credentials are valid
     * @returns {boolean} Credentials validity
     */
    hasValidCredentials() {
        return !!(this.credentials.clientId && this.credentials.clientSecret);
    }

    /**
     * Check if currently authenticated
     * @returns {boolean} Authentication status
     */
    isAuthenticated() {
        return !!(this.authentication.token && 
                 this.authentication.expiresAt > Date.now());
    }

    /**
     * Set provider status
     * @param {string} status - Status value
     * @param {string} message - Status message
     */
    setStatus(status, message = '') {
        this.status = status;
        
        this.emit('statusChange', {
            provider: 'digikey',
            status,
            message,
            timestamp: Date.now()
        });
        
        console.log(`Digikey Status: ${status} - ${message}`);
    }

    /**
     * Get current status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            status: this.status,
            authenticated: this.isAuthenticated(),
            environment: this.credentials.environment,
            hasCredentials: this.hasValidCredentials(),
            lastError: this.authentication.lastAuthError,
            tokenExpiry: this.authentication.expiresAt
        };
    }

    /**
     * Cache management
     */
    setCache(key, data, ttl = this.config.CACHE_TTL) {
        this.cache.set(key, {
            data,
            expires: Date.now() + ttl
        });
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && cached.expires > Date.now()) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    clearCache() {
        this.cache.clear();
    }

    /**
     * Clear authentication data
     */
    clearAuthentication() {
        this.authentication = {
            token: null,
            tokenType: 'Bearer',
            expiresAt: null,
            isAuthenticating: false,
            lastAuthError: null
        };
        this.clearCache();
        this.setStatus('inactive', 'Authentication cleared');
    }

    /**
     * Get comprehensive provider information
     * @returns {Object} Provider info
     */
    getProviderInfo() {
        return {
            name: 'Digikey',
            version: '1.0.0',
            environment: this.credentials.environment,
            locale: this.credentials.locale,
            status: this.getStatus(),
            metrics: this.getMetrics(),
            capabilities: [
                'product-search',
                'product-details',
                'manufacturers',
                'batch-lookup',
                'oauth2-authentication',
                'rate-limiting',
                'caching'
            ]
        };
    }
}

// Export for module use
window.DigikeyApiProvider = DigikeyApiProvider;