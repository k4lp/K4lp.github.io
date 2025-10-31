/**
 * GDRS Event Bus
 * Central event system for decoupled communication between modules
 */

export class EventBus {
  constructor() {
    this.listeners = new Map();
    this.onceListeners = new Map();
    this.debugMode = false;
  }
  
  /**
   * Subscribe to an event
   */
  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);
    
    if (this.debugMode) {
      console.log(`\ud83d\udce1 EventBus: Subscribed to '${eventName}'`);
    }
  }
  
  /**
   * Subscribe to an event (once only)
   */
  once(eventName, callback) {
    if (!this.onceListeners.has(eventName)) {
      this.onceListeners.set(eventName, []);
    }
    this.onceListeners.get(eventName).push(callback);
    
    if (this.debugMode) {
      console.log(`\ud83d\udce1 EventBus: Subscribed once to '${eventName}'`);
    }
  }
  
  /**
   * Unsubscribe from an event
   */
  off(eventName, callback) {
    if (this.listeners.has(eventName)) {
      const callbacks = this.listeners.get(eventName);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
        if (this.debugMode) {
          console.log(`\ud83d\udce1 EventBus: Unsubscribed from '${eventName}'`);
        }
      }
    }
  }
  
  /**
   * Emit an event
   */
  emit(eventName, data = null) {
    if (this.debugMode) {
      console.log(`\ud83d\udce1 EventBus: Emitting '${eventName}'`, data);
    }
    
    // Handle regular listeners
    if (this.listeners.has(eventName)) {
      const callbacks = this.listeners.get(eventName);
      callbacks.forEach(callback => {
        try {
          callback(data, eventName);
        } catch (error) {
          console.error(`\u274c EventBus: Error in listener for '${eventName}':`, error);
        }
      });
    }
    
    // Handle once listeners
    if (this.onceListeners.has(eventName)) {
      const callbacks = this.onceListeners.get(eventName);
      callbacks.forEach(callback => {
        try {
          callback(data, eventName);
        } catch (error) {
          console.error(`\u274c EventBus: Error in once listener for '${eventName}':`, error);
        }
      });
      // Clear once listeners after execution
      this.onceListeners.delete(eventName);
    }
  }
  
  /**
   * Remove all listeners for an event
   */
  removeAllListeners(eventName) {
    if (eventName) {
      this.listeners.delete(eventName);
      this.onceListeners.delete(eventName);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
    
    if (this.debugMode) {
      console.log(`\ud83d\udce1 EventBus: Removed all listeners${eventName ? ` for '${eventName}'` : ''}`);
    }
  }
  
  /**
   * Get listener count for an event
   */
  listenerCount(eventName) {
    const regular = this.listeners.get(eventName)?.length || 0;
    const once = this.onceListeners.get(eventName)?.length || 0;
    return regular + once;
  }
  
  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled) {
    this.debugMode = !!enabled;
    console.log(`\ud83d\udce1 EventBus debug mode: ${enabled ? 'ON' : 'OFF'}`);
  }
  
  /**
   * Get all registered events
   */
  getRegisteredEvents() {
    const events = new Set();
    for (const event of this.listeners.keys()) events.add(event);
    for (const event of this.onceListeners.keys()) events.add(event);
    return Array.from(events);
  }
}

// Global event bus instance
export const eventBus = new EventBus();

// Common event names for GDRS
export const Events = {
  // Storage events
  MEMORY_UPDATED: 'memory:updated',
  TASKS_UPDATED: 'tasks:updated', 
  GOALS_UPDATED: 'goals:updated',
  VAULT_UPDATED: 'vault:updated',
  FINAL_OUTPUT_UPDATED: 'final-output:updated',
  
  // Execution events
  JS_EXECUTION_START: 'execution:start',
  JS_EXECUTION_COMPLETE: 'execution:complete',
  JS_EXECUTION_ERROR: 'execution:error',
  JS_EXECUTION_QUEUE_CHANGED: 'execution:queue-changed',
  
  // Session events
  SESSION_START: 'session:start',
  SESSION_STOP: 'session:stop',
  ITERATION_COMPLETE: 'iteration:complete',
  
  // UI events
  UI_REFRESH_REQUEST: 'ui:refresh:request',
  UI_REFRESH_COMPLETE: 'ui:refresh:complete'
};
