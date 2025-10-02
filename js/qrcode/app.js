/**
 * QR Code Component Scanner - Main Application
 * Professional-grade application orchestration and workflow management
 * 
 * Handles:
 * - Application initialization and lifecycle
 * - Step-by-step workflow coordination
 * - Module integration and communication
 * - Error boundary and recovery
 * - Performance monitoring
 * - User experience optimization
 */

class QRScannerApp {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 5;
        this.modules = {
            excelProcessor: null,
            rangeSelector: null,
            columnMapper: null,
            qrScanner: null
        };
        this.appState = {
            initialized: false,
            hasData: false,
            hasMapping: false,
            isScanning: false
        };
        this.performanceMetrics = {
            initTime: null,
            loadTime: null,
            scanStartTime: null
        };
        
        // Application lifecycle
        this.initialize();
    }

    
// Enhanced dependency checking for app.js - FIXED VERSION

checkDependencies() {
    QRUtils.log.info('Starting dependency checks...');

    const checks = {
        'Secure Context': window.isSecureContext,
        'Local Storage': typeof Storage !== 'undefined',
        'Media Devices': !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        'File API': !!(window.File && window.FileReader),
        'Canvas Support': !!document.createElement('canvas').getContext,
        'Web Workers': typeof Worker !== 'undefined',
        'Service Worker': 'serviceWorker' in navigator,
        'Html5Qrcode': typeof Html5Qrcode !== 'undefined',
        'XLSX': typeof XLSX !== 'undefined'
    };

    const failedChecks = Object.entries(checks)
        .filter(([name, supported]) => !supported)
        .map(([name]) => name);

    const passedChecks = Object.entries(checks)
        .filter(([name, supported]) => supported)
        .map(([name]) => name);

    QRUtils.log.info('✅ Passed checks:', passedChecks);

    if (failedChecks.length > 0) {
        QRUtils.log.warn('⚠️ Failed checks:', failedChecks);

        // Show warnings but don't block initialization for non-critical failures
        const criticalFailures = failedChecks.filter(check => 
            ['File API', 'Canvas Support', 'Html5Qrcode'].includes(check)
        );

        if (criticalFailures.length > 0) {
            const error = new Error(`Critical dependencies missing: ${criticalFailures.join(', ')}`);
            QRUtils.handleError(error, 'Dependency Check');
            return false;
        }

        // Show security warning if not in secure context
        if (failedChecks.includes('Secure Context')) {
            this.showSecurityWarning();
        }

        // Show info about missing optional features
        const optionalFailures = failedChecks.filter(check => 
            !criticalFailures.includes(check)
        );

        if (optionalFailures.length > 0) {
            QRUtils.setStatus(`Optional features unavailable: ${optionalFailures.join(', ')}`, 'warning');
        }
    }

    // Check QR scanner module separately (may not be ready yet)
    setTimeout(() => {
        if (!window.qrScanner) {
            QRUtils.log.warn('QR Scanner module not yet initialized - this is normal during startup');
        } else {
            QRUtils.log.success('QR Scanner module found');
        }
    }, 1000);

    QRUtils.log.success('✅ Dependency check completed');
    return true;
}

    
    async initialize() {
        const startTime = performance.now();
        
        try {
            QRUtils.log.info('🔍 QR Code Component Scanner');
            QRUtils.log.info('Initializing application...');
            
            // Initialize utilities and check environment
            this.checkEnvironment();
            
            // Load previous session if available
            this.loadSession();
            
            // Initialize UI components
            this.initializeUI();
            
            // Set up global event handlers
            this.setupGlobalEventHandlers();
            
            // Initialize modules
            await this.initializeModules();
            
            // Set initial state
            this.appState.initialized = true;
            this.performanceMetrics.initTime = performance.now() - startTime;
            
            QRUtils.setStatus('Application ready', 'success');
            QRUtils.log.success(`✓ Application initialized in ${this.performanceMetrics.initTime.toFixed(2)}ms`);
            
            // Show startup message
            this.showStartupMessage();
            
        } catch (error) {
            QRUtils.handleError(error, 'Application Initialization');
            this.handleCriticalError(error);
        }
    }
    
    checkEnvironment() {
        const checks = {
            'Secure Context': window.isSecureContext,
            'Local Storage': typeof Storage !== 'undefined',
            'Media Devices': !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            'File API': !!(window.File && window.FileReader),
            'Canvas Support': !!document.createElement('canvas').getContext,
            'Web Workers': typeof Worker !== 'undefined'
        };
        
        const failedChecks = Object.entries(checks)
            .filter(([name, supported]) => !supported)
            .map(([name]) => name);
        
        if (failedChecks.length > 0) {
            QRUtils.log.warn('Environment checks failed:', failedChecks);
            
            // Show warnings but don't block initialization
            if (failedChecks.includes('Secure Context')) {
                this.showSecurityWarning();
            }
        }
        
        QRUtils.log.info('Environment checks completed');
    }
    
    showSecurityWarning() {
        const warning = document.createElement('div');
        warning.className = 'alert alert-warning';
        warning.innerHTML = `
            <div class="alert-title">Security Warning</div>
            Camera access requires HTTPS. Some features may not work on HTTP.
            <br><strong>Recommendation:</strong> Use HTTPS or localhost for full functionality.
        `;
        
        const firstSection = document.querySelector('.section');
        if (firstSection) {
            firstSection.parentNode.insertBefore(warning, firstSection);
        }
    }
    
    initializeUI() {
        // Set initial step indicator
        this.updateStepIndicator();
        
        // Set up step navigation
        this.setupStepNavigation();
        
        // Initialize tooltips and help text
        this.initializeTooltips();
        
        // Set up responsive behavior
        this.setupResponsiveBehavior();
        
        QRUtils.log.info('UI components initialized');
    }
    
    setupStepNavigation() {
        // Add step progress indicator
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container hidden';
        progressContainer.id = 'step-progress';
        progressContainer.innerHTML = `
            <div class="progress-text">Step Progress</div>
            <div class="progress-bar-bg">
                <div class="progress-bar" id="progress-bar"></div>
            </div>
        `;
        
        const header = document.querySelector('header');
        if (header) {
            header.appendChild(progressContainer);
        }
    }
    
    updateStepIndicator() {
        QRUtils.setStep(this.currentStep, this.totalSteps);
        
        // Update progress bar
        const progressBar = QRUtils.$('progress-bar');
        if (progressBar) {
            const progress = (this.currentStep / this.totalSteps) * 100;
            progressBar.style.width = `${progress}%`;
        }
    }
    
    initializeTooltips() {
        // Add keyboard shortcut tooltips
        const buttons = document.querySelectorAll('button[id]');
        buttons.forEach(button => {
            const shortcuts = {
                'start-camera': 'Ctrl+S',
                'stop-camera': 'Escape',
                'export-excel': 'Ctrl+E',
                'manual-entry': 'Ctrl+M'
            };
            
            const shortcut = shortcuts[button.id];
            if (shortcut) {
                const originalTitle = button.title || button.textContent;
                button.title = `${originalTitle} (${shortcut})`;
            }
        });
    }
    
    setupResponsiveBehavior() {
        // Handle orientation changes on mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 500);
        });
        
        // Handle window resize
        window.addEventListener('resize', 
            QRUtils.debounce(this.handleWindowResize.bind(this), 250)
        );
    }
    
    handleOrientationChange() {
        QRUtils.log.info('Orientation changed');
        
        // Restart scanner if active to adjust to new orientation
        if (this.appState.isScanning && this.modules.qrScanner) {
            setTimeout(async () => {
                await this.modules.qrScanner.stopScanning();
                setTimeout(() => {
                    this.modules.qrScanner.startScanning();
                }, 1000);
            }, 500);
        }
    }
    
    handleWindowResize() {
        // Adjust scanner dimensions if needed
        const scannerContainer = QRUtils.$('scanner-container');
        if (scannerContainer) {
            // Trigger any necessary UI adjustments
            scannerContainer.style.height = 'auto';
        }
    }
    
    setupGlobalEventHandlers() {
        // Global error handler
        window.addEventListener('error', this.handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
        
        // Visibility change handler
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Page unload handler
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        
        // Clear session button
        const clearBtn = QRUtils.$('clear-session-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', this.clearSession.bind(this));
        }
        
        QRUtils.log.info('Global event handlers set up');
    }
    
    handleGlobalError(event) {
        QRUtils.log.error('Global error:', event.error);
        
        // Don't interfere with module-specific error handling
        if (event.error?.context !== 'module-handled') {
            QRUtils.setStatus('Application error occurred', 'error');
        }
    }
    
    handleUnhandledRejection(event) {
        QRUtils.log.error('Unhandled promise rejection:', event.reason);
        QRUtils.setStatus('Promise rejection error', 'error');
        event.preventDefault(); // Prevent console error
    }
    
    handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden, pause scanning if active
            if (this.appState.isScanning && this.modules.qrScanner) {
                QRUtils.log.info('Page hidden, pausing scanner');
                this.modules.qrScanner.stopScanning();
            }
        } else {
            // Page is visible, resume if appropriate
            QRUtils.log.info('Page visible again');
        }
    }
    
    handleBeforeUnload(event) {
        // Save current state
        this.saveSession();
        
        // Clean up scanner resources
        if (this.modules.qrScanner) {
            this.modules.qrScanner.reset();
        }
    }
    
    async initializeModules() {
        QRUtils.log.info('Initializing application modules...');
        
        // Initialize modules in sequence
        try {
            // Excel processor is initialized on-demand
            // Range selector is initialized on-demand
            // Column mapper is initialized on-demand
            
            // QR Scanner is initialized immediately but camera access is deferred
            // It's already initialized globally, just reference it
            this.modules.qrScanner = window.qrScanner;
            
            // Set up module communication
            this.setupModuleCommunication();
            
            QRUtils.log.success('All modules initialized');
            
        } catch (error) {
            QRUtils.handleError(error, 'Module Initialization');
            throw error;
        }
    }
    
    setupModuleCommunication() {
        // Set up inter-module communication channels
        
        // Listen for Excel processor events
        document.addEventListener('excel-processed', (event) => {
            this.handleExcelProcessed(event.detail);
        });
        
        // Listen for range selection events
        document.addEventListener('range-selected', (event) => {
            this.handleRangeSelected(event.detail);
        });
        
        // Listen for column mapping events
        document.addEventListener('columns-mapped', (event) => {
            this.handleColumnsMapped(event.detail);
        });
        
        QRUtils.log.info('Module communication established');
    }
    
    handleExcelProcessed(data) {
        this.appState.hasData = true;
        this.advanceToStep(2);
        QRUtils.log.success('Excel processing completed, advancing to step 2');
    }
    
    handleRangeSelected(data) {
        this.advanceToStep(4); // Skip to column mapping
        QRUtils.log.success('Range selected, advancing to column mapping');
    }
    
    handleColumnsMapped(data) {
        this.appState.hasMapping = true;
        
        // Pass mapping to scanner
        if (this.modules.qrScanner) {
            this.modules.qrScanner.updateColumnMapping(data.columnMapping, data.rangeData);
        }
        
        this.advanceToStep(5);
        QRUtils.log.success('Column mapping completed, ready to scan');
    }
    
    advanceToStep(stepNumber) {
        if (stepNumber < 1 || stepNumber > this.totalSteps) {
            QRUtils.log.warn('Invalid step number:', stepNumber);
            return;
        }
        
        // Hide current step
        const currentStepElement = QRUtils.$(`step-${this.currentStep}`);
        if (currentStepElement) {
            QRUtils.hide(currentStepElement);
        }
        
        // Show new step
        const newStepElement = QRUtils.$(`step-${stepNumber}`);
        if (newStepElement) {
            QRUtils.show(newStepElement);
            newStepElement.classList.add('animate-slide-up');
        }
        
        // Update state
        this.currentStep = stepNumber;
        this.updateStepIndicator();
        
        // Show progress bar from step 2 onwards
        if (stepNumber >= 2) {
            const progressContainer = QRUtils.$('step-progress');
            if (progressContainer) {
                QRUtils.show(progressContainer);
            }
        }
        
        QRUtils.log.info(`Advanced to step ${stepNumber}`);
    }
    
    goToStep(stepNumber) {
        if (stepNumber === this.currentStep) return;
        
        // Validate that previous steps are completed
        if (!this.canAccessStep(stepNumber)) {
            QRUtils.setStatus('Complete previous steps first', 'warning');
            return;
        }
        
        this.advanceToStep(stepNumber);
    }
    
    canAccessStep(stepNumber) {
        switch (stepNumber) {
            case 1:
                return true; // Always accessible
            case 2:
                return this.appState.hasData;
            case 3:
                return this.appState.hasData;
            case 4:
                return this.appState.hasData;
            case 5:
                return this.appState.hasMapping;
            default:
                return false;
        }
    }
    
    clearSession() {
        const confirmed = confirm(
            'This will clear all data and reset the application. Continue?'
        );
        
        if (!confirmed) return;
        
        try {
            QRUtils.log.info('Clearing session...');
            
            // Stop any active processes
            if (this.modules.qrScanner?.isScanning) {
                this.modules.qrScanner.stopScanning();
            }
            
            // Reset all modules
            Object.values(this.modules).forEach(module => {
                if (module && typeof module.reset === 'function') {
                    module.reset();
                }
            });
            
            // Clear storage
            QRUtils.storage.clear();
            
            // Reset application state
            this.appState = {
                initialized: true,
                hasData: false,
                hasMapping: false,
                isScanning: false
            };
            
            // Reset to step 1
            this.goToFirstStep();
            
            // Clear UI
            this.clearAllStepsContent();
            
            QRUtils.showSuccess('Session cleared successfully');
            QRUtils.log.success('Session cleared');
            
        } catch (error) {
            QRUtils.handleError(error, 'Session Clear');
        }
    }
    
    goToFirstStep() {
        // Hide all steps
        for (let i = 1; i <= this.totalSteps; i++) {
            const stepElement = QRUtils.$(`step-${i}`);
            if (stepElement) {
                QRUtils.hide(stepElement);
            }
        }
        
        // Show first step
        this.currentStep = 1;
        const firstStep = QRUtils.$('step-1');
        if (firstStep) {
            QRUtils.show(firstStep);
        }
        
        // Hide progress bar
        const progressContainer = QRUtils.$('step-progress');
        if (progressContainer) {
            QRUtils.hide(progressContainer);
        }
        
        // Hide scan records section
        const recordsSection = QRUtils.$('scan-records-section');
        if (recordsSection) {
            QRUtils.hide(recordsSection);
        }
        
        this.updateStepIndicator();
    }
    
    clearAllStepsContent() {
        // Clear file input
        const fileInput = QRUtils.$('excel-file');
        if (fileInput) {
            fileInput.value = '';
        }
        
        // Clear sheet selector
        const sheetSelect = QRUtils.$('sheet-select');
        if (sheetSelect) {
            sheetSelect.innerHTML = '<option value="">Select a sheet...</option>';
        }
        
        // Clear range inputs
        ['start-row', 'end-row', 'start-col', 'end-col'].forEach(id => {
            const input = QRUtils.$(id);
            if (input) {
                input.value = input.id.includes('row') ? '1' : 
                             input.id === 'start-col' ? 'A' : 'H';
            }
        });
        
        // Clear data preview
        const dataPreview = QRUtils.$('data-preview');
        if (dataPreview) {
            dataPreview.innerHTML = '';
        }
        
        // Clear column mappers
        ['map-serial', 'map-mpn', 'map-designators', 'map-manufacturer', 'map-quantity', 'map-target']
            .forEach(id => {
                const select = QRUtils.$(id);
                if (select) {
                    select.innerHTML = '<option value="">Select column...</option>';
                }
            });
    }
    
    showStartupMessage() {
        const messages = [
            'Type qrDiagnostics() to see system status',
            'Press Ctrl+Shift+R to reset • Ctrl+Del to clear session',
            'Use Escape to stop scanning • Space to skip items'
        ];
        
        messages.forEach((message, index) => {
            setTimeout(() => {
                QRUtils.log.info(message);
            }, index * 100);
        });
    }
    
    // Session management
    saveSession() {
        const sessionData = {
            currentStep: this.currentStep,
            appState: this.appState,
            timestamp: Date.now()
        };
        
        QRUtils.storage.set('app_session', sessionData);
        QRUtils.log.info('Session saved');
    }
    
    loadSession() {
        const sessionData = QRUtils.storage.get('app_session');
        if (!sessionData) {
            QRUtils.log.info('No previous session found');
            return;
        }
        
        // Check if session is recent (within 2 hours)
        const isRecent = sessionData.timestamp && 
            (Date.now() - sessionData.timestamp) < 2 * 60 * 60 * 1000;
        
        if (!isRecent) {
            QRUtils.log.info('Previous session expired, starting fresh');
            QRUtils.storage.remove('app_session');
            return;
        }
        
        try {
            this.currentStep = sessionData.currentStep || 1;
            this.appState = { ...this.appState, ...sessionData.appState };
            
            QRUtils.log.info('Previous session restored');
            
            // Show appropriate step after initialization
            setTimeout(() => {
                if (this.currentStep > 1) {
                    this.advanceToStep(this.currentStep);
                }
            }, 1000);
            
        } catch (error) {
            QRUtils.log.warn('Failed to restore session:', error);
            QRUtils.storage.remove('app_session');
        }
    }
    
    // Error handling
    handleCriticalError(error) {
        QRUtils.log.error('Critical application error:', error);
        
        const errorOverlay = document.createElement('div');
        errorOverlay.className = 'loading-overlay';
        errorOverlay.innerHTML = `
            <div class="panel" style="max-width: 400px; margin: 2rem;">
                <h3 style="color: var(--color-error); margin-bottom: 1rem;">Critical Error</h3>
                <p style="margin-bottom: 1.5rem;">${QRUtils.escapeHtml(error.message)}</p>
                <div class="btn-group">
                    <button onclick="location.reload()" class="btn">Reload Application</button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            class="btn btn-secondary">Dismiss</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(errorOverlay);
    }
    
    // Performance monitoring
    measurePerformance(name, fn) {
        const start = performance.now();
        
        try {
            const result = fn();
            
            if (result && typeof result.then === 'function') {
                return result.finally(() => {
                    const duration = performance.now() - start;
                    this.recordPerformanceMetric(name, duration);
                });
            } else {
                const duration = performance.now() - start;
                this.recordPerformanceMetric(name, duration);
                return result;
            }
            
        } catch (error) {
            const duration = performance.now() - start;
            this.recordPerformanceMetric(name, duration, error);
            throw error;
        }
    }
    
    recordPerformanceMetric(name, duration, error = null) {
        this.performanceMetrics[name] = duration;
        
        if (error) {
            QRUtils.log.error(`Performance [${name}]: ${duration.toFixed(2)}ms (ERROR)`, error);
        } else {
            QRUtils.log.info(`Performance [${name}]: ${duration.toFixed(2)}ms`);
        }
    }
    
    // Public methods for debugging and diagnostics
    getStatus() {
        const status = {
            app: {
                currentStep: this.currentStep,
                state: this.appState,
                performance: this.performanceMetrics
            },
            scanner: this.modules.qrScanner?.getStatus() || null,
            camera: this.modules.qrScanner?.cameraManager?.getStatus() || null,
            environment: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine,
                hardwareConcurrency: navigator.hardwareConcurrency,
                deviceMemory: navigator.deviceMemory || 'unknown'
            }
        };
        
        return status;
    }
    
    // Global functions for console debugging
    installGlobalFunctions() {
        window.qrDiagnostics = () => {
            const status = this.getStatus();
            console.table(status.app.state);
            console.table(status.scanner);
            console.table(status.camera);
            console.table(status.environment);
            return status;
        };
        
        window.qrReset = () => {
            this.clearSession();
        };
        
        window.qrPerf = () => {
            console.table(this.performanceMetrics);
            return this.performanceMetrics;
        };
        
        QRUtils.log.info('Global diagnostic functions installed');
    }
    
    showStartMessage() {
        setTimeout(() => {
            QRUtils.log.info('🚀 QR Code Component Scanner Ready');
            QRUtils.log.info('📋 Load your Excel BOM file to begin');
            QRUtils.log.info('⚡ Type qrDiagnostics() for system diagnostics');
        }, 500);
    }
}

// Application initialization
document.addEventListener('DOMContentLoaded', () => {
    QRUtils.log.info('DOM loaded, initializing application...');
    
    // Initialize main application
    window.qrScannerApp = new QRScannerApp();
    
    // Install global debugging functions
    window.qrScannerApp.installGlobalFunctions();
    
    // Show welcome message
    window.qrScannerApp.showStartMessage();
});

// Handle hot reloads in development - REMOVE THE MODULE CHECK THAT CAUSES ERROR
// This was causing 'module is not defined' error in browser environment

// Global keyboard shortcuts
document.addEventListener('keydown', (event) => {
    // Global shortcuts that work regardless of focus
    if (event.ctrlKey && event.shiftKey) {
        switch (event.key) {
            case 'R':
                event.preventDefault();
                if (window.qrScannerApp) {
                    window.qrScannerApp.clearSession();
                }
                break;
        }
    }
    
    if (event.ctrlKey && event.key === 'Delete') {
        event.preventDefault();
        if (window.qrScannerApp) {
            window.qrScannerApp.clearSession();
        }
    }
});

// Export for module systems (only in Node.js-like environments)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QRScannerApp;
}

// Service Worker messaging
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
        const { type, message } = event.data;
        
        switch (type) {
            case 'SYNC_STARTED':
                QRUtils.setStatus(message, 'info');
                break;
            case 'SYNC_COMPLETED':
                QRUtils.showSuccess(message);
                break;
            default:
                QRUtils.log.info('SW Message:', event.data);
        }
    });
}

QRUtils.log.info('QR Code Component Scanner application loaded');