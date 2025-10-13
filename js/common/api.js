/**
 * Robust API Manager - Production-ready Digikey & Mouser API Integration
 * Based on proven authentication patterns and error handling
 * Handles token refresh, retries, and proper credential validation
 */

class ApiManager {
    constructor() {
        this.config = {
            PRODUCTION: {
                BASE_URL: 'https://api.digikey.com',
                TOKEN_URL: 'https://api.digikey.com/v1/oauth2/token'
            },
            SANDBOX: {
                BASE_URL: 'https://sandbox-api.digikey.com', 
                TOKEN_URL: 'https://sandbox-api.digikey.com/v1/oauth2/token'
            },
            MOUSER: {
                BASE_URL: 'https://api.mouser.com'
            },
            TOKEN_BUFFER: 300000, // 5 minutes before expiry
            MAX_RETRIES: 3,
            RETRY_DELAY: 1000,
            AUTH_TIMEOUT: 15000 // 15 second timeout for auth requests
        };

        this.credentials = {
            digikey: {
                clientId: null,
                clientSecret: null,
                environment: 'production', // 'production' or 'sandbox'
                token: null,
                expiry: null,
                status: 'inactive'
            },
            mouser: {
                apiKey: null,
                status: 'inactive'
            }
        };

        this.isAuthenticating = {
            digikey: false,
            mouser: false
        };
    }

