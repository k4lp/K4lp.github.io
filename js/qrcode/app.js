/**
 * Main Application Controller
 * Orchestrates the QR Code Component Scanner workflow
 */

class QRCodeApp {
    constructor() {
        this.currentStep = 1;
        this.isInitialized = false;
        
        this.initializeApp();
    }
    
    async initializeApp() {
        try {
            QRUtils.log.info('Initializing QR Code Component Scanner...');
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
            
        } catch (error) {
            QRUtils.handleError(error, 'Application Initialization');
        }
    }
    
    async setup() {
        // Check for required dependencies
        if (!this.checkDependencies()) {
            return;
        }
        
        // Initialize event listeners
        this.setupGlobalEventListeners();
        
        // Load previous session if available
        await this.loadPreviousSession();
        
        // Set initial state
        this.updateStepVisibility();
        
        this.isInitialized = true;
        QRUtils.setStatus('Application ready', 'success');
        QRUtils.log.success('QR Code Component Scanner initialized successfully');
    }
    
    checkDependencies() {
        const required = {
            'XLSX': 'SheetJS library for Excel processing',
            'Html5Qrcode': 'HTML5 QR Code library for scanning',
            'QRUtils': 'Utility functions',
            'excelProcessor': 'Excel processing module',
            'rangeSelector': 'Range selection module',
            'columnMapper': 'Column mapping module',
            'qrScanner': 'QR scanner module'
        };
        
        const missing = [];
        
        Object.entries(required).forEach(([dependency, description]) => {
            if (typeof window[dependency] === 'undefined') {
                missing.push(`${dependency} (${description})`);
            }
        });
        
        if (missing.length > 0) {
            const errorMsg = `Missing dependencies: ${missing.join(', ')}`;
            QRUtils.handleError(new Error(errorMsg), 'Dependency Check');
            return false;
        }
        
        return true;
    }
    
