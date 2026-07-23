/** @module core/event-bus */
import { uid } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import { EVENTS } from '../config/constants.js';

export class EventBus {
  constructor({ maxLog = 2500 } = {}) {
    this._handlers = new Map();
    this._log = [];
    this.maxLog = maxLog;
  }

  on(type, handler) {
    if (!this._handlers.has(type)) this._handlers.set(type, new Set());
    this._handlers.get(type).add(handler);
    return () => this.off(type, handler);
  }

  off(type, handler) {
    this._handlers.get(type)?.delete(handler);
  }

  emit(type, payload, meta = {}) {
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
    for (const h of this._handlers.get(type) || []) {
      try {
        h(evt);
      } catch (err) {
        console.error('[EventBus]', type, err);
      }
    }
    for (const h of this._handlers.get('*') || []) {
      try {
        h(evt);
      } catch (err) {
        console.error('[EventBus]*', type, err);
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

export const bus = new EventBus();
