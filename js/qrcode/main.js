/**
 * QR Code Component Scanner - Main Application Controller
 * Alica Technologies
 */

window.QRScannerMain = {
    // Application state
    _initialized: false,
    _currentStep: 1,

    /**
     * Initialize the main application
     */
    init() {
        if (this._initialized) return;

        try {
            // Initialize all modules
            this._initializeModules();

            // Set up global error handling
            this._setupErrorHandling();

            // Set up keyboard shortcuts
            this._setupKeyboardShortcuts();

            // Initialize UI state
            this._initializeUI();

            this._initialized = true;

            window.QRScannerUtils.log.info('QR Scanner application initialized successfully');

        } catch (error) {
            window.QRScannerUtils.log.error('Application initialization failed:', error);
            this._handleInitializationError(error);
        }
    },

    /**
     * Initialize all application modules
     */
    _initializeModules() {
        // Modules are initialized in their own files when DOM loads
        // This method ensures they're all ready

        const modules = [
            'QRScannerUtils',
            'QRScannerExcelHandler', 
            'QRScannerRangeSelector',
            'QRScannerManager',
            'QRScannerDataManager'
        ];

        modules.forEach(moduleName => {
            if (!window[moduleName]) {
                throw new Error(`Required module ${moduleName} is not loaded`);
            }
        });

        window.QRScannerUtils.log.debug('All modules initialized');
    },

    /**
     * Setup global error handling
     */
    _setupErrorHandling() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            window.QRScannerUtils.log.error('Uncaught error:', event.error);
            this._showErrorNotification('An unexpected error occurred. Please refresh the page.');
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            window.QRScannerUtils.log.error('Unhandled promise rejection:', event.reason);
            this._showErrorNotification('An error occurred during processing. Please try again.');
        });

        window.QRScannerUtils.log.debug('Error handling setup complete');
    },

    /**
     * Setup keyboard shortcuts
     */
    _setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Only handle shortcuts when not typing in inputs
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            // Ctrl/Cmd + shortcuts
            if (event.ctrlKey || event.metaKey) {
                switch (event.key.toLowerCase()) {
                    case 'e':
                        event.preventDefault();
                        this._handleExportShortcut();
                        break;
                    case 'r':
                        event.preventDefault();
                        this._handleResetShortcut();
                        break;
                    case 'c':
                        event.preventDefault();
                        this._handleClearShortcut();
                        break;
                }
            }

            // Function keys
            switch (event.key) {
                case 'F1':
                    event.preventDefault();
                    this._showHelp();
                    break;
                case 'Escape':
                    this._handleEscape();
                    break;
                case ' ':
                    if (this._currentStep === 5) {
                        event.preventDefault();
                        this._toggleScanner();
                    }
                    break;
            }
        });

        window.QRScannerUtils.log.debug('Keyboard shortcuts setup complete');
    },

    /**
     * Initialize UI state
     */
    _initializeUI() {
        // Hide all steps initially except step 1
        const steps = [2, 3, 4, 5];
        steps.forEach(stepNum => {
            const stepElement = window.QRScannerUtils.dom.get(`step${stepNum}`);
            if (stepElement) {
                window.QRScannerUtils.dom.hide(stepElement);
            }
        });

        // Set initial status
        const statusEl = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SCANNER_STATUS);
        if (statusEl) {
            statusEl.className = 'status-ready';
            statusEl.textContent = 'Ready';
        }

        // Initialize stats display
        this._updateStatsDisplay();

        window.QRScannerUtils.log.debug('UI state initialized');
    },

    /**
     * Handle export keyboard shortcut
     */
    _handleExportShortcut() {
        const exportBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.EXPORT_RESULTS);
        if (exportBtn && !exportBtn.disabled) {
            exportBtn.click();
        }
    },

    /**
     * Handle reset keyboard shortcut
     */
    _handleResetShortcut() {
        const resetBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.RESET_SCANNER);
        if (resetBtn) {
            resetBtn.click();
        }
    },

    /**
     * Handle clear keyboard shortcut
     */
    _handleClearShortcut() {
        const clearBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.CLEAR_RESULTS);
        if (clearBtn) {
            clearBtn.click();
        }
    },

    /**
     * Handle escape key
     */
    _handleEscape() {
        // Stop scanner if running
        const scannerState = window.QRScannerManager.getState();
        if (scannerState.isScanning) {
            const stopBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.STOP_CAMERA);
            if (stopBtn) {
                stopBtn.click();
            }
        }
    },

    /**
     * Toggle scanner on/off
     */
    _toggleScanner() {
        const scannerState = window.QRScannerManager.getState();
        if (scannerState.isScanning) {
            const stopBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.STOP_CAMERA);
            if (stopBtn) stopBtn.click();
        } else {
            const startBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.START_CAMERA);
            if (startBtn && !startBtn.disabled) startBtn.click();
        }
    },

    /**
     * Show help information
     */
    _showHelp() {
        const helpText = `
QR Code Component Scanner - Help

Keyboard Shortcuts:
• Ctrl+E: Export results
• Ctrl+R: Reset scanner
• Ctrl+C: Clear results
• Space: Start/stop scanner (when on scanner step)
• Escape: Stop scanner
• F1: Show this help

Steps:
1. Import Excel file (.xlsx or .xls)
2. Select the sheet containing BOM data
3. Select data range by clicking and dragging
4. Map columns (at minimum, select target column)
5. Start scanning QR/barcodes

Tips:
• Use high-quality camera for best results
• Ensure good lighting conditions
• Hold codes steady for scanning
• Target column is used for matching scanned values

For support, contact Alica Technologies.
        `;

        alert(helpText);
    },

    /**
     * Update current step tracker
     * @param {number} stepNumber - Current step number
     */
    updateCurrentStep(stepNumber) {
        this._currentStep = stepNumber;
        window.QRScannerUtils.log.debug(`Current step: ${stepNumber}`);
    },

    /**
     * Update statistics display
     */
    _updateStatsDisplay() {
        const stats = window.QRScannerDataManager.getStats();

        // Update header stats
        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.SCAN_COUNT, stats.totalScanned);
        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.MATCH_COUNT, stats.successfulMatches);

        // Update detailed stats in scanner section
        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.TOTAL_SCANNED, stats.totalScanned);
        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.SUCCESS_MATCHES, stats.successfulMatches);
    },

    /**
     * Show error notification
     * @param {string} message - Error message
     */
    _showErrorNotification(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <strong>Error:</strong> ${window.QRScannerUtils.string.escapeHtml(message)}
        `;

        document.body.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    },

    /**
     * Handle initialization errors
     * @param {Error} error - Initialization error
     */
    _handleInitializationError(error) {
        const errorMessage = `
            Failed to initialize QR Scanner application.

            Error: ${error.message}

            Please refresh the page and try again.
            If the problem persists, ensure you have:
            • A modern web browser with camera support
            • Camera permissions enabled
            • JavaScript enabled
        `;

        alert(errorMessage);
    },

    /**
     * Get application state
     * @returns {Object} - Application state
     */
    getState() {
        return {
            initialized: this._initialized,
            currentStep: this._currentStep,
            scannerState: window.QRScannerManager.getState(),
            stats: window.QRScannerDataManager.getStats()
        };
    },

    /**
     * Enable debug mode
     */
    enableDebugMode() {
        window.QRScannerConfig.DEBUG = true;
        window.QRDebug = {
            config: window.QRScannerConfig,
            utils: window.QRScannerUtils,
            excel: window.QRScannerExcelHandler,
            range: window.QRScannerRangeSelector,
            scanner: window.QRScannerManager,
            data: window.QRScannerDataManager,
            main: window.QRScannerMain
        };
        window.QRScannerUtils.log.info('Debug mode enabled. Use window.QRDebug to access modules.');
    }
};

/**
 * Auto-initialize when DOM is loaded
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.QRScannerMain.init();
    });
} else {
    window.QRScannerMain.init();
}

/**
 * Expose main controller globally for debugging
 */
if (window.QRScannerConfig && window.QRScannerConfig.DEBUG) {
    window.QRMain = window.QRScannerMain;
    window.QRScannerMain.enableDebugMode();
}

/**
 * Application version and info
 */
window.QRScannerInfo = {
    name: window.QRScannerConfig.APP_NAME,
    version: window.QRScannerConfig.VERSION,
    author: 'Alica Technologies',
    license: 'Proprietary',
    buildDate: new Date().toISOString(),

    // Feature flags
    features: {
        excelSupport: true,
        qrCodeScanning: true,
        barcodeScanning: true,
        audioFeedback: true,
        vibrationFeedback: true,
        exportResults: true,
        multiCamera: true
    }
};

console.log(`%c${window.QRScannerInfo.name} v${window.QRScannerInfo.version}`, 'color: #2563eb; font-weight: bold; font-size: 16px;');
console.log(`%cBy ${window.QRScannerInfo.author}`, 'color: #666; font-size: 12px;');

// Performance monitoring
if (window.QRScannerConfig.DEBUG) {
    console.time('QR Scanner Load Time');
    window.addEventListener('load', () => {
        console.timeEnd('QR Scanner Load Time');
    });
}
