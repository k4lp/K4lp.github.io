/**
 * Mouser API Provider - Ultra-robust Mouser integration
 * Feature-rich, production-ready, and future-proof
 * Handles API key authentication, rate limiting, caching, and comprehensive error handling
 */

class MouserApiProvider extends BaseApiManager {
    constructor() {
        super();
        
        this.config = {
            ...this.config,
            BASE_URL: 'https://api.mouser.com',
            API_VERSION: 'v1',
            DEFAULT_PARAMS: {
                format: 'json'
            },
            API_RATE_LIMIT: 1000, // 1 second between requests
            CACHE_TTL: 300000, // 5 minutes cache
            MAX_SEARCH_RESULTS: 50
        };
        
        this.credentials = {
            apiKey: null
        };
        
        this.cache = new Map();
        this.status = 'inactive';
        this.lastApiCall = 0;
    }

    /**
     * Set Mouser API credentials
     * @param {Object} creds - Credentials object
     * @param {string} creds.apiKey - Mouser API Key
     */
    setCredentials(creds) {
        this.credentials = {
            apiKey: creds.apiKey?.trim() || null
        };
        
        console.log('Mouser API credentials set');
    }

    /**
     * Test connection with comprehensive validation
     * @returns {Promise<boolean>} Connection test result
     */
    async testConnection() {
        if (!this.hasValidCredentials()) {
            this.setStatus('inactive', 'No API key provided');
            return false;
        }

        try {
            this.setStatus('connecting', 'Testing connection...');
            
            // Test with manufacturers list endpoint
            const result = await this.testApiEndpoint();
            
            if (result) {
                this.setStatus('active', 'Connection successful');
                return true;
            } else {
                this.setStatus('error', 'API test failed');
                return false;
            }
            
        } catch (error) {
            console.error('Mouser connection test failed:', error);
            this.setStatus('error', `Connection failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Test API endpoint with authenticated request
     * @returns {Promise<boolean>} API test result
     */
    async testApiEndpoint() {
        if (!this.hasValidCredentials()) {
            throw new Error('Invalid credentials: Missing API key');
        }
        
        try {
            // Test with a simple API call
            const result = await this.getManufacturerList();
            
            if (result && (result.ManufacturerList || result.Errors === undefined)) {
                console.log('✓ Mouser API endpoint test successful');
                return true;
            } else {
                console.error('Mouser API endpoint test failed:', result);
                return false;
            }
            
        } catch (error) {
            console.error('Mouser API endpoint test error:', error);
            
            // Check for specific error cases
            if (error.status === 401 || error.status === 403) {
                throw new Error('Invalid API key');
            } else if (error.status === 410) {
                // Try alternative endpoint
                return await this.testAlternativeEndpoint();
            }
            
            throw error;
        }
    }

    /**
     * Test alternative endpoint if primary fails
     * @returns {Promise<boolean>} Alternative test result
     */
    async testAlternativeEndpoint() {
        try {
            // Try search endpoint with a common part
            const result = await this.searchParts('resistor', { searchOptions: 'InStock', recordCount: 1 });
            
            if (result && !result.Errors) {
                console.log('✓ Mouser alternative API endpoint test successful');
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Mouser alternative endpoint test failed:', error);
            return false;
        }
    }

    /**
     * Search parts by keyword
     * @param {string} keyword - Search keyword
     * @param {Object} options - Search options
     * @returns {Promise<Object>} Search results
     */
    async searchParts(keyword, options = {}) {
        if (!this.hasValidCredentials()) {
            throw new Error('No valid API key');
        }
        
        // Check cache first
        const cacheKey = `search_${keyword}_${JSON.stringify(options)}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        const url = `${this.config.BASE_URL}/api/${this.config.API_VERSION}/search/keyword`;
        
        const searchPayload = {
            SearchByKeywordRequest: {
                keyword: keyword,
                records: options.recordCount || this.config.MAX_SEARCH_RESULTS,
                startingRecord: options.startingRecord || 0,
                searchOptions: options.searchOptions || 'InStock',
                searchWithYourSignUpLanguage: options.useSignupLanguage || false
            }
        };
        
        try {
            const result = await this.makeMouserRequest(url, {
                method: 'POST',
                data: searchPayload
            });
            
            // Cache successful result
            this.setCache(cacheKey, result);
            
            return result;
            
        } catch (error) {
            console.error(`Mouser search failed for keyword "${keyword}":`, error);
            throw error;
        }
    }

    /**
     * Get part details by Mouser part number
     * @param {string} mouserPartNumber - Mouser part number
     * @returns {Promise<Object>} Part details
     */
    async getPartDetails(mouserPartNumber) {
        if (!this.hasValidCredentials()) {
            throw new Error('No valid API key');
        }
        
        // Check cache first
        const cacheKey = `part_${mouserPartNumber}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        const url = `${this.config.BASE_URL}/api/${this.config.API_VERSION}/search/partnumber`;
        
        const partPayload = {
            SearchByPartRequest: {
                mouserPartNumber: mouserPartNumber,
                partSearchOptions: 'InStock'
            }
        };
        
        try {
            const result = await this.makeMouserRequest(url, {
                method: 'POST',
                data: partPayload
            });
            
            // Cache successful result
            this.setCache(cacheKey, result);
            
            return result;
            
        } catch (error) {
            // If not found, try keyword search as fallback
            if (error.status === 404) {
                console.log(`Part ${mouserPartNumber} not found, trying keyword search...`);
                return await this.searchParts(mouserPartNumber, { recordCount: 1 });
            }
            
            throw error;
        }
    }

    /**
     * Search by manufacturer part number
     * @param {string} manufacturerPartNumber - Manufacturer part number
     * @param {string} manufacturerName - Manufacturer name (optional)
     * @returns {Promise<Object>} Search results
     */
    async searchByManufacturerPartNumber(manufacturerPartNumber, manufacturerName = '') {
        if (!this.hasValidCredentials()) {
            throw new Error('No valid API key');
        }
        
        const cacheKey = `mfg_part_${manufacturerPartNumber}_${manufacturerName}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        const url = `${this.config.BASE_URL}/api/${this.config.API_VERSION}/search/manufacturerpartnumber`;
        
        const searchPayload = {
            SearchByManufacturerPartNumberRequest: {
                manufacturerPartNumber: manufacturerPartNumber,
                manufacturer: manufacturerName,
                partSearchOptions: 'InStock'
            }
        };
        
        try {
            const result = await this.makeMouserRequest(url, {
                method: 'POST',
                data: searchPayload
            });
            
            // Cache successful result
            this.setCache(cacheKey, result);
            
            return result;
            
        } catch (error) {
            console.error(`Mouser MPN search failed for "${manufacturerPartNumber}":`, error);
            throw error;
        }
    }

    /**
     * Get manufacturer list
     * @returns {Promise<Object>} Manufacturers list
     */
    async getManufacturerList() {
        if (!this.hasValidCredentials()) {
            throw new Error('No valid API key');
        }
        
        const cacheKey = 'manufacturer_list';
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        const url = `${this.config.BASE_URL}/api/${this.config.API_VERSION}/search/manufacturerlist`;
        
        try {
            const result = await this.makeMouserRequest(url, {
                method: 'GET'
            });
            
            // Cache for longer period (1 hour)
            this.setCache(cacheKey, result, 3600000);
            
            return result;
            
        } catch (error) {
            console.error('Mouser manufacturer list failed:', error);
            throw error;
        }
    }

    /**
     * Get category list
     * @returns {Promise<Object>} Categories list
     */
    async getCategoryList() {
        if (!this.hasValidCredentials()) {
            throw new Error('No valid API key');
        }
        
        const cacheKey = 'category_list';
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        const url = `${this.config.BASE_URL}/api/${this.config.API_VERSION}/search/categorylist`;
        
        try {
            const result = await this.makeMouserRequest(url, {
                method: 'GET'
            });
            
            // Cache for longer period (1 hour)
            this.setCache(cacheKey, result, 3600000);
            
            return result;
            
        } catch (error) {
            console.error('Mouser category list failed:', error);
            throw error;
        }
    }

    /**
     * Batch part lookup
     * @param {Array<string>} partNumbers - Array of part numbers
     * @param {Object} options - Batch options
     * @returns {Promise<Array>} Batch results
     */
    async batchPartLookup(partNumbers, options = {}) {
        const results = [];
        const batchSize = options.batchSize || 10;
        const concurrency = options.concurrency || 3;
        
        for (let i = 0; i < partNumbers.length; i += batchSize) {
            const batch = partNumbers.slice(i, i + batchSize);
            const batchPromises = batch.map(async (partNumber, index) => {
                try {
                    // Add delay to respect rate limits
                    await this.sleep(index * (this.config.API_RATE_LIMIT / concurrency));
                    
                    // Try manufacturer part number first, then keyword search
                    try {
                        return await this.searchByManufacturerPartNumber(partNumber);
                    } catch {
                        return await this.searchParts(partNumber, { recordCount: 1 });
                    }
                } catch (error) {
                    return { error: error.message, partNumber };
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Progress callback
            if (options.onProgress) {
                options.onProgress({
                    completed: i + batch.length,
                    total: partNumbers.length,
                    percentage: Math.round(((i + batch.length) / partNumbers.length) * 100)
                });
            }
        }
        
        return results;
    }

    /**
     * Make authenticated Mouser API request
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {Promise<Object>} API response
     */
    async makeMouserRequest(url, options = {}) {
        if (!this.hasValidCredentials()) {
            throw new Error('No valid API key');
        }
        
        // Add API key to URL parameters
        const urlObj = new URL(url);
        urlObj.searchParams.set('apiKey', this.credentials.apiKey);
        
        // Add default parameters
        Object.entries(this.config.DEFAULT_PARAMS).forEach(([key, value]) => {
            if (!urlObj.searchParams.has(key)) {
                urlObj.searchParams.set(key, value);
            }
        });
        
        const headers = {
            'Accept': 'application/json',
            'User-Agent': 'K4LP-Engineering-Tools/1.0'
        };
        
        if (options.data) {
            headers['Content-Type'] = 'application/json';
        }
        
        try {
            return await this.makeJsonRequest(urlObj.toString(), options, headers);
        } catch (error) {
            // Add more context to Mouser API errors
            if (error.status === 401 || error.status === 403) {
                throw new Error('Invalid Mouser API key');
            } else if (error.status === 429) {
                throw new Error('Mouser API rate limit exceeded');
            } else if (error.status === 410) {
                throw new Error('Mouser API endpoint deprecated or unavailable');
            }
            
            throw error;
        }
    }

    /**
     * Check if credentials are valid
     * @returns {boolean} Credentials validity
     */
    hasValidCredentials() {
        return !!(this.credentials.apiKey && this.credentials.apiKey.length > 0);
    }

    /**
     * Set provider status
     * @param {string} status - Status value
     * @param {string} message - Status message
     */
    setStatus(status, message = '') {
        this.status = status;
        
        this.emit('statusChange', {
            provider: 'mouser',
            status,
            message,
            timestamp: Date.now()
        });
        
        console.log(`Mouser Status: ${status} - ${message}`);
    }

    /**
     * Get current status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            status: this.status,
            hasCredentials: this.hasValidCredentials(),
            lastApiCall: this.lastApiCall,
            cacheSize: this.cache.size
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
     * Clear all data
     */
    clearAll() {
        this.credentials = { apiKey: null };
        this.clearCache();
        this.setStatus('inactive', 'Credentials cleared');
    }

    /**
     * Get comprehensive provider information
     * @returns {Object} Provider info
     */
    getProviderInfo() {
        return {
            name: 'Mouser',
            version: '1.0.0',
            apiVersion: this.config.API_VERSION,
            status: this.getStatus(),
            metrics: this.getMetrics(),
            capabilities: [
                'part-search',
                'part-details',
                'manufacturer-search',
                'manufacturers-list',
                'categories-list',
                'batch-lookup',
                'api-key-authentication',
                'rate-limiting',
                'caching'
            ]
        };
    }
}

// Export for module use
window.MouserApiProvider = MouserApiProvider;