/**
 * Live network + OpenAI API health monitor.
 *
 * Distinguishes:
 *  - browser offline
 *  - generic network failure (DNS/TLS/CORS/timeout)
 *  - API reachable but auth fail
 *  - API rate limited
 *  - API healthy (models list or light HEAD-ish GET)
 *
 * @module core/network-monitor
 */

import { EVENTS, NET_STATE } from '../config/constants.js';
import { bus } from './event-bus.js';
import { nowIso } from '../utils/time.js';

export class NetworkMonitor {
  /**
   * @param {object} deps
   * @param {() => string} deps.getApiBase
   * @param {() => import('./key-manager.js').KeyManager} deps.getKeyManager
   * @param {() => number} [deps.getIntervalMs]
   */
  constructor(deps) {
    this.getApiBase = deps.getApiBase;
    this.getKeyManager = deps.getKeyManager;
    this.getIntervalMs = deps.getIntervalMs || (() => 30_000);

    this.state = NET_STATE.UNKNOWN;
    this.lastProbe = null;
    this.lastLatencyMs = null;
    this.lastError = null;
    this.online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this._timer = null;
    this._probing = false;

    this._onOnline = () => {
      this.online = true;
      this._publish(NET_STATE.ONLINE, { reason: 'browser-online' });
      this.probe({ reason: 'online-event' });
    };
    this._onOffline = () => {
      this.online = false;
      this._publish(NET_STATE.OFFLINE, { reason: 'browser-offline' });
    };
  }

  start() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this._onOnline);
      window.addEventListener('offline', this._onOffline);
    }
    this.schedule();
    // Immediate probe
    this.probe({ reason: 'start' });
  }

  stop() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this._onOnline);
      window.removeEventListener('offline', this._onOffline);
    }
  }

  schedule() {
    if (this._timer) clearInterval(this._timer);
    const ms = Math.max(5_000, this.getIntervalMs() || 30_000);
    this._timer = setInterval(() => this.probe({ reason: 'interval' }), ms);
  }

  /**
   * Record outcome of a real chat request (feeds live badge without extra calls).
   */
  observeRequest({ ok, status, latencyMs, message, networkError }) {
    this.lastLatencyMs = latencyMs ?? this.lastLatencyMs;
    this.lastProbe = nowIso();

    if (networkError) {
      this.lastError = message || 'Network error';
      if (!this.online) this._publish(NET_STATE.OFFLINE, { message: this.lastError, latencyMs });
      else this._publish(NET_STATE.DEGRADED, { message: this.lastError, latencyMs });
      return;
    }

    if (status === 401 || status === 403) {
      this.lastError = message || `HTTP ${status}`;
      this._publish(NET_STATE.AUTH_FAIL, { status, message: this.lastError, latencyMs });
      return;
    }
    if (status === 429) {
      this.lastError = message || 'Rate limited';
      this._publish(NET_STATE.RATE_LIMITED, { status, message: this.lastError, latencyMs });
      return;
    }
    if (status != null && status >= 500) {
      this.lastError = message || `HTTP ${status}`;
      this._publish(NET_STATE.API_DOWN, { status, message: this.lastError, latencyMs });
      return;
    }
    if (ok) {
      this.lastError = null;
      this._publish(NET_STATE.ONLINE, { latencyMs, status });
      return;
    }
    if (status) {
      this.lastError = message || `HTTP ${status}`;
      this._publish(NET_STATE.DEGRADED, { status, message: this.lastError, latencyMs });
    }
  }

  /**
   * Active probe: GET /v1/models with a key (or detect offline).
   */
  async probe({ reason = 'manual' } = {}) {
    if (this._probing) return this.snapshot();
    this._probing = true;
    this._publish(NET_STATE.PROBING, { reason });

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.online = false;
      this._publish(NET_STATE.OFFLINE, { reason: 'navigator.offline' });
      this._probing = false;
      return this.snapshot();
    }

    const km = this.getKeyManager();
    const keyRec = km.selectKey?.() || km.healthyKeys?.()?.[0];
    if (!keyRec) {
      // No keys — still check browser connectivity via fetch to a public endpoint is unreliable under CORS.
      // Mark as unknown online browser but no key.
      this._publish(this.online ? NET_STATE.ONLINE : NET_STATE.OFFLINE, {
        reason: 'no-keys',
        message: 'No API keys — cannot probe OpenAI',
      });
      this._probing = false;
      return this.snapshot();
    }

    const base = (this.getApiBase() || 'https://api.openai.com/v1').replace(/\/$/, '');
    const url = `${base}/models?limit=1`;
    const started = performance.now();

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${keyRec.key}`,
          Accept: 'application/json',
        },
      });
      const latencyMs = performance.now() - started;
      this.lastLatencyMs = latencyMs;
      this.lastProbe = nowIso();

      let message = '';
      if (!res.ok) {
        try {
          const data = await res.json();
          message = data?.error?.message || res.statusText;
        } catch {
          message = res.statusText;
        }
      }

      this.observeRequest({
        ok: res.ok,
        status: res.status,
        latencyMs,
        message,
      });

      bus.emit(EVENTS.NET_PROBE, {
        ok: res.ok,
        status: res.status,
        latencyMs,
        reason,
        message,
        keyLabel: keyRec.label,
      });
    } catch (err) {
      const latencyMs = performance.now() - started;
      this.lastLatencyMs = latencyMs;
      this.lastProbe = nowIso();
      this.lastError = err.message || 'fetch failed';
      this.observeRequest({
        ok: false,
        networkError: true,
        latencyMs,
        message: this.lastError,
      });
      bus.emit(EVENTS.NET_PROBE, {
        ok: false,
        networkError: true,
        latencyMs,
        reason,
        message: this.lastError,
      });
    } finally {
      this._probing = false;
    }

    return this.snapshot();
  }

  _publish(state, extra = {}) {
    this.state = state;
    const snap = { ...this.snapshot(), ...extra };
    bus.emit(EVENTS.NET_STATUS, snap);
  }

  snapshot() {
    return {
      state: this.state,
      online: this.online,
      lastProbe: this.lastProbe,
      lastLatencyMs: this.lastLatencyMs,
      lastError: this.lastError,
    };
  }
}
