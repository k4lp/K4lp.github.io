/**
 * Excel API Processor - Credentials Manager (FIXED)
 * Alica Technologies
 */

window.ExcelProcessorCredentials = {
    // Internal state
    _digikeyCredentials: null,
    _mouserCredentials: null,
    _digikeyToken: null,
    _digikeyTokenExpiry: null,
    _isInitialized: false,

    /**
     * Initialize credentials manager
     */
    init() {
        if (this._isInitialized) {
            return;
        }
        
        this._loadStoredCredentials();
        this._bindEvents();
        this._updateApiCount();
        this._isInitialized = true;
        window.ExcelProcessorUtils.log.info('Credentials manager initialized');
    },

    /**
     * Bind event listeners - FIXED: Better error handling and timing
     */
    _bindEvents() {
        // Wait for DOM to be fully ready
        const bindWhenReady = () => {
            // Settings panel toggle - FIXED: Enhanced binding
            const toggleBtn = document.getElementById('toggleSettings');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this._toggleSettingsPanel();
                });
                window.ExcelProcessorUtils.log.info('Settings toggle bound successfully');
            } else {
                window.ExcelProcessorUtils.log.error('Toggle settings button not found');
            }

            // Digikey credential buttons
            const saveDigikeyBtn = document.getElementById('saveDigikeyCredentials');
            if (saveDigikeyBtn) {
                saveDigikeyBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this._saveDigikeyCredentials();
                });
            }

            const clearDigikeyBtn = document.getElementById('clearDigikeyCredentials');
            if (clearDigikeyBtn) {
                clearDigikeyBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this._clearDigikeyCredentials();
                });
            }

            // Mouser credential buttons
            const saveMouserBtn = document.getElementById('saveMouserCredentials');
            if (saveMouserBtn) {
                saveMouserBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this._saveMouserCredentials();
                });
            }

            const clearMouserBtn = document.getElementById('clearMouserCredentials');
            if (clearMouserBtn) {
                clearMouserBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this._clearMouserCredentials();
                });
            }
        };

        // Ensure DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bindWhenReady);
        } else {
            bindWhenReady();
        }
    },

    /**
     * Toggle settings panel visibility - FIXED: More robust implementation
     */
    _toggleSettingsPanel() {
        const panel = document.getElementById('settingsPanel');
        const button = document.getElementById('toggleSettings');
        
        if (!panel || !button) {
            window.ExcelProcessorUtils.log.error('Settings panel elements not found');
            return;
        }

        try {
            const isHidden = panel.style.display === 'none' || 
                           window.getComputedStyle(panel).display === 'none';
            
            if (isHidden) {
                panel.style.display = 'block';
                button.textContent = 'Collapse Settings';
                window.ExcelProcessorUtils.log.info('Settings panel expanded');
            } else {
                panel.style.display = 'none';
                button.textContent = 'Expand Settings';
                window.ExcelProcessorUtils.log.info('Settings panel collapsed');
            }
        } catch (error) {
            window.ExcelProcessorUtils.log.error('Error toggling settings panel:', error.message);
        }
    },

    /**
     * Load stored credentials from localStorage - FIXED: Enhanced persistence
     */
    _loadStoredCredentials() {
        try {
            // Load Digikey credentials with expiration check
            const digikeyData = this._getStoredCredentials('exce_digikey_creds');
            if (digikeyData) {
                this._digikeyCredentials = digikeyData;
                this._populateDigikeyForm(digikeyData);
                window.ExcelProcessorUtils.status.updateCredentialStatus('digikey', false);
                window.ExcelProcessorUtils.log.info('Digikey credentials loaded from storage');
            }

            // Load Mouser credentials with expiration check
            const mouserData = this._getStoredCredentials('exce_mouser_creds');
            if (mouserData) {
                this._mouserCredentials = mouserData;
                this._populateMouserForm(mouserData);
                window.ExcelProcessorUtils.status.updateCredentialStatus('mouser', true);
                window.ExcelProcessorUtils.log.info('Mouser credentials loaded from storage');
            }

            this._updateApiCount();
        } catch (error) {
            window.ExcelProcessorUtils.log.error('Error loading stored credentials:', error.message);
        }
    },

    /**
     * Enhanced credential storage with expiration - FIXED: Better persistence
     */
    _getStoredCredentials(key) {
        try {
            const stored = localStorage.getItem(key);
            if (!stored) return null;

            const data = JSON.parse(stored);
            
            // Check expiration (default 30 days)
            const now = Date.now();
            const expiry = data.expiry || (now + (30 * 24 * 60 * 60 * 1000));
            
            if (now > expiry) {
                localStorage.removeItem(key);
                window.ExcelProcessorUtils.log.info(`Expired credentials removed: ${key}`);
                return null;
            }

            return data.credentials || data; // Support both new and old format
        } catch (error) {
            window.ExcelProcessorUtils.log.error(`Error reading credentials ${key}:`, error.message);
            localStorage.removeItem(key); // Remove corrupted data
            return null;
        }
    },

    /**
     * Store credentials with expiration - FIXED: Enhanced storage
     */
    _storeCredentials(key, credentials) {
        try {
            const data = {
                credentials: credentials,
                expiry: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
                timestamp: Date.now()
            };
            
            localStorage.setItem(key, JSON.stringify(data));
            window.ExcelProcessorUtils.log.info(`Credentials stored: ${key}`);
        } catch (error) {
            window.ExcelProcessorUtils.log.error(`Error storing credentials ${key}:`, error.message);
            throw error;
        }
    },

    /**
     * Populate Digikey form with stored data
     */
    _populateDigikeyForm(data) {
        const setValue = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.value = value || '';
        };

        setValue('digikeyClientId', data.clientId);
        setValue('digikeyClientSecret', data.clientSecret);
        setValue('digikeyEnvironment', data.environment || 'production');
        setValue('digikeyLocale', data.locale || 'US/USD');
    },

    /**
     * Populate Mouser form with stored data
     */
    _populateMouserForm(data) {
        const apiKeyElement = document.getElementById('mouserApiKey');
        if (apiKeyElement) {
            apiKeyElement.value = data.apiKey || '';
        }
    },

    /**
     * Save Digikey credentials
     */
    async _saveDigikeyCredentials() {
        const getElementValue = (id) => {
            const element = document.getElementById(id);
            return element ? element.value.trim() : '';
        };

        const clientId = getElementValue('digikeyClientId');
        const clientSecret = getElementValue('digikeyClientSecret');
        const environment = getElementValue('digikeyEnvironment');
        const locale = getElementValue('digikeyLocale');

        if (!clientId || !clientSecret) {
            alert('Please enter both Client ID and Client Secret for Digikey.');
            return;
        }

        const credentials = { clientId, clientSecret, environment, locale };

        try {
            window.ExcelProcessorUtils.status.updateCredentialStatus('digikey', false, 'Testing...');
            
            const success = await this._testDigikeyAuthentication(credentials);
            
            if (success) {
                this._digikeyCredentials = credentials;
                this._storeCredentials('exce_digikey_creds', credentials);
                window.ExcelProcessorUtils.status.updateCredentialStatus('digikey', true);
                window.ExcelProcessorUtils.log.info('Digikey credentials saved and authenticated successfully');
                this._updateApiCount();
            }
        } catch (error) {
            window.ExcelProcessorUtils.status.updateCredentialStatus('digikey', false, error.message);
            window.ExcelProcessorUtils.log.error('Digikey authentication failed:', error.message);
            alert('Digikey authentication failed: ' + error.message);
        }
    },

    /**
     * Save Mouser credentials - FIXED: Alternative validation
     */
    async _saveMouserCredentials() {
        const apiKeyElement = document.getElementById('mouserApiKey');
        const apiKey = apiKeyElement ? apiKeyElement.value.trim() : '';

        if (!apiKey) {
            alert('Please enter API Key for Mouser.');
            return;
        }

        const credentials = { apiKey };

        try {
            window.ExcelProcessorUtils.status.updateCredentialStatus('mouser', false, 'Validating...');
            
            // FIXED: Client-side validation instead of CORS-blocked API call
            const isValid = this._validateMouserApiKey(apiKey);
            
            if (isValid) {
                this._mouserCredentials = credentials;
                this._storeCredentials('exce_mouser_creds', credentials);
                window.ExcelProcessorUtils.status.updateCredentialStatus('mouser', true);
                window.ExcelProcessorUtils.log.info('Mouser credentials saved successfully');
                this._updateApiCount();
            } else {
                throw new Error('Invalid API key format');
            }
        } catch (error) {
            window.ExcelProcessorUtils.status.updateCredentialStatus('mouser', false, error.message);
            window.ExcelProcessorUtils.log.error('Mouser API key validation failed:', error.message);
            alert('Mouser API key validation failed: ' + error.message);
        }
    },

    /**
     * Client-side Mouser API key validation - FIXED: No CORS issues
     */
    _validateMouserApiKey(apiKey) {
        // Basic format validation for Mouser API keys
        // Mouser API keys are typically UUIDs: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        if (!apiKey || apiKey.length < 32) {
            return false;
        }
        
        return uuidPattern.test(apiKey);
    },

    /**
     * Clear Digikey credentials
     */
    _clearDigikeyCredentials() {
        if (confirm('Clear Digikey credentials? This will remove all saved authentication data.')) {
            this._digikeyCredentials = null;
            this._digikeyToken = null;
            this._digikeyTokenExpiry = null;
            
            localStorage.removeItem('exce_digikey_creds');
            
            // Clear form
            const clearElement = (id) => {
                const element = document.getElementById(id);
                if (element) element.value = '';
            };
            
            clearElement('digikeyClientId');
            clearElement('digikeyClientSecret');
            
            window.ExcelProcessorUtils.status.updateCredentialStatus('digikey', false);
            window.ExcelProcessorUtils.log.info('Digikey credentials cleared');
            this._updateApiCount();
        }
    },

    /**
     * Clear Mouser credentials
     */
    _clearMouserCredentials() {
        if (confirm('Clear Mouser credentials? This will remove all saved API key data.')) {
            this._mouserCredentials = null;
            
            localStorage.removeItem('exce_mouser_creds');
            
            // Clear form
            const apiKeyElement = document.getElementById('mouserApiKey');
            if (apiKeyElement) apiKeyElement.value = '';
            
            window.ExcelProcessorUtils.status.updateCredentialStatus('mouser', false);
            window.ExcelProcessorUtils.log.info('Mouser credentials cleared');
            this._updateApiCount();
        }
    },

    /**
     * Test Digikey authentication
     */
    async _testDigikeyAuthentication(credentials) {
        const config = credentials.environment === 'sandbox' ? 
            window.ExcelProcessorConfig.DIGIKEY.SANDBOX : 
            window.ExcelProcessorConfig.DIGIKEY.PRODUCTION;

        const response = await fetch(config.TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: credentials.clientId,
                client_secret: credentials.clientSecret,
                grant_type: 'client_credentials'
            })
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.access_token || !data.expires_in) {
            throw new Error('Invalid token response');
        }

        // Store token for later use
        this._digikeyToken = data.access_token;
        this._digikeyTokenExpiry = Date.now() + ((data.expires_in - 60) * 1000); // 1 min buffer

        return true;
    },

    /**
     * Update API count in header
     */
    _updateApiCount() {
        let count = 0;
        if (this._digikeyCredentials && this.isDigikeyActive()) count++;
        if (this._mouserCredentials) count++;
        
        window.ExcelProcessorUtils.status.setApiCount(count);
    },

    /**
     * Get Digikey credentials
     */
    getDigikeyCredentials() {
        return this._digikeyCredentials;
    },

    /**
     * Get Mouser credentials
     */
    getMouserCredentials() {
        return this._mouserCredentials;
    },

    /**
     * Check if Digikey is active and has valid token
     */
    isDigikeyActive() {
        return this._digikeyCredentials && 
               this._digikeyToken && 
               this._digikeyTokenExpiry > (Date.now() + window.ExcelProcessorConfig.DIGIKEY.TOKEN_BUFFER);
    },

    /**
     * Check if Mouser is active
     */
    isMouserActive() {
        return !!this._mouserCredentials;
    },

    /**
     * Get Digikey access token (with refresh if needed)
     */
    async getDigikeyToken() {
        if (!this._digikeyCredentials) {
            throw new Error('Digikey credentials not configured');
        }

        // Check if token needs refresh
        if (!this._digikeyToken || 
            this._digikeyTokenExpiry <= (Date.now() + window.ExcelProcessorConfig.DIGIKEY.TOKEN_BUFFER)) {
            
            window.ExcelProcessorUtils.log.info('Refreshing Digikey token...');
            await this._testDigikeyAuthentication(this._digikeyCredentials);
        }

        return this._digikeyToken;
    },

    /**
     * Get active API services
     */
    getActiveApis() {
        const apis = [];
        
        if (this.isDigikeyActive()) {
            apis.push('digikey');
        }
        
        if (this.isMouserActive()) {
            apis.push('mouser');
        }
        
        return apis;
    },

    /**
     * Check if any API is configured
     */
    hasActiveApis() {
        return this.getActiveApis().length > 0;
    }
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.ExcelProcessorCredentials.init();
    });
} else {
    window.ExcelProcessorCredentials.init();
}