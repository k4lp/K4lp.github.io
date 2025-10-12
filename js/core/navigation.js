/**
 * Enhanced Navigation System
 * Handles top navbar, settings modal, API status display, and navigation state
 * Part of K4LP Engineering Tools - Swiss Minimalist Design
 * @version 2.0.0
 */

class NavigationManager {
    constructor() {
        this.version = '2.0.0';
        
        // DOM elements
        this.navbar = null;
        this.settingsButton = null;
        this.settingsModal = null;
        this.statusIndicators = new Map();
        
        // State management
        this.currentPage = '';
        this.isSettingsOpen = false;
        this.apiStatuses = {
            digikey: 'inactive',
            mouser: 'inactive'
        };
        
        // Modal content template
        this.settingsModalTemplate = `
            <div class="modal-backdrop" id="settings-modal-backdrop">
                <div class="modal-content settings-modal">
                    <div class="modal-header">
                        <h2>API Settings</h2>
                        <button class="modal-close" id="close-settings" aria-label="Close settings">&times;</button>
                    </div>
                    <div class="modal-body">
                        <!-- Digikey Settings -->
                        <div class="settings-section">
                            <div class="settings-header">
                                <h3>Digikey API v4</h3>
                                <div class="status-indicator" id="digikey-status">
                                    <span class="status-dot status--inactive"></span>
                                    <span class="status-text">Inactive</span>
                                </div>
                            </div>
                            <div class="settings-form">
                                <div class="field">
                                    <label for="digikey-client-id">Client ID</label>
                                    <input type="text" id="digikey-client-id" placeholder="Enter Digikey Client ID" autocomplete="off">
                                </div>
                                <div class="field">
                                    <label for="digikey-client-secret">Client Secret</label>
                                    <input type="password" id="digikey-client-secret" placeholder="Enter Digikey Client Secret" autocomplete="new-password">
                                </div>
                                <div class="field field--checkbox">
                                    <label>
                                        <input type="checkbox" id="digikey-sandbox"> Use Sandbox Environment
                                    </label>
                                    <p class="help">Enable for testing with Digikey sandbox API</p>
                                </div>
                                <div class="field-actions">
                                    <button class="btn btn--secondary" id="test-digikey">Test Connection</button>
                                    <button class="btn btn--primary" id="save-digikey">Save & Authenticate</button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Mouser Settings -->
                        <div class="settings-section">
                            <div class="settings-header">
                                <h3>Mouser API</h3>
                                <div class="status-indicator" id="mouser-status">
                                    <span class="status-dot status--inactive"></span>
                                    <span class="status-text">Inactive</span>
                                </div>
                            </div>
                            <div class="settings-form">
                                <div class="field">
                                    <label for="mouser-api-key">API Key</label>
                                    <input type="password" id="mouser-api-key" placeholder="Enter Mouser API Key" autocomplete="new-password">
                                </div>
                                <div class="field-actions">
                                    <button class="btn btn--secondary" id="test-mouser">Test Connection</button>
                                    <button class="btn btn--primary" id="save-mouser">Save & Configure</button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Debug Information -->
                        <div class="settings-section">
                            <div class="settings-header">
                                <h3>Debug Information</h3>
                            </div>
                            <div class="debug-info">
                                <div class="debug-item">
                                    <label>Storage Status:</label>
                                    <span id="storage-status">Loading...</span>
                                </div>
                                <div class="debug-item">
                                    <label>API Manager:</label>
                                    <span id="api-manager-status">Loading...</span>
                                </div>
                                <div class="debug-item">
                                    <label>Last Request:</label>
                                    <span id="last-request-time">Never</span>
                                </div>
                                <button class="btn btn--ghost btn--small" id="show-detailed-debug">Show Detailed Debug</button>
                            </div>
                        </div>
                        
                        <!-- Actions -->
                        <div class="settings-actions">
                            <button class="btn btn--danger" id="clear-all-data">Clear All Data</button>
                            <button class="btn btn--secondary" id="export-settings">Export Settings</button>
                            <button class="btn btn--secondary" id="import-settings">Import Settings</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    /**
     * Initialize navigation system
     */
    initialize() {
        try {
            this.detectCurrentPage();
            this.findNavElements();
            this.createSettingsModal();
            this.setupEventListeners();
            this.loadApiStatuses();
            this.startStatusPolling();
            
            console.log('✓ K4LP Navigation Manager v2.0.0 initialized');
        } catch (error) {
            console.error('Navigation initialization failed:', error);
        }
    }

    /**
     * Detect current page from URL
     */
    detectCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'index.html';
        this.currentPage = filename.replace('.html', '');
        
        // Add page class to body
        document.body.classList.add(`page--${this.currentPage}`);
    }

    /**
     * Find navigation elements in DOM
     */
    findNavElements() {
        this.navbar = document.querySelector('.navbar');
        this.settingsButton = document.querySelector('[href="settings.html"], [data-action="open-settings"]');
        
        if (!this.settingsButton) {
            // Create settings button if it doesn't exist
            this.createSettingsButton();
        }
    }

    /**
     * Create settings button if it doesn't exist
     */
    createSettingsButton() {
        if (this.navbar) {
            const navLinks = this.navbar.querySelector('.navbar__links');
            if (navLinks) {
                const settingsButton = document.createElement('button');
                settingsButton.className = 'btn btn--ghost';
                settingsButton.setAttribute('data-action', 'open-settings');
                settingsButton.setAttribute('aria-label', 'Settings');
                settingsButton.innerHTML = `
                    <span class="icon icon--gear" aria-hidden="true">⚙️</span>
                    <span class="label">Settings</span>
                `;
                navLinks.appendChild(settingsButton);
                this.settingsButton = settingsButton;
            }
        }
    }

    /**
     * Create settings modal
     */
    createSettingsModal() {
        // Remove existing modal if present
        const existingModal = document.getElementById('settings-modal-backdrop');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create and insert modal
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = this.settingsModalTemplate;
        document.body.appendChild(modalContainer.firstElementChild);
        
        this.settingsModal = document.getElementById('settings-modal-backdrop');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Settings button click
        if (this.settingsButton) {
            this.settingsButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.openSettings();
            });
        }
        
        // Modal close events
        const closeButton = document.getElementById('close-settings');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.closeSettings());
        }
        
        // Backdrop click to close
        if (this.settingsModal) {
            this.settingsModal.addEventListener('click', (e) => {
                if (e.target === this.settingsModal) {
                    this.closeSettings();
                }
            });
        }
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isSettingsOpen) {
                this.closeSettings();
            }
        });
        
        // API form handlers
        this.setupApiFormHandlers();
        
        // Debug handlers
        this.setupDebugHandlers();
        
        // API status change listeners
        if (window.eventBus) {
            window.eventBus.on('api-status-changed', (data) => {
                this.updateApiStatus(data.provider, data.status);
            });
        }
    }

    /**
     * Setup API form event handlers
     */
    setupApiFormHandlers() {
        // Digikey handlers
        const saveDigikey = document.getElementById('save-digikey');
        const testDigikey = document.getElementById('test-digikey');
        
        if (saveDigikey) {
            saveDigikey.addEventListener('click', () => this.saveDigikeySettings());
        }
        
        if (testDigikey) {
            testDigikey.addEventListener('click', () => this.testDigikeyConnection());
        }
        
        // Mouser handlers
        const saveMouser = document.getElementById('save-mouser');
        const testMouser = document.getElementById('test-mouser');
        
        if (saveMouser) {
            saveMouser.addEventListener('click', () => this.saveMouserSettings());
        }
        
        if (testMouser) {
            testMouser.addEventListener('click', () => this.testMouserConnection());
        }
    }

    /**
     * Setup debug event handlers
     */
    setupDebugHandlers() {
        const clearAllData = document.getElementById('clear-all-data');
        const exportSettings = document.getElementById('export-settings');
        const importSettings = document.getElementById('import-settings');
        const showDetailedDebug = document.getElementById('show-detailed-debug');
        
        if (clearAllData) {
            clearAllData.addEventListener('click', () => this.clearAllData());
        }
        
        if (exportSettings) {
            exportSettings.addEventListener('click', () => this.exportSettings());
        }
        
        if (importSettings) {
            importSettings.addEventListener('click', () => this.importSettings());
        }
        
        if (showDetailedDebug) {
            showDetailedDebug.addEventListener('click', () => this.showDetailedDebug());
        }
    }

    /**
     * Open settings modal
     */
    openSettings() {
        if (!this.settingsModal) return;
        
        this.isSettingsOpen = true;
        this.settingsModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Load current settings
        this.loadCurrentSettings();
        this.updateDebugInfo();
        
        // Focus first input
        setTimeout(() => {
            const firstInput = this.settingsModal.querySelector('input');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    /**
     * Close settings modal
     */
    closeSettings() {
        if (!this.settingsModal) return;
        
        this.isSettingsOpen = false;
        this.settingsModal.style.display = 'none';
        document.body.style.overflow = '';
    }

    /**
     * Load current settings into modal
     */
    loadCurrentSettings() {
        if (!window.storage) return;
        
        try {
            // Load Digikey settings
            const digikeyCredentials = window.storage.getDigikeyCredentials();
            const digikeyClientId = document.getElementById('digikey-client-id');
            const digikeyClientSecret = document.getElementById('digikey-client-secret');
            const digikeySandbox = document.getElementById('digikey-sandbox');
            
            if (digikeyClientId) digikeyClientId.value = digikeyCredentials.clientId || '';
            if (digikeyClientSecret) digikeyClientSecret.value = digikeyCredentials.clientSecret || '';
            
            // Load sandbox preference
            const sandboxSetting = window.storage.getItem('digikey_environment');
            if (digikeySandbox && sandboxSetting) {
                digikeySandbox.checked = sandboxSetting.useSandbox || false;
            }
            
            // Load Mouser settings
            const mouserCredentials = window.storage.getMouserCredentials();
            const mouserApiKey = document.getElementById('mouser-api-key');
            
            if (mouserApiKey) mouserApiKey.value = mouserCredentials.apiKey || '';
            
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    /**
     * Save Digikey settings
     */
    async saveDigikeySettings() {
        const clientId = document.getElementById('digikey-client-id')?.value?.trim();
        const clientSecret = document.getElementById('digikey-client-secret')?.value?.trim();
        const useSandbox = document.getElementById('digikey-sandbox')?.checked || false;
        
        if (!clientId || !clientSecret) {
            this.showNotification('Please enter both Client ID and Client Secret', 'error');
            return;
        }
        
        try {
            this.updateApiStatus('digikey', 'connecting');
            
            if (!window.apiManager) {
                throw new Error('API Manager not available');
            }
            
            // Set sandbox mode
            window.apiManager.setSandboxMode(useSandbox);
            
            // Authenticate
            const success = await window.apiManager.authenticateDigikey(clientId, clientSecret, true, useSandbox);
            
            if (success) {
                this.showNotification('Digikey settings saved and authenticated successfully!', 'success');
                this.updateApiStatus('digikey', 'active');
            } else {
                throw new Error('Authentication failed');
            }
            
        } catch (error) {
            console.error('Digikey save error:', error);
            this.updateApiStatus('digikey', 'error');
            this.showNotification(`Digikey error: ${error.message}`, 'error');
        }
    }

    /**
     * Save Mouser settings
     */
    async saveMouserSettings() {
        const apiKey = document.getElementById('mouser-api-key')?.value?.trim();
        
        if (!apiKey) {
            this.showNotification('Please enter Mouser API Key', 'error');
            return;
        }
        
        try {
            this.updateApiStatus('mouser', 'connecting');
            
            if (!window.apiManager) {
                throw new Error('API Manager not available');
            }
            
            // Set API key
            const success = window.apiManager.setMouserApiKey(apiKey, true);
            
            if (success) {
                // Test the connection
                await window.apiManager.testMouserConnection();
                this.showNotification('Mouser settings saved and configured successfully!', 'success');
                this.updateApiStatus('mouser', 'active');
            } else {
                throw new Error('Configuration failed');
            }
            
        } catch (error) {
            console.error('Mouser save error:', error);
            this.updateApiStatus('mouser', 'error');
            this.showNotification(`Mouser error: ${error.message}`, 'error');
        }
    }

    /**
     * Test Digikey connection
     */
    async testDigikeyConnection() {
        const clientId = document.getElementById('digikey-client-id')?.value?.trim();
        const clientSecret = document.getElementById('digikey-client-secret')?.value?.trim();
        const useSandbox = document.getElementById('digikey-sandbox')?.checked || false;
        
        if (!clientId || !clientSecret) {
            this.showNotification('Please enter credentials first', 'warning');
            return;
        }
        
        try {
            this.updateApiStatus('digikey', 'connecting');
            
            if (!window.apiManager) {
                throw new Error('API Manager not available');
            }
            
            // Test authentication (without saving)
            const success = await window.apiManager.authenticateDigikey(clientId, clientSecret, false, useSandbox);
            
            if (success) {
                const envLabel = useSandbox ? 'Sandbox' : 'Production';
                this.showNotification(`Digikey ${envLabel} connection test successful!`, 'success');
                this.updateApiStatus('digikey', 'active');
            } else {
                throw new Error('Authentication failed');
            }
            
        } catch (error) {
            console.error('Digikey test error:', error);
            this.updateApiStatus('digikey', 'error');
            this.showNotification(`Digikey test failed: ${error.message}`, 'error');
        }
    }

    /**
     * Test Mouser connection
     */
    async testMouserConnection() {
        const apiKey = document.getElementById('mouser-api-key')?.value?.trim();
        
        if (!apiKey) {
            this.showNotification('Please enter API key first', 'warning');
            return;
        }
        
        try {
            this.updateApiStatus('mouser', 'connecting');
            
            if (!window.apiManager) {
                throw new Error('API Manager not available');
            }
            
            // Test with temporary setup
            const tempApiManager = { ...window.apiManager };
            tempApiManager.setMouserApiKey(apiKey, false);
            
            await tempApiManager.testMouserConnection();
            this.showNotification('Mouser connection test successful!', 'success');
            this.updateApiStatus('mouser', 'active');
            
        } catch (error) {
            console.error('Mouser test error:', error);
            this.updateApiStatus('mouser', 'error');
            this.showNotification(`Mouser test failed: ${error.message}`, 'error');
        }
    }

    /**
     * Update API status indicator
     */
    updateApiStatus(provider, status) {
        this.apiStatuses[provider] = status;
        
        const statusElement = document.getElementById(`${provider}-status`);
        if (!statusElement) return;
        
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('.status-text');
        
        if (dot) {
            // Remove all status classes
            dot.className = 'status-dot';
            dot.classList.add(`status--${status}`);
        }
        
        if (text) {
            text.textContent = this.formatStatusText(status);
        }
        
        console.log(`🔄 ${provider} status: ${status}`);
    }

    /**
     * Format status text for display
     */
    formatStatusText(status) {
        const statusMap = {
            'inactive': 'Inactive',
            'connecting': 'Connecting...',
            'active': 'Active',
            'error': 'Error',
            'rate_limited': 'Rate Limited'
        };
        
        return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
    }

    /**
     * Load API statuses on initialization
     */
    loadApiStatuses() {
        if (window.apiManager) {
            const statuses = window.apiManager.getApiStatuses();
            Object.entries(statuses).forEach(([provider, status]) => {
                this.updateApiStatus(provider, status);
            });
        }
    }

    /**
     * Start polling for API status updates
     */
    startStatusPolling() {
        setInterval(() => {
            if (window.apiManager) {
                const statuses = window.apiManager.getApiStatuses();
                Object.entries(statuses).forEach(([provider, status]) => {
                    if (this.apiStatuses[provider] !== status) {
                        this.updateApiStatus(provider, status);
                    }
                });
            }
        }, 5000); // Poll every 5 seconds
    }

    /**
     * Update debug information
     */
    updateDebugInfo() {
        const storageStatus = document.getElementById('storage-status');
        const apiManagerStatus = document.getElementById('api-manager-status');
        const lastRequestTime = document.getElementById('last-request-time');
        
        if (storageStatus) {
            storageStatus.textContent = window.storage ? 'Available' : 'Not Available';
        }
        
        if (apiManagerStatus) {
            apiManagerStatus.textContent = window.apiManager ? 'Available' : 'Not Available';
        }
        
        if (lastRequestTime && window.apiManager) {
            const debugInfo = window.apiManager.getDebugInfo();
            const lastDigikey = debugInfo.metrics?.digikey?.lastRequestTime;
            const lastMouser = debugInfo.metrics?.mouser?.lastRequestTime;
            
            const latest = Math.max(lastDigikey || 0, lastMouser || 0);
            lastRequestTime.textContent = latest > 0 ? new Date(latest).toLocaleString() : 'Never';
        }
    }

    /**
     * Show detailed debug information
     */
    showDetailedDebug() {
        if (!window.apiManager) {
            alert('API Manager not available');
            return;
        }
        
        const debugInfo = window.apiManager.getDebugInfo();
        const formattedInfo = JSON.stringify(debugInfo, null, 2);
        
        // Create a modal or console log
        console.log('Detailed Debug Info:', debugInfo);
        
        // Show in a simple text area modal
        const debugModal = document.createElement('div');
        debugModal.className = 'modal-backdrop';
        debugModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Debug Information</h3>
                    <button class="modal-close" onclick="this.closest('.modal-backdrop').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <textarea readonly style="width: 100%; height: 400px; font-family: monospace; font-size: 12px;">${formattedInfo}</textarea>
                </div>
            </div>
        `;
        
        document.body.appendChild(debugModal);
        
        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (debugModal.parentNode) {
                debugModal.remove();
            }
        }, 30000);
    }

    /**
     * Clear all stored data
     */
    clearAllData() {
        if (!confirm('Are you sure you want to clear all stored data? This cannot be undone.')) {
            return;
        }
        
        try {
            if (window.storage) {
                window.storage.clear();
            }
            
            if (window.apiManager) {
                window.apiManager.clearAuthentication();
            }
            
            // Clear form fields
            const inputs = this.settingsModal.querySelectorAll('input');
            inputs.forEach(input => {
                if (input.type === 'checkbox') {
                    input.checked = false;
                } else {
                    input.value = '';
                }
            });
            
            // Reset statuses
            this.updateApiStatus('digikey', 'inactive');
            this.updateApiStatus('mouser', 'inactive');
            
            this.showNotification('All data cleared successfully', 'success');
            
        } catch (error) {
            console.error('Error clearing data:', error);
            this.showNotification('Error clearing data: ' + error.message, 'error');
        }
    }

    /**
     * Export settings
     */
    exportSettings() {
        try {
            if (!window.storage) {
                throw new Error('Storage not available');
            }
            
            const exportData = window.storage.exportData();
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `k4lp-settings-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            this.showNotification('Settings exported successfully', 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Export failed: ' + error.message, 'error');
        }
    }

    /**
     * Import settings
     */
    importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const importData = JSON.parse(text);
                
                if (!window.storage) {
                    throw new Error('Storage not available');
                }
                
                const result = window.storage.importData(importData);
                
                if (result.success) {
                    this.showNotification(`Settings imported successfully (${result.imported} items)`, 'success');
                    this.loadCurrentSettings();
                } else {
                    throw new Error(result.error);
                }
                
            } catch (error) {
                console.error('Import error:', error);
                this.showNotification('Import failed: ' + error.message, 'error');
            }
        };
        
        input.click();
    }

    /**
     * Show notification message
     */
    showNotification(message, type = 'info') {
        // Create or update notification element
        let notification = document.querySelector('.notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        
        notification.className = `notification notification--${type}`;
        notification.textContent = message;
        notification.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.display = 'none';
            }
        }, 5000);
        
        console.log(`🔔 ${type.toUpperCase()}: ${message}`);
    }

    /**
     * Get current navigation state
     */
    getState() {
        return {
            currentPage: this.currentPage,
            isSettingsOpen: this.isSettingsOpen,
            apiStatuses: { ...this.apiStatuses }
        };
    }
}

// Create and expose global instance
const navigation = new NavigationManager();
window.navigation = navigation;

// Legacy compatibility
window.NavigationManager = NavigationManager;

// Module export for modern environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationManager;
}

console.log('✓ K4LP Navigation Manager v2.0.0 initialized');
