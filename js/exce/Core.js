/**
 * Excel API Processor - Core System
 * Modular architecture foundation
 * Alica Technologies
 */

'use strict';

// Initialize global namespace
if (!window.ExcelProcessor) {
    window.ExcelProcessor = {
        Core: {},
        Services: {},
        Controllers: {},
        UI: {}
    };
}

/**
 * Core Logger - Simple, reliable logging system
 */
class Logger {
    constructor() {
        this.levels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
            FATAL: 4
        };
        this.currentLevel = 1; // INFO
        this.initialized = false;
    }

    init(config = {}) {
        this.showTimestamp = config.showTimestamp !== false;
        this.showModule = config.showModule !== false;
        this.colorConsole = config.colorConsole !== false;
        this.persistToStorage = config.persistToStorage === true;
        this.initialized = true;
        return this;
    }

    setLevel(level) {
        if (typeof level === 'string') {
            this.currentLevel = this.levels[level.toUpperCase()] || 1;
        } else {
            this.currentLevel = level;
        }
    }

    debug(module, message, data = null) {
        this._log(0, 'DEBUG', module, message, data);
    }

    info(module, message, data = null) {
        this._log(1, 'INFO', module, message, data);
    }

    warn(module, message, data = null) {
        this._log(2, 'WARN', module, message, data);
    }

    error(module, message, data = null) {
        this._log(3, 'ERROR', module, message, data);
    }

    fatal(module, message, data = null) {
        this._log(4, 'FATAL', module, message, data);
    }

    _log(levelNum, levelName, module, message, data) {
        if (levelNum < this.currentLevel) return;

        const timestamp = this.showTimestamp ? new Date().toLocaleTimeString() : '';
        const moduleStr = this.showModule && module ? `[${module}]` : '';
        const logMessage = `${timestamp} [${levelName}] ${moduleStr} ${message}`;

        // Update activity log in DOM
        this._updateActivityLog(logMessage);

        // Console output
        const consoleMethod = this._getConsoleMethod(levelName);
        if (data) {
            console[consoleMethod](logMessage, data);
        } else {
            console[consoleMethod](logMessage);
        }
    }

    _getConsoleMethod(level) {
        switch (level) {
            case 'ERROR':
            case 'FATAL':
                return 'error';
            case 'WARN':
                return 'warn';
            default:
                return 'log';
        }
    }

    _updateActivityLog(message) {
        const activityLog = document.getElementById('activityLog');
        if (!activityLog) return;

        const logEntry = document.createElement('div');
        logEntry.className = 'log-item';
        logEntry.textContent = message;
        
        activityLog.insertBefore(logEntry, activityLog.firstChild);
        
        // Keep only last 50 entries
        const entries = activityLog.children;
        if (entries.length > 50) {
            activityLog.removeChild(entries[entries.length - 1]);
        }
    }
}

/**
 * Core EventBus - Simple event system
 */
class EventBus {
    constructor() {
        this.events = new Map();
        this.debugMode = false;
    }

    setDebug(enabled) {
        this.debugMode = enabled;
    }

    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    }

    off(event, callback) {
        if (!this.events.has(event)) return;
        
        const callbacks = this.events.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    emit(event, data = null) {
        if (this.debugMode) {
            console.log(`EventBus: Emitting ${event}`, data);
        }

        if (!this.events.has(event)) return;

        const callbacks = this.events.get(event);
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`EventBus: Error in callback for ${event}:`, error);
            }
        });
    }

    clear() {
        this.events.clear();
    }
}

// Create singleton instances
const logger = new Logger();
const eventBus = new EventBus();

// Export to namespace
window.ExcelProcessor.Core.Logger = logger;
window.ExcelProcessor.Core.EventBus = eventBus;

// Initialize core systems
logger.init({
    showTimestamp: true,
    showModule: true,
    colorConsole: true,
    persistToStorage: false
});

eventBus.setDebug(false);

// Log initialization
logger.info('Core', 'Core systems initialized successfully');
