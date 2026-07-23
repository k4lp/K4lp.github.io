/**
 * Multi-key pool with status tracking and rotation.
 *
 * Paste many Gemini API keys; the manager selects a healthy key
 * based on strategy and updates status from HTTP responses.
 *
 * @module core/key-manager
 */

import { KEY_STATUS, ROTATION_STRATEGY, EVENTS } from '../config/constants.js';
import { uid } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import { bus } from './event-bus.js';
import { storage } from './storage.js';
import { STORAGE_KEYS } from '../config/constants.js';

/**
 * @typedef {Object} ApiKeyRecord
 * @property {string} id
 * @property {string} key          full key
 * @property {string} label        masked display
 * @property {string} status
 * @property {boolean} enabled
 * @property {number} successCount
 * @property {number} failureCount
 * @property {number} requestCount
 * @property {number|null} cooldownUntil  epoch ms
 * @property {string|null} lastError
 * @property {string|null} lastUsedAt
 * @property {string} createdAt
 */

function maskKey(key) {
  const k = String(key || '').trim();
  if (k.length <= 8) return '••••';
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

/** Parse pasted blob: newlines, commas, semicolons, spaces */
export function parseKeyBlob(text) {
  if (!text) return [];
  const parts = String(text)
    .split(/[\n,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  // de-dupe preserving order
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

export class KeyManager {
  /**
   * @param {{strategy?: string, rateLimitCooldownMs?: number, maxKeyFailures?: number}} opts
   */
  constructor(opts = {}) {
    /** @type {ApiKeyRecord[]} */
    this.keys = [];
    this.strategy = opts.strategy || ROTATION_STRATEGY.HEALTHY_FIRST;
    this.rateLimitCooldownMs = opts.rateLimitCooldownMs ?? 60_000;
    this.maxKeyFailures = opts.maxKeyFailures ?? 3;
    this._rrIndex = 0;
  }

  configure({ strategy, rateLimitCooldownMs, maxKeyFailures } = {}) {
    if (strategy) this.strategy = strategy;
    if (rateLimitCooldownMs != null) this.rateLimitCooldownMs = rateLimitCooldownMs;
    if (maxKeyFailures != null) this.maxKeyFailures = maxKeyFailures;
  }

  /**
   * Replace pool from pasted text (keeps stats for matching keys).
   * @param {string} blob
   */
  importFromText(blob) {
    const parsed = parseKeyBlob(blob);
    const prevByKey = new Map(this.keys.map((k) => [k.key, k]));
    this.keys = parsed.map((key) => {
      const prev = prevByKey.get(key);
      if (prev) return { ...prev, label: maskKey(key), enabled: prev.enabled !== false };
      return this._newRecord(key);
    });
    this._emit();
    return this.keys.length;
  }

  /** Set keys from structured array (load from storage) */
  loadRecords(records) {
    this.keys = (records || []).map((r) => ({
      ...this._newRecord(r.key),
      ...r,
      label: maskKey(r.key),
    }));
    this._emit();
  }

  _newRecord(key) {
    return {
      id: uid('key'),
      key,
      label: maskKey(key),
      status: KEY_STATUS.READY,
      enabled: true,
      successCount: 0,
      failureCount: 0,
      requestCount: 0,
      cooldownUntil: null,
      lastError: null,
      lastUsedAt: null,
      createdAt: nowIso(),
    };
  }

  getTextBlob() {
    return this.keys.map((k) => k.key).join('\n');
  }

  list() {
    this._refreshCooldowns();
    return this.keys.map((k) => ({ ...k, key: k.key })); // full key for internal use
  }

  /** Public-safe list (masked) for UI */
  listPublic() {
    this._refreshCooldowns();
    return this.keys.map((k) => ({
      id: k.id,
      label: k.label,
      status: k.status,
      enabled: k.enabled,
      successCount: k.successCount,
      failureCount: k.failureCount,
      requestCount: k.requestCount,
      cooldownUntil: k.cooldownUntil,
      lastError: k.lastError,
      lastUsedAt: k.lastUsedAt,
    }));
  }

  setEnabled(id, enabled) {
    const rec = this.keys.find((k) => k.id === id);
    if (!rec) return;
    rec.enabled = enabled;
    if (!enabled) rec.status = KEY_STATUS.DISABLED;
    else if (rec.status === KEY_STATUS.DISABLED) rec.status = KEY_STATUS.READY;
    this._emit();
  }

  resetStatus(id) {
    const rec = this.keys.find((k) => k.id === id);
    if (!rec) return;
    rec.status = KEY_STATUS.READY;
    rec.failureCount = 0;
    rec.cooldownUntil = null;
    rec.lastError = null;
    this._emit();
  }

  resetAllStatuses() {
    for (const rec of this.keys) {
      if (!rec.enabled) {
        rec.status = KEY_STATUS.DISABLED;
        continue;
      }
      rec.status = KEY_STATUS.READY;
      rec.failureCount = 0;
      rec.cooldownUntil = null;
      rec.lastError = null;
    }
    this._emit();
  }

  _refreshCooldowns() {
    const now = Date.now();
    for (const rec of this.keys) {
      if (
        (rec.status === KEY_STATUS.RATE_LIMITED || rec.status === KEY_STATUS.COOLDOWN) &&
        rec.cooldownUntil &&
        rec.cooldownUntil <= now
      ) {
        rec.status = KEY_STATUS.READY;
        rec.cooldownUntil = null;
      }
    }
  }

  /**
   * Healthy keys eligible for selection.
   * @returns {ApiKeyRecord[]}
   */
  healthyKeys() {
    this._refreshCooldowns();
    return this.keys.filter(
      (k) =>
        k.enabled &&
        k.status !== KEY_STATUS.INVALID &&
        k.status !== KEY_STATUS.DISABLED &&
        k.status !== KEY_STATUS.BUSY &&
        k.status !== KEY_STATUS.RATE_LIMITED &&
        k.status !== KEY_STATUS.COOLDOWN
    );
  }

  /**
   * Pick next key according to strategy.
   * @param {{excludeIds?: string[]}} [opts]
   * @returns {ApiKeyRecord|null}
   */
  selectKey(opts = {}) {
    const exclude = new Set(opts.excludeIds || []);
    let pool = this.healthyKeys().filter((k) => !exclude.has(k.id));
    if (!pool.length) {
      // fallback: try rate-limited that finished cooldown already handled;
      // as last resort, any enabled non-invalid
      pool = this.keys.filter(
        (k) => k.enabled && k.status !== KEY_STATUS.INVALID && !exclude.has(k.id)
      );
    }
    if (!pool.length) return null;

    let chosen;
    switch (this.strategy) {
      case ROTATION_STRATEGY.LEAST_USED:
        chosen = pool.slice().sort((a, b) => a.requestCount - b.requestCount)[0];
        break;
      case ROTATION_STRATEGY.ROUND_ROBIN:
        this._rrIndex = this._rrIndex % pool.length;
        chosen = pool[this._rrIndex];
        this._rrIndex = (this._rrIndex + 1) % pool.length;
        break;
      case ROTATION_STRATEGY.HEALTHY_FIRST:
      default:
        // prefer READY with fewest failures, then least used
        chosen = pool
          .slice()
          .sort((a, b) => {
            if (a.status === KEY_STATUS.READY && b.status !== KEY_STATUS.READY) return -1;
            if (b.status === KEY_STATUS.READY && a.status !== KEY_STATUS.READY) return 1;
            if (a.failureCount !== b.failureCount) return a.failureCount - b.failureCount;
            return a.requestCount - b.requestCount;
          })[0];
        break;
    }

    bus.emit(EVENTS.KEY_SELECTED, {
      keyId: chosen.id,
      label: chosen.label,
      strategy: this.strategy,
    });
    return chosen;
  }

  markBusy(id) {
    const rec = this.keys.find((k) => k.id === id);
    if (!rec) return;
    rec.status = KEY_STATUS.BUSY;
    rec.requestCount += 1;
    rec.lastUsedAt = nowIso();
    bus.emit(EVENTS.KEY_STATUS, { keyId: id, status: rec.status, label: rec.label });
    this._emit(false);
  }

  /**
   * Record successful response.
   * @param {string} id
   */
  markSuccess(id) {
    const rec = this.keys.find((k) => k.id === id);
    if (!rec) return;
    rec.successCount += 1;
    rec.failureCount = 0;
    rec.status = KEY_STATUS.READY;
    rec.lastError = null;
    rec.cooldownUntil = null;
    bus.emit(EVENTS.KEY_STATUS, { keyId: id, status: rec.status, label: rec.label });
    this._emit(false);
  }

  /**
   * Record failure from HTTP / network.
   * @param {string} id
   * @param {{status?: number, message?: string, retryAfterMs?: number}} info
   */
  markFailure(id, info = {}) {
    const rec = this.keys.find((k) => k.id === id);
    if (!rec) return;
    rec.failureCount += 1;
    rec.lastError = info.message || `HTTP ${info.status || '?'}`;
    const code = info.status;

    if (code === 401 || code === 403) {
      rec.status = KEY_STATUS.INVALID;
    } else if (code === 429) {
      rec.status = KEY_STATUS.RATE_LIMITED;
      const cool = info.retryAfterMs ?? this.rateLimitCooldownMs;
      rec.cooldownUntil = Date.now() + cool;
    } else if (rec.failureCount >= this.maxKeyFailures) {
      rec.status = KEY_STATUS.ERROR;
      rec.cooldownUntil = Date.now() + this.rateLimitCooldownMs;
    } else {
      rec.status = KEY_STATUS.COOLDOWN;
      rec.cooldownUntil = Date.now() + Math.min(15_000, this.rateLimitCooldownMs);
    }

    bus.emit(EVENTS.KEY_STATUS, {
      keyId: id,
      status: rec.status,
      label: rec.label,
      error: rec.lastError,
    });
    this._emit(false);
  }

  releaseBusy(id) {
    const rec = this.keys.find((k) => k.id === id);
    if (!rec) return;
    if (rec.status === KEY_STATUS.BUSY) {
      rec.status = KEY_STATUS.READY;
      bus.emit(EVENTS.KEY_STATUS, { keyId: id, status: rec.status, label: rec.label });
      this._emit(false);
    }
  }

  summary() {
    this._refreshCooldowns();
    const counts = {};
    for (const s of Object.values(KEY_STATUS)) counts[s] = 0;
    for (const k of this.keys) counts[k.status] = (counts[k.status] || 0) + 1;
    return {
      total: this.keys.length,
      healthy: this.healthyKeys().length,
      counts,
      strategy: this.strategy,
    };
  }

  persist(persistKeys = true) {
    if (!persistKeys) {
      storage.remove(STORAGE_KEYS.API_KEYS);
      return;
    }
    // store full keys only if user opted in
    storage.set(
      STORAGE_KEYS.API_KEYS,
      this.keys.map((k) => ({
        id: k.id,
        key: k.key,
        enabled: k.enabled,
        successCount: k.successCount,
        failureCount: k.failureCount,
        requestCount: k.requestCount,
        status: k.status === KEY_STATUS.BUSY ? KEY_STATUS.READY : k.status,
        createdAt: k.createdAt,
      }))
    );
  }

  restore() {
    const data = storage.get(STORAGE_KEYS.API_KEYS, null);
    if (Array.isArray(data) && data.length) this.loadRecords(data);
  }

  _emit(notify = true) {
    if (notify) {
      bus.emit(EVENTS.KEYS_UPDATED, this.summary());
    }
  }
}