    /**
     * Test Digikey connection with comprehensive error handling
     * @param {string} clientId - Digikey Client ID
     * @param {string} clientSecret - Digikey Client Secret  
     * @param {string} environment - 'production' or 'sandbox'
     * @returns {Promise<boolean>} Real connection status
     */
    async testDigikeyConnection(clientId, clientSecret, environment = 'production') {
        if (!clientId || !clientSecret) {
            this.setStatus('digikey', 'inactive');
            return false;
        }

        // Validate environment parameter
        if (!['production', 'sandbox'].includes(environment)) {
            environment = 'production';
        }

        try {
            this.setStatus('digikey', 'connecting');
            
            // Store credentials for this test
            this.credentials.digikey = {
                clientId: clientId.trim(),
                clientSecret: clientSecret.trim(),
                environment,
                token: null,
                expiry: null,
                status: 'connecting'
            };

            const authSuccess = await this.authenticateDigikey();
            if (!authSuccess) {
                this.setStatus('digikey', 'error');
                return false;
            }

            // Test with a simple API call to verify the token works
            const testResult = await this.testDigikeyApiCall();
            
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
     * Test Mouser connection with proper API validation
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
            
            this.credentials.mouser = {
                apiKey: apiKey.trim(),
                status: 'connecting'
            };
            
            // Test with actual API call
            const testResult = await this.testMouserApiCall();
            
            if (testResult) {
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
     * Authenticate with Digikey using robust OAuth2 flow
     * @returns {Promise<boolean>} Authentication success
     */
    async authenticateDigikey() {
        if (this.isAuthenticating.digikey) {
            console.log('Digikey authentication already in progress');
            return false;
        }

        const cred = this.credentials.digikey;
        if (!cred.clientId || !cred.clientSecret) {
            throw new Error('Digikey credentials not set');
        }

        this.isAuthenticating.digikey = true;

        try {
            const config = cred.environment === 'sandbox' ? 
                          this.config.SANDBOX : this.config.PRODUCTION;

            console.log(`Authenticating Digikey (${cred.environment})...`);

            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.AUTH_TIMEOUT);

            const response = await fetch(config.TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({
                    'client_id': cred.clientId,
                    'client_secret': cred.clientSecret,
                    'grant_type': 'client_credentials'
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const tokenData = await response.json();
            
            if (!tokenData.access_token || !tokenData.expires_in) {
                throw new Error('Invalid token response: Missing access_token or expires_in');
            }

            // Store token with proper expiry calculation
            cred.token = tokenData.access_token;
            cred.expiry = Date.now() + ((tokenData.expires_in - 60) * 1000); // 1 minute buffer
            cred.status = 'active';

            console.log(`✓ Digikey authenticated successfully (expires in ${Math.floor(tokenData.expires_in/60)}m)`);
            return true;

        } catch (error) {
            const errorMsg = error.name === 'AbortError' ? 'Request timeout' : error.message;
            console.error('Digikey authentication failed:', errorMsg);
            
            cred.token = null;
            cred.expiry = null;
            cred.status = 'error';
            
            throw new Error(`Authentication failed: ${errorMsg}`);
        } finally {
            this.isAuthenticating.digikey = false;
        }
    }

    /**
     * Test Digikey API with authenticated request
     * @returns {Promise<boolean>} API call success
     */
    async testDigikeyApiCall() {
        const cred = this.credentials.digikey;
        if (!cred.token) {
            throw new Error('No Digikey token available');
        }

        const config = cred.environment === 'sandbox' ? 
                      this.config.SANDBOX : this.config.PRODUCTION;

        try {
            const response = await fetch(`${config.BASE_URL}/products/v4/search/manufacturerPart`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${cred.token}`,
                    'X-DIGIKEY-Client-Id': cred.clientId,
                    'Accept': 'application/json',
                    'X-DIGIKEY-Locale-Site': 'US',
                    'X-DIGIKEY-Locale-Language': 'en',
                    'X-DIGIKEY-Locale-Currency': 'USD'
                }
            });

            // Even a 404 is a successful auth test (endpoint exists but no product specified)
            return response.status === 404 || response.ok;
        } catch (error) {
            console.error('Digikey API test call failed:', error);
            return false;
        }
    }

    /**
     * Test Mouser API with authenticated request
     * @returns {Promise<boolean>} API call success
     */
    async testMouserApiCall() {
        const cred = this.credentials.mouser;
        if (!cred.apiKey) {
            throw new Error('No Mouser API key available');
        }

        try {
            const response = await fetch(`${this.config.MOUSER.BASE_URL}/api/v1/search/manufacturerlist?apiKey=${cred.apiKey}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            return !!(data && (data.ManufacturerList || data.Errors === undefined));
        } catch (error) {
            console.error('Mouser API test call failed:', error);
            return false;
        }
    }

    /**
     * Get valid Digikey token (refresh if needed)
     * @returns {Promise<string|null>} Valid access token
     */
    async getValidDigikeyToken() {
        const cred = this.credentials.digikey;
        
        if (!cred.token || !cred.expiry) {
            return null;
        }

        // Check if token is expired or about to expire
        if (Date.now() >= (cred.expiry - this.config.TOKEN_BUFFER)) {
            console.log('Digikey token expired, refreshing...');
            
            try {
                const refreshed = await this.authenticateDigikey();
                if (!refreshed) {
                    return null;
                }
            } catch (error) {
                console.error('Token refresh failed:', error);
                return null;
            }
        }

        return cred.token;
    }

    /**
     * Make authenticated Digikey API request with retry logic
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<Object>} API response data
     */
    async makeDigikeyRequest(endpoint, options = {}) {
        const token = await this.getValidDigikeyToken();
        if (!token) {
            throw new Error('Digikey not authenticated');
        }

        const cred = this.credentials.digikey;
        const config = cred.environment === 'sandbox' ? 
                      this.config.SANDBOX : this.config.PRODUCTION;
        
        const url = config.BASE_URL + endpoint;
        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-DIGIKEY-Client-Id': cred.clientId,
                'Accept': 'application/json',
                'X-DIGIKEY-Locale-Site': 'US',
                'X-DIGIKEY-Locale-Language': 'en', 
                'X-DIGIKEY-Locale-Currency': 'USD',
                ...options.headers
            }
        };

        if (options.data) {
            requestOptions.headers['Content-Type'] = 'application/json';
            requestOptions.body = JSON.stringify(options.data);
        }

        return this.apiCallWithRetry(() => fetch(url, requestOptions));
    }

    /**
     * Make Mouser API request with retry logic
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<Object>} API response data
     */
    async makeMouserRequest(endpoint, options = {}) {
        const cred = this.credentials.mouser;
        if (!cred.apiKey) {
            throw new Error('Mouser not authenticated');
        }

        const params = new URLSearchParams({
            apiKey: cred.apiKey,
            ...options.params
        });

        const url = `${this.config.MOUSER.BASE_URL}${endpoint}?${params.toString()}`;
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

        return this.apiCallWithRetry(() => fetch(url, requestOptions));
    }

    /**
     * API call with retry logic and proper error handling
     * @param {Function} apiCall - Function that returns a fetch promise
     * @returns {Promise<Object>} Parsed response data
     */
    async apiCallWithRetry(apiCall) {
        let lastError;
        
        for (let attempt = 0; attempt <= this.config.MAX_RETRIES; attempt++) {
            try {
                const response = await apiCall();
                
                if (!response.ok) {
                    const errorText = await response.text().catch(() => '');
                    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
                }

                return await response.json();
            } catch (error) {
                lastError = error;
                
                // Don't retry on certain HTTP status codes
                if (error.message.includes('401') || error.message.includes('403') || 
                    error.message.includes('404') || error.message.includes('400')) {
                    throw error;
                }

                if (attempt < this.config.MAX_RETRIES) {
                    console.log(`API call failed (attempt ${attempt + 1}/${this.config.MAX_RETRIES + 1}): ${error.message}. Retrying...`);
                    await this.sleep(this.config.RETRY_DELAY * (attempt + 1));
                }
            }
        }

        throw lastError;
    }

    /**
     * Set API status and emit event
     * @param {string} provider - 'digikey' or 'mouser'
     * @param {string} status - Status value
     */
    setStatus(provider, status) {
        if (this.credentials[provider]) {
            this.credentials[provider].status = status;
        }
        
        // Emit status change event
        window.dispatchEvent(new CustomEvent('apiStatusChange', {
            detail: { provider, status }
        }));
        
        console.log(`API Status: ${provider} -> ${status}`);
    }

    /**
     * Get current API status
     * @param {string} provider - Optional provider filter
     * @returns {Object} Status information
     */
    getStatus(provider = null) {
        if (provider) {
            return {
                status: this.credentials[provider]?.status || 'inactive',
                authenticated: this.isAuthenticated(provider)
            };
        }
        
        return {
            digikey: this.getStatus('digikey'),
            mouser: this.getStatus('mouser')
        };
    }

    /**
     * Check if provider is authenticated
     * @param {string} provider - Provider name
     * @returns {boolean} Authentication status
     */
    isAuthenticated(provider) {
        if (provider === 'digikey') {
            const cred = this.credentials.digikey;
            return !!(cred.token && cred.expiry > Date.now());
        } else if (provider === 'mouser') {
            return !!(this.credentials.mouser.apiKey);
        }
        return false;
    }

    /**
     * Clear all authentication data
     */
    clearAuth() {
        this.credentials = {
            digikey: {
                clientId: null,
                clientSecret: null,
                environment: 'production',
                token: null,
                expiry: null,
                status: 'inactive'
            },
            mouser: {
                apiKey: null,
                status: 'inactive'
            }
        };
        
        console.log('API authentication cleared');
    }

    /**
     * Sleep utility for delays
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} Sleep promise
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Global instance
const apiManager = new ApiManager();
window.apiManager = apiManager;