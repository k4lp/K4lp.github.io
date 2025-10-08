/**
 * Excel API Processor - API Client
 * Alica Technologies
 */

window.ExcelProcessorApiClient = {
    /**
     * Fetch data from Digikey API
     * @param {string} mpn - Manufacturer Part Number
     * @param {string} manufacturer - Manufacturer name (optional)
     * @returns {Promise<Object>} - Processed API response
     */
    async fetchDigikeyData(mpn, manufacturer = '') {
        if (!window.ExcelProcessorCredentials.isDigikeyActive()) {
            throw new Error('Digikey credentials not configured or inactive');
        }

        const credentials = window.ExcelProcessorCredentials.getDigikeyCredentials();
        const config = credentials.environment === 'sandbox' ?
            window.ExcelProcessorConfig.DIGIKEY.SANDBOX :
            window.ExcelProcessorConfig.DIGIKEY.PRODUCTION;

        try {
            // Get access token
            const token = await window.ExcelProcessorCredentials.getDigikeyToken();

            // Try direct product lookup first
            let productData = null;
            try {
                productData = await this._digikeyProductDetails(config, token, credentials, mpn);
            } catch (error) {
                // If direct lookup fails, try keyword search
                if (!error.message.includes('404')) {
                    throw error; // Re-throw non-404 errors
                }
                productData = await this._digikeyKeywordSearch(config, token, credentials, mpn);
            }

            return this._processDigikeyResponse(productData);

        } catch (error) {
            window.ExcelProcessorUtils.log.error(`Digikey API error for ${mpn}:`, error.message);
            throw error;
        }
    },

    /**
     * Digikey product details API call
     */
    async _digikeyProductDetails(config, token, credentials, mpn) {
        const url = `${config.BASE_URL}/products/v4/search/${encodeURIComponent(mpn)}/productdetails`;
        const [site, currency] = credentials.locale.split('/');

        const response = await window.ExcelProcessorUtils.api.retryRequest(
            async () => {
                const res = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-DIGIKEY-Client-Id': credentials.clientId,
                        'Authorization': `Bearer ${token}`,
                        'X-DIGIKEY-Locale-Site': site,
                        'X-DIGIKEY-Locale-Language': 'en',
                        'X-DIGIKEY-Locale-Currency': currency
                    }
                });

                if (!res.ok) {
                    const errorText = await res.text().catch(() => 'Unknown error');
                    throw new Error(`HTTP ${res.status}: ${errorText}`);
                }

                return res.json();
            },
            window.ExcelProcessorConfig.DIGIKEY.MAX_RETRIES,
            window.ExcelProcessorConfig.DIGIKEY.RETRY_DELAY
        );

        if (!response?.Product) {
            throw new Error('No product data in response');
        }

        return response.Product;
    },

    /**
     * Digikey keyword search API call
     */
    async _digikeyKeywordSearch(config, token, credentials, mpn) {
        const url = `${config.BASE_URL}/products/v4/search/keyword`;
        const [site, currency] = credentials.locale.split('/');

        const response = await window.ExcelProcessorUtils.api.retryRequest(
            async () => {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-DIGIKEY-Client-Id': credentials.clientId,
                        'Authorization': `Bearer ${token}`,
                        'X-DIGIKEY-Locale-Site': site,
                        'X-DIGIKEY-Locale-Language': 'en',
                        'X-DIGIKEY-Locale-Currency': currency
                    },
                    body: JSON.stringify({
                        Keywords: mpn,
                        RecordCount: 20,
                        RecordStartPosition: 0,
                        Filters: {},
                        Sort: { Option: 'SortByManu', Direction: 'Ascending', SortParameterId: 0 }
                    })
                });

                if (!res.ok) {
                    const errorText = await res.text().catch(() => 'Unknown error');
                    throw new Error(`HTTP ${res.status}: ${errorText}`);
                }

                return res.json();
            },
            window.ExcelProcessorConfig.DIGIKEY.MAX_RETRIES,
            window.ExcelProcessorConfig.DIGIKEY.RETRY_DELAY
        );

        // Find best match
        const products = response?.Products || [];
        const exactMatches = response?.ExactMatches || [];

        let match = null;

        // Priority: Exact match > Direct MPN match > First result
        if (exactMatches.length > 0) {
            match = exactMatches[0];
        } else {
            match = products.find(p =>
                p.ManufacturerProductNumber?.toUpperCase() === mpn.toUpperCase()
            );
        }

        if (!match && products.length > 0) {
            match = products[0];
        }

        if (!match) {
            throw new Error('No matching products found');
        }

        return match;
    },

    /**
     * Process Digikey API response
     */
    _processDigikeyResponse(product) {
        if (!product) {
            throw new Error('Empty product data');
        }

        return {
            mpn: product.ManufacturerProductNumber || '',
            manufacturer: product.Manufacturer?.Name || '',
            description: product.Description?.ProductDescription || '',
            detailedDescription: product.Description?.DetailedDescription || '',
            unitPrice: this._extractDigikeyPrice(product.StandardPricing),
            stockAvailable: product.QuantityAvailable || 0,
            packageCase: this._extractParameter(product.Parameters, ['Package', 'Case']),
            datasheet: this._extractDatasheet(product),
            htsusNumber: product.Classifications?.HtsusCode || '',
            category: product.Category?.Name || ''
        };
    },

    /**
     * Extract price from Digikey pricing structure
     */
    _extractDigikeyPrice(pricing) {
        if (!pricing || !Array.isArray(pricing) || pricing.length === 0) {
            return '';
        }

        // Find the lowest quantity price break
        const sortedPricing = pricing.sort((a, b) => (a.BreakQuantity || 0) - (b.BreakQuantity || 0));
        const lowestBreak = sortedPricing[0];

        return lowestBreak?.UnitPrice || '';
    },

    /**
     * Fetch data from Mouser API
     * @param {string} mpn - Manufacturer Part Number
     * @param {string} manufacturer - Manufacturer name (optional)
     * @returns {Promise<Object>} - Processed API response
     */
    async fetchMouserData(mpn, manufacturer = '') {
        if (!window.ExcelProcessorCredentials.isMouserActive()) {
            throw new Error('Mouser credentials not configured');
        }

        const credentials = window.ExcelProcessorCredentials.getMouserCredentials();

        try {
            const productData = await this._mouserPartSearch(credentials, mpn, manufacturer);
            return this._processMouserResponse(productData);

        } catch (error) {
            window.ExcelProcessorUtils.log.error(`Mouser API error for ${mpn}:`, error.message);
            throw error;
        }
    },

    /**
     * Mouser part search API call
     */
    async _mouserPartSearch(credentials, mpn, manufacturer) {
        const baseUrl = window.ExcelProcessorConfig.MOUSER.BASE_URL;
        let url;

        // Try exact part number search first
        if (manufacturer && manufacturer.trim()) {
            url = `${baseUrl}/search/partnumber?apikey=${credentials.apiKey}&partnumber=${encodeURIComponent(mpn)}&manufacturerpartname=${encodeURIComponent(manufacturer)}`;
        } else {
            url = `${baseUrl}/search/partnumber?apikey=${credentials.apiKey}&partnumber=${encodeURIComponent(mpn)}`;
        }

        const response = await window.ExcelProcessorUtils.api.retryRequest(
            async () => {
                const res = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (!res.ok) {
                    const errorText = await res.text().catch(() => 'Unknown error');
                    throw new Error(`HTTP ${res.status}: ${errorText}`);
                }

                return res.json();
            },
            window.ExcelProcessorConfig.MOUSER.MAX_RETRIES,
            window.ExcelProcessorConfig.MOUSER.RETRY_DELAY
        );

        // Check if we got results
        const searchResults = response?.SearchResults;
        if (!searchResults || !searchResults.NumberOfResult || searchResults.NumberOfResult === 0) {
            // Try broader keyword search if no exact match
            return this._mouserKeywordSearch(credentials, mpn);
        }

        const parts = searchResults.Parts || [];
        if (parts.length === 0) {
            throw new Error('No parts found in search results');
        }

        // Return the first (best) match
        return parts[0];
    },

    /**
     * Mouser keyword search API call
     */
    async _mouserKeywordSearch(credentials, keyword) {
        const url = `${window.ExcelProcessorConfig.MOUSER.BASE_URL}/search/keyword?apikey=${credentials.apiKey}&keyword=${encodeURIComponent(keyword)}&records=20`;

        const response = await window.ExcelProcessorUtils.api.retryRequest(
            async () => {
                const res = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (!res.ok) {
                    const errorText = await res.text().catch(() => 'Unknown error');
                    throw new Error(`HTTP ${res.status}: ${errorText}`);
                }

                return res.json();
            },
            window.ExcelProcessorConfig.MOUSER.MAX_RETRIES,
            window.ExcelProcessorConfig.MOUSER.RETRY_DELAY
        );

        const searchResults = response?.SearchResults;
        if (!searchResults || !searchResults.NumberOfResult || searchResults.NumberOfResult === 0) {
            throw new Error('No products found');
        }

        const parts = searchResults.Parts || [];
        if (parts.length === 0) {
            throw new Error('No parts found in keyword search results');
        }

        // Find best match by MPN similarity
        const exactMatch = parts.find(p =>
            p.ManufacturerPartNumber?.toUpperCase() === keyword.toUpperCase()
        );

        return exactMatch || parts[0];
    },

    /**
     * Process Mouser API response
     */
    _processMouserResponse(part) {
        if (!part) {
            throw new Error('Empty part data');
        }

        return {
            mpn: part.ManufacturerPartNumber || '',
            manufacturer: part.Manufacturer || '',
            description: part.Description || '',
            detailedDescription: part.DetailedDescription || part.Description || '',
            unitPrice: this._extractMouserPrice(part.PriceBreaks),
            stockAvailable: part.AvailabilityInStock || 0,
            datasheet: part.DataSheetUrl || '',
            htsusNumber: '',  // Mouser doesn't typically provide HTSUS in standard API
            category: part.Category || ''
        };
    },

    /**
     * Extract price from Mouser pricing structure
     */
    _extractMouserPrice(priceBreaks) {
        if (!priceBreaks || !Array.isArray(priceBreaks) || priceBreaks.length === 0) {
            return '';
        }

        // Find the lowest quantity price break
        const sortedPricing = priceBreaks.sort((a, b) => (a.Quantity || 0) - (b.Quantity || 0));
        const lowestBreak = sortedPricing[0];

        // Extract numeric price from string like "$1.23"
        const priceStr = lowestBreak?.Price || '';
        const numericPrice = priceStr.replace(/[^\d.]/g, '');

        return numericPrice || priceStr;
    },

    /**
     * Extract parameter value from parameters array
     */
    _extractParameter(parameters, names) {
        if (!Array.isArray(parameters)) return '';

        const param = parameters.find(p =>
            p && p.ParameterText && names.some(name =>
                p.ParameterText.toLowerCase().includes(name.toLowerCase())
            )
        );

        return param?.ValueText || '';
    },

    /**
     * Extract datasheet URL from product data
     */
    _extractDatasheet(product) {
        return product.PrimaryDatasheet ||
               product.DatasheetUrl ||
               product.Datasheets?.[0]?.Url ||
               product.DatasheetURL ||
               '';
    },

    /**
     * Test API connectivity and credentials
     * @param {string} api - 'digikey' or 'mouser'
     * @returns {Promise<boolean>} - Test result
     */
    async testApiConnection(api) {
        try {
            if (api === 'digikey') {
                // Test with a simple, well-known MPN
                const testData = await this.fetchDigikeyData('LM358P');
                return !!testData;
            } else if (api === 'mouser') {
                // Test with a simple, well-known MPN
                const testData = await this.fetchMouserData('LM358P');
                return !!testData;
            }
            return false;
        } catch (error) {
            window.ExcelProcessorUtils.log.error(`${api} API test failed:`, error.message);
            return false;
        }
    },

    /**
     * Get API rate limit information (if available)
     * @param {string} api - 'digikey' or 'mouser'
     * @returns {Object} - Rate limit info
     */
    getRateLimitInfo(api) {
        // This would be populated from response headers in a real implementation
        // For now, return static limits based on known API constraints
        
        if (api === 'digikey') {
            return {
                limit: 1000, // requests per hour
                remaining: null, // would be populated from headers
                resetTime: null // would be populated from headers
            };
        } else if (api === 'mouser') {
            return {
                limit: 1000, // requests per day
                remaining: null,
                resetTime: null
            };
        }
        
        return { limit: 0, remaining: 0, resetTime: null };
    },

    /**
     * Batch process multiple MPNs
     * @param {Array} mpns - Array of {mpn, manufacturer} objects
     * @param {string} api - 'digikey' or 'mouser'
     * @param {Function} progressCallback - Progress callback function
     * @returns {Promise<Array>} - Array of results
     */
    async batchProcess(mpns, api, progressCallback = null) {
        const results = [];
        const fetchFunction = api === 'digikey' ? this.fetchDigikeyData : this.fetchMouserData;
        
        for (let i = 0; i < mpns.length; i++) {
            const { mpn, manufacturer } = mpns[i];
            
            try {
                const result = await fetchFunction.call(this, mpn, manufacturer);
                results.push({ success: true, data: result, mpn, manufacturer });
            } catch (error) {
                results.push({ success: false, error: error.message, mpn, manufacturer });
            }
            
            // Progress callback
            if (progressCallback) {
                progressCallback(i + 1, mpns.length, results[results.length - 1]);
            }
            
            // Rate limiting delay
            if (i < mpns.length - 1) {
                await window.ExcelProcessorUtils.api.sleep(window.ExcelProcessorConfig.PROCESSING.REQUEST_DELAY);
            }
        }
        
        return results;
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.ExcelProcessorApiClient;
}