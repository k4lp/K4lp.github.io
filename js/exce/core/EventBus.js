/**
 * Excel API Processor - Core Event Bus
 * Professional Event-Driven Architecture
 * Alica Technologies
 */

(function(global) {
    'use strict';

    /**
     * Professional Event Bus for loose coupling between modules
     * Handles event registration, emission, and cleanup
     */
    class EventBus {
        constructor() {
            this._events = new Map();
            this._onceEvents = new Set();
            this._maxListeners = 50;
            this._debug = false;
        }

        /**
         * Subscribe to an event
         * @param {string} event - Event name
         * @param {Function} callback - Event handler
         * @param {Object} context - Execution context
         * @returns {Function} Unsubscribe function
         */
        on(event, callback, context = null) {
            if (!this._validateEvent(event, callback)) return () => {};

            if (!this._events.has(event)) {
                this._events.set(event, []);
            }

            const listeners = this._events.get(event);
            
            // Check max listeners limit
            if (listeners.length >= this._maxListeners) {
                console.warn(`EventBus: Maximum listeners (${this._maxListeners}) reached for event '${event}'`);
                return () => {};
            }

            const listener = { callback, context, id: Date.now() + Math.random() };
            listeners.push(listener);

            if (this._debug) {
                console.log(`EventBus: Subscribed to '${event}' (${listeners.length} total listeners)`);
            }

            // Return unsubscribe function
            return () => this.off(event, callback);
        }

        /**
         * Subscribe to an event (one-time only)
         * @param {string} event - Event name
         * @param {Function} callback - Event handler
         * @param {Object} context - Execution context
         * @returns {Function} Unsubscribe function
         */
        once(event, callback, context = null) {
            const unsubscribe = this.on(event, (...args) => {
                unsubscribe();
                callback.apply(context, args);
            }, context);

            this._onceEvents.add(callback);
            return unsubscribe;
        }

        /**
         * Unsubscribe from an event
         * @param {string} event - Event name
         * @param {Function} callback - Event handler to remove
         */
        off(event, callback) {
            if (!this._events.has(event)) return;

            const listeners = this._events.get(event);
            const index = listeners.findIndex(listener => listener.callback === callback);
            
            if (index !== -1) {
                listeners.splice(index, 1);
                
                if (listeners.length === 0) {
                    this._events.delete(event);
                }

                if (this._debug) {
                    console.log(`EventBus: Unsubscribed from '${event}' (${listeners.length} remaining)`);
                }
            }

            this._onceEvents.delete(callback);
        }

        /**
         * Emit an event to all subscribers
         * @param {string} event - Event name
         * @param {...*} args - Arguments to pass to listeners
         */
        emit(event, ...args) {
            if (!this._events.has(event)) {
                if (this._debug) {
                    console.log(`EventBus: No listeners for event '${event}'`);
                }
                return;
            }

            const listeners = [...this._events.get(event)]; // Copy to prevent modification during iteration
            
            if (this._debug) {
                console.log(`EventBus: Emitting '${event}' to ${listeners.length} listeners`);
            }

            listeners.forEach(listener => {
                try {
                    if (listener.context) {
                        listener.callback.apply(listener.context, args);
                    } else {
                        listener.callback(...args);
                    }
                } catch (error) {
                    console.error(`EventBus: Error in listener for '${event}':`, error);
                    // Don't stop other listeners from executing
                }
            });
        }

        /**
         * Remove all listeners for an event or all events
         * @param {string} [event] - Specific event to clear, or all if not provided
         */
        clear(event = null) {
            if (event) {
                this._events.delete(event);
                if (this._debug) {
                    console.log(`EventBus: Cleared all listeners for '${event}'`);
                }
            } else {
                this._events.clear();
                this._onceEvents.clear();
                if (this._debug) {
                    console.log('EventBus: Cleared all event listeners');
                }
            }
        }

        /**
         * Get list of events with listener counts
         * @returns {Object} Events and their listener counts
         */
        getEvents() {
            const events = {};
            for (const [event, listeners] of this._events) {
                events[event] = listeners.length;
            }
            return events;
        }

        /**
         * Check if an event has any listeners
         * @param {string} event - Event name
         * @returns {boolean} True if has listeners
         */
        hasListeners(event) {
            return this._events.has(event) && this._events.get(event).length > 0;
        }

        /**
         * Set maximum number of listeners per event
         * @param {number} max - Maximum listeners
         */
        setMaxListeners(max) {
            this._maxListeners = Math.max(1, parseInt(max) || 50);
        }

        /**
         * Enable or disable debug logging
         * @param {boolean} enabled - Debug state
         */
        setDebug(enabled) {
            this._debug = !!enabled;
        }

        /**
         * Validate event parameters
         * @private
         */
        _validateEvent(event, callback) {
            if (typeof event !== 'string' || !event.trim()) {
                console.error('EventBus: Event name must be a non-empty string');
                return false;
            }

            if (typeof callback !== 'function') {
                console.error('EventBus: Callback must be a function');
                return false;
            }

            return true;
        }

        /**
         * Get memory usage statistics
         * @returns {Object} Memory usage info
         */
        getStats() {
            const totalListeners = Array.from(this._events.values())
                .reduce((sum, listeners) => sum + listeners.length, 0);

            return {
                eventCount: this._events.size,
                totalListeners,
                onceListeners: this._onceEvents.size,
                maxListeners: this._maxListeners
            };
        }
    }

    // Create singleton instance
    const eventBus = new EventBus();

    // Export to global namespace
    if (!global.ExcelProcessor) {
        global.ExcelProcessor = {};
    }
    if (!global.ExcelProcessor.Core) {
        global.ExcelProcessor.Core = {};
    }
    
    global.ExcelProcessor.Core.EventBus = eventBus;

    // Also expose the class for testing
    global.ExcelProcessor.Core.EventBusClass = EventBus;

})(window);

// Event Constants for consistency
window.ExcelProcessor.Events = {
    // File Events
    FILE_SELECTED: 'file.selected',
    FILE_LOADED: 'file.loaded',
    FILE_ERROR: 'file.error',
    
    // Sheet Events
    SHEET_SELECTED: 'sheet.selected',
    SHEET_PREVIEW_READY: 'sheet.preview.ready',
    
    // Mapping Events
    MAPPING_UPDATED: 'mapping.updated',
    MAPPING_VALIDATED: 'mapping.validated',
    
    // Processing Events
    PROCESSING_STARTED: 'processing.started',
    PROCESSING_PROGRESS: 'processing.progress',
    PROCESSING_COMPLETED: 'processing.completed',
    PROCESSING_ERROR: 'processing.error',
    
    // API Events
    API_CREDENTIALS_UPDATED: 'api.credentials.updated',
    API_REQUEST_STARTED: 'api.request.started',
    API_REQUEST_COMPLETED: 'api.request.completed',
    
    // UI Events
    UI_STATUS_CHANGED: 'ui.status.changed',
    UI_SETTINGS_TOGGLED: 'ui.settings.toggled',
    
    // Export Events
    EXPORT_READY: 'export.ready',
    EXPORT_COMPLETED: 'export.completed'
};