/**
 * Excel API Processor - Application Orchestrator
 * Lightweight wrapper that doesn't interfere with main ExcelProcessor
 * Alica Technologies
 */

'use strict';

/**
 * Simple application orchestrator - non-conflicting version
 */
class ApplicationOrchestrator {
    constructor() {
        this.initialized = false;
        this.modules = {};
    }

    /**
     * Initialize application orchestrator
     */
    init() {
        if (this.initialized) return;
        
        try {
            // Simple initialization without conflicts
            this._setupGlobalErrorHandling();
            
            this.initialized = true;
            
            if (window.ExcelUtils) {
                ExcelUtils.log('INFO', 'Application orchestrator initialized');
            }
        } catch (error) {
            console.error('Application orchestrator init failed:', error);
        }
    }

    /**
     * Set up global error handling
     * @private
     */
    _setupGlobalErrorHandling() {
        // Global error handler for better debugging
        window.addEventListener('error', (event) => {
            if (window.ExcelUtils) {
                ExcelUtils.log('ERROR', 'Global error caught', {
                    message: event.message,
                    filename: event.filename,
                    line: event.lineno
                });
            }
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            if (window.ExcelUtils) {
                ExcelUtils.log('ERROR', 'Unhandled promise rejection', {
                    reason: event.reason
                });
            }
            // Prevent default console error
            event.preventDefault();
        });
    }

    /**
     * Get application state for debugging
     * @returns {Object} Application state
     */
    getState() {
        return {
            initialized: this.initialized,
            hasExcelProcessor: !!window.excelProcessor,
            hasExcelUtils: !!window.ExcelUtils,
            timestamp: new Date().toISOString()
        };
    }
}

// Create and initialize orchestrator
const appOrchestrator = new ApplicationOrchestrator();

// Initialize immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        appOrchestrator.init();
    });
} else {
    appOrchestrator.init();
}

// Export to global namespace for debugging
window.appOrchestrator = appOrchestrator;