/**
 * Clean Navigation Manager - Core navigation and settings modal functionality
 * Single-responsibility module for navbar and settings interface
 * Part of K4LP Engineering Tools - Swiss Minimalist Design
 */

class NavigationManager {
    constructor() {
        this.isInitialized = false;
        this.settingsModal = null;
        this.statusElements = {
            digikey: null,
            mouser: null
        };
    }

    /**
     * Initialize navigation system
     */
    init() {
        if (this.isInitialized) return;
        
        this.setupSettingsModal();
        this.setupEventListeners();
        this.loadStoredCredentials();
        
        this.isInitialized = true;
        console.log('Navigation system initialized');
    }

    /**
     * Setup settings modal functionality
     */
    setupSettingsModal() {
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const closeModal = document.getElementById('closeModal');
        const apiSettingsForm = document.getElementById('apiSettingsForm');
        const testConnections = document.getElementById('testConnections');
        
        if (!settingsBtn || !settingsModal) {
            console.warn('Settings modal elements not found');
            return;
        }
        
        this.settingsModal = settingsModal;
        
        // Get status elements
        this.statusElements.digikey = document.getElementById('digikeyStatus');
        this.statusElements.mouser = document.getElementById('mouserStatus');
        
        // Open modal
        settingsBtn.addEventListener('click', () => {
            this.openSettingsModal();
        });
        
        // Close modal
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                this.closeSettingsModal();
            });
        }
        
        // Close on backdrop click
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                this.closeSettingsModal();
            }
        });
        
        // Test connections
        if (testConnections) {
            testConnections.addEventListener('click', () => {
                this.testAllConnections();
            });
        }
        
        // Save settings
        if (apiSettingsForm) {
            apiSettingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveApiSettings();
            });
        }
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && settingsModal.classList.contains('active')) {
                this.closeSettingsModal();
            }
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for API status changes
        window.addEventListener('apiStatusChange', (e) => {
            this.updateApiStatus(e.detail.provider, e.detail.status);
        });
        
        // Update status on page load
        window.addEventListener('load', () => {
            this.updateAllApiStatuses();
        });
    }

    /**
     * Open settings modal
     */
    openSettingsModal() {
        if (this.settingsModal) {
            this.settingsModal.classList.add('active');
            this.loadStoredCredentials();
            this.updateAllApiStatuses();
        }
    }

    /**
     * Close settings modal
     */
    closeSettingsModal() {
        if (this.settingsModal) {
            this.settingsModal.classList.remove('active');
        }
    }

    /**
     * Load stored credentials into form
     */
    loadStoredCredentials() {
        if (!window.storage) return;
        
        const apiKeys = window.storage.getApiKeys();
        if (!apiKeys) return;
        
        // Populate form fields
        const digikeyClientId = document.getElementById('digikeyClientId');
        const digikeyClientSecret = document.getElementById('digikeyClientSecret');
        const mouserApiKey = document.getElementById('mouserApiKey');
        
        if (digikeyClientId && apiKeys.digikeyClientId) {
            digikeyClientId.value = apiKeys.digikeyClientId;
        }
        
        if (digikeyClientSecret && apiKeys.digikeyClientSecret) {
            digikeyClientSecret.value = apiKeys.digikeyClientSecret;
        }
        
        if (mouserApiKey && apiKeys.mouserApiKey) {
            mouserApiKey.value = apiKeys.mouserApiKey;
        }
    }

    /**
     * Save API settings
     */
    async saveApiSettings() {
        const digikeyClientId = document.getElementById('digikeyClientId')?.value?.trim();
        const digikeyClientSecret = document.getElementById('digikeyClientSecret')?.value?.trim();
        const mouserApiKey = document.getElementById('mouserApiKey')?.value?.trim();
        
        // Save to storage
        if (window.storage) {
            const success = window.storage.saveApiKeys({
                digikeyClientId,
                digikeyClientSecret,
                mouserApiKey
            });
            
            if (success) {
                if (window.utils) {
                    window.utils.showNotification('API settings saved successfully', 'success');
                }
                
                // Update API manager credentials if available
                if (window.apiManager) {
                    if (digikeyClientId && digikeyClientSecret) {
                        window.apiManager.credentials.digikey = { 
                            clientId: digikeyClientId, 
                            clientSecret: digikeyClientSecret 
                        };
                    }
                    
                    if (mouserApiKey) {
                        window.apiManager.credentials.mouser = { apiKey: mouserApiKey };
                    }
                }
                
                this.closeSettingsModal();
            } else {
                if (window.utils) {
                    window.utils.showNotification('Failed to save API settings', 'error');
                }
            }
        }
    }

    /**
     * Test all API connections
     */
    async testAllConnections() {
        const digikeyClientId = document.getElementById('digikeyClientId')?.value?.trim();
        const digikeyClientSecret = document.getElementById('digikeyClientSecret')?.value?.trim();
        const mouserApiKey = document.getElementById('mouserApiKey')?.value?.trim();
        
        if (!window.apiManager) {
            if (window.utils) {
                window.utils.showNotification('API manager not available', 'error');
            }
            return;
        }
        
        // Test Digikey connection
        if (digikeyClientId && digikeyClientSecret) {
            this.updateApiStatus('digikey', 'connecting');
            
            try {
                const success = await window.apiManager.testDigikeyConnection(digikeyClientId, digikeyClientSecret);
                if (success) {
                    this.updateApiStatus('digikey', 'active');
                    if (window.utils) {
                        window.utils.showNotification('Digikey connection successful', 'success');
                    }
                } else {
                    this.updateApiStatus('digikey', 'error');
                    if (window.utils) {
                        window.utils.showNotification('Digikey connection failed', 'error');
                    }
                }
            } catch (error) {
                this.updateApiStatus('digikey', 'error');
                if (window.utils) {
                    window.utils.showNotification(`Digikey error: ${error.message}`, 'error');
                }
            }
        }
        
        // Test Mouser connection
        if (mouserApiKey) {
            this.updateApiStatus('mouser', 'connecting');
            
            try {
                const success = await window.apiManager.testMouserConnection(mouserApiKey);
                if (success) {
                    this.updateApiStatus('mouser', 'active');
                    if (window.utils) {
                        window.utils.showNotification('Mouser connection successful', 'success');
                    }
                } else {
                    this.updateApiStatus('mouser', 'error');
                    if (window.utils) {
                        window.utils.showNotification('Mouser connection failed', 'error');
                    }
                }
            } catch (error) {
                this.updateApiStatus('mouser', 'error');
                if (window.utils) {
                    window.utils.showNotification(`Mouser error: ${error.message}`, 'error');
                }
            }
        }
    }

    /**
     * Update API status display
     * @param {string} provider - 'digikey' or 'mouser'
     * @param {string} status - 'inactive', 'connecting', 'active', 'error'
     */
    updateApiStatus(provider, status) {
        const statusElement = this.statusElements[provider];
        if (!statusElement) return;
        
        // Remove all status classes
        statusElement.classList.remove('status-inactive', 'status-connecting', 'status-active', 'status-error');
        
        // Add current status class
        statusElement.classList.add(`status-${status}`);
        
        // Update text
        const statusText = {
            inactive: 'Inactive',
            connecting: 'Connecting...',
            active: 'Active',
            error: 'Error'
        };
        
        statusElement.textContent = statusText[status] || status;
    }

    /**
     * Update all API statuses from API manager
     */
    updateAllApiStatuses() {
        if (!window.apiManager) return;
        
        const statuses = window.apiManager.getStatus();
        
        if (statuses.digikey) {
            this.updateApiStatus('digikey', statuses.digikey.status);
        }
        
        if (statuses.mouser) {
            this.updateApiStatus('mouser', statuses.mouser.status);
        }
    }

    /**
     * Highlight current page in navigation
     */
    highlightCurrentPage() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            
            const href = link.getAttribute('href');
            if (href === currentPage || (currentPage === '' && href === 'index.html')) {
                link.classList.add('active');
            }
        });
    }

    /**
     * Get current API status for debugging
     * @returns {Object} Current status information
     */
    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            modalVisible: this.settingsModal?.classList.contains('active') || false,
            hasApiManager: !!window.apiManager,
            hasStorage: !!window.storage,
            hasUtils: !!window.utils
        };
    }
}

// Create and initialize navigation manager
const navigationManager = new NavigationManager();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        navigationManager.init();
        navigationManager.highlightCurrentPage();
    });
} else {
    navigationManager.init();
    navigationManager.highlightCurrentPage();
}

// Expose globally
window.navigationManager = navigationManager;