// API Manager Module
class ApiManager {
    constructor(controller) {
        this.controller = controller;
        this.credentialManager = null;
        this.requestQueue = new Map();
        this.rateLimits = {
            digikey: { requests: 0, resetTime: 0, limit: 1000 },
            mouser: { requests: 0, resetTime: 0, limit: 1000 }
        };
    }

    init() {
        this.credentialManager = this.controller.getModule('CredentialManager');
        this.controller.log('ApiManager initialized', 'info');
    }

    async fetchData(supplier, dataType, mpn, manufacturer) {
        try {
            switch (supplier.toLowerCase()) {
                case 'digikey':
                    return await this.fetchDigikeyData(dataType, mpn, manufacturer);
                case 'mouser':
                    return await this.fetchMouserData(dataType, mpn, manufacturer);
                default:
                    throw new Error(`Unsupported supplier: ${supplier}`);
            }
        } catch (error) {
            this.controller.log(`API fetch failed for ${supplier}/${dataType}: ${error.message}`, 'error');
            throw error;
        }
    }

    async fetchDigikeyData(dataType, mpn, manufacturer) {
        if (!this.credentialManager) {
            this.credentialManager = this.controller.getModule('CredentialManager');
        }

        // Ensure we have a valid token
        const token = await this.credentialManager.ensureDigikeyToken();
        const credentials = this.credentialManager.getCredentials().digikey;
        
        if (!credentials) {
            throw new Error('Digikey credentials not available');
        }

        // Check rate limits
        await this.checkRateLimit('digikey');

        try {
            // First try direct product lookup
            let productData = await this.digikeyProductDetails(mpn, credentials);
            
            // If direct lookup fails, try keyword search
            if (!productData) {
                const searchResults = await this.digikeyKeywordSearch(mpn, credentials);
                if (searchResults && searchResults.length > 0) {
                    productData = searchResults[0]; // Use first result
                }
            }

            if (!productData) {
                throw new Error('Product not found in Digikey');
            }

            // Extract specific data type
            return this.extractDigikeyData(productData, dataType);
        } catch (error) {
            throw new Error(`Digikey API error: ${error.message}`);
        }
    }

