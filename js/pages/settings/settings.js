/**
 * Settings Page Management
 * Handles API configuration, connection testing, and system monitoring
 * Part of K4LP Engineering Tools - Swiss Minimalist Design
 * @version 2.0.0
 */

class SettingsManager {
    constructor() {
        this.version = '2.0.0';
        
        // State tracking
        this.isInitialized = false;
        this.connectionTests = {
            digikey: { running: false, lastResult: null },
            mouser: { running: false, lastResult: null }
        };
        
        // DOM elements
        this.elements = {};
        
        // Notification system
        this.notificationContainer = null;
        
        // Auto-initialization
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    /**
     * Initialize settings manager
     */
    initialize() {
        try {
            console.log('Initializing Settings Manager v2.0.0...');
            
            // Wait for core systems
            if (!this.checkCoreSystemsReady()) {
                console.warn('Core systems not ready, retrying in 1 second...');
                setTimeout(() => this.initialize(), 1000);
                return;
            }
            
            this.cacheElements();
            this.setupEventListeners();
            this.loadCurrentSettings();
            this.updateSystemStatus();
            this.enableControls();
            
            this.isInitialized = true;
            console.log('✓ Settings Manager v2.0.0 initialized successfully');
            
        } catch (error) {
            console.error('Settings Manager initialization failed:', error);
            this.showError('Initialization failed: ' + error.message);
        }
    }

    /**
     * Check if core systems are ready
     */
    checkCoreSystemsReady() {
        const systems = {
            storage: !!window.storage,
            apiManager: !!window.apiManager,
            utils: !!window.utils
        };
        
        console.log('Core systems status:', systems);
        return Object.values(systems).every(ready => ready);
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        // Status indicators
        this.elements.digikeyStatus = document.getElementById('digikey-status');
        this.elements.mouserStatus = document.getElementById('mouser-status');
        
        // Form inputs
        this.elements.digikeyClientId = document.getElementById('digikey-client-id');
        this.elements.digikeyClientSecret = document.getElementById('digikey-client-secret');
        this.elements.digikeySandbox = document.getElementById('digikey-sandbox');
        this.elements.mouserApiKey = document.getElementById('mouser-api-key');
        
        // Buttons
        this.elements.testDigikey = document.getElementById('test-digikey');
        this.elements.saveDigikey = document.getElementById('save-digikey');
        this.elements.testMouser = document.getElementById('test-mouser');
        this.elements.saveMouser = document.getElementById('save-mouser');
        
        // System info
        this.elements.storageStatus = document.getElementById('storage-status');
        this.elements.apiManagerStatus = document.getElementById('api-manager-status');
        this.elements.utilityManagerStatus = document.getElementById('utility-manager-status');
        this.elements.lastRequestTime = document.getElementById('last-request-time');
        this.elements.storageUsage = document.getElementById('storage-usage');
        this.elements.browserInfo = document.getElementById('browser-info');
        
        // Action buttons
        this.elements.refreshStatus = document.getElementById('refresh-status');
        this.elements.showDetailedDebug = document.getElementById('show-detailed-debug');
        this.elements.testPricing = document.getElementById('test-pricing');
        this.elements.exportSettings = document.getElementById('export-settings');
        this.elements.importSettings = document.getElementById('import-settings');
        this.elements.clearCache = document.getElementById('clear-cache');
        this.elements.clearAllData = document.getElementById('clear-all-data');
        
        // Logs
        this.elements.digikeyLog = document.getElementById('digikey-log');
        this.elements.digikeyLogContent = document.getElementById('digikey-log-content');
        this.elements.mouserLog = document.getElementById('mouser-log');
        this.elements.mouserLogContent = document.getElementById('mouser-log-content');
        
        // Notification container
        this.notificationContainer = document.getElementById('notification-container');
        
        console.log('DOM elements cached successfully');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // API connection buttons
        if (this.elements.testDigikey) {
            this.elements.testDigikey.addEventListener('click', () => this.testDigikeyConnection());
        }
        if (this.elements.saveDigikey) {
            this.elements.saveDigikey.addEventListener('click', () => this.saveDigikeySettings());
        }
        if (this.elements.testMouser) {
            this.elements.testMouser.addEventListener('click', () => this.testMouserConnection());
        }
        if (this.elements.saveMouser) {
            this.elements.saveMouser.addEventListener('click', () => this.saveMouserSettings());
        }
        
        console.log('Event listeners setup successfully');
    }

    /**
     * Load current settings from storage
     */
    loadCurrentSettings() {
        try {
            console.log('Loading current settings...');
            
            if (!window.storage) {
                throw new Error('Storage system not available');
            }
            
            // Load Digikey settings
            const digikeyCredentials = window.storage.getDigikeyCredentials();
            if (this.elements.digikeyClientId) {
                this.elements.digikeyClientId.value = digikeyCredentials.clientId || '';
            }
            if (this.elements.digikeyClientSecret) {
                this.elements.digikeyClientSecret.value = digikeyCredentials.clientSecret || '';
            }
            
            // Load Mouser settings
            const mouserCredentials = window.storage.getMouserCredentials();
            if (this.elements.mouserApiKey) {
                this.elements.mouserApiKey.value = mouserCredentials.apiKey || '';
            }
            
            // Update API statuses
            this.updateApiStatuses();
            
            console.log('Settings loaded successfully');
            
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.showError('Failed to load settings: ' + error.message);
        }
    }

    /**
     * Update API status indicators
     */
    updateApiStatuses() {
        if (window.apiManager) {
            const statuses = window.apiManager.getApiStatuses();
            this.updateStatusIndicator('digikey', statuses.digikey);
            this.updateStatusIndicator('mouser', statuses.mouser);
        } else {
            this.updateStatusIndicator('digikey', 'inactive');
            this.updateStatusIndicator('mouser', 'inactive');
        }
    }

    /**
     * Update individual status indicator
     */
    updateStatusIndicator(provider, status) {
        const statusElement = this.elements[provider + 'Status'];
        if (!statusElement) return;
        
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('.status-text');
        
        if (dot) {
            dot.className = 'status-dot status--' + status;
        }
        
        if (text) {
            text.textContent = this.formatStatusText(status);
        }
        
        console.log(`Status updated: ${provider} -> ${status}`);
    }

    /**
     * Format status text for display
     */
    formatStatusText(status) {
        const statusMap = {
            'inactive': 'Not Configured',
            'connecting': 'Testing Connection...',
            'active': 'Connected',
            'error': 'Connection Failed',
            'rate_limited': 'Rate Limited'
        };
        
        return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
    }

    /**
     * Enable controls after initialization
     */
    enableControls() {
        const buttons = [
            this.elements.testDigikey,
            this.elements.saveDigikey,
            this.elements.testMouser,
            this.elements.saveMouser
        ];
        
        buttons.forEach(button => {
            if (button) {
                button.disabled = false;
            }
        });
    }

    /**
     * Test Digikey connection
     */
    async testDigikeyConnection() {
        if (this.connectionTests.digikey.running) {
            this.showNotification('Digikey test already in progress...', 'warning');
            return;
        }
        
        try {
            this.connectionTests.digikey.running = true;
            this.updateStatusIndicator('digikey', 'connecting');
            
            const clientId = this.elements.digikeyClientId.value.trim();
            const clientSecret = this.elements.digikeyClientSecret.value.trim();
            const useSandbox = this.elements.digikeySandbox.checked;
            
            if (!clientId || !clientSecret) {
                throw new Error('Both Client ID and Client Secret are required');
            }
            
            if (!window.apiManager) {
                throw new Error('API Manager is not available');
            }
            
            console.log(`Testing Digikey with ${useSandbox ? 'Sandbox' : 'Production'} environment...`);
            
            // Test authentication without saving
            const success = await window.apiManager.authenticateDigikey(clientId, clientSecret, false, useSandbox);
            
            if (success) {
                this.updateStatusIndicator('digikey', 'active');
                this.showNotification(`Digikey ${useSandbox ? 'Sandbox' : 'Production'} connection test successful!`, 'success');
                this.connectionTests.digikey.lastResult = { success: true, timestamp: Date.now() };
            } else {
                throw new Error('Authentication failed - check your credentials');
            }
            
        } catch (error) {
            console.error('Digikey test error:', error);
            this.updateStatusIndicator('digikey', 'error');
            this.showNotification(`Digikey test failed: ${error.message}`, 'error');
            this.connectionTests.digikey.lastResult = { success: false, error: error.message, timestamp: Date.now() };
        } finally {
            this.connectionTests.digikey.running = false;
        }
    }

    /**
     * Save Digikey settings
     */
    async saveDigikeySettings() {
        try {
            const clientId = this.elements.digikeyClientId.value.trim();
            const clientSecret = this.elements.digikeyClientSecret.value.trim();
            const useSandbox = this.elements.digikeySandbox.checked;
            
            if (!clientId || !clientSecret) {
                throw new Error('Both Client ID and Client Secret are required');
            }
            
            if (!window.apiManager) {
                throw new Error('API Manager is not available');
            }
            
            this.updateStatusIndicator('digikey', 'connecting');
            console.log('Saving Digikey settings and authenticating...');
            
            // Set sandbox mode first
            window.apiManager.setSandboxMode(useSandbox);
            
            // Authenticate and save
            const success = await window.apiManager.authenticateDigikey(clientId, clientSecret, true, useSandbox);
            
            if (success) {
                this.updateStatusIndicator('digikey', 'active');
                this.showNotification('Digikey settings saved successfully!', 'success');
            } else {
                throw new Error('Authentication failed');
            }
            
        } catch (error) {
            console.error('Digikey save error:', error);
            this.updateStatusIndicator('digikey', 'error');
            this.showNotification(`Failed to save Digikey settings: ${error.message}`, 'error');
        }
    }

    /**
     * Test Mouser connection
     */
    async testMouserConnection() {
        if (this.connectionTests.mouser.running) {
            this.showNotification('Mouser test already in progress...', 'warning');
            return;
        }
        
        try {
            this.connectionTests.mouser.running = true;
            this.updateStatusIndicator('mouser', 'connecting');
            
            const apiKey = this.elements.mouserApiKey.value.trim();
            
            if (!apiKey) {
                throw new Error('API Key is required');
            }
            
            if (!window.apiManager) {
                throw new Error('API Manager is not available');
            }
            
            console.log('Testing Mouser API key...');
            
            // Create temporary API manager instance for testing
            const tempApiManager = Object.create(window.apiManager);
            tempApiManager.setMouserApiKey(apiKey, false);
            
            await tempApiManager.testMouserConnection();
            
            this.updateStatusIndicator('mouser', 'active');
            this.showNotification('Mouser connection test successful!', 'success');
            this.connectionTests.mouser.lastResult = { success: true, timestamp: Date.now() };
            
        } catch (error) {
            console.error('Mouser test error:', error);
            this.updateStatusIndicator('mouser', 'error');
            this.showNotification(`Mouser test failed: ${error.message}`, 'error');
            this.connectionTests.mouser.lastResult = { success: false, error: error.message, timestamp: Date.now() };
        } finally {
            this.connectionTests.mouser.running = false;
        }
    }

    /**
     * Save Mouser settings
     */
    async saveMouserSettings() {
        try {
            const apiKey = this.elements.mouserApiKey.value.trim();
            
            if (!apiKey) {
                throw new Error('API Key is required');
            }
            
            if (!window.apiManager) {
                throw new Error('API Manager is not available');
            }
            
            this.updateStatusIndicator('mouser', 'connecting');
            console.log('Saving Mouser settings and testing connection...');
            
            // Set API key and test
            window.apiManager.setMouserApiKey(apiKey, true);
            await window.apiManager.testMouserConnection();
            
            this.updateStatusIndicator('mouser', 'active');
            this.showNotification('Mouser settings saved successfully!', 'success');
            
        } catch (error) {
            console.error('Mouser save error:', error);
            this.updateStatusIndicator('mouser', 'error');
            this.showNotification(`Failed to save Mouser settings: ${error.message}`, 'error');
        }
    }

    /**
     * Update system status information
     */
    updateSystemStatus() {
        try {
            // Storage status
            if (this.elements.storageStatus) {
                this.elements.storageStatus.textContent = window.storage ? 
                    '✓ Available' : '❌ Not Available';
            }
            
            // API Manager status
            if (this.elements.apiManagerStatus) {
                this.elements.apiManagerStatus.textContent = window.apiManager ? 
                    '✓ Available' : '❌ Not Available';
            }
            
            // Utility Manager status
            if (this.elements.utilityManagerStatus) {
                this.elements.utilityManagerStatus.textContent = window.utils ? 
                    '✓ Available' : '❌ Not Available';
            }
            
            console.log('System status updated');
            
        } catch (error) {
            console.error('Failed to update system status:', error);
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Also try to show in the browser if notification container exists
        if (this.notificationContainer) {
            const notification = document.createElement('div');
            notification.className = `notification notification--${type}`;
            notification.innerHTML = `
                <div class="notification-content">
                    <span class="notification-message">${message}</span>
                    <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                </div>
            `;
            
            this.notificationContainer.appendChild(notification);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 5000);
        }
    }

    /**
     * Show error
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            version: this.version,
            isInitialized: this.isInitialized,
            connectionTests: this.connectionTests,
            coreSystemsReady: this.checkCoreSystemsReady()
        };
    }
}

// Create and expose global instance
const settingsManager = new SettingsManager();
window.settingsManager = settingsManager;

// Legacy compatibility
window.SettingsManager = SettingsManager;

// Module export for modern environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsManager;
}

console.log('✓ K4LP Settings Manager v2.0.0 loaded');
