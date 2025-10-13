/**
 * Clean API Manager - Digikey & Mouser API Integration
 * Single responsibility: API authentication and requests ONLY
 * No false status flags, proper credential validation
 */

class ApiManager {
    constructor() {
        this.endpoints = {
            digikey: {
                base: 'https://api.digikey.com',
                auth: 'https://api.digikey.com/v1/oauth2/token'
            },
            mouser: {
                base: 'https://api.mouser.com'
            }
        };

        this.tokens = {
            digikey: null,
            mouser: null
        };

        this.status = {
            digikey: 'inactive',
            mouser: 'inactive'
        };
    }

    /**
     * Test Digikey connection with ACTUAL API call
     * @param {string} clientId - Digikey Client ID
     * @param {string} clientSecret - Digikey Client Secret
     * @returns {Promise<boolean>} Real connection status
     */
    async testDigikeyConnection(clientId, clientSecret) {
        if (!clientId || !clientSecret) {
            this.setStatus('digikey', 'inactive');
            return false;
        }

        try {
            this.setStatus('digikey', 'connecting');
            
            const authSuccess = await this.authenticateDigikey(clientId, clientSecret);
            if (!authSuccess) {
                this.setStatus('digikey', 'error');
                return false;
            }

            // Test with real API call
            const testResult = await this.makeDigikeyRequest('/products/v4/search/manufacturerPart');
            
            if (testResult) {
                this.setStatus('digikey', 'active');
                return true;
            } else {
                this.setStatus('digikey', 'error');
                return false;
            }
        } catch (error) {
            console.error('Digikey test failed:', error);
            this.setStatus('digikey', 'error');
            return false;
        }
    }

    /**
     * Test Mouser connection with ACTUAL API call
     * @param {string} apiKey - Mouser API Key
     * @returns {Promise<boolean>} Real connection status
     */
    async testMouserConnection(apiKey) {
        if (!apiKey) {
            this.setStatus('mouser', 'inactive');
            return false;
        }

        try {
            this.setStatus('mouser', 'connecting');
            
            // Test with real API call
            const testResult = await this.makeMouserRequest('/api/v1/search/manufacturerlist', {
                params: { apiKey }
            });
            
            if (testResult && testResult.ManufacturerList) {
                this.setStatus('mouser', 'active');
                return true;
            } else {
                this.setStatus('mouser', 'error');
                return false;
            }
        } catch (error) {
            console.error('Mouser test failed:', error);
            this.setStatus('mouser', 'error');
            return false;
        }
    }

    /**
     * Authenticate with Digikey OAuth2
     * @param {string} clientId - Client ID
     * @param {string} clientSecret - Client Secret
     * @returns {Promise<boolean>} Auth success
     */
    async authenticateDigikey(clientId, clientSecret) {
        try {
            const response = await fetch(this.endpoints.digikey.auth, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({
                    'client_id': clientId,
                    'client_secret': clientSecret,
                    'grant_type': 'client_credentials'
                })
            });

            if (!response.ok) {
                throw new Error(`Auth failed: ${response.status}`);
            }

            const tokenData = await response.json();
            
            this.tokens.digikey = {
                access_token: tokenData.access_token,
                expires_at: Date.now() + ((tokenData.expires_in - 30) * 1000),
                clientId,
                clientSecret
            };

            return true;
        } catch (error) {
            console.error('Digikey auth failed:', error);
            return false;
        }
    }

    /**
     * Make authenticated Digikey API request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<Object|null>} API response
     */
    async makeDigikeyRequest(endpoint, options = {}) {
        const token = await this.getValidDigikeyToken();
        if (!token) {
            throw new Error('Digikey not authenticated');
        }

        const url = this.endpoints.digikey.base + endpoint;
        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                'Authorization': `Bearer ${token.access_token}`,
                'X-DIGIKEY-Client-Id': token.clientId,
                'Accept': 'application/json',
                ...options.headers
            }
        };

        if (options.data) {
            requestOptions.headers['Content-Type'] = 'application/json';
            requestOptions.body = JSON.stringify(options.data);
        }

        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Make Mouser API request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<Object|null>} API response
     */
    async makeMouserRequest(endpoint, options = {}) {
        const params = new URLSearchParams(options.params || {});
        const url = `${this.endpoints.mouser.base}${endpoint}?${params.toString()}`;
        
        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                'Accept': 'application/json',
                ...options.headers
            }
        };

        if (options.data) {
            requestOptions.headers['Content-Type'] = 'application/json';
            requestOptions.body = JSON.stringify(options.data);
        }

        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Get valid Digikey token (refresh if needed)
     * @returns {Promise<Object|null>} Valid token or null
     */
    async getValidDigikeyToken() {
        if (!this.tokens.digikey) {
            return null;
        }

        // Check if token expired
        if (Date.now() >= this.tokens.digikey.expires_at) {
            const { clientId, clientSecret } = this.tokens.digikey;
            const refreshed = await this.authenticateDigikey(clientId, clientSecret);
            if (!refreshed) {
                return null;
            }
        }

        return this.tokens.digikey;
    }

    /**
     * Set API status and emit event
     * @param {string} provider - 'digikey' or 'mouser'
     * @param {string} status - Status value
     */
    setStatus(provider, status) {
        this.status[provider] = status;
        
        // Emit status change event
        window.dispatchEvent(new CustomEvent('apiStatusChange', {
            detail: { provider, status }
        }));
    }

    /**
     * Get current status
     * @param {string} provider - Optional provider filter
     * @returns {Object|string} Status object or specific status
     */
    getStatus(provider = null) {
        return provider ? this.status[provider] : { ...this.status };
    }

    /**
     * Clear all authentication data
     */
    clearAuth() {
        this.tokens = { digikey: null, mouser: null };
        this.status = { digikey: 'inactive', mouser: 'inactive' };
    }
}

// Global instance
const apiManager = new ApiManager();
window.apiManager = apiManager;