/**
 * Excel API Processor - Main Application
 * Simplified modular architecture that works
 * Alica Technologies
 */

(function(global) {
    'use strict';

    /**
     * Main application class - simplified working version
     */
    class Application {
        constructor() {
            this.modules = new Map();
            this.initialized = false;
            this.config = {
                debug: false,
                autoStart: true,
                maxFileSize: 50 * 1024 * 1024, // 50MB
                supportedFormats: ['xlsx', 'xls']
            };
        }

        /**
         * Initialize the application
         * @param {Object} config - Application configuration
         */
        async init(config = {}) {
            Object.assign(this.config, config);

            try {
                // Initialize core modules using existing working utilities
                await this._initializeCore();
                
                // Initialize services
                await this._initializeServices();
                
                // Set up event listeners
                this._setupEventListeners();
                
                // Start the application
                if (this.config.autoStart) {
                    await this.start();
                }

                this.initialized = true;
                this._log('INFO', 'Application initialized successfully');
            } catch (error) {
                this._log('ERROR', 'Application initialization failed', error);
                throw error;
            }
        }

        /**
         * Start the application
         */
        async start() {
            if (!this.initialized) {
                throw new Error('Application not initialized');
            }

            try {
                // Start all modules
                for (const [name, module] of this.modules) {
                    if (module.start && typeof module.start === 'function') {
                        await module.start();
                        this._log('INFO', `Module started: ${name}`);
                    }
                }

                this._log('INFO', 'Application started successfully');
            } catch (error) {
                this._log('ERROR', 'Application start failed', error);
                throw error;
            }
        }

        /**
         * Get module by name
         * @param {string} name - Module name
         * @returns {Object|null} Module instance
         */
        getModule(name) {
            return this.modules.get(name) || null;
        }

        /**
         * Initialize core modules using existing working system
         * @private
         */
        async _initializeCore() {
            // Use existing ExcelUtils instead of non-existent namespace
            if (global.ExcelUtils) {
                this.modules.set('Logger', global.ExcelUtils);
                this._log('INFO', 'Using ExcelUtils for logging');
            }
        }

        /**
         * Initialize service modules
         * @private
         */
        async _initializeServices() {
            // Services will be initialized by individual modules
            this._log('INFO', 'Services initialization ready');
        }

        /**
         * Set up application-level event listeners
         * @private
         */
        _setupEventListeners() {
            // Global error handler
            window.addEventListener('error', (event) => {
                this._log('ERROR', 'Uncaught error', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            });

            window.addEventListener('unhandledrejection', (event) => {
                this._log('ERROR', 'Unhandled promise rejection', {
                    reason: event.reason
                });
            });

            this._log('INFO', 'Event listeners set up');
        }

        /**
         * Log message using existing ExcelUtils
         * @private
         */
        _log(level, message, data = null) {
            if (global.ExcelUtils && global.ExcelUtils.log) {
                global.ExcelUtils.log(level, message, data);
            } else {
                console.log(`[${level}] ${message}`, data || '');
            }
        }
    }

    // Create singleton instance
    const app = new Application();

    // Export to global namespace
    if (!global.ExcelProcessor) {
        global.ExcelProcessor = {};
    }
    
    global.ExcelProcessor.Application = app;

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            app.init().catch(error => {
                console.error('Failed to initialize Excel Processor:', error);
            });
        });
    } else {
        app.init().catch(error => {
            console.error('Failed to initialize Excel Processor:', error);
        });
    }

})(window);