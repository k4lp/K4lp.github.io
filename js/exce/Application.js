/**
 * Excel API Processor - Main Application
 * Professional Modular Architecture Orchestrator
 * Alica Technologies
 */

(function(global) {
    'use strict';

    /**
     * Main application class that orchestrates all modules
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
                // Initialize core modules first
                await this._initializeCore();
                
                // Initialize services
                await this._initializeServices();
                
                // Initialize controllers
                await this._initializeControllers();
                
                // Initialize UI managers
                await this._initializeUI();
                
                // Set up event listeners
                this._setupEventListeners();
                
                // Start the application
                if (this.config.autoStart) {
                    await this.start();
                }

                this.initialized = true;
                this._log('info', 'Application initialized successfully');
            } catch (error) {
                this._log('fatal', 'Application initialization failed', error);
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
                        this._log('debug', `Module started: ${name}`);
                    }
                }

                this._emitEvent('application.started');
                this._log('info', 'Application started successfully');
            } catch (error) {
                this._log('error', 'Application start failed', error);
                throw error;
            }
        }

        /**
         * Stop the application
         */
        async stop() {
            try {
                // Stop all modules in reverse order
                const moduleEntries = Array.from(this.modules.entries()).reverse();
                
                for (const [name, module] of moduleEntries) {
                    if (module.stop && typeof module.stop === 'function') {
                        await module.stop();
                        this._log('debug', `Module stopped: ${name}`);
                    }
                }

                this._emitEvent('application.stopped');
                this._log('info', 'Application stopped successfully');
            } catch (error) {
                this._log('error', 'Application stop failed', error);
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
         * Get application statistics
         * @returns {Object} Application stats
         */
        getStats() {
            const stats = {
                initialized: this.initialized,
                moduleCount: this.modules.size,
                modules: {},
                memory: this._getMemoryStats()
            };

            // Get stats from each module if available
            for (const [name, module] of this.modules) {
                if (module.getStats && typeof module.getStats === 'function') {
                    stats.modules[name] = module.getStats();
                }
            }

            return stats;
        }

        /**
         * Initialize core modules
         * @private
         */
        async _initializeCore() {
            // Initialize Logger first
            if (global.ExcelProcessor.Core.Logger) {
                global.ExcelProcessor.Core.Logger.init({
                    showTimestamp: true,
                    showModule: true,
                    colorConsole: true,
                    persistToStorage: false
                });
                
                if (this.config.debug) {
                    global.ExcelProcessor.Core.Logger.setLevel('DEBUG');
                }
                
                this.modules.set('Logger', global.ExcelProcessor.Core.Logger);
            }

            // Initialize EventBus
            if (global.ExcelProcessor.Core.EventBus) {
                global.ExcelProcessor.Core.EventBus.setDebug(this.config.debug);
                this.modules.set('EventBus', global.ExcelProcessor.Core.EventBus);
            }
        }

        /**
         * Initialize service modules
         * @private
         */
        async _initializeServices() {
            // File Service
            if (global.ExcelProcessor.Services.FileService) {
                global.ExcelProcessor.Services.FileService.init({
                    supportedFormats: this.config.supportedFormats,
                    maxFileSize: this.config.maxFileSize
                });
                this.modules.set('FileService', global.ExcelProcessor.Services.FileService);
            }

            // Validation Service (when created)
            // API Service (when created)
            // Excel Service (when created)
        }

        /**
         * Initialize controller modules
         * @private
         */
        async _initializeControllers() {
            // File Controller (when created)
            // Mapping Controller (when created)
            // Processing Controller (when created)
            // Export Controller (when created)
        }

        /**
         * Initialize UI modules
         * @private
         */
        async _initializeUI() {
            // UI Manager (when created)
            // Status Manager (when created)
            // Progress Manager (when created)
            // Settings Manager (when created)
        }

        /**
         * Set up application-level event listeners
         * @private
         */
        _setupEventListeners() {
            const eventBus = global.ExcelProcessor.Core.EventBus;
            if (!eventBus) return;

            // Global error handler
            eventBus.on('*.error', (error) => {
                this._log('error', 'Global error caught', error);
            });

            // File processing events
            eventBus.on('file.loaded', (data) => {
                this._log('info', 'File loaded', { fileName: data.file.name });
            });

            eventBus.on('processing.completed', (data) => {
                this._log('info', 'Processing completed', data);
            });

            // Window events
            window.addEventListener('beforeunload', () => {
                this.stop().catch(error => {
                    console.error('Error during application shutdown:', error);
                });
            });

            // Error boundary
            window.addEventListener('error', (event) => {
                this._log('fatal', 'Uncaught error', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: event.error
                });
            });

            window.addEventListener('unhandledrejection', (event) => {
                this._log('fatal', 'Unhandled promise rejection', {
                    reason: event.reason
                });
            });
        }

        /**
         * Get memory statistics
         * @private
         */
        _getMemoryStats() {
            if (performance.memory) {
                return {
                    usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
                    totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB',
                    jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
                };
            }
            return { available: false };
        }

        /**
         * Log message using core logger
         * @private
         */
        _log(level, message, data = null) {
            if (global.ExcelProcessor && global.ExcelProcessor.Core && global.ExcelProcessor.Core.Logger) {
                global.ExcelProcessor.Core.Logger[level]('Application', message, data);
            }
        }

        /**
         * Emit event using core event bus
         * @private
         */
        _emitEvent(event, data = null) {
            if (global.ExcelProcessor && global.ExcelProcessor.Core && global.ExcelProcessor.Core.EventBus) {
                global.ExcelProcessor.Core.EventBus.emit(event, data);
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
    global.ExcelProcessor.ApplicationClass = Application;

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