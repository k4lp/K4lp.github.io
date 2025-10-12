/**
 * Enhanced API Management for Digikey and Mouser
 * Handles authentication, requests, response processing, and caching
 * Part of K4LP Engineering Tools - Swiss Minimalist Design
 * @version 2.0.0
 */

class ApiManager {
    constructor() {
        this.version = '2.0.0';
        
        // API Endpoints
        this.endpoints = {
            digikey: {
                base: 'https://api.digikey.com',
                auth: 'https://api.digikey.com/v1/oauth2/token',
                search: '/Search/v3/Products/Keyword',
                product: '/Search/v3/Products',
                categories: '/Search/v3/Categories',
                manufacturers: '/Search/v3/Manufacturers',
                productDetails: '/Search/v3/Products/ProductDetails',
                suggestions: '/Search/v3/Products/Suggestions'
            },
            mouser: {
                base: 'https://api.mouser.com',
                search: '/api/v1/search/keyword',
                product: '/api/v1/search/partnumber',
                categories: '/api/v1/search/manufacturerlist',
                priceAvailability: '/api/v1/search/priceandavailability'
            }
        };

        // Request configuration
        this.requestConfig = {
            timeout: 30000, // 30 seconds
            retryAttempts: 3,
            retryDelay: 1000, // 1 second base delay
            maxConcurrentRequests: 5
        };

        // Rate limiting
        this.rateLimits = {
            digikey: {
                requestsPerMinute: 1000,
                requestsPerDay: 25000,
                currentMinute: 0,
                currentDay: 0,
                minuteReset: null,
                dayReset: null
            },
            mouser: {
                requestsPerMinute: 1000,
                requestsPerDay: 25000,
                currentMinute: 0,
                currentDay: 0,
                minuteReset: null,
                dayReset: null
            }
        };

        // Status tracking
        this.status = {
            digikey: 'inactive', // inactive, connecting, active, error, rate_limited
            mouser: 'inactive'
        };

        // Authentication tokens
        this.tokens = {
            digikey: null,
            mouser: null
        };

        // Request queue for managing concurrency
        this.requestQueue = {
            digikey: [],
            mouser: []
        };
        
        this.activeRequests = {
            digikey: 0,
            mouser: 0
        };

        // Error tracking
        this.errorHistory = {
            digikey: [],
            mouser: []
        };

        // Performance metrics
        this.metrics = {
            digikey: {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                avgResponseTime: 0,
                lastRequestTime: null
            },
            mouser: {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                avgResponseTime: 0,
                lastRequestTime: null
            }
        };

        // Initialize
        this.initialize();
    }

    /**
     * Initialize API manager
     */
    async initialize() {
        try {
            await this.loadStoredCredentials();
            await this.validateStoredTokens();
            this.setupPeriodicTasks();
            
            console.log('✓ K4LP API Manager v2.0.0 initialized');
        } catch (error) {
            console.error('API Manager initialization failed:', error);
            this.logError('initialization', error);
        }
    }

    /**
     * Load stored credentials and attempt authentication
     */
    async loadStoredCredentials() {
        if (!window.storage) {
            throw new Error('Storage manager not available');
        }

        // Load Digikey credentials
        const digikeyCredentials = window.storage.getDigikeyCredentials();
        if (digikeyCredentials.clientId && digikeyCredentials.clientSecret) {
            await this.authenticateDigikey(digikeyCredentials.clientId, digikeyCredentials.clientSecret, false);
        }

        // Load Mouser credentials
        const mouserCredentials = window.storage.getMouserCredentials();
        if (mouserCredentials.apiKey) {
            this.setMouserApiKey(mouserCredentials.apiKey, false);
        }
    }

    /**
     * Validate stored authentication tokens
     */
    async validateStoredTokens() {
        // Check Digikey token validity
        if (this.tokens.digikey) {
            if (Date.now() >= this.tokens.digikey.expires_at) {
                console.log('Digikey token expired, will re-authenticate on next request');
                this.tokens.digikey = null;
                this.setStatus('digikey', 'inactive');
            } else {
                // Test token with a simple request
                try {
                    await this.testDigikeyConnection();
                } catch (error) {
                    console.warn('Digikey token validation failed:', error.message);
                    this.tokens.digikey = null;
                    this.setStatus('digikey', 'error');
                }
            }
        }

        // Test Mouser connection if configured
        if (this.tokens.mouser) {
            try {
                await this.testMouserConnection();
            } catch (error) {
                console.warn('Mouser API validation failed:', error.message);
                this.setStatus('mouser', 'error');
            }
        }
    }

