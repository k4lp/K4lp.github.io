/**
 * Unified API Manager - Orchestrates all API providers
 * Ultra-robust, modular, and future-proof API management
 * Coordinates Digikey and Mouser providers with unified interface
 */

class UnifiedApiManager {
    constructor() {
        this.providers = {
            digikey: null,
            mouser: null
        };
        
        this.initialized = false;
        this.initializationPromise = null;
        
        // Automatically initialize when providers are available
        this.waitForDependencies().then(() => this.initialize());
    }

    /**
     * Wait for provider dependencies to load
     * @returns {Promise<void>}
     */
    async waitForDependencies() {
        const maxWait = 10000; // 10 seconds max wait
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWait) {
            if (window.BaseApiManager && window.DigikeyApiProvider && window.MouserApiProvider) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        throw new Error('API provider dependencies not loaded within timeout');
    }

    /**
     * Initialize all API providers
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized || this.initializationPromise) {
            return this.initializationPromise;
        }
        
        this.initializationPromise = this.performInitialization();
        return this.initializationPromise;
    }

    /**
     * Perform actual initialization
     * @returns {Promise<void>}
     */
    async performInitialization() {
        try {
            console.log('Initializing API providers...');
            
            // Initialize Digikey provider
            this.providers.digikey = new DigikeyApiProvider();
            
            // Initialize Mouser provider
            this.providers.mouser = new MouserApiProvider();
            
            // Set up event forwarding
            this.setupEventForwarding();
            
            // Load saved credentials
            await this.loadSavedCredentials();
            
            this.initialized = true;
            console.log('✓ All API providers initialized successfully');
            
            // Emit initialization complete event
            window.dispatchEvent(new CustomEvent('apiManagerReady', {
                detail: { providers: Object.keys(this.providers) }
            }));
            
        } catch (error) {
            console.error('API Manager initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup event forwarding from providers
     */
    setupEventForwarding() {
        Object.entries(this.providers).forEach(([name, provider]) => {
            if (provider) {
                // Forward status changes
                provider.addEventListener('statusChange', (data) => {
                    window.dispatchEvent(new CustomEvent('apiStatusChange', { detail: data }));
                });
                
                // Forward authentication events
                provider.addEventListener('authenticationSuccess', (data) => {
                    window.dispatchEvent(new CustomEvent('apiAuthSuccess', { detail: data }));
                });
                
                provider.addEventListener('authenticationError', (data) => {
                    window.dispatchEvent(new CustomEvent('apiAuthError', { detail: data }));
                });
            }
        });
    }

    /**
     * Load saved credentials from storage
     * @returns {Promise<void>}
     */
    async loadSavedCredentials() {
        if (!window.storage) {
            console.warn('Storage not available, skipping credential loading');
            return;
        }
        
        const apiKeys = window.storage.getApiKeys();
        if (!apiKeys) {
            console.log('No saved API credentials found');
            return;
        }
        
        // Load Digikey credentials
        if (apiKeys.digikeyClientId && apiKeys.digikeyClientSecret) {
            this.providers.digikey.setCredentials({
                clientId: apiKeys.digikeyClientId,
                clientSecret: apiKeys.digikeyClientSecret,
                environment: apiKeys.digikeyEnvironment || 'production'
            });
            console.log('✓ Digikey credentials loaded from storage');
        }
        
        // Load Mouser credentials
        if (apiKeys.mouserApiKey) {
            this.providers.mouser.setCredentials({
                apiKey: apiKeys.mouserApiKey
            });
            console.log('✓ Mouser credentials loaded from storage');
        }
    }

    /**
     * Test connection for specific provider
     * @param {string} provider - Provider name ('digikey' or 'mouser')
     * @param {Object} credentials - Provider credentials
     * @returns {Promise<boolean>} Connection test result
     */
    async testConnection(provider, credentials = null) {
        await this.initialize();
        
        const providerInstance = this.providers[provider];
        if (!providerInstance) {
            throw new Error(`Unknown provider: ${provider}`);
        }
        
        // Set credentials if provided
        if (credentials) {
            providerInstance.setCredentials(credentials);
        }
        
        return await providerInstance.testConnection();
    }

    /**
     * Test Digikey connection
     * @param {string} clientId - Client ID
     * @param {string} clientSecret - Client Secret
     * @param {string} environment - Environment ('production' or 'sandbox')
     * @returns {Promise<boolean>} Connection result
     */
    async testDigikeyConnection(clientId, clientSecret, environment = 'production') {
        return await this.testConnection('digikey', {
            clientId,
            clientSecret,
            environment
        });
    }

    /**
     * Test Mouser connection
     * @param {string} apiKey - API Key
     * @returns {Promise<boolean>} Connection result
     */
    async testMouserConnection(apiKey) {
        return await this.testConnection('mouser', { apiKey });
    }

    /**
     * Search products across all providers
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Object>} Unified search results
     */
    async searchProducts(query, options = {}) {
        await this.initialize();
        
        const results = {};
        const providers = options.providers || ['digikey', 'mouser'];
        
        // Search across specified providers
        const searchPromises = providers.map(async (providerName) => {
            const provider = this.providers[providerName];
            if (!provider || !provider.hasValidCredentials()) {
                return { provider: providerName, error: 'Not configured' };
            }
            
            try {
                let result;
                if (providerName === 'digikey') {
                    result = await provider.searchProducts(query, options);
                } else if (providerName === 'mouser') {
                    result = await provider.searchParts(query, options);
                }
                
                return { provider: providerName, result };
            } catch (error) {
                return { provider: providerName, error: error.message };
            }
        });
        
        const searchResults = await Promise.all(searchPromises);
        
        // Organize results by provider
        searchResults.forEach(({ provider, result, error }) => {
            results[provider] = error ? { error } : result;
        });
        
        return results;
    }

    /**
     * Get product details from specific provider
     * @param {string} provider - Provider name
     * @param {string} partNumber - Part number
     * @returns {Promise<Object>} Product details
     */
    async getProductDetails(provider, partNumber) {
        await this.initialize();
        
        const providerInstance = this.providers[provider];
        if (!providerInstance) {
            throw new Error(`Unknown provider: ${provider}`);
        }
        
        if (provider === 'digikey') {
            return await providerInstance.getProductDetails(partNumber);
        } else if (provider === 'mouser') {
            return await providerInstance.getPartDetails(partNumber);
        }
        
        throw new Error(`Product details not supported for provider: ${provider}`);
    }

    /**
     * Get status for all providers
     * @returns {Object} Unified status
     */
    getStatus() {
        if (!this.initialized) {
            return {
                digikey: { status: 'initializing', authenticated: false },
                mouser: { status: 'initializing', authenticated: false }
            };
        }
        
        return {
            digikey: this.providers.digikey?.getStatus() || { status: 'unavailable', authenticated: false },
            mouser: this.providers.mouser?.getStatus() || { status: 'unavailable', authenticated: false }
        };
    }

    /**
     * Check if provider is authenticated
     * @param {string} provider - Provider name
     * @returns {boolean} Authentication status
     */
    isAuthenticated(provider) {
        if (!this.initialized) return false;
        
        const providerInstance = this.providers[provider];
        if (!providerInstance) return false;
        
        if (provider === 'digikey') {
            return providerInstance.isAuthenticated();
        } else if (provider === 'mouser') {
            return providerInstance.hasValidCredentials();
        }
        
        return false;
    }

    /**
     * Get comprehensive system metrics
     * @returns {Object} System metrics
     */
    getSystemMetrics() {
        if (!this.initialized) {
            return { status: 'not_initialized' };
        }
        
        return {
            digikey: this.providers.digikey?.getMetrics() || null,
            mouser: this.providers.mouser?.getMetrics() || null,
            initialized: this.initialized,
            uptime: Date.now() - (this.initializationTime || Date.now())
        };
    }

    /**
     * Clear all provider data
     */
    clearAll() {
        Object.values(this.providers).forEach(provider => {
            if (provider && provider.clearAll) {
                provider.clearAll();
            }
        });
        
        console.log('All API provider data cleared');
    }

    /**
     * Get provider instance
     * @param {string} provider - Provider name
     * @returns {Object|null} Provider instance
     */
    getProvider(provider) {
        return this.providers[provider] || null;
    }

    /**
     * Check if system is ready
     * @returns {boolean} Ready status
     */
    isReady() {
        return this.initialized && 
               this.providers.digikey && 
               this.providers.mouser;
    }

    /**
     * Wait for system to be ready
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<boolean>} Ready status
     */
    async waitForReady(timeout = 10000) {
        const startTime = Date.now();
        
        while (!this.isReady() && (Date.now() - startTime) < timeout) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return this.isReady();
    }

    /**
     * Destroy all providers and clean up
     */
    destroy() {
        Object.values(this.providers).forEach(provider => {
            if (provider && provider.destroy) {
                provider.destroy();
            }
        });
        
        this.providers = { digikey: null, mouser: null };
        this.initialized = false;
        this.initializationPromise = null;
        
        console.log('API Manager destroyed');
    }
}

// Create global instance when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.apiManager = new UnifiedApiManager();
    });
} else {
    window.apiManager = new UnifiedApiManager();
}