    setupGlobalEventListeners() {
        // Clear session button
        const clearSessionBtn = QRUtils.$('clear-session-btn');
        if (clearSessionBtn) {
            clearSessionBtn.addEventListener('click', this.clearSession.bind(this));
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        
        // Window events
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.addEventListener('resize', QRUtils.debounce(this.handleResize.bind(this), 250));
        
        // Storage events (for multi-tab synchronization)
        window.addEventListener('storage', this.handleStorageChange.bind(this));
        
        // Error handling
        window.addEventListener('error', this.handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
        
        // Add reset functionality
        this.addResetFunctionality();
    }
    
    async clearSession() {
        if (!confirm('Clear the current session? This will remove all loaded data and scan results.')) {
            return;
        }
        
        try {
            QRUtils.setStatus('Clearing session...', 'loading');
            
            // Stop scanner if active
            if (window.qrScanner?.isScanning) {
                await window.qrScanner.stopScanning();
            }
            
            // Reset all modules but keep them initialized
            if (window.excelProcessor) window.excelProcessor.reset();
            if (window.rangeSelector) window.rangeSelector.reset();
            if (window.columnMapper) window.columnMapper.reset();
            if (window.qrScanner) window.qrScanner.reset();
            
            // Clear storage
            QRUtils.storage.clear();
            
            // Reset app state
            this.currentStep = 1;
            QRUtils.setStep(1);
            
            // Hide all steps except first
            for (let i = 2; i <= 5; i++) {
                QRUtils.hide(`step-${i}`);
            }
            QRUtils.hide('scan-records-section');
            
            // Clear any error messages
            document.querySelectorAll('.alert-error, .alert-warning').forEach(el => el.remove());
            
            QRUtils.setStatus('Session cleared successfully', 'success');
            QRUtils.showSuccess('Session cleared - ready to start fresh');
            QRUtils.log.success('Session cleared successfully');
            
        } catch (error) {
            QRUtils.handleError(error, 'Clear Session');
        }
    }
    
    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + R: Reset application
        if ((event.ctrlKey || event.metaKey) && event.key === 'r' && event.shiftKey) {
            event.preventDefault();
            this.resetApplication();
            return;
        }
        
        // Ctrl/Cmd + Delete: Clear session
        if ((event.ctrlKey || event.metaKey) && event.key === 'Delete') {
            event.preventDefault();
            this.clearSession();
            return;
        }
        
        // ESC: Stop scanning if active
        if (event.key === 'Escape' && window.qrScanner?.isScanning) {
            event.preventDefault();
            window.qrScanner.stopScanning();
            return;
        }
        
        // Space: Start/stop scanning (when on scanner step)
        if (event.code === 'Space' && this.currentStep === 5) {
            event.preventDefault();
            const startBtn = QRUtils.$('start-camera');
            const stopBtn = QRUtils.$('stop-camera');
            
            if (window.qrScanner?.isScanning) {
                if (stopBtn && !stopBtn.disabled) stopBtn.click();
            } else {
                if (startBtn && !startBtn.disabled) startBtn.click();
            }
            return;
        }
    }
    
    handleBeforeUnload(event) {
        // Save current state before closing
        this.saveCurrentState();
        
        // Warn if scanning is active
        if (window.qrScanner?.isScanning) {
            event.preventDefault();
            event.returnValue = 'Scanner is active. Are you sure you want to leave?';
            return event.returnValue;
        }
    }
    
    handleResize() {
        // Handle responsive adjustments if needed
        if (window.qrScanner?.isScanning) {
            QRUtils.log.info('Window resized while scanning');
        }
    }
    
    handleStorageChange(event) {
        // Handle changes from other tabs/windows
        if (event.key && event.key.startsWith('qr_scanner_')) {
            QRUtils.log.info('Storage changed from another tab:', event.key);
        }
    }
    
    handleGlobalError(event) {
        QRUtils.log.error('Global error:', event.error);
        QRUtils.setStatus('An error occurred', 'error');
    }
    
    handleUnhandledRejection(event) {
        QRUtils.log.error('Unhandled promise rejection:', event.reason);
        QRUtils.setStatus('An error occurred', 'error');
    }
    
    addResetFunctionality() {
        // Add hidden reset button (accessible via keyboard shortcut)
        const resetBtn = document.createElement('button');
        resetBtn.id = 'hidden-reset-btn';
        resetBtn.style.display = 'none';
        resetBtn.onclick = () => this.resetApplication();
        document.body.appendChild(resetBtn);
        
        // Add to footer for mobile users
        const footer = document.querySelector('footer');
        if (footer) {
            const resetContainer = document.createElement('div');
            resetContainer.innerHTML = `
                <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--color-gray-200);">
                    <button class="btn btn-ghost btn-sm" onclick="window.qrApp.resetApplication()">
                        Reset Application
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="window.qrApp.clearSession()" style="margin-left: 10px;">
                        Clear Session
                    </button>
                    <p class="text-xs" style="margin-top: 8px; color: var(--color-gray-500);">
                        Use Ctrl+Shift+R to reset • Ctrl+Del to clear session
                    </p>
                </div>
            `;
            footer.appendChild(resetContainer);
        }
    }
    
    async loadPreviousSession() {
        try {
            QRUtils.log.info('Checking for previous session...');
            
            // Check if modules have restored data
            const hasExcelData = window.excelProcessor?.fileInfo !== null;
            const hasRangeData = window.rangeSelector?.selectedRange !== null;
            const hasColumnMapping = window.columnMapper?.columnMapping !== null;
            const hasScanResults = window.qrScanner?.scanResults?.length > 0;
            
            if (hasExcelData) {
                this.currentStep = Math.max(this.currentStep, 2);
                QRUtils.show('step-2');
            }
            
            if (hasRangeData) {
                this.currentStep = Math.max(this.currentStep, 3);
                QRUtils.show('step-3');
            }
            
            if (hasColumnMapping) {
                this.currentStep = Math.max(this.currentStep, 5);
                QRUtils.show('step-4');
                QRUtils.show('step-5');
                QRUtils.show('scan-records-section');
            }
            
            if (hasScanResults) {
                QRUtils.log.info('Previous scan results restored');
            }
            
            QRUtils.setStep(this.currentStep);
            
            if (this.currentStep > 1) {
                QRUtils.showSuccess('Previous session restored');
            }
            
        } catch (error) {
            QRUtils.log.warn('Failed to load previous session:', error);
        }
    }
    
    saveCurrentState() {
        const state = {
            currentStep: this.currentStep,
            timestamp: Date.now(),
            modules: {
                hasExcelData: !!window.excelProcessor?.fileInfo,
                hasRangeData: !!window.rangeSelector?.selectedRange,
                hasColumnMapping: !!window.columnMapper?.columnMapping,
                hasScanResults: window.qrScanner?.scanResults?.length > 0
            }
        };
        
        QRUtils.storage.set('app_state', state);
    }
    
    updateStepVisibility() {
        // Hide all steps initially
        for (let i = 1; i <= 5; i++) {
            const step = QRUtils.$(`step-${i}`);
            if (step && i > this.currentStep) {
                QRUtils.hide(step);
            }
        }
        
        // Show scan records section only if we're at step 5
        const scanRecords = QRUtils.$('scan-records-section');
        if (scanRecords && this.currentStep < 5) {
            QRUtils.hide(scanRecords);
        }
    }
    
    async resetApplication() {
        if (!confirm('Reset the entire application? This will clear all data and restart completely.')) {
            return;
        }
        
        try {
            QRUtils.setStatus('Resetting application...', 'loading');
            
            // Stop scanner if active
            if (window.qrScanner?.isScanning) {
                await window.qrScanner.stopScanning();
            }
            
            // Reset all modules
            if (window.excelProcessor) window.excelProcessor.reset();
            if (window.rangeSelector) window.rangeSelector.reset();
            if (window.columnMapper) window.columnMapper.reset();
            if (window.qrScanner) window.qrScanner.reset();
            
            // Clear all storage
            QRUtils.storage.clear();
            
            // Reset app state
            this.currentStep = 1;
            QRUtils.setStep(1);
            
            // Hide all steps except first
            for (let i = 2; i <= 5; i++) {
                QRUtils.hide(`step-${i}`);
            }
            QRUtils.hide('scan-records-section');
            
            // Clear any error messages
            document.querySelectorAll('.alert-error, .alert-warning').forEach(el => el.remove());
            
            // Reload page to ensure clean state
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
            QRUtils.setStatus('Application reset - reloading...', 'success');
            QRUtils.log.success('Application reset completed');
            
        } catch (error) {
            QRUtils.handleError(error, 'Reset Application');
        }
    }
    
    // Public API methods
    getCurrentStep() {
        return this.currentStep;
    }
    
    isReady() {
        return this.isInitialized;
    }
    
    // Diagnostic information
    getDiagnostics() {
        return {
            currentStep: this.currentStep,
            isInitialized: this.isInitialized,
            dependencies: {
                XLSX: typeof XLSX !== 'undefined',
                Html5Qrcode: typeof Html5Qrcode !== 'undefined',
                modules: {
                    excelProcessor: !!window.excelProcessor,
                    rangeSelector: !!window.rangeSelector,
                    columnMapper: !!window.columnMapper,
                    qrScanner: !!window.qrScanner
                }
            },
            data: {
                hasExcelData: !!window.excelProcessor?.fileInfo,
                hasRangeData: !!window.rangeSelector?.selectedRange,
                hasColumnMapping: !!window.columnMapper?.columnMapping,
                scanResultsCount: window.qrScanner?.scanResults?.length || 0
            },
            storage: {
                excel_data: !!QRUtils.storage.get('excel_data'),
                selected_range: !!QRUtils.storage.get('selected_range'),
                column_mapping: !!QRUtils.storage.get('column_mapping'),
                scan_results: !!QRUtils.storage.get('scan_results')
            }
        };
    }
    
    // Export diagnostics for debugging
    exportDiagnostics() {
        const diagnostics = this.getDiagnostics();
        const blob = new Blob([JSON.stringify(diagnostics, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-scanner-diagnostics-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        QRUtils.log.info('Diagnostics exported');
    }
}

// Initialize the application
window.qrApp = new QRCodeApp();

// Expose diagnostics to console for debugging
window.qrDiagnostics = () => {
    console.table(window.qrApp.getDiagnostics());
};

// Console welcome message
console.log('%c🔍 QR Code Component Scanner', 'font-size: 16px; font-weight: bold; color: #000;');
console.log('%cType qrDiagnostics() to see system status', 'color: #666;');
console.log('%cPress Ctrl+Shift+R to reset • Ctrl+Del to clear session', 'color: #666;');