    /**
     * Setup periodic maintenance tasks
     */
    setupPeriodicTasks() {
        // Reset rate limits every minute
        setInterval(() => {
            this.resetMinuteRateLimits();
        }, 60000);

        // Reset daily rate limits every day
        setInterval(() => {
            this.resetDayRateLimits();
        }, 24 * 60 * 60 * 1000);

        // Clean up error history every hour
        setInterval(() => {
            this.cleanupErrorHistory();
        }, 60 * 60 * 1000);

        // Update performance metrics every 5 minutes
        setInterval(() => {
            this.updatePerformanceMetrics();
        }, 5 * 60 * 1000);
    }

    /**
     * Authenticate with Digikey API using OAuth2 client credentials flow
     */
    async authenticateDigikey(clientId, clientSecret, updateStorage = true) {
        this.setStatus('digikey', 'connecting');
        
        try {
            const credentials = btoa(`${clientId}:${clientSecret}`);
            
            const response = await this.makeRawRequest(this.endpoints.digikey.auth, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${credentials}`,
                    'X-DIGIKEY-Client-Id': clientId
                },
                body: 'grant_type=client_credentials'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
            }

            const tokenData = await response.json();
            
            this.tokens.digikey = {
                access_token: tokenData.access_token,
                token_type: tokenData.token_type || 'Bearer',
                expires_in: tokenData.expires_in,
                expires_at: Date.now() + (tokenData.expires_in * 1000),
                client_id: clientId
            };

            // Save credentials and tokens to storage
            if (updateStorage && window.storage) {
                window.storage.saveDigikeyCredentials(clientId, clientSecret);
                window.storage.setItem('digikey_tokens', this.tokens.digikey);
            }

            this.setStatus('digikey', 'active');
            console.log('✓ Digikey authentication successful');
            return true;

        } catch (error) {
            console.error('Digikey authentication failed:', error);
            this.setStatus('digikey', 'error');
            this.logError('digikey', error, 'authentication');
            return false;
        }
    }

    /**
     * Set Mouser API key
     */
    setMouserApiKey(apiKey, updateStorage = true) {
        this.tokens.mouser = {
            api_key: apiKey,
            configured_at: Date.now()
        };

        if (updateStorage && window.storage) {
            window.storage.saveMouserCredentials(apiKey);
        }

        this.setStatus('mouser', 'active');
        console.log('✓ Mouser API key configured');
        return true;
    }

    /**
     * Test Digikey API connection
     */
    async testDigikeyConnection() {
        if (!this.tokens.digikey) {
            throw new Error('Digikey not authenticated');
        }

        try {
            this.setStatus('digikey', 'connecting');
            
            // Simple test request to categories endpoint
            const response = await this.makeDigikeyRequest('/Search/v3/Categories', {
                method: 'GET'
            });

            this.setStatus('digikey', 'active');
            return response !== null;
        } catch (error) {
            this.setStatus('digikey', 'error');
            throw error;
        }
    }

    /**
     * Test Mouser API connection
     */
    async testMouserConnection() {
        if (!this.tokens.mouser) {
            throw new Error('Mouser API key not configured');
        }

        try {
            this.setStatus('mouser', 'connecting');
            
            // Simple test request to manufacturer list
            const response = await this.makeMouserRequest('/api/v1/search/manufacturerlist', {
                method: 'GET'
            });

            this.setStatus('mouser', 'active');
            return response !== null;
        } catch (error) {
            this.setStatus('mouser', 'error');
            throw error;
        }
    }

    /**
     * Make authenticated Digikey API request
     */
    async makeDigikeyRequest(endpoint, options = {}) {
        return this.makeApiRequest('digikey', endpoint, options);
    }

    /**
     * Make Mouser API request
     */
    async makeMouserRequest(endpoint, options = {}) {
        return this.makeApiRequest('mouser', endpoint, options);
    }

    /**
     * Generic API request method with comprehensive error handling
     */
    async makeApiRequest(provider, endpoint, options = {}) {
        // Validate provider
        if (!['digikey', 'mouser'].includes(provider)) {
            throw new Error(`Invalid API provider: ${provider}`);
        }

        // Check authentication
        if (!this.tokens[provider]) {
            throw new Error(`${provider} not authenticated`);
        }

        // Check rate limits
        if (this.isRateLimited(provider)) {
            throw new Error(`${provider} API rate limit exceeded`);
        }

        // Add to request queue if at max concurrency
        if (this.activeRequests[provider] >= this.requestConfig.maxConcurrentRequests) {
            return this.queueRequest(provider, endpoint, options);
        }

        const startTime = Date.now();
        this.activeRequests[provider]++;
        this.updateRateLimit(provider);

        try {
            const url = this.buildUrl(provider, endpoint, options.params);
            const requestOptions = this.buildRequestOptions(provider, options);
            
            const response = await this.makeRawRequestWithRetry(url, requestOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Update metrics
            this.updateMetrics(provider, startTime, true);
            
            // Cache response if cacheable
            if (options.cache) {
                this.cacheResponse(provider, endpoint, options.params, data, options.cacheTtl);
            }

            return data;

        } catch (error) {
            this.updateMetrics(provider, startTime, false);
            this.logError(provider, error, `${options.method || 'GET'} ${endpoint}`);
            throw error;
        } finally {
            this.activeRequests[provider]--;
            this.processQueue(provider);
        }
    }

    /**
     * Build complete URL for API request
     */
    buildUrl(provider, endpoint, params = {}) {
        const baseUrl = this.endpoints[provider].base;
        let url = baseUrl + endpoint;
        
        // Add query parameters for Mouser (includes API key)
        if (provider === 'mouser') {
            const urlParams = new URLSearchParams({
                apiKey: this.tokens.mouser.api_key,
                ...params
            });
            url += '?' + urlParams.toString();
        } else if (Object.keys(params).length > 0) {
            const urlParams = new URLSearchParams(params);
            url += '?' + urlParams.toString();
        }
        
        return url;
    }

    /**
     * Build request options with authentication headers
     */
    buildRequestOptions(provider, options = {}) {
        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'K4LP-Engineering-Tools/2.0.0',
                ...options.headers
            }
        };

        // Add authentication headers
        if (provider === 'digikey') {
            requestOptions.headers['Authorization'] = `${this.tokens.digikey.token_type} ${this.tokens.digikey.access_token}`;
            requestOptions.headers['X-DIGIKEY-Client-Id'] = this.tokens.digikey.client_id;
        }

        // Add request body for POST/PUT requests
        if (options.data && ['POST', 'PUT', 'PATCH'].includes(requestOptions.method)) {
            requestOptions.body = JSON.stringify(options.data);
        }

        return requestOptions;
    }

    /**
     * Make raw HTTP request with timeout
     */
    async makeRawRequest(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestConfig.timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${this.requestConfig.timeout}ms`);
            }
            throw error;
        }
    }

    /**
     * Make request with automatic retry logic
     */
    async makeRawRequestWithRetry(url, options = {}, attempt = 1) {
        try {
            return await this.makeRawRequest(url, options);
        } catch (error) {
            if (attempt < this.requestConfig.retryAttempts) {
                const delay = this.requestConfig.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
                console.warn(`Request failed (attempt ${attempt}), retrying in ${delay}ms:`, error.message);
                
                await this.sleep(delay);
                return this.makeRawRequestWithRetry(url, options, attempt + 1);
            }
            throw error;
        }
    }

    /**
     * Queue request for later execution
     */
    async queueRequest(provider, endpoint, options) {
        return new Promise((resolve, reject) => {
            this.requestQueue[provider].push({
                endpoint,
                options,
                resolve,
                reject,
                timestamp: Date.now()
            });
        });
    }

    /**
     * Process queued requests
     */
    async processQueue(provider) {
        if (this.requestQueue[provider].length > 0 && this.activeRequests[provider] < this.requestConfig.maxConcurrentRequests) {
            const queuedRequest = this.requestQueue[provider].shift();
            
            try {
                const result = await this.makeApiRequest(provider, queuedRequest.endpoint, queuedRequest.options);
                queuedRequest.resolve(result);
            } catch (error) {
                queuedRequest.reject(error);
            }
        }
    }

    /**
     * Search components across providers
     */
    async searchComponents(keyword, options = {}) {
        const {
            provider = 'both',
            limit = 50,
            cache = true,
            cacheTtl = 15 * 60 * 1000 // 15 minutes
        } = options;

        const results = {
            digikey: null,
            mouser: null,
            combined: [],
            metadata: {
                searchTerm: keyword,
                timestamp: Date.now(),
                sources: []
            }
        };

        // Search Digikey
        if ((provider === 'both' || provider === 'digikey') && this.status.digikey === 'active') {
            try {
                const cacheKey = `search_digikey_${keyword}_${limit}`;
                let digikeyData;
                
                if (cache) {
                    digikeyData = this.getFromCache(cacheKey);
                }
                
                if (!digikeyData) {
                    digikeyData = await this.searchDigikey(keyword, limit);
                    if (cache) {
                        this.cacheResponse('digikey', 'search', { keyword, limit }, digikeyData, cacheTtl);
                    }
                }
                
                results.digikey = digikeyData;
                results.metadata.sources.push('digikey');
                
                if (digikeyData && digikeyData.Products) {
                    results.combined.push(...this.normalizeDigikeyProducts(digikeyData.Products));
                }
            } catch (error) {
                console.error('Digikey search failed:', error);
                this.logError('digikey', error, `search: ${keyword}`);
            }
        }

        // Search Mouser
        if ((provider === 'both' || provider === 'mouser') && this.status.mouser === 'active') {
            try {
                const cacheKey = `search_mouser_${keyword}_${limit}`;
                let mouserData;
                
                if (cache) {
                    mouserData = this.getFromCache(cacheKey);
                }
                
                if (!mouserData) {
                    mouserData = await this.searchMouser(keyword, limit);
                    if (cache) {
                        this.cacheResponse('mouser', 'search', { keyword, limit }, mouserData, cacheTtl);
                    }
                }
                
                results.mouser = mouserData;
                results.metadata.sources.push('mouser');
                
                if (mouserData && mouserData.SearchResults && mouserData.SearchResults.Parts) {
                    results.combined.push(...this.normalizeMouserProducts(mouserData.SearchResults.Parts));
                }
            } catch (error) {
                console.error('Mouser search failed:', error);
                this.logError('mouser', error, `search: ${keyword}`);
            }
        }

        return results;
    }

    /**
     * Search Digikey products
     */
    async searchDigikey(keyword, limit = 50) {
        const searchData = {
            Keywords: keyword,
            RecordCount: Math.min(limit, 500), // Digikey max
            RecordStartPosition: 0,
            Sort: {
                Option: "SortByUnitPrice",
                Direction: "Ascending"
            },
            RequestedQuantity: 1
        };

        return await this.makeDigikeyRequest('/Search/v3/Products/Keyword', {
            method: 'POST',
            data: searchData,
            cache: true
        });
    }

    /**
     * Search Mouser products
     */
    async searchMouser(keyword, limit = 50) {
        const params = {
            keyword: keyword,
            records: Math.min(limit, 1000) // Mouser max
        };

        return await this.makeMouserRequest('/api/v1/search/keyword', {
            method: 'GET',
            params: params,
            cache: true
        });
    }

    /**
     * Normalize Digikey product data to common format
     */
    normalizeDigikeyProducts(products) {
        return products.map(product => ({
            provider: 'digikey',
            providerPartNumber: product.DigiKeyPartNumber,
            manufacturerPartNumber: product.ManufacturerPartNumber,
            manufacturer: product.Manufacturer?.Name || '',
            description: product.ProductDescription,
            datasheet: product.PrimaryDatasheet,
            unitPrice: parseFloat(product.UnitPrice) || 0,
            quantityAvailable: parseInt(product.QuantityAvailable) || 0,
            minimumOrderQuantity: parseInt(product.MinimumOrderQuantity) || 1,
            packaging: product.Packaging?.Name || '',
            series: product.Series?.Name || '',
            productUrl: product.ProductUrl,
            imageUrl: product.PrimaryPhoto,
            category: product.Category?.Name || '',
            family: product.Family?.Name || '',
            parameters: this.normalizeParameters(product.Parameters, 'digikey'),
            priceBreaks: this.normalizePriceBreaks(product.StandardPricing, 'digikey'),
            lastUpdated: Date.now()
        }));
    }

    /**
     * Normalize Mouser product data to common format
     */
    normalizeMouserProducts(products) {
        return products.map(product => ({
            provider: 'mouser',
            providerPartNumber: product.MouserPartNumber,
            manufacturerPartNumber: product.ManufacturerPartNumber,
            manufacturer: product.Manufacturer,
            description: product.Description,
            datasheet: product.DataSheetUrl,
            unitPrice: this.parseMouserPrice(product.PriceBreaks),
            quantityAvailable: parseInt(product.AvailabilityInStock) || 0,
            minimumOrderQuantity: parseInt(product.Min) || 1,
            packaging: product.ProductCompliance || '',
            series: '',
            productUrl: product.ProductDetailUrl,
            imageUrl: product.ImagePath,
            category: product.Category || '',
            family: product.ProductCompliance || '',
            parameters: this.normalizeParameters(product.ProductAttributes, 'mouser'),
            priceBreaks: this.normalizePriceBreaks(product.PriceBreaks, 'mouser'),
            lastUpdated: Date.now()
        }));
    }

    /**
     * Normalize product parameters
     */
    normalizeParameters(parameters, provider) {
        if (!parameters || !Array.isArray(parameters)) return {};
        
        const normalized = {};
        
        parameters.forEach(param => {
            if (provider === 'digikey') {
                normalized[param.Parameter] = {
                    value: param.Value,
                    unit: param.ValueId || ''
                };
            } else if (provider === 'mouser') {
                normalized[param.AttributeName] = {
                    value: param.AttributeValue,
                    unit: param.AttributeUnit || ''
                };
            }
        });
        
        return normalized;
    }

    /**
     * Normalize price breaks
     */
    normalizePriceBreaks(priceBreaks, provider) {
        if (!priceBreaks || !Array.isArray(priceBreaks)) return [];
        
        return priceBreaks.map(priceBreak => {
            if (provider === 'digikey') {
                return {
                    quantity: parseInt(priceBreak.BreakQuantity) || 0,
                    unitPrice: parseFloat(priceBreak.UnitPrice) || 0,
                    totalPrice: parseFloat(priceBreak.TotalPrice) || 0
                };
            } else if (provider === 'mouser') {
                return {
                    quantity: parseInt(priceBreak.Quantity) || 0,
                    unitPrice: parseFloat(priceBreak.Price?.replace('$', '')) || 0,
                    totalPrice: 0 // Calculate if needed
                };
            }
        }).filter(pb => pb.quantity > 0);
    }

    /**
     * Parse Mouser price from price breaks
     */
    parseMouserPrice(priceBreaks) {
        if (!priceBreaks || !Array.isArray(priceBreaks) || priceBreaks.length === 0) {
            return 0;
        }
        
        const firstPrice = priceBreaks[0].Price;
        return parseFloat(firstPrice?.replace('$', '')) || 0;
    }

    /**
     * Cache API response
     */
    cacheResponse(provider, endpoint, params, data, ttl = 15 * 60 * 1000) {
        if (!window.storage) return;
        
        const cacheKey = this.generateCacheKey(provider, endpoint, params);
        window.storage.saveToCache(cacheKey, data, ttl);
    }

    /**
     * Get cached response
     */
    getFromCache(cacheKey) {
        if (!window.storage) return null;
        return window.storage.getFromCache(cacheKey);
    }

    /**
     * Generate cache key
     */
    generateCacheKey(provider, endpoint, params = {}) {
        const paramString = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');
        
        return `${provider}_${endpoint.replace(/\//g, '_')}_${paramString}`;
    }

    /**
     * Rate limiting check
     */
    isRateLimited(provider) {
        const limits = this.rateLimits[provider];
        return limits.currentMinute >= limits.requestsPerMinute || 
               limits.currentDay >= limits.requestsPerDay;
    }

    /**
     * Update rate limit counters
     */
    updateRateLimit(provider) {
        const now = Date.now();
        const limits = this.rateLimits[provider];
        
        // Initialize reset times if not set
        if (!limits.minuteReset) {
            limits.minuteReset = now + 60000; // 1 minute from now
        }
        if (!limits.dayReset) {
            limits.dayReset = now + (24 * 60 * 60 * 1000); // 24 hours from now
        }
        
        limits.currentMinute++;
        limits.currentDay++;
    }

    /**
     * Reset minute rate limits
     */
    resetMinuteRateLimits() {
        Object.values(this.rateLimits).forEach(limits => {
            limits.currentMinute = 0;
            limits.minuteReset = Date.now() + 60000;
        });
    }

    /**
     * Reset daily rate limits
     */
    resetDayRateLimits() {
        Object.values(this.rateLimits).forEach(limits => {
            limits.currentDay = 0;
            limits.dayReset = Date.now() + (24 * 60 * 60 * 1000);
        });
    }

    /**
     * Set API status with event emission
     */
    setStatus(provider, status) {
        const oldStatus = this.status[provider];
        this.status[provider] = status;
        
        // Update storage
        if (window.storage) {
            window.storage.setApiStatus(provider, status);
        }
        
        // Emit status change event
        if (window.eventBus) {
            window.eventBus.emit('api-status-changed', { 
                provider, 
                status, 
                oldStatus, 
                timestamp: Date.now() 
            });
        }
        
        console.log(`API Status: ${provider} -> ${status}`);
    }

    /**
     * Get current API status
     */
    getStatus(provider = null) {
        if (provider) {
            return {
                status: this.status[provider],
                metrics: this.metrics[provider],
                rateLimits: this.rateLimits[provider],
                errors: this.errorHistory[provider].slice(-5) // Last 5 errors
            };
        }
        
        return {
            digikey: this.getStatus('digikey'),
            mouser: this.getStatus('mouser')
        };
    }

    /**
     * Update performance metrics
     */
    updateMetrics(provider, startTime, success) {
        const metrics = this.metrics[provider];
        const responseTime = Date.now() - startTime;
        
        metrics.totalRequests++;
        metrics.lastRequestTime = Date.now();
        
        if (success) {
            metrics.successfulRequests++;
        } else {
            metrics.failedRequests++;
        }
        
        // Update average response time
        metrics.avgResponseTime = 
            (metrics.avgResponseTime * (metrics.totalRequests - 1) + responseTime) / metrics.totalRequests;
    }

    /**
     * Update performance metrics periodically
     */
    updatePerformanceMetrics() {
        // Save current metrics to storage for persistence
        if (window.storage) {
            window.storage.setItem('api_metrics', this.metrics);
        }
    }

    /**
     * Log API errors with context
     */
    logError(provider, error, context = '') {
        const errorEntry = {
            timestamp: Date.now(),
            error: error.message,
            stack: error.stack,
            context: context,
            userAgent: navigator.userAgent
        };
        
        this.errorHistory[provider].push(errorEntry);
        
        // Keep only last 100 errors per provider
        if (this.errorHistory[provider].length > 100) {
            this.errorHistory[provider] = this.errorHistory[provider].slice(-100);
        }
        
        console.error(`${provider} API Error:`, error);
    }

    /**
     * Clean up old error history
     */
    cleanupErrorHistory() {
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
        
        Object.keys(this.errorHistory).forEach(provider => {
            this.errorHistory[provider] = this.errorHistory[provider]
                .filter(error => error.timestamp > cutoffTime);
        });
    }

    /**
     * Utility function for sleeping/delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clear all authentication and reset
     */
    clearAuthentication() {
        this.tokens = { digikey: null, mouser: null };
        this.status = { digikey: 'inactive', mouser: 'inactive' };
        
        if (window.storage) {
            window.storage.removeItem('digikey_credentials');
            window.storage.removeItem('mouser_credentials');
            window.storage.removeItem('digikey_tokens');
        }
        
        console.log('API authentication cleared');
    }

    /**
     * Get comprehensive status for debugging
     */
    getDebugInfo() {
        return {
            version: this.version,
            status: this.status,
            tokens: {
                digikey: !!this.tokens.digikey,
                mouser: !!this.tokens.mouser
            },
            metrics: this.metrics,
            rateLimits: this.rateLimits,
            activeRequests: this.activeRequests,
            queueSizes: {
                digikey: this.requestQueue.digikey.length,
                mouser: this.requestQueue.mouser.length
            },
            errorCounts: {
                digikey: this.errorHistory.digikey.length,
                mouser: this.errorHistory.mouser.length
            },
            timestamp: Date.now()
        };
    }

    // Legacy compatibility methods
    async testDigikeyConnection() {
        return await this.testDigikeyConnection();
    }

    async testMouserConnection() {
        return await this.testMouserConnection();
    }

    getApiStatuses() {
        return {
            digikey: this.status.digikey,
            mouser: this.status.mouser
        };
    }
}

// Create and expose global instance
const apiManager = new ApiManager();
window.apiManager = apiManager;

// Legacy compatibility
window.ApiManager = ApiManager;

// Module export for modern environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiManager;
}

console.log('✓ K4LP API Manager v2.0.0 initialized');
