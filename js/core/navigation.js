/**
 * Enhanced Navigation and Settings Management
 * Provides sticky navigation, settings modal, and navigation state management
 * Part of K4LP Engineering Tools - Swiss Minimalist Design
 * @version 2.1.0 - Enhanced with comprehensive settings management
 */

class NavigationManager {
    constructor() {
        this.version = '2.1.0';
        
        // Navigation state
        this.currentPage = this.getCurrentPage();
        this.navigationVisible = true;
        this.settingsModalOpen = false;
        
        // Navigation items configuration
        this.navigationItems = [
            {
                id: 'home',
                label: 'Tools',
                url: '/index.html',
                icon: '🛠️',
                description: 'Engineering tools dashboard'
            },
            {
                id: 'contact',
                label: 'Contact',
                url: '/contact.html',
                icon: '📞',
                description: 'Project information and contact'
            },
            {
                id: 'settings',
                label: 'Settings',
                action: 'openSettings',
                icon: '⚙️',
                description: 'API credentials and configuration'
            }
        ];
        
        // Settings configuration
        this.settingsConfig = {
            digikey: {
                title: 'Digikey API',
                description: 'Configure Digikey API credentials for component search',
                fields: [
                    {
                        id: 'digikey-client-id',
                        label: 'Client ID',
                        type: 'text',
                        placeholder: 'Enter your Digikey Client ID',
                        required: true,
                        validation: 'alphanumeric'
                    },
                    {
                        id: 'digikey-client-secret',
                        label: 'Client Secret',
                        type: 'password',
                        placeholder: 'Enter your Digikey Client Secret',
                        required: true,
                        validation: 'alphanumeric'
                    },
                    {
                        id: 'digikey-sandbox',
                        label: 'Use Sandbox',
                        type: 'checkbox',
                        description: 'Use Digikey sandbox environment for testing'
                    }
                ]
            },
            mouser: {
                title: 'Mouser API',
                description: 'Configure Mouser API credentials for component search',
                fields: [
                    {
                        id: 'mouser-api-key',
                        label: 'API Key',
                        type: 'password',
                        placeholder: 'Enter your Mouser API Key',
                        required: true,
                        validation: 'alphanumeric'
                    }
                ]
            },
            application: {
                title: 'Application Settings',
                description: 'General application preferences and behavior',
                fields: [
                    {
                        id: 'theme',
                        label: 'Theme',
                        type: 'select',
                        options: [
                            { value: 'auto', label: 'Auto (System)' },
                            { value: 'light', label: 'Light' },
                            { value: 'dark', label: 'Dark' }
                        ],
                        default: 'auto'
                    },
                    {
                        id: 'notifications',
                        label: 'Enable Notifications',
                        type: 'checkbox',
                        description: 'Show system notifications for important events',
                        default: true
                    },
                    {
                        id: 'auto-save',
                        label: 'Auto-save Settings',
                        type: 'checkbox',
                        description: 'Automatically save settings changes',
                        default: true
                    }
                ]
            }
        };
        
        // DOM elements
        this.elements = {
            navbar: null,
            settingsModal: null,
            settingsOverlay: null,
            statusIndicators: null
        };
        
        this.initialize();
    }
    
