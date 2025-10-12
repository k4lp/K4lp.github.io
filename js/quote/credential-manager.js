// Credential Manager Module
class CredentialManager {
    constructor(controller) {
        this.controller = controller;
        this.storage_key = 'quote_credentials';
        this.credentials = {
            digikey: null,
            mouser: null
        };
        
        this.apiStatus = {
            digikey: { active: false, token: null, expiry: null },
            mouser: { active: false, lastTest: null }
        };

        this.init();
    }

    init() {
        this.loadCredentials();
        this.controller.log('CredentialManager initialized', 'info');
    }

    saveCredentials() {
        try {
            const dgClientId = document.getElementById('dgClientId').value.trim();
            const dgClientSecret = document.getElementById('dgClientSecret').value.trim();
            const dgEnvironment = document.getElementById('dgEnvironment').value;
            const dgLocale = document.getElementById('dgLocale').value;
            
            const mrApiKey = document.getElementById('mrApiKey').value.trim();

            // Validate inputs
            if (dgClientId && dgClientSecret) {
                this.credentials.digikey = {
                    clientId: dgClientId,
                    clientSecret: dgClientSecret,
                    environment: dgEnvironment,
                    locale: dgLocale
                };
                this.controller.log('Digikey credentials saved', 'success');
            } else if (dgClientId || dgClientSecret) {
                throw new Error('Both Digikey Client ID and Secret are required');
            }

            if (mrApiKey) {
                this.credentials.mouser = {
                    apiKey: mrApiKey
                };
                this.controller.log('Mouser credentials saved', 'success');
            }

            // Save to localStorage
            this.persistCredentials();
            
            // Update UI status
            this.updateCredentialStatus();
            
            this.controller.log('All credentials saved successfully', 'success');
        } catch (error) {
            this.controller.log(`Failed to save credentials: ${error.message}`, 'error');
        }
    }

    async testCredentials() {
        try {
            this.controller.log('Testing API connections...', 'info');
            
            const promises = [];
            
            // Test Digikey
            if (this.credentials.digikey) {
                promises.push(this.testDigikeyConnection());
            }
            
            // Test Mouser
            if (this.credentials.mouser) {
                promises.push(this.testMouserConnection());
            }
            
            if (promises.length === 0) {
                throw new Error('No credentials to test');
            }
            
            await Promise.allSettled(promises);
            
            this.updateCredentialStatus();
            this.controller.log('Credential testing completed', 'info');
        } catch (error) {
            this.controller.log(`Credential test failed: ${error.message}`, 'error');
        }
    }

    async testDigikeyConnection() {
        try {
            const cred = this.credentials.digikey;
            const config = this.getDigikeyConfig(cred.environment);
            
            const response = await fetch(config.tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: cred.clientId,
                    client_secret: cred.clientSecret,
                    grant_type: 'client_credentials'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.access_token) {
                this.apiStatus.digikey = {
                    active: true,
                    token: data.access_token,
                    expiry: Date.now() + ((data.expires_in - 60) * 1000) // 1 min buffer
                };
                this.controller.log('Digikey authentication successful', 'success');
            } else {
                throw new Error('Invalid token response');
            }
        } catch (error) {
            this.apiStatus.digikey.active = false;
            this.controller.log(`Digikey authentication failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async testMouserConnection() {
        try {
            const cred = this.credentials.mouser;
            const testUrl = `https://api.mouser.com/api/v1/search/partnumber?apiKey=${cred.apiKey}`;
            
            // Test with a simple part search
            const response = await fetch(testUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    SearchByPartRequest: {
                        mouserPartNumber: "TEST123",
                        partSearchOptions: "string"
                    }
                })
            });

            // Mouser returns 200 even for invalid keys, so we check response structure
            const data = await response.json();
            
            if (data.Errors && data.Errors.length > 0) {
                const errors = data.Errors.filter(e => e.ErrorMessage.includes('API'));
                if (errors.length > 0) {
                    throw new Error(errors[0].ErrorMessage);
                }
            }

