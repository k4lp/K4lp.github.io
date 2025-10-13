/**
 * Navigation Manager - Enhanced for modular API system
 * Integrates with UnifiedApiManager and provider-specific modules
 * Ultra-robust with comprehensive error handling
 */

class NavigationManager {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.settingsModal = null;
        this.isSettingsOpen = false;
        this.apiReady = false;
        
        this.initialize();
    }

    /**
     * Initialize navigation system
     */
    initialize() {
        this.createNavigation();
        this.createSettingsModal();
        this.attachEventListeners();
        this.updateActiveNavigation();
        
        // Wait for API manager to be ready
        this.waitForApiManager();
        
        console.log('Navigation Manager initialized');
    }

    /**
     * Wait for API manager to be ready
     */
    async waitForApiManager() {
        const maxWait = 10000; // 10 seconds
        const startTime = Date.now();
        
        while (!this.apiReady && (Date.now() - startTime) < maxWait) {
            if (window.apiManager && window.apiManager.isReady()) {
                this.apiReady = true;
                console.log('✓ API Manager ready for navigation');
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!this.apiReady) {
            console.warn('API Manager not ready within timeout');
        }
    }

    /**
     * Create navigation HTML
     */
    createNavigation() {
        const existingNav = document.querySelector('.navbar');
        if (existingNav) return;
        
        const nav = document.createElement('nav');
        nav.className = 'navbar';
        nav.innerHTML = `
            <div class="nav-container">
                <div class="nav-brand">
                    <a href="/index.html" class="nav-brand-link">K4LP Engineering Tools</a>
                </div>
                
                <div class="nav-menu">
                    <a href="/index.html" class="nav-link" data-page="index.html">Tools</a>
                    <a href="/contact.html" class="nav-link" data-page="contact.html">Contact</a>
                </div>
                
                <div class="nav-actions">
                    <div class="api-status-indicators" id="nav-status-indicators">
                        <span class="status-dot status-inactive" title="Digikey: Not configured" data-provider="digikey"></span>
                        <span class="status-dot status-inactive" title="Mouser: Not configured" data-provider="mouser"></span>
                    </div>
                    <button id="settings-btn" class="settings-btn" type="button">
                        Settings
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertBefore(nav, document.body.firstChild);
    }

    /**
     * Create enhanced settings modal
     */
    createSettingsModal() {
        if (document.getElementById('settings-modal')) return;
        
        const modal = document.createElement('div');
        modal.id = 'settings-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">API Configuration</h2>
                    <button id="close-settings" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="settings-form">
                        <div class="settings-section">
                            <h3>Digikey API</h3>
                            
                            <div class="form-group">
                                <label for="digikey-environment">Environment</label>
                                <select id="digikey-environment" name="digikeyEnvironment" class="form-input">
                                    <option value="production">Production (Live Data)</option>
                                    <option value="sandbox">Sandbox (Testing)</option>
                                </select>
                                <small class="form-help">Use Sandbox for testing, Production for live component data</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="digikey-client-id">Client ID</label>
                                <input type="text" id="digikey-client-id" name="digikeyClientId" class="form-input" 
                                       placeholder="Enter Digikey Client ID" spellcheck="false">
                                <small class="form-help">Get from <a href="https://developer.digikey.com/" target="_blank" rel="noopener">Digikey Developer Portal</a></small>
                            </div>
                            
                            <div class="form-group">
                                <label for="digikey-client-secret">Client Secret</label>
                                <input type="password" id="digikey-client-secret" name="digikeyClientSecret" class="form-input" 
                                       placeholder="Enter Client Secret" spellcheck="false">
                                <small class="form-help">Keep this secret and never share it</small>
                            </div>
                            
                            <div class="api-status-row">
                                <div class="status-info">
                                    <span>Status: <span id="digikey-status" class="status status-inactive">Not Configured</span></span>
                                    <div id="digikey-details" class="status-details"></div>
                                </div>
                                <button type="button" id="test-digikey" class="btn btn-secondary">Test Connection</button>
                            </div>
                            
                            <div id="digikey-error" class="error-message" style="display: none;"></div>
                        </div>
                        
                        <div class="settings-section">
                            <h3>Mouser API</h3>
                            
                            <div class="form-group">
                                <label for="mouser-api-key">API Key</label>
                                <input type="password" id="mouser-api-key" name="mouserApiKey" class="form-input" 
                                       placeholder="Enter Mouser API Key" spellcheck="false">
                                <small class="form-help">Get your API key from <a href="https://www.mouser.com/api-hub/" target="_blank" rel="noopener">Mouser API Hub</a></small>
                            </div>
                            
                            <div class="api-status-row">
                                <div class="status-info">
                                    <span>Status: <span id="mouser-status" class="status status-inactive">Not Configured</span></span>
                                    <div id="mouser-details" class="status-details"></div>
                                </div>
                                <button type="button" id="test-mouser" class="btn btn-secondary">Test Connection</button>
                            </div>
                            
                            <div id="mouser-error" class="error-message" style="display: none;"></div>
                        </div>
                        
                        <div class="system-info" id="system-info">
                            <h3>System Status</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">API Manager:</span>
                                    <span class="info-value" id="api-manager-status">Loading...</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Storage:</span>
                                    <span class="info-value" id="storage-status">Checking...</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Providers:</span>
                                    <span class="info-value" id="providers-status">Initializing...</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="settings-actions">
                            <button type="submit" class="btn btn-primary">Save Settings</button>
                            <button type="button" id="clear-settings" class="btn btn-danger">Clear All Data</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.settingsModal = modal;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettings());
        }

        // Settings modal events
        if (this.settingsModal) {
            this.settingsModal.querySelector('#close-settings').addEventListener('click', () => this.closeSettings());
            this.settingsModal.querySelector('.modal-overlay').addEventListener('click', () => this.closeSettings());
            this.settingsModal.querySelector('#settings-form').addEventListener('submit', (e) => this.saveSettings(e));
            this.settingsModal.querySelector('#test-digikey').addEventListener('click', () => this.testDigikey());
            this.settingsModal.querySelector('#test-mouser').addEventListener('click', () => this.testMouser());
            this.settingsModal.querySelector('#clear-settings').addEventListener('click', () => this.clearAllSettings());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isSettingsOpen) {
                this.closeSettings();
            }
        });

        // Listen for API events
        window.addEventListener('apiStatusChange', (e) => this.updateApiStatus(e.detail));
        window.addEventListener('apiManagerReady', () => this.onApiManagerReady());
        window.addEventListener('apiAuthSuccess', (e) => this.onAuthSuccess(e.detail));
        window.addEventListener('apiAuthError', (e) => this.onAuthError(e.detail));
    }

    /**
     * Handle API manager ready event
     */
    onApiManagerReady() {
        this.apiReady = true;
        this.updateSystemInfo();
        this.updateNavStatusIndicators();
        console.log('✓ Navigation integrated with API Manager');
    }

    /**
     * Handle authentication success
     * @param {Object} detail - Auth success details
     */
    onAuthSuccess(detail) {
        console.log(`✓ ${detail.provider} authentication successful`);
        this.updateNavStatusIndicators();
    }

    /**
     * Handle authentication error
     * @param {Object} detail - Auth error details
     */
    onAuthError(detail) {
        console.error(`✗ ${detail.provider} authentication failed:`, detail.error);
    }

    /**
     * Open settings modal
     */
    async openSettings() {
        if (!this.settingsModal) return;
        
        this.settingsModal.classList.add('active');
        this.isSettingsOpen = true;
        document.body.style.overflow = 'hidden';
        
        // Wait for API manager if not ready
        if (!this.apiReady) {
            await this.waitForApiManager();
        }
        
        this.loadCurrentSettings();
        this.updateStatusDisplay();
        this.updateSystemInfo();
    }

    /**
     * Close settings modal
     */
    closeSettings() {
        if (!this.settingsModal) return;
        
        this.settingsModal.classList.remove('active');
        this.isSettingsOpen = false;
        document.body.style.overflow = '';
        
        this.clearErrorMessages();
    }

    /**
     * Load current settings into form
     */
    loadCurrentSettings() {
        if (!window.storage) return;
        
        const apiKeys = window.storage.getApiKeys();
        if (!apiKeys) return;
        
        const form = this.settingsModal.querySelector('#settings-form');
        
        // Digikey settings
        if (apiKeys.digikeyClientId) {
            form.digikeyClientId.value = apiKeys.digikeyClientId;
        }
        if (apiKeys.digikeyClientSecret) {
            form.digikeyClientSecret.value = '••••••••••••';
        }
        if (apiKeys.digikeyEnvironment) {
            form.digikeyEnvironment.value = apiKeys.digikeyEnvironment;
        }
        
        // Mouser settings
        if (apiKeys.mouserApiKey) {
            form.mouserApiKey.value = '••••••••••••';
        }
    }

    /**
     * Save settings
     */
    async saveSettings(e) {
        e.preventDefault();
        
        if (!window.storage) {
            this.showError('Storage not available', 'general');
            return;
        }
        
        if (!this.apiReady) {
            this.showError('API Manager not ready', 'general');
            return;
        }
        
        const formData = new FormData(e.target);
        const credentials = {};
        
        // Collect form data (only if not masked)
        const digikeyClientId = formData.get('digikeyClientId');
        const digikeyClientSecret = formData.get('digikeyClientSecret');
        const digikeyEnvironment = formData.get('digikeyEnvironment');
        const mouserApiKey = formData.get('mouserApiKey');
        
        if (digikeyClientId && !digikeyClientId.includes('•')) {
            credentials.digikeyClientId = digikeyClientId.trim();
        }
        if (digikeyClientSecret && !digikeyClientSecret.includes('•')) {
            credentials.digikeyClientSecret = digikeyClientSecret.trim();
        }
        if (digikeyEnvironment) {
            credentials.digikeyEnvironment = digikeyEnvironment;
        }
        if (mouserApiKey && !mouserApiKey.includes('•')) {
            credentials.mouserApiKey = mouserApiKey.trim();
        }
        
        // Save to storage
        const existingKeys = window.storage.getApiKeys() || {};
        const updatedKeys = { ...existingKeys, ...credentials };
        
        if (window.storage.saveApiKeys(updatedKeys)) {
            // Update providers with new credentials
            if (credentials.digikeyClientId || credentials.digikeyClientSecret) {
                const digikeyCreds = {
                    clientId: updatedKeys.digikeyClientId,
                    clientSecret: updatedKeys.digikeyClientSecret,
                    environment: updatedKeys.digikeyEnvironment || 'production'
                };
                window.apiManager.getProvider('digikey')?.setCredentials(digikeyCreds);
            }
            
            if (credentials.mouserApiKey) {
                const mouserCreds = {
                    apiKey: updatedKeys.mouserApiKey
                };
                window.apiManager.getProvider('mouser')?.setCredentials(mouserCreds);
            }
            
            window.utils?.showNotification('Settings saved successfully', 'success');
            this.updateStatusDisplay();
            this.updateNavStatusIndicators();
            this.clearErrorMessages();
        } else {
            this.showError('Failed to save settings', 'general');
        }
    }

    /**
     * Test Digikey connection
     */
    async testDigikey() {
        if (!this.apiReady) {
            this.showError('API Manager not ready', 'digikey');
            return;
        }
        
        const form = this.settingsModal.querySelector('#settings-form');
        const clientId = form.digikeyClientId.value.trim();
        const clientSecret = form.digikeyClientSecret.value.trim();
        const environment = form.digikeyEnvironment.value;
        
        if (!clientId || !clientSecret || clientSecret.includes('•')) {
            this.showError('Please enter valid Digikey Client ID and Secret', 'digikey');
            return;
        }
        
        const testBtn = this.settingsModal.querySelector('#test-digikey');
        const originalText = testBtn.textContent;
        testBtn.disabled = true;
        testBtn.textContent = 'Testing...';
        
        this.clearErrorMessages();
        
        try {
            console.log(`Testing Digikey connection (${environment})...`);
            
            const result = await window.apiManager.testDigikeyConnection(clientId, clientSecret, environment);
            
            if (result) {
                window.utils?.showNotification(`Digikey ${environment} connection successful`, 'success');
                this.updateDigikeyDetails(`Connected to ${environment} environment`);
            } else {
                this.showError(`Digikey ${environment} connection failed`, 'digikey');
            }
        } catch (error) {
            console.error('Digikey test error:', error);
            this.showError(`Digikey test failed: ${error.message}`, 'digikey');
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = originalText;
            this.updateNavStatusIndicators();
        }
    }

    /**
     * Test Mouser connection
     */
    async testMouser() {
        if (!this.apiReady) {
            this.showError('API Manager not ready', 'mouser');
            return;
        }
        
        const form = this.settingsModal.querySelector('#settings-form');
        const apiKey = form.mouserApiKey.value.trim();
        
        if (!apiKey || apiKey.includes('•')) {
            this.showError('Please enter a valid Mouser API key', 'mouser');
            return;
        }
        
        const testBtn = this.settingsModal.querySelector('#test-mouser');
        const originalText = testBtn.textContent;
        testBtn.disabled = true;
        testBtn.textContent = 'Testing...';
        
        this.clearErrorMessages();
        
        try {
            console.log('Testing Mouser connection...');
            
            const result = await window.apiManager.testMouserConnection(apiKey);
            
            if (result) {
                window.utils?.showNotification('Mouser connection successful', 'success');
                this.updateMouserDetails('Connected successfully');
            } else {
                this.showError('Mouser connection failed', 'mouser');
            }
        } catch (error) {
            console.error('Mouser test error:', error);
            this.showError(`Mouser test failed: ${error.message}`, 'mouser');
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = originalText;
            this.updateNavStatusIndicators();
        }
    }

    /**
     * Update navigation status indicators
     */
    updateNavStatusIndicators() {
        if (!this.apiReady) return;
        
        const indicators = document.getElementById('nav-status-indicators');
        if (!indicators) return;
        
        const status = window.apiManager.getStatus();
        
        // Update Digikey indicator
        const digikeyDot = indicators.querySelector('[data-provider="digikey"]');
        if (digikeyDot) {
            const digikeyStatus = status.digikey.authenticated ? 'active' : 
                                status.digikey.status === 'error' ? 'error' : 'inactive';
            digikeyDot.className = `status-dot status-${digikeyStatus}`;
            digikeyDot.title = `Digikey: ${this.formatStatusForTooltip(status.digikey)}`;
        }
        
        // Update Mouser indicator
        const mouserDot = indicators.querySelector('[data-provider="mouser"]');
        if (mouserDot) {
            const mouserStatus = status.mouser.authenticated ? 'active' : 
                               status.mouser.status === 'error' ? 'error' : 'inactive';
            mouserDot.className = `status-dot status-${mouserStatus}`;
            mouserDot.title = `Mouser: ${this.formatStatusForTooltip(status.mouser)}`;
        }
    }

    /**
     * Update system information display
     */
    updateSystemInfo() {
        const apiManagerStatus = document.getElementById('api-manager-status');
        const storageStatus = document.getElementById('storage-status');
        const providersStatus = document.getElementById('providers-status');
        
        if (apiManagerStatus) {
            apiManagerStatus.textContent = this.apiReady ? 'Ready' : 'Loading...';
            apiManagerStatus.className = this.apiReady ? 'status-success' : 'status-warning';
        }
        
        if (storageStatus) {
            const available = window.storage?.isAvailable();
            storageStatus.textContent = available ? 'Available' : 'Unavailable';
            storageStatus.className = available ? 'status-success' : 'status-error';
        }
        
        if (providersStatus) {
            const providerCount = this.apiReady ? 2 : 0;
            providersStatus.textContent = `${providerCount}/2 loaded`;
            providersStatus.className = providerCount === 2 ? 'status-success' : 'status-warning';
        }
    }

    /**
     * Helper methods for status display
     */
    updateDigikeyDetails(message) {
        const details = this.settingsModal?.querySelector('#digikey-details');
        if (details) {
            details.textContent = message;
        }
    }

    updateMouserDetails(message) {
        const details = this.settingsModal?.querySelector('#mouser-details');
        if (details) {
            details.textContent = message;
        }
    }

    formatStatusForTooltip(statusObj) {
        if (statusObj.authenticated) {
            return 'Connected';
        } else if (statusObj.hasCredentials) {
            return 'Configured';
        } else {
            return 'Not configured';
        }
    }

    /**
     * Update API status display
     */
    updateApiStatus(statusChange) {
        const { provider, status, message } = statusChange;
        const statusElement = this.settingsModal?.querySelector(`#${provider}-status`);
        
        if (statusElement) {
            statusElement.textContent = this.formatStatus(status);
            statusElement.className = `status status-${status}`;
        }
        
        // Update details if message provided
        if (message) {
            if (provider === 'digikey') {
                this.updateDigikeyDetails(message);
            } else if (provider === 'mouser') {
                this.updateMouserDetails(message);
            }
        }
        
        this.updateNavStatusIndicators();
    }

    /**
     * Update status display based on stored credentials
     */
    updateStatusDisplay() {
        if (!window.storage || !this.apiReady) return;
        
        const status = window.apiManager.getStatus();
        
        // Update Digikey status
        const digikeyStatus = this.settingsModal?.querySelector('#digikey-status');
        if (digikeyStatus) {
            const text = status.digikey.authenticated ? 'Connected' :
                        status.digikey.hasCredentials ? 'Configured' : 'Not Configured';
            const statusClass = status.digikey.authenticated ? 'active' : 'inactive';
            
            digikeyStatus.textContent = text;
            digikeyStatus.className = `status status-${statusClass}`;
        }
        
        // Update Mouser status
        const mouserStatus = this.settingsModal?.querySelector('#mouser-status');
        if (mouserStatus) {
            const text = status.mouser.authenticated ? 'Connected' :
                        status.mouser.hasCredentials ? 'Configured' : 'Not Configured';
            const statusClass = status.mouser.authenticated ? 'active' : 'inactive';
            
            mouserStatus.textContent = text;
            mouserStatus.className = `status status-${statusClass}`;
        }
    }

    /**
     * Clear all settings
     */
    clearAllSettings() {
        if (!confirm('Clear all saved data? This will remove all API credentials and cannot be undone.')) {
            return;
        }
        
        if (window.storage?.clearAll()) {
            if (window.apiManager) {
                window.apiManager.clearAll();
            }
            
            window.utils?.showNotification('All data cleared', 'success');
            
            const form = this.settingsModal.querySelector('#settings-form');
            form.reset();
            
            this.updateStatusDisplay();
            this.updateNavStatusIndicators();
            this.clearErrorMessages();
        } else {
            this.showError('Failed to clear data', 'general');
        }
    }

    /**
     * Show error message
     */
    showError(message, provider) {
        const errorElement = this.settingsModal?.querySelector(`#${provider}-error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        
        window.utils?.showNotification(message, 'error');
    }

    /**
     * Clear error messages
     */
    clearErrorMessages() {
        const errorElements = this.settingsModal?.querySelectorAll('.error-message');
        if (errorElements) {
            errorElements.forEach(el => {
                el.style.display = 'none';
                el.textContent = '';
            });
        }
    }

    /**
     * Format status for display
     */
    formatStatus(status) {
        const statusMap = {
            'active': 'Connected',
            'inactive': 'Not Connected',
            'connecting': 'Connecting...',
            'error': 'Connection Failed'
        };
        return statusMap[status] || status;
    }

    /**
     * Update active navigation link
     */
    updateActiveNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const linkPage = link.dataset.page;
            if (linkPage === this.currentPage || 
                (this.currentPage === '' && linkPage === 'index.html')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    /**
     * Get current page name
     */
    getCurrentPage() {
        const path = window.location.pathname;
        return path.split('/').pop() || 'index.html';
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.navigationManager = new NavigationManager();
    });
} else {
    window.navigationManager = new NavigationManager();
}