    /**
     * Initialize navigation manager
     */
    initialize() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupNavigation());
        } else {
            this.setupNavigation();
        }
        
        console.log('✓ K4LP Navigation Manager v2.1.0 initialized');
    }
    
    /**
     * Get current page identifier
     */
    getCurrentPage() {
        const path = window.location.pathname;
        
        if (path.includes('contact')) return 'contact';
        if (path.includes('settings')) return 'settings';
        return 'home';
    }
    
    /**
     * Setup navigation elements
     */
    setupNavigation() {
        this.createNavigation();
        this.createSettingsModal();
        this.setupEventListeners();
        this.updateNavigationState();
        this.startStatusUpdates();
    }
    
    /**
     * Create main navigation
     */
    createNavigation() {
        // Check if navigation already exists
        let existingNav = document.querySelector('.main-navigation');
        if (existingNav) {
            this.elements.navbar = existingNav;
            return;
        }
        
        // Create navigation container
        const nav = document.createElement('nav');
        nav.className = 'main-navigation';
        nav.innerHTML = `
            <div class="nav-container">
                <div class="nav-brand">
                    <h1>K4LP Tools</h1>
                    <div class="nav-status" id="nav-status"></div>
                </div>
                <div class="nav-menu">
                    ${this.navigationItems.map(item => `
                        <a href="${item.url || '#'}" 
                           class="nav-item ${item.action ? 'nav-action' : ''}" 
                           data-page="${item.id}"
                           data-action="${item.action || ''}"
                           title="${item.description}">
                            <span class="nav-icon">${item.icon}</span>
                            <span class="nav-label">${item.label}</span>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Insert at beginning of body
        document.body.insertBefore(nav, document.body.firstChild);
        this.elements.navbar = nav;
        this.elements.statusIndicators = nav.querySelector('#nav-status');
    }
    
    /**
     * Create settings modal
     */
    createSettingsModal() {
        // Check if modal already exists
        if (document.getElementById('settings-modal')) return;
        
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'settings-overlay';
        overlay.className = 'modal-overlay';
        
        // Create modal container
        const modal = document.createElement('div');
        modal.id = 'settings-modal';
        modal.className = 'settings-modal';
        
        modal.innerHTML = `
            <div class="modal-header">
                <h2>Settings & Configuration</h2>
                <button class="modal-close" id="settings-close">&times;</button>
            </div>
            <div class="modal-content">
                <div class="settings-tabs">
                    ${Object.entries(this.settingsConfig).map(([key, config]) => `
                        <button class="settings-tab" data-tab="${key}">
                            ${config.title}
                        </button>
                    `).join('')}
                </div>
                <div class="settings-panels">
                    ${Object.entries(this.settingsConfig).map(([key, config]) => `
                        <div class="settings-panel" data-panel="${key}">
                            <h3>${config.title}</h3>
                            <p class="panel-description">${config.description}</p>
                            <div class="settings-form">
                                ${this.renderSettingsFields(config.fields)}
                            </div>
                            <div class="panel-status" id="${key}-status"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="settings-test-all">Test All Connections</button>
                <button class="btn btn-primary" id="settings-save">Save Settings</button>
                <button class="btn btn-secondary" id="settings-reset">Reset to Defaults</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        this.elements.settingsModal = modal;
        this.elements.settingsOverlay = overlay;
        
        // Load current settings
        this.loadSettings();
    }
    
    /**
     * Render settings form fields
     */
    renderSettingsFields(fields) {
        return fields.map(field => {
            switch (field.type) {
                case 'text':
                case 'password':
                    return `
                        <div class="form-group">
                            <label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>
                            <input type="${field.type}" 
                                   id="${field.id}" 
                                   name="${field.id}"
                                   placeholder="${field.placeholder || ''}"
                                   ${field.required ? 'required' : ''}
                                   data-validation="${field.validation || ''}">
                            <small class="field-help">${field.description || ''}</small>
                        </div>
                    `;
                
                case 'checkbox':
                    return `
                        <div class="form-group checkbox-group">
                            <label class="checkbox-label">
                                <input type="checkbox" 
                                       id="${field.id}" 
                                       name="${field.id}">
                                <span class="checkbox-text">${field.label}</span>
                            </label>
                            <small class="field-help">${field.description || ''}</small>
                        </div>
                    `;
                
                case 'select':
                    return `
                        <div class="form-group">
                            <label for="${field.id}">${field.label}</label>
                            <select id="${field.id}" name="${field.id}">
                                ${field.options.map(option => `
                                    <option value="${option.value}" 
                                            ${option.value === field.default ? 'selected' : ''}>
                                        ${option.label}
                                    </option>
                                `).join('')}
                            </select>
                            <small class="field-help">${field.description || ''}</small>
                        </div>
                    `;
                
                default:
                    return '';
            }
        }).join('');
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation clicks
        this.elements.navbar.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (!navItem) return;
            
            const action = navItem.dataset.action;
            if (action) {
                e.preventDefault();
                this.handleNavAction(action);
            }
        });
        
        // Settings modal events
        if (this.elements.settingsModal) {
            // Close modal
            const closeBtn = this.elements.settingsModal.querySelector('#settings-close');
            closeBtn.addEventListener('click', () => this.closeSettings());
            
            this.elements.settingsOverlay.addEventListener('click', (e) => {
                if (e.target === this.elements.settingsOverlay) {
                    this.closeSettings();
                }
            });
            
            // Tab switching
            const tabButtons = this.elements.settingsModal.querySelectorAll('.settings-tab');
            tabButtons.forEach(tab => {
                tab.addEventListener('click', () => {
                    this.switchSettingsTab(tab.dataset.tab);
                });
            });
            
            // Action buttons
            const saveBtn = this.elements.settingsModal.querySelector('#settings-save');
            saveBtn.addEventListener('click', () => this.saveSettings());
            
            const testBtn = this.elements.settingsModal.querySelector('#settings-test-all');
            testBtn.addEventListener('click', () => this.testAllConnections());
            
            const resetBtn = this.elements.settingsModal.querySelector('#settings-reset');
            resetBtn.addEventListener('click', () => this.resetSettings());
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape key closes modal
            if (e.key === 'Escape' && this.settingsModalOpen) {
                this.closeSettings();
            }
            
            // Ctrl/Cmd + K opens settings
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.openSettings();
            }
        });
    }
    
    /**
     * Handle navigation action
     */
    handleNavAction(action) {
        switch (action) {
            case 'openSettings':
                this.openSettings();
                break;
            default:
                console.warn(`Unknown navigation action: ${action}`);
        }
    }
    
    /**
     * Update navigation state
     */
    updateNavigationState() {
        const navItems = this.elements.navbar.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            const page = item.dataset.page;
            if (page === this.currentPage) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    /**
     * Open settings modal
     */
    openSettings() {
        if (!this.elements.settingsOverlay) return;
        
        this.elements.settingsOverlay.style.display = 'flex';
        this.settingsModalOpen = true;
        
        // Focus first input
        setTimeout(() => {
            const firstInput = this.elements.settingsModal.querySelector('input');
            if (firstInput) firstInput.focus();
        }, 100);
        
        // Show first tab
        const firstTab = Object.keys(this.settingsConfig)[0];
        this.switchSettingsTab(firstTab);
        
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * Close settings modal
     */
    closeSettings() {
        if (!this.elements.settingsOverlay) return;
        
        this.elements.settingsOverlay.style.display = 'none';
        this.settingsModalOpen = false;
        document.body.style.overflow = '';
    }
    
    /**
     * Switch settings tab
     */
    switchSettingsTab(tabId) {
        // Update tab buttons
        const tabs = this.elements.settingsModal.querySelectorAll('.settings-tab');
        tabs.forEach(tab => {
            if (tab.dataset.tab === tabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Update panels
        const panels = this.elements.settingsModal.querySelectorAll('.settings-panel');
        panels.forEach(panel => {
            if (panel.dataset.panel === tabId) {
                panel.style.display = 'block';
            } else {
                panel.style.display = 'none';
            }
        });
    }
    
    /**
     * Load current settings into form
     */
    loadSettings() {
        if (!window.storage) {
            console.warn('Storage manager not available');
            return;
        }
        
        // Load Digikey settings
        const digikeyCredentials = window.storage.getDigikeyCredentials();
        const digikeyEnv = window.storage.getItem('digikey_environment') || {};
        
        this.setFieldValue('digikey-client-id', digikeyCredentials.clientId || '');
        this.setFieldValue('digikey-client-secret', digikeyCredentials.clientSecret || '');
        this.setFieldValue('digikey-sandbox', digikeyEnv.useSandbox || false);
        
        // Load Mouser settings
        const mouserCredentials = window.storage.getMouserCredentials();
        this.setFieldValue('mouser-api-key', mouserCredentials.apiKey || '');
        
        // Load application settings
        const appSettings = window.storage.getItem('app_settings') || {};
        this.setFieldValue('theme', appSettings.theme || 'auto');
        this.setFieldValue('notifications', appSettings.notifications !== false);
        this.setFieldValue('auto-save', appSettings.autoSave !== false);
    }
    
    /**
     * Save settings from form
     */
    async saveSettings() {
        if (!window.storage) {
            this.showStatusMessage('application', 'Storage manager not available', 'error');
            return;
        }
        
        try {
            // Save Digikey settings
            const digikeyClientId = this.getFieldValue('digikey-client-id');
            const digikeyClientSecret = this.getFieldValue('digikey-client-secret');
            const digikeySandbox = this.getFieldValue('digikey-sandbox');
            
            if (digikeyClientId && digikeyClientSecret) {
                window.storage.saveDigikeyCredentials(digikeyClientId, digikeyClientSecret);
                window.storage.setItem('digikey_environment', { useSandbox: digikeySandbox });
                
                // Test Digikey connection if API manager is available
                if (window.apiManager) {
                    await window.apiManager.authenticateDigikey(digikeyClientId, digikeyClientSecret, true, digikeySandbox);
                    this.showStatusMessage('digikey', 'Digikey credentials saved and tested successfully', 'success');
                } else {
                    this.showStatusMessage('digikey', 'Digikey credentials saved', 'success');
                }
            }
            
            // Save Mouser settings
            const mouserApiKey = this.getFieldValue('mouser-api-key');
            if (mouserApiKey) {
                window.storage.saveMouserCredentials(mouserApiKey);
                
                // Test Mouser connection if API manager is available
                if (window.apiManager) {
                    window.apiManager.setMouserApiKey(mouserApiKey, true);
                    this.showStatusMessage('mouser', 'Mouser API key saved successfully', 'success');
                } else {
                    this.showStatusMessage('mouser', 'Mouser API key saved', 'success');
                }
            }
            
            // Save application settings
            const appSettings = {
                theme: this.getFieldValue('theme'),
                notifications: this.getFieldValue('notifications'),
                autoSave: this.getFieldValue('auto-save')
            };
            
            window.storage.setItem('app_settings', appSettings);
            this.showStatusMessage('application', 'Application settings saved', 'success');
            
            // Apply theme change immediately
            this.applyTheme(appSettings.theme);
            
            if (window.utils) {
                window.utils.showNotification('Settings saved successfully', 'success');
            }
            
        } catch (error) {
            console.error('Failed to save settings:', error);
            if (window.utils) {
                window.utils.showNotification('Failed to save settings: ' + error.message, 'error');
            }
        }
    }
    
    /**
     * Test all API connections
     */
    async testAllConnections() {
        if (!window.apiManager) {
            if (window.utils) {
                window.utils.showNotification('API manager not available', 'error');
            }
            return;
        }
        
        const testBtn = this.elements.settingsModal.querySelector('#settings-test-all');
        const originalText = testBtn.textContent;
        testBtn.textContent = 'Testing...';
        testBtn.disabled = true;
        
        try {
            // Test Digikey
            try {
                const digikeyStatus = window.apiManager.getStatus('digikey');
                if (digikeyStatus.status === 'active') {
                    await window.apiManager.testDigikeyConnection();
                    this.showStatusMessage('digikey', 'Digikey connection successful', 'success');
                } else {
                    this.showStatusMessage('digikey', 'Digikey not configured or inactive', 'warning');
                }
            } catch (error) {
                this.showStatusMessage('digikey', 'Digikey connection failed: ' + error.message, 'error');
            }
            
            // Test Mouser
            try {
                const mouserStatus = window.apiManager.getStatus('mouser');
                if (mouserStatus.status === 'active') {
                    await window.apiManager.testMouserConnection();
                    this.showStatusMessage('mouser', 'Mouser connection successful', 'success');
                } else {
                    this.showStatusMessage('mouser', 'Mouser not configured or inactive', 'warning');
                }
            } catch (error) {
                this.showStatusMessage('mouser', 'Mouser connection failed: ' + error.message, 'error');
            }
            
        } finally {
            testBtn.textContent = originalText;
            testBtn.disabled = false;
        }
    }
    
    /**
     * Reset settings to defaults
     */
    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
            if (window.storage) {
                window.storage.clearAll();
            }
            
            // Clear form fields
            Object.entries(this.settingsConfig).forEach(([section, config]) => {
                config.fields.forEach(field => {
                    this.setFieldValue(field.id, field.default || '');
                });
            });
            
            if (window.utils) {
                window.utils.showNotification('Settings reset to defaults', 'info');
            }
        }
    }
    
    /**
     * Get field value from form
     */
    getFieldValue(fieldId) {
        const field = this.elements.settingsModal.querySelector(`#${fieldId}`);
        if (!field) return null;
        
        if (field.type === 'checkbox') {
            return field.checked;
        }
        return field.value;
    }
    
    /**
     * Set field value in form
     */
    setFieldValue(fieldId, value) {
        const field = this.elements.settingsModal.querySelector(`#${fieldId}`);
        if (!field) return;
        
        if (field.type === 'checkbox') {
            field.checked = Boolean(value);
        } else {
            field.value = value || '';
        }
    }
    
    /**
     * Show status message in settings panel
     */
    showStatusMessage(section, message, type = 'info') {
        const statusDiv = this.elements.settingsModal.querySelector(`#${section}-status`);
        if (!statusDiv) return;
        
        statusDiv.className = `panel-status ${type}`;
        statusDiv.textContent = message;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'panel-status';
        }, 5000);
    }
    
    /**
     * Apply theme
     */
    applyTheme(theme) {
        const html = document.documentElement;
        
        switch (theme) {
            case 'light':
                html.classList.remove('dark-theme');
                html.classList.add('light-theme');
                break;
            case 'dark':
                html.classList.remove('light-theme');
                html.classList.add('dark-theme');
                break;
            case 'auto':
            default:
                html.classList.remove('light-theme', 'dark-theme');
                break;
        }
    }
    
    /**
     * Start status updates
     */
    startStatusUpdates() {
        this.updateStatus();
        
        // Update every 30 seconds
        setInterval(() => {
            this.updateStatus();
        }, 30000);
    }
    
    /**
     * Update status indicators
     */
    updateStatus() {
        if (!this.elements.statusIndicators || !window.apiManager) return;
        
        const status = window.apiManager.getStatus();
        const indicators = [];
        
        // Digikey status
        const digikeyStatus = status.digikey.status;
        const digikeyClass = digikeyStatus === 'active' ? 'status-active' : 
                           digikeyStatus === 'error' ? 'status-error' : 'status-inactive';
        indicators.push(`<span class="status-indicator ${digikeyClass}" title="Digikey: ${digikeyStatus}">DK</span>`);
        
        // Mouser status
        const mouserStatus = status.mouser.status;
        const mouserClass = mouserStatus === 'active' ? 'status-active' : 
                          mouserStatus === 'error' ? 'status-error' : 'status-inactive';
        indicators.push(`<span class="status-indicator ${mouserClass}" title="Mouser: ${mouserStatus}">MS</span>`);
        
        this.elements.statusIndicators.innerHTML = indicators.join('');
    }
    
    /**
     * Get current navigation state
     */
    getNavigationState() {
        return {
            currentPage: this.currentPage,
            visible: this.navigationVisible,
            settingsOpen: this.settingsModalOpen
        };
    }
}

// Create and expose global instance
const navigationManager = new NavigationManager();
window.navigationManager = navigationManager;

// Legacy compatibility
window.NavigationManager = NavigationManager;

// Module export for modern environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationManager;
}

console.log('✓ K4LP Navigation Manager v2.1.0 initialized');