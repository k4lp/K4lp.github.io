/**
 * Enhanced API Management for Digikey v4 and Mouser
 * Handles OAuth 2.0 authentication, requests, response processing, and caching
 * Part of K4LP Engineering Tools - Swiss Minimalist Design
 * @version 2.1.0 - Updated for Digikey API v4
 */

class ApiManager {
    constructor() {
        this.version = '2.1.0';
        
        // API Endpoints - Updated for Digikey v4
        this.endpoints = {
            digikey: {
                // Production endpoints
                base: 'https://api.digikey.com',
                auth: 'https://api.digikey.com/v1/oauth2/token',
                // Product Information V4 endpoints
                keywordSearch: '/products/v4/search/keyword',
                productDetails: '/products/v4/search/{partNumber}/productdetails',
                manufacturers: '/products/v4/manufacturers',
                categories: '/products/v4/categories',
                categoriesById: '/products/v4/categories/{categoryId}',
                digiReelPricing: '/products/v4/search/{partNumber}/digireepricing',
                recommendedProducts: '/products/v4/search/{partNumber}/recommendedproducts',
                substitutions: '/products/v4/search/{partNumber}/substitutions',
                associations: '/products/v4/search/{partNumber}/associations',
                packageTypeByQuantity: '/products/v4/search/{partNumber}/packagetypes/{quantity}',
                media: '/products/v4/search/{partNumber}/media',
                productPricing: '/products/v4/search/{partNumber}/productpricing',
                alternatePackaging: '/products/v4/search/{partNumber}/alternatepackaging',
                pricingOptionsByQuantity: '/products/v4/search/{partNumber}/pricingoptions/{quantity}',
                // Sandbox endpoints (for testing)
                sandboxBase: 'https://sandbox-api.digikey.com',
                sandboxAuth: 'https://sandbox-api.digikey.com/v1/oauth2/token'
            },
            mouser: {
                base: 'https://api.mouser.com',
                search: '/api/v1/search/keyword',
                product: '/api/v1/search/partnumber',
                categories: '/api/v1/search/manufacturerlist',
                priceAvailability: '/api/v1/search/priceandavailability'
            }
        };

        // Environment configuration
        this.environment = {
            useSandbox: false, // Set to true for testing with sandbox
            digikeyClientId: null,
            digikeyClientSecret: null,
            mouserApiKey: null
        };

        // Request configuration
        this.requestConfig = {
            timeout: 30000, // 30 seconds
            retryAttempts: 3,
            retryDelay: 1000, // 1 second base delay
            maxConcurrentRequests: 5
        };

        // Rate limiting (based on Digikey documentation)
        this.rateLimits = {
            digikey: {
                requestsPerSecond: 10,
                requestsPerMinute: 1000,
                requestsPerDay: 25000,
                currentSecond: 0,
                currentMinute: 0,
                currentDay: 0,
                secondReset: null,
                minuteReset: null,
                dayReset: null
            },
            mouser: {
                requestsPerSecond: 10,
                requestsPerMinute: 1000,
                requestsPerDay: 25000,
                currentSecond: 0,
                currentMinute: 0,
                currentDay: 0,
                secondReset: null,
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
            digikey: null, // Will store access_token, token_type, expires_in, expires_at
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
                lastRequestTime: null,
                tokenRefreshCount: 0
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
            
            console.log('✓ K4LP API Manager v2.1.0 (Digikey v4) initialized');
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
        // Check Digikey token validity (tokens expire in 10 minutes)
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
        // Reset rate limits every second
        setInterval(() => {
            this.resetSecondRateLimits();
        }, 1000);

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
     * Authenticate with Digikey API using OAuth 2.0 Client Credentials flow (2-legged)
     */
    async authenticateDigikey(clientId, clientSecret, updateStorage = true, useSandbox = null) {
        this.setStatus('digikey', 'connecting');
        
        // Use provided sandbox preference or default from config
        const sandbox = useSandbox !== null ? useSandbox : this.environment.useSandbox;
        const authEndpoint = sandbox ? this.endpoints.digikey.sandboxAuth : this.endpoints.digikey.auth;
        
        try {
            // Prepare request data for OAuth 2.0 Client Credentials flow
            const requestBody = new URLSearchParams({
                'client_id': clientId,
                'client_secret': clientSecret,
                'grant_type': 'client_credentials'
            });
            
            const response = await this.makeRawRequest(authEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: requestBody.toString()
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Digikey authentication failed: ${response.status} - ${errorText}`);
            }

            const tokenData = await response.json();
            
            this.tokens.digikey = {
                access_token: tokenData.access_token,
                token_type: tokenData.token_type || 'Bearer',
                expires_in: tokenData.expires_in, // Usually 600 seconds (10 minutes)
                expires_at: Date.now() + (tokenData.expires_in * 1000),
                client_id: clientId,
                sandbox: sandbox,
                obtained_at: Date.now()
            };

            // Store environment configuration
            this.environment.digikeyClientId = clientId;
            this.environment.digikeyClientSecret = clientSecret;
            this.environment.useSandbox = sandbox;

            // Save credentials and tokens to storage
            if (updateStorage && window.storage) {
                window.storage.saveDigikeyCredentials(clientId, clientSecret);
                window.storage.setItem('digikey_tokens', this.tokens.digikey);
                window.storage.setItem('digikey_environment', { useSandbox: sandbox });
            }

            this.setStatus('digikey', 'active');
            this.metrics.digikey.tokenRefreshCount++;
            
            const envLabel = sandbox ? 'Sandbox' : 'Production';
            console.log(`✓ Digikey ${envLabel} authentication successful (expires in ${tokenData.expires_in}s)`);
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

        this.environment.mouserApiKey = apiKey;

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
            
            // Simple test request to manufacturers endpoint
            const response = await this.makeDigikeyRequest('/products/v4/manufacturers', {
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

        // Check if Digikey token needs refresh
        if (provider === 'digikey' && this.tokens.digikey.expires_at <= Date.now()) {
            console.log('Digikey token expired, refreshing...');
            const success = await this.authenticateDigikey(
                this.environment.digikeyClientId,
                this.environment.digikeyClientSecret,
                true,
                this.environment.useSandbox
            );
            if (!success) {
                throw new Error('Failed to refresh Digikey token');
            }
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
        let baseUrl;
        
        if (provider === 'digikey') {
            baseUrl = this.environment.useSandbox ? 
                this.endpoints.digikey.sandboxBase : 
                this.endpoints.digikey.base;
        } else {
            baseUrl = this.endpoints[provider].base;
        }
        
        let url = baseUrl + endpoint;
        
        // Replace URL parameters (e.g., {partNumber})
        Object.entries(params).forEach(([key, value]) => {
            url = url.replace(`{${key}}`, encodeURIComponent(value));
        });
        
        // Add query parameters for Mouser (includes API key)
        if (provider === 'mouser') {
            const urlParams = new URLSearchParams({
                apiKey: this.tokens.mouser.api_key,
                ...params
            });
            url += '?' + urlParams.toString();
        } else if (provider === 'digikey') {
            // For Digikey, add query parameters if any (excluding URL path params)
            const queryParams = {};
            Object.entries(params).forEach(([key, value]) => {
                if (!url.includes(`{${key}}`)) {
                    queryParams[key] = value;
                }
            });
            
            if (Object.keys(queryParams).length > 0) {
                const urlParams = new URLSearchParams(queryParams);
                url += '?' + urlParams.toString();
            }
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
                'Accept': 'application/json',
                'User-Agent': 'K4LP-Engineering-Tools/2.1.0',
                ...options.headers
            }
        };

        // Add authentication headers
        if (provider === 'digikey') {
            requestOptions.headers['Authorization'] = `${this.tokens.digikey.token_type} ${this.tokens.digikey.access_token}`;
            requestOptions.headers['X-DIGIKEY-Client-Id'] = this.tokens.digikey.client_id;
            
            // Add required Digikey locale headers
            requestOptions.headers['X-DIGIKEY-Locale-Site'] = options.localeSite || 'US';
            requestOptions.headers['X-DIGIKEY-Locale-Language'] = options.localeLanguage || 'en';
            requestOptions.headers['X-DIGIKEY-Locale-Currency'] = options.localeCurrency || 'USD';
            requestOptions.headers['X-DIGIKEY-Customer-Id'] = options.customerId || '0';
        }

        // Add request body for POST/PUT requests
        if (options.data && ['POST', 'PUT', 'PATCH'].includes(requestOptions.method)) {
            requestOptions.headers['Content-Type'] = 'application/json';
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
     * Search components using Digikey v4 KeywordSearch
     */
    async searchDigikeyKeyword(keyword, options = {}) {
        const searchData = {
            Keywords: keyword,
            RecordCount: Math.min(options.limit || 50, 500), // Digikey max is 500
            RecordStartPosition: options.offset || 0,
            Sort: {
                Option: options.sortBy || "SortByUnitPrice",
                Direction: options.sortDirection || "Ascending"
            },
            RequestedQuantity: options.quantity || 1,
            SearchOptions: options.searchOptions || [],
            ExcludeMarketPlaceProducts: options.excludeMarketplace || false
        };

        // Add filters if provided
        if (options.filters) {
            searchData.Filters = options.filters;
        }

        return await this.makeDigikeyRequest('/products/v4/search/keyword', {
            method: 'POST',
            data: searchData,
            cache: options.cache !== false,
            cacheTtl: options.cacheTtl
        });
    }

    /**
     * Get product details using Digikey v4 ProductDetails
     */
    async getDigikeyProductDetails(partNumber, options = {}) {
        const endpoint = `/products/v4/search/${encodeURIComponent(partNumber)}/productdetails`;
        
        return await this.makeDigikeyRequest(endpoint, {
            method: 'GET',
            params: {
                includes: options.includes || 'All' // All, None, or specific includes
            },
            cache: options.cache !== false,
            cacheTtl: options.cacheTtl
        });
    }

    /**
     * Search components across providers with enhanced Digikey v4 support
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
                sources: [],
                apiVersions: {}
            }
        };

        // Search Digikey v4
        if ((provider === 'both' || provider === 'digikey') && this.status.digikey === 'active') {
            try {
                const cacheKey = `search_digikey_v4_${keyword}_${limit}`;
                let digikeyData;
                
                if (cache) {
                    digikeyData = this.getFromCache(cacheKey);
                }
                
                if (!digikeyData) {
                    digikeyData = await this.searchDigikeyKeyword(keyword, { limit, ...options });
                    if (cache) {
                        this.cacheResponse('digikey', 'keywordSearch', { keyword, limit }, digikeyData, cacheTtl);
                    }
                }
                
                results.digikey = digikeyData;
                results.metadata.sources.push('digikey');
                results.metadata.apiVersions.digikey = 'v4';
                
                if (digikeyData && digikeyData.Products) {
                    results.combined.push(...this.normalizeDigikeyProducts(digikeyData.Products));
                }
            } catch (error) {
                console.error('Digikey v4 search failed:', error);
                this.logError('digikey', error, `keywordSearch: ${keyword}`);
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
                results.metadata.apiVersions.mouser = 'v1';
                
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
     * Search Mouser products (unchanged)
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
     * Normalize Digikey v4 product data to common format
     */
    normalizeDigikeyProducts(products) {
        return products.map(product => ({
            provider: 'digikey',
            apiVersion: 'v4',
            providerPartNumber: product.DigiKeyPartNumber,
            manufacturerPartNumber: product.ManufacturerPartNumber,
            manufacturer: product.Manufacturer?.Name || product.Manufacturer?.Id || '',
            description: product.ProductDescription,
            detailedDescription: product.DetailedDescription,
            datasheet: product.PrimaryDatasheet,
            unitPrice: parseFloat(product.UnitPrice) || 0,
            quantityAvailable: parseInt(product.QuantityAvailable) || 0,
            minimumOrderQuantity: parseInt(product.MinimumOrderQuantity) || 1,
            packaging: product.Packaging?.Name || '',
            series: product.Series?.Name || '',
            productUrl: product.ProductUrl,
            imageUrl: product.PrimaryPhoto,
            thumbnailUrl: product.PrimaryPhotoThumbnail,
            category: product.Category?.Name || '',
            family: product.Family?.Name || '',
            productStatus: product.ProductStatus?.Name || '',
            rohs: product.RohsInfo || '',
            leadStatus: product.LeadStatus || '',
            partStatus: product.PartStatus || '',
            parameters: this.normalizeParameters(product.Parameters, 'digikey'),
            priceBreaks: this.normalizePriceBreaks(product.StandardPricing, 'digikey'),
            myPricing: this.normalizePriceBreaks(product.MyPricing, 'digikey'),
            alternatePackaging: product.AlternatePackaging || [],
            tariffActive: product.TariffActive || false,
            lastUpdated: Date.now()
        }));
    }

    /**
     * Normalize Mouser product data to common format (unchanged)
     */
    normalizeMouserProducts(products) {
        return products.map(product => ({
            provider: 'mouser',
            apiVersion: 'v1',
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
        return limits.currentSecond >= limits.requestsPerSecond ||
               limits.currentMinute >= limits.requestsPerMinute || 
               limits.currentDay >= limits.requestsPerDay;
    }

    /**
     * Update rate limit counters
     */
    updateRateLimit(provider) {
        const now = Date.now();
        const limits = this.rateLimits[provider];
        
        // Initialize reset times if not set
        if (!limits.secondReset) {
            limits.secondReset = now + 1000; // 1 second from now
        }
        if (!limits.minuteReset) {
            limits.minuteReset = now + 60000; // 1 minute from now
        }
        if (!limits.dayReset) {
            limits.dayReset = now + (24 * 60 * 60 * 1000); // 24 hours from now
        }
        
        limits.currentSecond++;
        limits.currentMinute++;
        limits.currentDay++;
    }

    /**
     * Reset second rate limits
     */
    resetSecondRateLimits() {
        Object.values(this.rateLimits).forEach(limits => {
            limits.currentSecond = 0;
            limits.secondReset = Date.now() + 1000;
        });
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
                errors: this.errorHistory[provider].slice(-5), // Last 5 errors
                token: this.tokens[provider] ? {
                    expires_at: this.tokens[provider].expires_at,
                    expires_in: Math.max(0, Math.floor((this.tokens[provider].expires_at - Date.now()) / 1000)),
                    sandbox: this.tokens[provider].sandbox
                } : null
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
     * Switch between sandbox and production environments
     */
    setSandboxMode(enabled) {
        this.environment.useSandbox = enabled;
        
        // Clear existing token as it's environment-specific
        if (this.tokens.digikey) {
            this.tokens.digikey = null;
            this.setStatus('digikey', 'inactive');
        }
        
        if (window.storage) {
            window.storage.setItem('digikey_environment', { useSandbox: enabled });
        }
        
        const envLabel = enabled ? 'Sandbox' : 'Production';
        console.log(`Switched to Digikey ${envLabel} environment`);
        
        // Re-authenticate if credentials are available
        if (this.environment.digikeyClientId && this.environment.digikeyClientSecret) {
            this.authenticateDigikey(
                this.environment.digikeyClientId, 
                this.environment.digikeyClientSecret, 
                true, 
                enabled
            );
        }
    }

    /**
     * Get comprehensive status for debugging
     */
    getDebugInfo() {
        return {
            version: this.version,
            status: this.status,
            environment: this.environment,
            tokens: {
                digikey: !!this.tokens.digikey,
                mouser: !!this.tokens.mouser
            },
            tokenExpiry: {
                digikey: this.tokens.digikey ? new Date(this.tokens.digikey.expires_at) : null,
                mouser: null
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

console.log('✓ K4LP API Manager v2.1.0 (Digikey API v4) initialized');
