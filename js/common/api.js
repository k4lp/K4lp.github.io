/**
 * Clean API Manager - Core Digikey & Mouser API Integration
 * Single-responsibility module focused on API authentication and requests
 * Part of K4LP Engineering Tools - Swiss Minimalist Design
 */

class ApiManager {
    constructor() {
        this.endpoints = {
            digikey: {
                base: 'https://api.digikey.com',
                auth: 'https://api.digikey.com/v1/oauth2/token',
                sandbox: 'https://sandbox-api.digikey.com'
            },
            mouser: {
                base: 'https://api.mouser.com'
            }
        };

        this.status = {
            digikey: 'inactive',
            mouser: 'inactive'
        };

        this.tokens = {
            digikey: null,
            mouser: null
        };

        this.credentials = {
            digikey: { clientId: null, clientSecret: null },
            mouser: { apiKey: null }
        };
    }

    /**
     * Test Digikey connection with credentials
     * @param {string} clientId - Digikey Client ID
     * @param {string} clientSecret - Digikey Client Secret
     * @returns {Promise<boolean>} Connection status
     */
    async testDigikeyConnection(clientId, clientSecret) {
        try {
            this.setStatus('digikey', 'connecting');
            
            const authSuccess = await this.authenticateDigikey(clientId, clientSecret);
            if (!authSuccess) {
                this.setStatus('digikey', 'error');
                return false;
            }

            // Test with simple API call
            const response = await this.makeDigikeyRequest('/products/v4/manufacturers');
            
            if (response) {
                this.setStatus('digikey', 'active');
                return true;
            } else {
                this.setStatus('digikey', 'error');
                return false;
            }
        } catch (error) {
            console.error('Digikey connection test failed:', error);
            this.setStatus('digikey', 'error');
            return false;
        }
    }

    /**
     * Test Mouser connection with API key
     * @param {string} apiKey - Mouser API Key
     * @returns {Promise<boolean>} Connection status
     */
    async testMouserConnection(apiKey) {
        try {
            this.setStatus('mouser', 'connecting');
            this.credentials.mouser.apiKey = apiKey;
            
            const response = await this.makeMouserRequest('/api/v1/search/manufacturerlist');
            
            if (response) {
                this.setStatus('mouser', 'active');
                return true;
            } else {
                this.setStatus('mouser', 'error');
                return false;
            }
        } catch (error) {
            console.error('Mouser connection test failed:', error);
            this.setStatus('mouser', 'error');
            return false;
        }
    }

    /**
     * Authenticate with Digikey using OAuth 2.0 Client Credentials
     * @param {string} clientId - Digikey Client ID
     * @param {string} clientSecret - Digikey Client Secret
     * @returns {Promise<boolean>} Authentication success
     */
    async authenticateDigikey(clientId, clientSecret) {
        try {
            const requestBody = new URLSearchParams({
                'client_id': clientId,
                'client_secret': clientSecret,
                'grant_type': 'client_credentials'
            });

            const response = await fetch(this.endpoints.digikey.auth, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: requestBody.toString()
            });

            if (!response.ok) {
                throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
            }

            const tokenData = await response.json();
            
            this.tokens.digikey = {
                access_token: tokenData.access_token,
                token_type: tokenData.token_type || 'Bearer',
                expires_in: tokenData.expires_in,
                expires_at: Date.now() + ((tokenData.expires_in - 30) * 1000)
            };

            this.credentials.digikey = { clientId, clientSecret };
            return true;
            
        } catch (error) {
            console.error('Digikey authentication failed:', error);
            return false;
        }
    }

    /**
     * Get current Digikey token (refresh if needed)
     * @returns {Promise<string|null>} Access token
     */
    async getDigikeyToken() {
        if (!this.tokens.digikey) {
            return null;
        }

        // Check if token is expired
        if (Date.now() >= this.tokens.digikey.expires_at) {
            const { clientId, clientSecret } = this.credentials.digikey;
            if (clientId && clientSecret) {
                await this.authenticateDigikey(clientId, clientSecret);
            } else {
                return null;
            }
        }

        return this.tokens.digikey ? this.tokens.digikey.access_token : null;
    }

    /**
     * Make authenticated Digikey API request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<Object|null>} API response data
     */
    async makeDigikeyRequest(endpoint, options = {}) {
        const token = await this.getDigikeyToken();
        if (!token) {
            throw new Error('Digikey not authenticated');
        }

        const url = this.endpoints.digikey.base + endpoint;
        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-DIGIKEY-Client-Id': this.credentials.digikey.clientId,
                'Accept': 'application/json',
                'X-DIGIKEY-Locale-Site': 'US',
                'X-DIGIKEY-Locale-Language': 'en',
                'X-DIGIKEY-Locale-Currency': 'USD',
                ...options.headers
            }
        };

        if (options.data && ['POST', 'PUT', 'PATCH'].includes(requestOptions.method)) {
            requestOptions.headers['Content-Type'] = 'application/json';
            requestOptions.body = JSON.stringify(options.data);
        }

        try {
            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Digikey API request failed:', error);
            throw error;
        }
    }

    /**
     * Make Mouser API request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<Object|null>} API response data
     */
    async makeMouserRequest(endpoint, options = {}) {
        if (!this.credentials.mouser.apiKey) {
            throw new Error('Mouser not authenticated');
        }

        const params = new URLSearchParams({
            apiKey: this.credentials.mouser.apiKey,
            ...options.params
        });

        const url = `${this.endpoints.mouser.base}${endpoint}?${params.toString()}`;
        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                'Accept': 'application/json',
                ...options.headers
            }
        };

        if (options.data && ['POST', 'PUT', 'PATCH'].includes(requestOptions.method)) {
            requestOptions.headers['Content-Type'] = 'application/json';
            requestOptions.body = JSON.stringify(options.data);
        }

        try {
            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Mouser API request failed:', error);
            throw error;
        }
    }

    /**
     * Set API status and emit event
     * @param {string} provider - 'digikey' or 'mouser'
     * @param {string} status - 'inactive', 'connecting', 'active', 'error'
     */
    setStatus(provider, status) {
        this.status[provider] = status;
        
        // Update storage if available
        if (window.storage) {
            const apiKeys = window.storage.getApiKeys() || {};
            window.storage.saveUserData({ ...apiKeys, [`${provider}Status`]: status });
        }

        // Emit event if event system available
        if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('apiStatusChange', {
                detail: { provider, status }
            }));
        }

        console.log(`API Status: ${provider} -> ${status}`);
    }

    /**
     * Get current API status
     * @param {string} provider - Optional provider filter
     * @returns {Object} Status object
     */
    getStatus(provider = null) {
        if (provider) {
            return {
                status: this.status[provider],
                authenticated: provider === 'digikey' ? !!this.tokens.digikey : !!this.credentials.mouser.apiKey
            };
        }
        
        return {
            digikey: this.getStatus('digikey'),
            mouser: this.getStatus('mouser')
        };
    }

    /**
     * Clear all authentication
     */
    clearAuthentication() {
        this.tokens = { digikey: null, mouser: null };
        this.credentials = {
            digikey: { clientId: null, clientSecret: null },
            mouser: { apiKey: null }
        };
        this.status = { digikey: 'inactive', mouser: 'inactive' };
        
        console.log('API authentication cleared');
    }
}

// Create and export singleton instance
const apiManager = new ApiManager();
window.apiManager = apiManager;