            this.apiStatus.mouser = {
                active: true,
                lastTest: Date.now()
            };
            this.controller.log('Mouser API key validated successfully', 'success');
        } catch (error) {
            this.apiStatus.mouser.active = false;
            this.controller.log(`Mouser validation failed: ${error.message}`, 'error');
            throw error;
        }
    }

    clearCredentials() {
        if (!confirm('Are you sure you want to clear all saved credentials?')) {
            return;
        }

        try {
            // Clear memory
            this.credentials = { digikey: null, mouser: null };
            this.apiStatus = {
                digikey: { active: false, token: null, expiry: null },
                mouser: { active: false, lastTest: null }
            };

            // Clear localStorage
            localStorage.removeItem(this.storage_key);

            // Clear form fields
            document.getElementById('dgClientId').value = '';
            document.getElementById('dgClientSecret').value = '';
            document.getElementById('mrApiKey').value = '';

            // Update UI
            this.updateCredentialStatus();

            this.controller.log('All credentials cleared successfully', 'success');
        } catch (error) {
            this.controller.log(`Failed to clear credentials: ${error.message}`, 'error');
        }
    }

    loadCredentials() {
        try {
            const stored = localStorage.getItem(this.storage_key);
            if (stored) {
                const data = JSON.parse(stored);
                this.credentials = data.credentials || { digikey: null, mouser: null };

                // Populate form fields
                if (this.credentials.digikey) {
                    document.getElementById('dgClientId').value = this.credentials.digikey.clientId || '';
                    document.getElementById('dgClientSecret').value = this.credentials.digikey.clientSecret || '';
                    document.getElementById('dgEnvironment').value = this.credentials.digikey.environment || 'production';
                    document.getElementById('dgLocale').value = this.credentials.digikey.locale || 'US/USD';
                }

                if (this.credentials.mouser) {
                    document.getElementById('mrApiKey').value = this.credentials.mouser.apiKey || '';
                }

                this.updateCredentialStatus();
                this.controller.log('Saved credentials loaded successfully', 'info');
            }
        } catch (error) {
            this.controller.log(`Failed to load saved credentials: ${error.message}`, 'error');
        }
    }

    persistCredentials() {
        try {
            const data = {
                credentials: this.credentials,
                saved: Date.now()
            };
            localStorage.setItem(this.storage_key, JSON.stringify(data));
        } catch (error) {
            throw new Error(`Failed to save credentials: ${error.message}`);
        }
    }

    updateCredentialStatus() {
        // Update Digikey status
        const dgStatus = document.getElementById('dgStatus');
        const dgStatusText = document.getElementById('dgStatusText');
        
        if (this.apiStatus.digikey.active) {
            dgStatus.className = 'status-dot status-dot--success';
            dgStatusText.textContent = 'Active';
        } else if (this.credentials.digikey) {
            dgStatus.className = 'status-dot status-dot--warning';
            dgStatusText.textContent = 'Configured';
        } else {
            dgStatus.className = 'status-dot status-dot--inactive';
            dgStatusText.textContent = 'Inactive';
        }

        // Update Mouser status
        const mrStatus = document.getElementById('mrStatus');
        const mrStatusText = document.getElementById('mrStatusText');
        
        if (this.apiStatus.mouser.active) {
            mrStatus.className = 'status-dot status-dot--success';
            mrStatusText.textContent = 'Active';
        } else if (this.credentials.mouser) {
            mrStatus.className = 'status-dot status-dot--warning';
            mrStatusText.textContent = 'Configured';
        } else {
            mrStatus.className = 'status-dot status-dot--inactive';
            mrStatusText.textContent = 'Inactive';
        }
    }

    getDigikeyConfig(environment) {
        const configs = {
            production: {
                baseUrl: 'https://api.digikey.com',
                tokenUrl: 'https://api.digikey.com/v1/oauth2/token'
            },
            sandbox: {
                baseUrl: 'https://sandbox-api.digikey.com',
                tokenUrl: 'https://sandbox-api.digikey.com/v1/oauth2/token'
            }
        };
        return configs[environment] || configs.production;
    }

    // Public API for other modules
    getCredentials() {
        return {
            digikey: this.credentials.digikey,
            mouser: this.credentials.mouser
        };
    }

    getApiStatus() {
        return { ...this.apiStatus };
    }

    async ensureDigikeyToken() {
        if (!this.credentials.digikey) {
            throw new Error('Digikey credentials not configured');
        }

        // Check if token is still valid
        if (this.apiStatus.digikey.active && 
            this.apiStatus.digikey.token && 
            this.apiStatus.digikey.expiry > Date.now() + 60000) { // 1 min buffer
            return this.apiStatus.digikey.token;
        }

        // Refresh token
        await this.testDigikeyConnection();
        return this.apiStatus.digikey.token;
    }

    isDigikeyActive() {
        return this.apiStatus.digikey.active && 
               this.apiStatus.digikey.token && 
               this.apiStatus.digikey.expiry > Date.now();
    }

    isMouserActive() {
        return this.apiStatus.mouser.active && this.credentials.mouser;
    }

    getDigikeyHeaders() {
        if (!this.credentials.digikey || !this.isDigikeyActive()) {
            throw new Error('Digikey not authenticated');
        }

        const [site, currency] = this.credentials.digikey.locale.split('/');
        return {
            'Content-Type': 'application/json',
            'X-DIGIKEY-Client-Id': this.credentials.digikey.clientId,
            'Authorization': `Bearer ${this.apiStatus.digikey.token}`,
            'X-DIGIKEY-Locale-Site': site,
            'X-DIGIKEY-Locale-Language': 'en',
            'X-DIGIKEY-Locale-Currency': currency
        };
    }

    getMouserApiKey() {
        if (!this.credentials.mouser) {
            throw new Error('Mouser credentials not configured');
        }
        return this.credentials.mouser.apiKey;
    }
}

// Export to global scope
if (typeof window !== 'undefined') {
    window.CredentialManager = CredentialManager;
}