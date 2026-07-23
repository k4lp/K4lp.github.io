/**
 * Multi-key pool with status tracking and rotation.
 *
 * Paste many Gemini API keys; the manager selects a healthy key
 * based on strategy and updates status from HTTP responses.
 *
 * Quota / resource-exhausted responses park a key in cooldown and
 * force the next pick onto a different key — that is the whole point
 * of the pool.
 *
 * @module core/key-manager
 */

import { KEY_STATUS, ROTATION_STRATEGY, EVENTS, STORAGE_KEYS } from '../config/constants.js';
import { uid } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import { bus } from './event-bus.js';
import { storage } from './storage.js';

/**
 * @typedef {Object} ApiKeyRecord
 * @property {string} id
 * @property {string} key
 * @property {string} label
 * @property {string} status
 * @property {boolean} enabled
 * @property {number} successCount
 * @property {number} failureCount
 * @property {number} requestCount
 * @property {number|null} cooldownUntil
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
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

/** True for free-tier / RPM / daily quota style failures that another key may fix */
export function isQuotaOrRateLimitError(status, message = '') {
  const m = String(message || '');
  if (status === 429) return true;
  return /resource has been exhausted|resource_exhausted|quota|rate.?limit|too many requests|exceeded your current quota|limit:\s*0/i.test(
    m
  );
}

/** True for permanently bad keys (not quota) */
export function isAuthError(status, message = '') {
  const m = String(message || '');
  if (isQuotaOrRateLimitError(status, m)) return false;
  if (status === 401) return true;
  if (status === 403 && /api key|permission|forbidden|invalid|not allowed|blocked/i.test(m)) {
    return true;
  }
  return /api key not valid|invalid api key|api_key_invalid|permission.?denied/i.test(m);
}

export class KeyManager {
  /**
   * @param {{strategy?: string, rateLimitCooldownMs?: number, maxKeyFailures?: number, quotaCooldownMs?: number}} opts
   */
  constructor(opts = {}) {
    /** @type {ApiKeyRecord[]} */
    this.keys = [];
    this.strategy = opts.strategy || ROTATION_STRATEGY.ROUND_ROBIN;
    this.rateLimitCooldownMs = opts.rateLimitCooldownMs ?? 60_000;
    /** Longer park for hard quota exhausted (free tier daily / RPM) */
    this.quotaCooldownMs = opts.quotaCooldownMs ?? 90_000;
    this.maxKeyFailures = opts.maxKeyFailures ?? 3;
    this._rrIndex = 0;
  }

