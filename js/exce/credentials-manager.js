/**
 * Excel API Processor - Credentials Manager
 * Alica Technologies
 */

window.ExcelProcessorCredentials = {
    // Internal state
    _digikeyCredentials: null,
    _mouserCredentials: null,
    _digikeyToken: null,
    _digikeyTokenExpiry: null,

    /**
     * Initialize credentials manager
     */
    init() {
        this._loadStoredCredentials();
        this._bindEvents();
        this._updateApiCount();
        window.ExcelProcessorUtils.log.info('Credentials manager initialized');
    },

    /**
     * Bind event listeners
     */
    _bindEvents() {
        // Settings panel toggle
        const toggleBtn = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.TOGGLE_SETTINGS);
        if (toggleBtn) {
            toggleBtn.addEventListener('click', this._toggleSettingsPanel.bind(this));
        }

        // Digikey credential buttons
        const saveDigikeyBtn = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.SAVE_DIGIKEY);
        if (saveDigikeyBtn) {
            saveDigikeyBtn.addEventListener('click', this._saveDigikeyCredentials.bind(this));
        }

        const clearDigikeyBtn = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.CLEAR_DIGIKEY);
        if (clearDigikeyBtn) {
            clearDigikeyBtn.addEventListener('click', this._clearDigikeyCredentials.bind(this));
        }

        // Mouser credential buttons
        const saveMouserBtn = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.SAVE_MOUSER);
        if (saveMouserBtn) {
            saveMouserBtn.addEventListener('click', this._saveMouserCredentials.bind(this));
        }

        const clearMouserBtn = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.CLEAR_MOUSER);
        if (clearMouserBtn) {
            clearMouserBtn.addEventListener('click', this._clearMouserCredentials.bind(this));
        }
    },

    /**
     * Toggle settings panel visibility
     */
    _toggleSettingsPanel() {
        const panel = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.SETTINGS_PANEL);
        const button = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.TOGGLE_SETTINGS);
        
        if (panel && button) {
            const isHidden = panel.style.display === 'none' || !panel.style.display;
            
            if (isHidden) {
                window.ExcelProcessorUtils.dom.show(panel);
                button.textContent = 'Collapse Settings';
            } else {
                window.ExcelProcessorUtils.dom.hide(panel);
                button.textContent = 'Expand Settings';
            }
        }
    },

    /**
     * Load stored credentials from localStorage
     */
    _loadStoredCredentials() {
        // Load Digikey credentials
        const digikeyData = window.ExcelProcessorUtils.storage.get(window.ExcelProcessorConfig.STORAGE.DIGIKEY_CREDS);
        if (digikeyData) {
            this._digikeyCredentials = digikeyData;
            this._populateDigikeyForm(digikeyData);
            window.ExcelProcessorUtils.status.updateCredentialStatus('digikey', false);
        }

        // Load Mouser credentials
        const mouserData = window.ExcelProcessorUtils.storage.get(window.ExcelProcessorConfig.STORAGE.MOUSER_CREDS);
        if (mouserData) {
            this._mouserCredentials = mouserData;
            this._populateMouserForm(mouserData);
            window.ExcelProcessorUtils.status.updateCredentialStatus('mouser', true);
        }

        this._updateApiCount();
    },

    /**
     * Populate Digikey form with stored data
     */
    _populateDigikeyForm(data) {
        window.ExcelProcessorUtils.dom.setValue(window.ExcelProcessorConfig.ELEMENTS.DIGIKEY_CLIENT_ID, data.clientId || '');
        window.ExcelProcessorUtils.dom.setValue(window.ExcelProcessorConfig.ELEMENTS.DIGIKEY_CLIENT_SECRET, data.clientSecret || '');
        window.ExcelProcessorUtils.dom.setValue(window.ExcelProcessorConfig.ELEMENTS.DIGIKEY_ENVIRONMENT, data.environment || window.ExcelProcessorConfig.DEFAULTS.DIGIKEY_ENVIRONMENT);
        window.ExcelProcessorUtils.dom.setValue(window.ExcelProcessorConfig.ELEMENTS.DIGIKEY_LOCALE, data.locale || window.ExcelProcessorConfig.DEFAULTS.DIGIKEY_LOCALE);
    },

    /**
     * Populate Mouser form with stored data
     */
    _populateMouserForm(data) {
        window.ExcelProcessorUtils.dom.setValue(window.ExcelProcessorConfig.ELEMENTS.MOUSER_API_KEY, data.apiKey || '');
    },

    /**
     * Save Digikey credentials
     */
    async _saveDigikeyCredentials() {
        const clientId = window.ExcelProcessorUtils.dom.getValue(window.ExcelProcessorConfig.ELEMENTS.DIGIKEY_CLIENT_ID).trim();
        const clientSecret = window.ExcelProcessorUtils.dom.getValue(window.ExcelProcessorConfig.ELEMENTS.DIGIKEY_CLIENT_SECRET).trim();
        const environment = window.ExcelProcessorUtils.dom.getValue(window.ExcelProcessorConfig.ELEMENTS.DIGIKEY_ENVIRONMENT);
        const locale = window.ExcelProcessorUtils.dom.getValue(window.ExcelProcessorConfig.ELEMENTS.DIGIKEY_LOCALE);

        if (!clientId || !clientSecret) {
            alert('Please enter both Client ID and Client Secret for Digikey.');
            return;
        }

        const credentials = {
            clientId,
            clientSecret,
            environment,
            locale
        };

        try {
            window.ExcelProcessorUtils.status.updateCredentialStatus('digikey', false, 'Testing...');
            
            // Test authentication
            const success = await this._testDigikeyAuthentication(credentials);
            
            if (success) {
                this._digikeyCredentials = credentials;
                window.ExcelProcessorUtils.storage.set(window.ExcelProcessorConfig.STORAGE.DIGIKEY_CREDS, credentials);
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
     * Save Mouser credentials
     */
    async _saveMouserCredentials() {
        const apiKey = window.ExcelProcessorUtils.dom.getValue(window.ExcelProcessorConfig.ELEMENTS.MOUSER_API_KEY).trim();

        if (!apiKey) {
            alert('Please enter API Key for Mouser.');
            return;
        }

        const credentials = { apiKey };

        try {
            window.ExcelProcessorUtils.status.updateCredentialStatus('mouser', false, 'Testing...');
            
            // Test API key
            const success = await this._testMouserApiKey(credentials);
            
            if (success) {
                this._mouserCredentials = credentials;
                window.ExcelProcessorUtils.storage.set(window.ExcelProcessorConfig.STORAGE.MOUSER_CREDS, credentials);
                window.ExcelProcessorUtils.status.updateCredentialStatus('mouser', true);
                window.ExcelProcessorUtils.log.info('Mouser credentials saved and tested successfully');
                this._updateApiCount();
            }
        } catch (error) {
            window.ExcelProcessorUtils.status.updateCredentialStatus('mouser', false, error.message);
            window.ExcelProcessorUtils.log.error('Mouser API key test failed:', error.message);
            alert('Mouser API key test failed: ' + error.message);
        }
    },

    /**
     * Clear Digikey credentials
     */
    _clearDigikeyCredentials() {
        if (confirm('Clear Digikey credentials? This will remove all saved authentication data.')) {
            this._digikeyCredentials = null;
            this._digikeyToken = null;
            this._digikeyTokenExpiry = null;
            
            window.ExcelProcessorUtils.storage.remove(window.ExcelProcessorConfig.STORAGE.DIGIKEY_CREDS);
            
            // Clear form
            window.ExcelProcessorUtils.dom.setValue(window.ExcelProcessorConfig.ELEMENTS.DIGIKEY_CLIENT_ID, '');
            window.ExcelProcessorUtils.dom.setValue(window.ExcelProcessorConfig.ELEMENTS.DIGIKEY_CLIENT_SECRET, '');
            
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
            
            window.ExcelProcessorUtils.storage.remove(window.ExcelProcessorConfig.STORAGE.MOUSER_CREDS);
            
            // Clear form
            window.ExcelProcessorUtils.dom.setValue(window.ExcelProcessorConfig.ELEMENTS.MOUSER_API_KEY, '');
            
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
     * Test Mouser API key
     */
    async _testMouserApiKey(credentials) {
        // Simple test call to validate API key
        const testUrl = `${window.ExcelProcessorConfig.MOUSER.BASE_URL}/search/partnumber?apikey=${credentials.apiKey}&keyword=test&records=1`;
        
        const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        // If we get here, the API key is valid
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