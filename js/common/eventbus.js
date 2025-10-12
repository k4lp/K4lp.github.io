/**
 * Event Bus System
 * Centralized event management for module communication
 * Part of K4LP Engineering Tools - Swiss Minimalist Design
 * @version 1.0.0
 */

class EventBus {
    constructor() {
        this.version = '1.0.0';
        this.events = new Map();
        this.onceEvents = new Set();
        this.maxListeners = 100; // Prevent memory leaks
        
        console.log('✓ K4LP Event Bus v1.0.0 initialized');
    }

    /**
     * Add event listener
     */
    on(event, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        const listeners = this.events.get(event);
        
        if (listeners.length >= this.maxListeners) {
            console.warn(`Event '${event}' has reached maximum listeners (${this.maxListeners})`);
            return;
        }

        listeners.push(callback);
        return this;
    }

    /**
     * Add one-time event listener
     */
    once(event, callback) {
        const onceCallback = (...args) => {
            this.off(event, onceCallback);
            callback.apply(this, args);
        };
        
        this.onceEvents.add(onceCallback);
        return this.on(event, onceCallback);
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        if (!this.events.has(event)) {
            return this;
        }

        const listeners = this.events.get(event);
        const index = listeners.indexOf(callback);
        
        if (index > -1) {
            listeners.splice(index, 1);
        }

        if (listeners.length === 0) {
            this.events.delete(event);
        }

        this.onceEvents.delete(callback);
        return this;
    }

    /**
     * Emit event
     */
    emit(event, ...args) {
        if (!this.events.has(event)) {
            return false;
        }

        const listeners = this.events.get(event).slice(); // Clone to prevent issues with modifications
        
        listeners.forEach(callback => {
            try {
                callback.apply(this, args);
            } catch (error) {
                console.error(`Error in event listener for '${event}':`, error);
            }
        });

        return true;
    }

    /**
     * Remove all listeners for an event
     */
    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
            this.onceEvents.clear();
        }
        return this;
    }

    /**
     * Get listener count for an event
     */
    listenerCount(event) {
        return this.events.has(event) ? this.events.get(event).length : 0;
    }

    /**
     * Get all event names
     */
    eventNames() {
        return Array.from(this.events.keys());
    }

    /**
     * Set max listeners
     */
    setMaxListeners(n) {
        this.maxListeners = n;
        return this;
    }
}

// Create and expose global instance
const eventBus = new EventBus();
window.eventBus = eventBus;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventBus;
}

console.log('✓ K4LP Event Bus v1.0.0 ready');