  configure({ strategy, rateLimitCooldownMs, maxKeyFailures, quotaCooldownMs } = {}) {
    if (strategy) this.strategy = strategy;
    if (rateLimitCooldownMs != null) this.rateLimitCooldownMs = rateLimitCooldownMs;
    if (maxKeyFailures != null) this.maxKeyFailures = maxKeyFailures;
    if (quotaCooldownMs != null) this.quotaCooldownMs = quotaCooldownMs;
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
    this._rrIndex = 0;
    this._emit();
    return this.keys.length;
  }

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
    return this.keys.map((k) => ({ ...k }));
  }

  enabledCount() {
    return this.keys.filter((k) => k.enabled && k.status !== KEY_STATUS.INVALID).length;
  }

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
    this._rrIndex = 0;
    this._emit();
  }

  _refreshCooldowns() {
    const now = Date.now();
    let changed = false;
    for (const rec of this.keys) {
      if (
        (rec.status === KEY_STATUS.RATE_LIMITED ||
          rec.status === KEY_STATUS.COOLDOWN ||
          rec.status === KEY_STATUS.ERROR) &&
        rec.cooldownUntil &&
        rec.cooldownUntil <= now
      ) {
        rec.status = KEY_STATUS.READY;
        rec.cooldownUntil = null;
        changed = true;
      }
    }
    if (changed) this._emit(false);
  }

  /**
   * Keys that may receive traffic right now.
   * @returns {ApiKeyRecord[]}
   */
  healthyKeys() {
    this._refreshCooldowns();
    return this.keys.filter(
      (k) => k.enabled && k.status === KEY_STATUS.READY
    );
  }

  /**
   * ms until the soonest cooling key becomes READY, or 0 if none.
   */
  msUntilNextHealthy() {
    this._refreshCooldowns();
    if (this.healthyKeys().length) return 0;
    const now = Date.now();
    let min = Infinity;
    for (const k of this.keys) {
      if (!k.enabled || k.status === KEY_STATUS.INVALID || k.status === KEY_STATUS.DISABLED) {
        continue;
      }
      if (k.cooldownUntil && k.cooldownUntil > now) {
        min = Math.min(min, k.cooldownUntil - now);
      }
    }
    return min === Infinity ? -1 : min;
  }

  /**
   * Pick next key according to strategy.
   * By default ONLY healthy keys — never silently re-use a rate-limited key.
   *
   * @param {{excludeIds?: string[], allowUnhealthy?: boolean}} [opts]
   * @returns {ApiKeyRecord|null}
   */
  selectKey(opts = {}) {
    const exclude = new Set(opts.excludeIds || []);
    let pool = this.healthyKeys().filter((k) => !exclude.has(k.id));

    if (!pool.length && opts.allowUnhealthy) {
      // Last-ditch: enabled, not invalid, not busy — still prefer shortest remaining cooldown
      pool = this.keys
        .filter(
          (k) =>
            k.enabled &&
            k.status !== KEY_STATUS.INVALID &&
            k.status !== KEY_STATUS.DISABLED &&
            k.status !== KEY_STATUS.BUSY &&
            !exclude.has(k.id)
        )
        .sort((a, b) => (a.cooldownUntil || 0) - (b.cooldownUntil || 0));
    }

    if (!pool.length) return null;

    let chosen;
    switch (this.strategy) {
      case ROTATION_STRATEGY.LEAST_USED:
        chosen = pool.slice().sort((a, b) => a.requestCount - b.requestCount)[0];
        break;
      case ROTATION_STRATEGY.HEALTHY_FIRST:
        chosen = pool
          .slice()
          .sort((a, b) => {
            if (a.failureCount !== b.failureCount) return a.failureCount - b.failureCount;
            return a.requestCount - b.requestCount;
          })[0];
        break;
      case ROTATION_STRATEGY.ROUND_ROBIN:
      default: {
        // Stable round-robin over full enabled set, skip excluded/unhealthy
        const enabled = this.keys.filter(
          (k) => k.enabled && k.status !== KEY_STATUS.INVALID && k.status !== KEY_STATUS.DISABLED
        );
        if (!enabled.length) {
          chosen = pool[0];
          break;
        }
        for (let i = 0; i < enabled.length; i++) {
          const idx = (this._rrIndex + i) % enabled.length;
          const cand = enabled[idx];
          if (pool.some((p) => p.id === cand.id)) {
            chosen = cand;
            this._rrIndex = (idx + 1) % enabled.length;
            break;
          }
        }
        if (!chosen) {
          chosen = pool[0];
          this._rrIndex = (this._rrIndex + 1) % Math.max(enabled.length, 1);
        }
        break;
      }
    }

    bus.emit(EVENTS.KEY_SELECTED, {
      keyId: chosen.id,
      label: chosen.label,
      strategy: this.strategy,
      healthy: this.healthyKeys().length,
      total: this.keys.length,
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
   * Quota → park key (rate_limited) so the pool moves on.
   * Auth → invalid.
   *
   * @param {string} id
   * @param {{status?: number, message?: string, retryAfterMs?: number}} info
   */
  markFailure(id, info = {}) {
    const rec = this.keys.find((k) => k.id === id);
    if (!rec) return;
    rec.failureCount += 1;
    const msg = info.message || `HTTP ${info.status || '?'}`;
    rec.lastError = msg;
    const code = info.status;

    if (isAuthError(code, msg)) {
      rec.status = KEY_STATUS.INVALID;
      rec.cooldownUntil = null;
    } else if (isQuotaOrRateLimitError(code, msg)) {
      rec.status = KEY_STATUS.RATE_LIMITED;
      // Prefer Retry-After; else quota park (longer than short RPM blips)
      const cool =
        info.retryAfterMs ??
        (code === 429 && !/exhausted|quota/i.test(msg)
          ? this.rateLimitCooldownMs
          : this.quotaCooldownMs);
      rec.cooldownUntil = Date.now() + cool;
    } else if (rec.failureCount >= this.maxKeyFailures) {
      rec.status = KEY_STATUS.ERROR;
      rec.cooldownUntil = Date.now() + this.rateLimitCooldownMs;
    } else {
      rec.status = KEY_STATUS.COOLDOWN;
      rec.cooldownUntil = Date.now() + Math.min(10_000, this.rateLimitCooldownMs);
    }

    bus.emit(EVENTS.KEY_STATUS, {
      keyId: id,
      status: rec.status,
      label: rec.label,
      error: rec.lastError,
      cooldownUntil: rec.cooldownUntil,
    });
    bus.log(
      `Key ${rec.label} → ${rec.status}${rec.cooldownUntil ? ` (cool ${Math.ceil((rec.cooldownUntil - Date.now()) / 1000)}s)` : ''}: ${msg}`,
      isQuotaOrRateLimitError(code, msg) ? 'warn' : 'error'
    );
    this._emit(false);
  }

  releaseBusy(id) {
    const rec = this.keys.find((k) => k.id === id);
    if (!rec) return;
    // Only clear BUSY — never wipe RATE_LIMITED / COOLDOWN set by markFailure
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
      msUntilNextHealthy: this.msUntilNextHealthy(),
    };
  }

  persist(persistKeys = true) {
    if (!persistKeys) {
      storage.remove(STORAGE_KEYS.API_KEYS);
      return;
    }
    storage.set(
      STORAGE_KEYS.API_KEYS,
      this.keys.map((k) => ({
        id: k.id,
        key: k.key,
        enabled: k.enabled,
        successCount: k.successCount,
        failureCount: k.failureCount,
        requestCount: k.requestCount,
        status:
          k.status === KEY_STATUS.BUSY || k.status === KEY_STATUS.RATE_LIMITED
            ? KEY_STATUS.READY
            : k.status === KEY_STATUS.COOLDOWN
              ? KEY_STATUS.READY
              : k.status,
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
