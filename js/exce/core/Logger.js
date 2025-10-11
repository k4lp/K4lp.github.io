/**
 * Excel API Processor - Core Logger
 * Professional Logging System
 * Alica Technologies
 */

(function(global) {
    'use strict';

    /**
     * Professional logging system with levels, filtering, and performance tracking
     */
    class Logger {
        constructor() {
            this.levels = {
                TRACE: 0,
                DEBUG: 1,
                INFO: 2,
                WARN: 3,
                ERROR: 4,
                FATAL: 5
            };

            this.currentLevel = this.levels.INFO;
            this.maxEntries = 1000;
            this.entries = [];
            this.performanceMarks = new Map();
            this.errorCount = 0;
            this.warningCount = 0;
            
            this.config = {
                showTimestamp: true,
                showLevel: true,
                showModule: true,
                colorConsole: true,
                persistToStorage: false,
                storageKey: 'exce_logs'
            };

            this.colors = {
                TRACE: '#999999',
                DEBUG: '#2563eb',
                INFO: '#059669', 
                WARN: '#d97706',
                ERROR: '#dc2626',
                FATAL: '#7c2d12'
            };

            this.moduleFilters = new Set();
            this.initialized = false;
        }

        /**
         * Initialize logger with configuration
         * @param {Object} config - Logger configuration
         */
        init(config = {}) {
            Object.assign(this.config, config);
            
            if (this.config.persistToStorage) {
                this._loadFromStorage();
            }

            this.initialized = true;
            this.info('Logger', 'Logger initialized', { config: this.config });
        }

        /**
         * Set logging level
         * @param {string|number} level - Log level
         */
        setLevel(level) {
            if (typeof level === 'string') {
                level = this.levels[level.toUpperCase()];
            }
            
            if (level >= 0 && level <= 5) {
                this.currentLevel = level;
                this.info('Logger', `Log level set to ${this._getLevelName(level)}`);
            }
        }

        /**
         * Add module filter (only log from specific modules)
         * @param {string} module - Module name to filter
         */
        addModuleFilter(module) {
            this.moduleFilters.add(module);
        }

        /**
         * Remove module filter
         * @param {string} module - Module name to remove
         */
        removeModuleFilter(module) {
            this.moduleFilters.delete(module);
        }

        /**
         * Clear all module filters
         */
        clearModuleFilters() {
            this.moduleFilters.clear();
        }

        /**
         * Log trace message
         */
        trace(module, message, data = null) {
            this._log('TRACE', module, message, data);
        }

        /**
         * Log debug message
         */
        debug(module, message, data = null) {
            this._log('DEBUG', module, message, data);
        }

        /**
         * Log info message
         */
        info(module, message, data = null) {
            this._log('INFO', module, message, data);
        }

        /**
         * Log warning message
         */
        warn(module, message, data = null) {
            this.warningCount++;
            this._log('WARN', module, message, data);
        }

        /**
         * Log error message
         */
        error(module, message, error = null) {
            this.errorCount++;
            const data = error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : null;
            this._log('ERROR', module, message, data);
        }

        /**
         * Log fatal error message
         */
        fatal(module, message, error = null) {
            this.errorCount++;
            const data = error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : null;
            this._log('FATAL', module, message, data);
        }

        /**
         * Start performance measurement
         * @param {string} name - Measurement name
         */
        startTiming(name) {
            this.performanceMarks.set(name, {
                start: performance.now(),
                end: null,
                duration: null
            });
        }

        /**
         * End performance measurement
         * @param {string} name - Measurement name
         * @returns {number} Duration in milliseconds
         */
        endTiming(name) {
            const mark = this.performanceMarks.get(name);
            if (!mark) {
                this.warn('Logger', `No timing mark found for '${name}'`);
                return 0;
            }

            mark.end = performance.now();
            mark.duration = mark.end - mark.start;
            
            this.debug('Performance', `${name}: ${mark.duration.toFixed(2)}ms`);
            return mark.duration;
        }

        /**
         * Get performance statistics
         * @returns {Object} Performance stats
         */
        getPerformanceStats() {
            const stats = {};
            for (const [name, mark] of this.performanceMarks) {
                if (mark.duration !== null) {
                    stats[name] = mark.duration;
                }
            }
            return stats;
        }

        /**
         * Get logger statistics
         * @returns {Object} Logger stats
         */
        getStats() {
            return {
                totalEntries: this.entries.length,
                errorCount: this.errorCount,
                warningCount: this.warningCount,
                currentLevel: this._getLevelName(this.currentLevel),
                moduleFilters: Array.from(this.moduleFilters),
                memoryUsage: this._getMemoryUsage()
            };
        }

        /**
         * Get recent log entries
         * @param {number} count - Number of entries to return
         * @param {string} level - Minimum level filter
         * @returns {Array} Log entries
         */
        getRecentEntries(count = 50, level = null) {
            let entries = [...this.entries];
            
            if (level) {
                const minLevel = this.levels[level.toUpperCase()];
                entries = entries.filter(entry => this.levels[entry.level] >= minLevel);
            }

            return entries.slice(-count);
        }

        /**
         * Export logs as text
         * @param {string} format - Export format ('text' or 'json')
         * @returns {string} Exported logs
         */
        exportLogs(format = 'text') {
            if (format === 'json') {
                return JSON.stringify({
                    exported: new Date().toISOString(),
                    stats: this.getStats(),
                    entries: this.entries
                }, null, 2);
            }

            return this.entries.map(entry => 
                `${entry.timestamp} [${entry.level}] ${entry.module}: ${entry.message}` +
                (entry.data ? ` | ${JSON.stringify(entry.data)}` : '')
            ).join('\n');
        }

        /**
         * Clear all log entries
         */
        clear() {
            this.entries = [];
            this.errorCount = 0;
            this.warningCount = 0;
            this.performanceMarks.clear();
            
            if (this.config.persistToStorage) {
                this._saveToStorage();
            }
            
            this.info('Logger', 'Log entries cleared');
        }

        /**
         * Core logging method
         * @private
         */
        _log(level, module, message, data) {
            const levelNum = this.levels[level];
            
            // Check level filter
            if (levelNum < this.currentLevel) {
                return;
            }

            // Check module filter
            if (this.moduleFilters.size > 0 && !this.moduleFilters.has(module)) {
                return;
            }

            const entry = {
                timestamp: new Date().toISOString(),
                level,
                module,
                message,
                data: data || null
            };

            // Add to entries
            this.entries.push(entry);
            
            // Rotate logs if needed
            if (this.entries.length > this.maxEntries) {
                this.entries = this.entries.slice(-Math.floor(this.maxEntries * 0.8));
            }

            // Console output
            this._outputToConsole(entry);

            // Persist if configured
            if (this.config.persistToStorage) {
                this._saveToStorage();
            }

            // Emit event if EventBus available
            if (global.ExcelProcessor && global.ExcelProcessor.Core && global.ExcelProcessor.Core.EventBus) {
                global.ExcelProcessor.Core.EventBus.emit('logger.entry', entry);
            }
        }

        /**
         * Output to browser console
         * @private
         */
        _outputToConsole(entry) {
            const parts = [];
            
            if (this.config.showTimestamp) {
                parts.push(new Date(entry.timestamp).toLocaleTimeString());
            }
            
            if (this.config.showLevel) {
                parts.push(`[${entry.level}]`);
            }
            
            if (this.config.showModule) {
                parts.push(entry.module + ':');
            }
            
            parts.push(entry.message);
            
            const logMessage = parts.join(' ');
            const consoleMethod = this._getConsoleMethod(entry.level);
            
            if (this.config.colorConsole && entry.level in this.colors) {
                console[consoleMethod](`%c${logMessage}`, `color: ${this.colors[entry.level]}`, entry.data || '');
            } else {
                console[consoleMethod](logMessage, entry.data || '');
            }
        }

        /**
         * Get appropriate console method for log level
         * @private
         */
        _getConsoleMethod(level) {
            switch (level) {
                case 'ERROR':
                case 'FATAL':
                    return 'error';
                case 'WARN':
                    return 'warn';
                case 'DEBUG':
                case 'TRACE':
                    return 'debug';
                default:
                    return 'log';
            }
        }

        /**
         * Get level name from number
         * @private
         */
        _getLevelName(levelNum) {
            return Object.keys(this.levels).find(key => this.levels[key] === levelNum) || 'UNKNOWN';
        }

        /**
         * Estimate memory usage
         * @private
         */
        _getMemoryUsage() {
            const size = JSON.stringify(this.entries).length;
            return {
                entries: this.entries.length,
                estimatedBytes: size,
                estimatedKB: Math.round(size / 1024)
            };
        }

        /**
         * Load logs from localStorage
         * @private
         */
        _loadFromStorage() {
            try {
                const stored = localStorage.getItem(this.config.storageKey);
                if (stored) {
                    const data = JSON.parse(stored);
                    this.entries = data.entries || [];
                    this.errorCount = data.errorCount || 0;
                    this.warningCount = data.warningCount || 0;
                }
            } catch (error) {
                console.error('Logger: Failed to load from storage:', error);
            }
        }

        /**
         * Save logs to localStorage
         * @private
         */
        _saveToStorage() {
            try {
                const data = {
                    entries: this.entries.slice(-100), // Only keep recent 100
                    errorCount: this.errorCount,
                    warningCount: this.warningCount,
                    saved: new Date().toISOString()
                };
                localStorage.setItem(this.config.storageKey, JSON.stringify(data));
            } catch (error) {
                console.error('Logger: Failed to save to storage:', error);
            }
        }
    }

    // Create singleton instance
    const logger = new Logger();

    // Export to global namespace
    if (!global.ExcelProcessor) {
        global.ExcelProcessor = {};
    }
    if (!global.ExcelProcessor.Core) {
        global.ExcelProcessor.Core = {};
    }
    
    global.ExcelProcessor.Core.Logger = logger;
    global.ExcelProcessor.Core.LoggerClass = Logger;

})(window);