/**
 * Excel API Processor - Main Application
 * Alica Technologies
 */

window.ExcelProcessorMain = {
    // Application state
    _isInitialized: false,
    _modules: [],

    /**
     * Initialize the main application
     */
    init() {
        if (this._isInitialized) {
            window.ExcelProcessorUtils.log.warn('Application already initialized');
            return;
        }

        try {
            // Check dependencies
            this._checkDependencies();

            // Initialize modules in order
            this._initializeModules();

            // Setup global event handlers
            this._setupGlobalEventHandlers();

            // Setup error handling
            this._setupErrorHandling();

            // Initialize UI state
            this._initializeUIState();

            this._isInitialized = true;
            window.ExcelProcessorUtils.log.info('Excel API Processor initialized successfully');
            window.ExcelProcessorUtils.status.setSystemStatus('Ready');

        } catch (error) {
            window.ExcelProcessorUtils.log.error('Initialization failed:', error.message);
            this._handleInitializationError(error);
        }
    },

    /**
     * Check for required dependencies
     */
    _checkDependencies() {
        const requiredGlobals = [
            'ExcelProcessorConfig',
            'ExcelProcessorUtils',
            'ExcelProcessorCredentials',
            'ExcelProcessorExcel',
            'ExcelProcessorApiClient',
            'ExcelProcessorExport',
            'XLSX' // SheetJS library
        ];

        const missing = [];

        requiredGlobals.forEach(globalVar => {
            if (typeof window[globalVar] === 'undefined') {
                missing.push(globalVar);
            }
        });

        if (missing.length > 0) {
            throw new Error(`Missing required dependencies: ${missing.join(', ')}`);
        }

        // Check XLSX version if available
        if (window.XLSX && window.XLSX.version) {
            window.ExcelProcessorUtils.log.info('SheetJS version:', window.XLSX.version);
        }
    },

    /**
     * Initialize all modules
     */
    _initializeModules() {
        // Store module references
        this._modules = [
            window.ExcelProcessorCredentials,
            window.ExcelProcessorExcel,
            window.ExcelProcessorExport
        ];

        // All modules should already be initialized by their own scripts
        // This is just to verify they're ready
        this._modules.forEach(module => {
            if (typeof module.init === 'function' && !module._isInitialized) {
                window.ExcelProcessorUtils.log.warn('Module not auto-initialized, initializing now:', module);
                module.init();
            }
        });
    },

    /**
     * Setup global event handlers
     */
    _setupGlobalEventHandlers() {
        // Handle page unload
        window.addEventListener('beforeunload', this._handlePageUnload.bind(this));

        // Handle visibility change (page hidden/shown)
        document.addEventListener('visibilitychange', this._handleVisibilityChange.bind(this));

        // Handle keyboard shortcuts
        document.addEventListener('keydown', this._handleKeyboardShortcuts.bind(this));

        // Handle file drag and drop on the entire page
        this._setupFileDragDrop();
    },

    /**
     * Setup file drag and drop functionality
     */
    _setupFileDragDrop() {
        const fileInput = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.EXCEL_FILE);
        
        if (!fileInput) return;

        // Prevent default drag behaviors on the entire document
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, this._preventDefaults, false);
        });

        // Highlight drop area
        ['dragenter', 'dragover'].forEach(eventName => {
            document.addEventListener(eventName, this._highlightDropArea, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, this._unhighlightDropArea, false);
        });

        // Handle dropped files
        document.addEventListener('drop', this._handleFileDrop.bind(this), false);
    },

    /**
     * Prevent default drag behaviors
     */
    _preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    },

    /**
     * Highlight drop area
     */
    _highlightDropArea() {
        document.body.style.backgroundColor = '#f0f9ff';
        document.body.style.transition = 'background-color 0.2s ease';
    },

    /**
     * Remove drop area highlight
     */
    _unhighlightDropArea() {
        document.body.style.backgroundColor = '';
    },

    /**
     * Handle dropped files
     */
    _handleFileDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            const fileInput = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.EXCEL_FILE);
            if (fileInput) {
                // Create a new FileList and assign to input
                fileInput.files = files;
                // Trigger change event
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    },

    /**
     * Handle keyboard shortcuts
     */
    _handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + R: Reset processor
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            if (window.ExcelProcessorExport && typeof window.ExcelProcessorExport._resetProcessor === 'function') {
                window.ExcelProcessorExport._resetProcessor();
            }
        }

        // Ctrl/Cmd + E: Export (if ready)
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            if (window.ExcelProcessorExport && window.ExcelProcessorExport.isExportReady()) {
                const exportBtn = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.EXPORT_EXCEL);
                if (exportBtn && !exportBtn.disabled) {
                    exportBtn.click();
                }
            }
        }

        // Ctrl/Cmd + T: Toggle settings panel
        if ((e.ctrlKey || e.metaKey) && e.key === 't') {
            e.preventDefault();
            const toggleBtn = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.TOGGLE_SETTINGS);
            if (toggleBtn) {
                toggleBtn.click();
            }
        }

        // Escape: Close settings panel
        if (e.key === 'Escape') {
            const settingsPanel = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.SETTINGS_PANEL);
            if (settingsPanel && settingsPanel.style.display !== 'none') {
                const toggleBtn = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.TOGGLE_SETTINGS);
                if (toggleBtn) {
                    toggleBtn.click();
                }
            }
        }
    },

    /**
     * Handle page unload (save state if needed)
     */
    _handlePageUnload(e) {
        // Check if processing is in progress
        const isProcessing = window.ExcelProcessorExcel && window.ExcelProcessorExcel._isProcessing;
        
        if (isProcessing) {
            const message = 'Processing is in progress. Are you sure you want to leave?';
            e.returnValue = message;
            return message;
        }
    },

    /**
     * Handle visibility change (page hidden/shown)
     */
    _handleVisibilityChange() {
        if (document.hidden) {
            window.ExcelProcessorUtils.log.debug('Page hidden');
        } else {
            window.ExcelProcessorUtils.log.debug('Page visible');
            // Refresh API status when page becomes visible
            this._refreshApiStatus();
        }
    },

    /**
     * Setup error handling
     */
    _setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (e) => {
            window.ExcelProcessorUtils.log.error('Global error:', e.error?.message || e.message);
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (e) => {
            window.ExcelProcessorUtils.log.error('Unhandled promise rejection:', e.reason);
        });
    },

    /**
     * Initialize UI state
     */
    _initializeUIState() {
        // Set initial API count
        window.ExcelProcessorUtils.status.setApiCount(0);
        
        // Hide sections that should be hidden initially
        const sectionsToHide = [
            window.ExcelProcessorConfig.ELEMENTS.SETTINGS_PANEL,
            window.ExcelProcessorConfig.ELEMENTS.SHEET_SELECTION,
            window.ExcelProcessorConfig.ELEMENTS.PREVIEW_SECTION,
            window.ExcelProcessorConfig.ELEMENTS.MAPPING_SECTION,
            window.ExcelProcessorConfig.ELEMENTS.PROGRESS_SECTION,
            window.ExcelProcessorConfig.ELEMENTS.EXPORT_SECTION,
            window.ExcelProcessorConfig.ELEMENTS.PROCESSING_STATUS
        ];

        sectionsToHide.forEach(elementId => {
            window.ExcelProcessorUtils.dom.hide(elementId);
        });

        // Load and apply saved credentials (already done by credentials manager)
        this._refreshApiStatus();

        // Show welcome message
        this._showWelcomeMessage();
    },

    /**
     * Show welcome message
     */
    _showWelcomeMessage() {
        const hasApis = window.ExcelProcessorCredentials && window.ExcelProcessorCredentials.hasActiveApis();
        
        if (!hasApis) {
            window.ExcelProcessorUtils.log.info('Welcome! Please configure API credentials to get started.');
            // Auto-expand settings panel if no APIs are configured
            setTimeout(() => {
                const toggleBtn = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.TOGGLE_SETTINGS);
                if (toggleBtn) {
                    toggleBtn.click();
                }
            }, 1000);
        }
    },

    /**
     * Refresh API status
     */
    _refreshApiStatus() {
        if (window.ExcelProcessorCredentials) {
            const activeApis = window.ExcelProcessorCredentials.getActiveApis();
            window.ExcelProcessorUtils.status.setApiCount(activeApis.length);
        }
    },

    /**
     * Handle initialization error
     */
    _handleInitializationError(error) {
        // Set error status
        window.ExcelProcessorUtils.status.setSystemStatus('Initialization Error');
        
        // Show error message to user
        const errorMessage = `
            <div class="alert alert--error">
                <div class="alert__title">Initialization Failed</div>
                <div class="alert__msg">${error.message}</div>
                <div class="mt-16">
                    <button class="button button--sm" onclick="location.reload()">Reload Page</button>
                </div>
            </div>
        `;
        
        // Find a container to show the error
        const container = document.querySelector('.container') || document.body;
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = errorMessage;
            container.insertBefore(errorDiv, container.firstChild);
        }
    },

    /**
     * Get application status
     */
    getStatus() {
        return {
            initialized: this._isInitialized,
            modules: this._modules.length,
            hasCredentials: window.ExcelProcessorCredentials ? window.ExcelProcessorCredentials.hasActiveApis() : false,
            activeApis: window.ExcelProcessorCredentials ? window.ExcelProcessorCredentials.getActiveApis() : [],
            exportReady: window.ExcelProcessorExport ? window.ExcelProcessorExport.isExportReady() : false
        };
    },

    /**
     * Perform health check
     */
    healthCheck() {
        const status = this.getStatus();
        const issues = [];

        if (!status.initialized) {
            issues.push('Application not initialized');
        }

        if (!window.XLSX) {
            issues.push('SheetJS library not loaded');
        }

        if (status.modules === 0) {
            issues.push('No modules loaded');
        }

        if (!status.hasCredentials) {
            issues.push('No API credentials configured');
        }

        return {
            healthy: issues.length === 0,
            issues,
            status
        };
    },

    /**
     * Get version information
     */
    getVersion() {
        return {
            app: '1.0.0',
            sheetjs: window.XLSX ? window.XLSX.version : 'Not loaded',
            build: window.ExcelProcessorUtils.datetime.getTimestamp()
        };
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Small delay to ensure all modules are loaded
        setTimeout(() => {
            window.ExcelProcessorMain.init();
        }, 100);
    });
} else {
    // DOM already loaded
    setTimeout(() => {
        window.ExcelProcessorMain.init();
    }, 100);
}

// Make main app globally accessible for debugging
window.ExcelProcessor = window.ExcelProcessorMain;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.ExcelProcessorMain;
}