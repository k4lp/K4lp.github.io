/**
 * Navigation Manager - Enhanced with robust API testing
 * Proper integration with improved ApiManager
 * Handles environment selection and comprehensive error reporting
 */

class NavigationManager {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.settingsModal = null;
        this.isSettingsOpen = false;
        
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
        
        console.log('Navigation Manager initialized');
    }

    /**
     * Create navigation HTML
     */
    createNavigation() {
        const existingNav = document.querySelector('.navbar');
        if (existingNav) return; // Already exists
        
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
                    <button id="settings-btn" class="settings-btn" type="button">
                        Settings
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertBefore(nav, document.body.firstChild);
    }

    /**
     * Create enhanced settings modal with environment selection
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
                                    <option value="production">Production</option>
                                    <option value="sandbox">Sandbox (Testing)</option>
                                </select>
                                <small class="form-help">Use Sandbox for testing, Production for live data</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="digikey-client-id">Client ID</label>
                                <input type="text" id="digikey-client-id" name="digikeyClientId" class="form-input" placeholder="Enter Client ID">
                            </div>
                            
                            <div class="form-group">
                                <label for="digikey-client-secret">Client Secret</label>
                                <input type="password" id="digikey-client-secret" name="digikeyClientSecret" class="form-input" placeholder="Enter Client Secret">
                            </div>
                            
                            <div class="api-status-row">
                                <span>Status: <span id="digikey-status" class="status status-inactive">Not Configured</span></span>
                                <button type="button" id="test-digikey" class="btn btn-secondary">Test Connection</button>
                            </div>
                            
                            <div id="digikey-error" class="error-message" style="display: none;"></div>
                        </div>
                        
                        <div class="settings-section">
                            <h3>Mouser API</h3>
                            
                            <div class="form-group">
                                <label for="mouser-api-key">API Key</label>
                                <input type="password" id="mouser-api-key" name="mouserApiKey" class="form-input" placeholder="Enter API Key">
                                <small class="form-help">Get your API key from <a href="https://www.mouser.com/api-hub" target="_blank" rel="noopener">Mouser API Hub</a></small>
                            </div>
                            
                            <div class="api-status-row">
                                <span>Status: <span id="mouser-status" class="status status-inactive">Not Configured</span></span>
                                <button type="button" id="test-mouser" class="btn btn-secondary">Test Connection</button>
                            </div>
                            
                            <div id="mouser-error" class="error-message" style="display: none;"></div>
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
            // Close modal
            this.settingsModal.querySelector('#close-settings').addEventListener('click', () => this.closeSettings());
            this.settingsModal.querySelector('.modal-overlay').addEventListener('click', () => this.closeSettings());
            
            // Form submission
            this.settingsModal.querySelector('#settings-form').addEventListener('submit', (e) => this.saveSettings(e));
            
            // Test buttons
            this.settingsModal.querySelector('#test-digikey').addEventListener('click', () => this.testDigikey());
            this.settingsModal.querySelector('#test-mouser').addEventListener('click', () => this.testMouser());
            
            // Clear button
            this.settingsModal.querySelector('#clear-settings').addEventListener('click', () => this.clearAllSettings());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isSettingsOpen) {
                this.closeSettings();
            }
        });

        // Listen for API status changes
        window.addEventListener('apiStatusChange', (e) => this.updateApiStatus(e.detail));
    }

    /**
     * Open settings modal
     */
    openSettings() {
        if (!this.settingsModal) return;
        
        this.settingsModal.classList.add('active');
        this.isSettingsOpen = true;
        document.body.style.overflow = 'hidden';
        
        this.loadCurrentSettings();
        this.updateStatusDisplay();
    }

    /**
     * Close settings modal
     */
    closeSettings() {
        if (!this.settingsModal) return;
        
        this.settingsModal.classList.remove('active');
        this.isSettingsOpen = false;
        document.body.style.overflow = '';
        
        // Clear any error messages
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
     * Save settings with environment support
     * @param {Event} e - Form submit event
     */
    saveSettings(e) {
        e.preventDefault();
        
        if (!window.storage) {
            this.showError('Storage not available', 'general');
            return;
        }
        
        const formData = new FormData(e.target);
        const credentials = {};
        
        // Only save if not masked
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
        
        // Merge with existing credentials
        const existingKeys = window.storage.getApiKeys() || {};
        const updatedKeys = { ...existingKeys, ...credentials };
        
        if (window.storage.saveApiKeys(updatedKeys)) {
            window.utils?.showNotification('Settings saved successfully', 'success');
            this.updateStatusDisplay();
            this.clearErrorMessages();
        } else {
            this.showError('Failed to save settings', 'general');
        }
    }

    /**
     * Test Digikey connection with comprehensive error handling
     */
    async testDigikey() {
        if (!window.apiManager) {
            this.showError('API Manager not available', 'digikey');
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
            } else {
                this.showError(`Digikey ${environment} connection failed - please verify your credentials`, 'digikey');
            }
        } catch (error) {
            console.error('Digikey test error:', error);
            this.showError(`Digikey test failed: ${error.message}`, 'digikey');
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = originalText;
        }
    }

    /**
     * Test Mouser connection with comprehensive error handling
     */
    async testMouser() {
        if (!window.apiManager) {
            this.showError('API Manager not available', 'mouser');
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
            } else {
                this.showError('Mouser connection failed - please verify your API key', 'mouser');
            }
        } catch (error) {
            console.error('Mouser test error:', error);
            this.showError(`Mouser test failed: ${error.message}`, 'mouser');
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = originalText;
        }
    }

    /**
     * Clear all settings
     */
    clearAllSettings() {
        if (!confirm('Clear all saved data? This cannot be undone.')) {
            return;
        }
        
        if (window.storage?.clearAll()) {
            window.utils?.showNotification('All data cleared', 'success');
            
            // Clear API manager authentication
            if (window.apiManager) {
                window.apiManager.clearAuth();
            }
            
            // Reset form
            const form = this.settingsModal.querySelector('#settings-form');
            form.reset();
            
            this.updateStatusDisplay();
            this.clearErrorMessages();
        } else {
            this.showError('Failed to clear data', 'general');
        }
    }

    /**
     * Update API status display from events
     * @param {Object} statusChange - Status change event detail
     */
    updateApiStatus(statusChange) {
        const { provider, status } = statusChange;
        const statusElement = this.settingsModal?.querySelector(`#${provider}-status`);
        
        if (statusElement) {
            statusElement.textContent = this.formatStatus(status);
            statusElement.className = `status status-${status}`;
        }
    }

    /**
     * Update status display based on stored credentials
     */
    updateStatusDisplay() {
        if (!window.storage) return;
        
        const hasKeys = window.storage.hasApiKeys();
        
        // Update Digikey status
        const digikeyStatus = this.settingsModal?.querySelector('#digikey-status');
        if (digikeyStatus) {
            let status, text;
            
            if (window.apiManager?.isAuthenticated('digikey')) {
                status = 'active';
                text = 'Connected';
            } else if (hasKeys.digikey) {
                status = 'inactive';
                text = 'Configured';
            } else {
                status = 'inactive';
                text = 'Not Configured';
            }
            
            digikeyStatus.textContent = text;
            digikeyStatus.className = `status status-${status}`;
        }
        
        // Update Mouser status
        const mouserStatus = this.settingsModal?.querySelector('#mouser-status');
        if (mouserStatus) {
            let status, text;
            
            if (window.apiManager?.isAuthenticated('mouser')) {
                status = 'active';
                text = 'Connected';
            } else if (hasKeys.mouser) {
                status = 'inactive';
                text = 'Configured';
            } else {
                status = 'inactive';
                text = 'Not Configured';
            }
            
            mouserStatus.textContent = text;
            mouserStatus.className = `status status-${status}`;
        }
    }

    /**
     * Show error message in appropriate section
     * @param {string} message - Error message
     * @param {string} provider - 'digikey', 'mouser', or 'general'
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
     * Clear all error messages
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
     * @param {string} status - Status value
     * @returns {string} Formatted status
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
     * @returns {string} Current page filename
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