    async digikeyProductDetails(mpn, credentials) {
        const config = this.credentialManager.getDigikeyConfig(credentials.environment);
        const headers = this.credentialManager.getDigikeyHeaders();
        
        const url = `${config.baseUrl}/products/v4/search/${encodeURIComponent(mpn)}/productdetails`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        this.updateRateLimit('digikey', response);

        if (!response.ok) {
            if (response.status === 404) {
                return null; // Product not found
            }
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return data.Product || null;
    }

    async digikeyKeywordSearch(keyword, credentials) {
        const config = this.credentialManager.getDigikeyConfig(credentials.environment);
        const headers = this.credentialManager.getDigikeyHeaders();
        
        const url = `${config.baseUrl}/products/v4/search/keyword`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                Keywords: keyword,
                RecordCount: 10,
                RecordStartPosition: 0,
                Filters: {},
                Sort: { Option: "SortByManu", Direction: "Ascending", SortParameterId: 0 }
            })
        });

        this.updateRateLimit('digikey', response);

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return data.Products || [];
    }

    extractDigikeyData(product, dataType) {
        try {
            switch (dataType.toLowerCase()) {
                case 'unit price':
                    return this.extractDigikeyUnitPrice(product);
                case 'manufacturer':
                    return product.Manufacturer?.Name || '';
                case 'detailed description':
                    return product.Description?.DetailedDescription || product.Description?.ProductDescription || '';
                case 'datasheet':
                    return this.extractDigikeyDatasheet(product);
                case 'stock available':
                    return this.formatStock(product.QuantityAvailable || 0);
                case 'package / case':
                    return this.extractDigikeyParameter(product, ['Package', 'Case']);
                case 'htsus number':
                    return product.Classifications?.HtsusCode || '';
                case 'htsus stripped':
                    return this.cleanHTSUS(product.Classifications?.HtsusCode || '');
                default:
                    return '';
            }
        } catch (error) {
            this.controller.log(`Data extraction failed for ${dataType}: ${error.message}`, 'warning');
            return 'Error: ' + error.message;
        }
    }

    extractDigikeyUnitPrice(product) {
        try {
            if (product.StandardPricing && product.StandardPricing.length > 0) {
                // Find the lowest quantity tier price
                const pricing = product.StandardPricing
                    .filter(p => p.BreakQuantity && p.UnitPrice)
                    .sort((a, b) => a.BreakQuantity - b.BreakQuantity);
                
                if (pricing.length > 0) {
                    return this.formatCurrency(pricing[0].UnitPrice, 'USD');
                }
            }
            return '';
        } catch (error) {
            return '';
        }
    }

    extractDigikeyDatasheet(product) {
        try {
            return product.PrimaryDatasheet || 
                   product.DatasheetUrl || 
                   product.Datasheets?.[0]?.Url || 
                   product.DatasheetURL || 
                   '';
        } catch (error) {
            return '';
        }
    }

    extractDigikeyParameter(product, names) {
        try {
            if (!Array.isArray(product.Parameters)) return '';
            
            const param = product.Parameters.find(p => 
                p && p.ParameterText && names.some(n => 
                    p.ParameterText.toLowerCase().includes(n.toLowerCase())
                )
            );
            
            return param?.ValueText || '';
        } catch (error) {
            return '';
        }
    }

    async fetchMouserData(dataType, mpn, manufacturer) {
        if (!this.credentialManager) {
            this.credentialManager = this.controller.getModule('CredentialManager');
        }

        const apiKey = this.credentialManager.getMouserApiKey();
        
        // Check rate limits
        await this.checkRateLimit('mouser');

        try {
            const productData = await this.mouserPartSearch(mpn, apiKey);
            
            if (!productData) {
                throw new Error('Product not found in Mouser');
            }

            return this.extractMouserData(productData, dataType);
        } catch (error) {
            throw new Error(`Mouser API error: ${error.message}`);
        }
    }

    async mouserPartSearch(mpn, apiKey) {
        const url = `https://api.mouser.com/api/v1/search/partnumber?apiKey=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                SearchByPartRequest: {
                    mouserPartNumber: mpn,
                    partSearchOptions: 'string'
                }
            })
        });

        this.updateRateLimit('mouser', response);

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        // Check for API errors
        if (data.Errors && data.Errors.length > 0) {
            const errors = data.Errors.filter(e => !e.ErrorMessage.includes('No parts found'));
            if (errors.length > 0) {
                throw new Error(errors[0].ErrorMessage);
            }
        }

        // Return first part if found
        const parts = data.SearchResults?.Parts;
        return parts && parts.length > 0 ? parts[0] : null;
    }

    extractMouserData(product, dataType) {
        try {
            switch (dataType.toLowerCase()) {
                case 'unit price':
                    return this.extractMouserUnitPrice(product);
                case 'manufacturer':
                    return product.Manufacturer || '';
                case 'detailed description':
                    return product.Description || '';
                case 'datasheet':
                    return product.DataSheetUrl || '';
                case 'stock available':
                    return this.formatStock(product.AvailabilityInStock || 0);
                case 'htsus number':
                    return product.HtsusCode || '';
                case 'htsus stripped':
                    return this.cleanHTSUS(product.HtsusCode || '');
                default:
                    return '';
            }
        } catch (error) {
            this.controller.log(`Data extraction failed for ${dataType}: ${error.message}`, 'warning');
            return 'Error: ' + error.message;
        }
    }

    extractMouserUnitPrice(product) {
        try {
            if (product.PriceBreaks && product.PriceBreaks.length > 0) {
                // Find the lowest quantity tier price
                const pricing = product.PriceBreaks
                    .filter(p => p.Quantity && p.Price)
                    .sort((a, b) => parseFloat(a.Quantity) - parseFloat(b.Quantity));
                
                if (pricing.length > 0) {
                    // Extract numeric value from price string
                    const priceStr = pricing[0].Price.replace(/[^\d.]/g, '');
                    return this.formatCurrency(priceStr, pricing[0].Currency || 'USD');
                }
            }
            return '';
        } catch (error) {
            return '';
        }
    }

    // Rate limiting functions
    async checkRateLimit(supplier) {
        const limit = this.rateLimits[supplier];
        const now = Date.now();
        
        // Reset counter if time window passed
        if (now > limit.resetTime) {
            limit.requests = 0;
            limit.resetTime = now + (60 * 1000); // Reset every minute
        }
        
        // Check if we're at the limit
        if (limit.requests >= limit.limit) {
            const waitTime = limit.resetTime - now;
            if (waitTime > 0) {
                this.controller.log(`Rate limit reached for ${supplier}, waiting ${Math.ceil(waitTime/1000)}s`, 'warning');
                await this.delay(waitTime);
                limit.requests = 0;
                limit.resetTime = Date.now() + (60 * 1000);
            }
        }
        
        limit.requests++;
    }

    updateRateLimit(supplier, response) {
        // Update rate limit info from response headers if available
        const remaining = response.headers.get('X-RateLimit-Remaining');
        const reset = response.headers.get('X-RateLimit-Reset');
        
        if (remaining !== null) {
            this.rateLimits[supplier].requests = this.rateLimits[supplier].limit - parseInt(remaining);
        }
        
        if (reset !== null) {
            this.rateLimits[supplier].resetTime = parseInt(reset) * 1000; // Convert to milliseconds
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Utility functions
    cleanHTSUS(code) {
        if (!code) return '';
        const digits = String(code).replace(/\D/g, '');
        return digits.slice(0, 8);
    }

    formatCurrency(value, currency = 'USD') {
        if (!value || isNaN(value)) return '';
        
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        }).format(parseFloat(value));
    }

    formatStock(value) {
        if (!value || isNaN(value)) return '0';
        
        return new Intl.NumberFormat('en-US').format(parseInt(value));
    }

    // Get available data types for each supplier
    getAvailableDataTypes() {
        return {
            digikey: [
                'Unit Price',
                'Manufacturer', 
                'Detailed Description',
                'Datasheet',
                'Stock Available',
                'Package / Case',
                'HTSUS Number',
                'HTSUS Stripped'
            ],
            mouser: [
                'Unit Price',
                'Manufacturer',
                'Detailed Description', 
                'Datasheet',
                'Stock Available',
                'HTSUS Number',
                'HTSUS Stripped'
            ]
        };
    }

    // Validate API configuration
    validateConfiguration() {
        const errors = [];
        
        if (!this.credentialManager) {
            errors.push('Credential manager not available');
            return errors;
        }
        
        const credentials = this.credentialManager.getCredentials();
        const status = this.credentialManager.getApiStatus();
        
        if (!credentials.digikey && !credentials.mouser) {
            errors.push('No API credentials configured');
        }
        
        if (credentials.digikey && !status.digikey.active) {
            errors.push('Digikey credentials not authenticated');
        }
        
        if (credentials.mouser && !status.mouser.active) {
            errors.push('Mouser credentials not validated');
        }
        
        return errors;
    }

    // Get rate limit status
    getRateLimitStatus() {
        return { ...this.rateLimits };
    }
}

// Export to global scope
if (typeof window !== 'undefined') {
    window.ApiManager = ApiManager;
}