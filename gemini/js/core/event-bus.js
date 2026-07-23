/**
 * Tiny typed-ish pub/sub bus for observability + UI wiring.
 * Every important system action should emit here so the session
 * can be reconstructed and inspected.
 * @module core/event-bus
 */

import { uid } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import { EVENTS } from '../config/constants.js';

/**
 * @typedef {Object} BusEvent
 * @property {string} id
 * @property {string} type
 * @property {string} at
 * @property {*} [payload]
 * @property {string} [level] info|warn|error|debug
 */

export class EventBus {
  constructor({ maxLog = 2000 } = {}) {
    /** @type {Map<string, Set<Function>>} */
    this._handlers = new Map();
    /** @type {BusEvent[]} */
    this._log = [];
    this.maxLog = maxLog;
  }

  /**
   * @param {string} type
   * @param {Function} handler
   * @returns {() => void} unsubscribe
   */
  on(type, handler) {
    if (!this._handlers.has(type)) this._handlers.set(type, new Set());
    this._handlers.get(type).add(handler);
    return () => this.off(type, handler);
  }

  off(type, handler) {
    this._handlers.get(type)?.delete(handler);
  }

  /**
   * @param {string} type
   * @param {*} [payload]
   * @param {{level?: string, silent?: boolean}} [meta]
   */
  emit(type, payload, meta = {}) {
    /** @type {BusEvent} */
    const evt = {
      id: uid('evt'),
      type,
      at: nowIso(),
      payload,
      level: meta.level || 'info',
    };
    if (!meta.silent) {
      this._log.push(evt);
      if (this._log.length > this.maxLog) {
        this._log.splice(0, this._log.length - this.maxLog);
      }
    }
    const set = this._handlers.get(type);
    if (set) {
      for (const h of set) {
        try {
          h(evt);
        } catch (err) {
          console.error('[EventBus] handler error', type, err);
        }
      }
    }
    // Wildcard listeners
    const all = this._handlers.get('*');
    if (all) {
      for (const h of all) {
        try {
          h(evt);
        } catch (err) {
          console.error('[EventBus] * handler error', type, err);
        }
      }
    }
    return evt;
  }

  log(message, level = 'info', extra) {
    return this.emit(EVENTS.LOG, { message, extra }, { level });
  }

  getLog() {
    return this._log.slice();
  }

  clearLog() {
    this._log = [];
  }
}

/** Shared app bus */
export const bus = new EventBus();
