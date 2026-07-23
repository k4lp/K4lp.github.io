/**
 * OpenAI multi-key pool with status + rotation.
 * @module core/key-manager
 */

import { KEY_STATUS, ROTATION_STRATEGY, EVENTS, STORAGE_KEYS } from '../config/constants.js';
import { uid } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import { bus } from './event-bus.js';
import { storage } from './storage.js';

function maskKey(key) {
  const k = String(key || '').trim();
  if (k.length <= 10) return '••••';
  return `${k.slice(0, 7)}…${k.slice(-4)}`;
}

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

export function isQuotaError(status, message = '') {
  if (status === 429) return true;
  return /rate.?limit|quota|resource.?exhausted|too many requests|billing/i.test(message);
}

export function isAuthError(status, message = '') {
  if (isQuotaError(status, message)) return false;
  if (status === 401) return true;
  if (status === 403) return /invalid|auth|key|forbidden|project/i.test(message || 'x');
  return /invalid.?api.?key|incorrect api key|authentication/i.test(message || '');
}

export class KeyManager {
  constructor(opts = {}) {
    this.keys = [];
    this.strategy = opts.strategy || ROTATION_STRATEGY.ROUND_ROBIN;
    this.rateLimitCooldownMs = opts.rateLimitCooldownMs ?? 60_000;
    this.maxKeyFailures = opts.maxKeyFailures ?? 3;
    this._rrIndex = 0;
  }

  configure({ strategy, rateLimitCooldownMs, maxKeyFailures } = {}) {
    if (strategy) this.strategy = strategy;
    if (rateLimitCooldownMs != null) this.rateLimitCooldownMs = rateLimitCooldownMs;
    if (maxKeyFailures != null) this.maxKeyFailures = maxKeyFailures;
  }

  importFromText(blob) {
    const parsed = parseKeyBlob(blob);
    const prev = new Map(this.keys.map((k) => [k.key, k]));
    this.keys = parsed.map((key) => {
      const p = prev.get(key);
      if (p) return { ...p, label: maskKey(key), enabled: p.enabled !== false };
      return this._new(key);
    });
    this._rrIndex = 0;
    this._emit();
    return this.keys.length;
  }

  loadRecords(records) {
    this.keys = (records || []).map((r) => ({ ...this._new(r.key), ...r, label: maskKey(r.key) }));
    this._emit();
  }

  _new(key) {
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
    this._refresh();
    return this.keys.map((k) => ({ ...k }));
  }

  listPublic() {
    this._refresh();
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

  enabledCount() {
    return this.keys.filter((k) => k.enabled && k.status !== KEY_STATUS.INVALID).length;
  }

  setEnabled(id, enabled) {
    const rec = this.keys.find((k) => k.id === id);
    if (!rec) return;
    rec.enabled = enabled;
    rec.status = enabled ? KEY_STATUS.READY : KEY_STATUS.DISABLED;
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

  _refresh() {
    const now = Date.now();
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
      }
    }
  }

  healthyKeys() {
    this._refresh();
    return this.keys.filter((k) => k.enabled && k.status === KEY_STATUS.READY);
  }

  msUntilNextHealthy() {
    this._refresh();
    if (this.healthyKeys().length) return 0;
    const now = Date.now();
    let min = Infinity;
    for (const k of this.keys) {
      if (!k.enabled || k.status === KEY_STATUS.INVALID) continue;
      if (k.cooldownUntil && k.cooldownUntil > now) {
        min = Math.min(min, k.cooldownUntil - now);
      }
    }
    return min === Infinity ? -1 : min;
  }

  selectKey({ excludeIds = [] } = {}) {
    const exclude = new Set(excludeIds);
    const pool = this.healthyKeys().filter((k) => !exclude.has(k.id));
    if (!pool.length) return null;

    let chosen;
    switch (this.strategy) {
      case ROTATION_STRATEGY.LEAST_USED:
        chosen = pool.slice().sort((a, b) => a.requestCount - b.requestCount)[0];
        break;
      case ROTATION_STRATEGY.HEALTHY_FIRST:
        chosen = pool
          .slice()
          .sort((a, b) => a.failureCount - b.failureCount || a.requestCount - b.requestCount)[0];
        break;
      case ROTATION_STRATEGY.ROUND_ROBIN:
      default: {
        const enabled = this.keys.filter(
          (k) => k.enabled && k.status !== KEY_STATUS.INVALID && k.status !== KEY_STATUS.DISABLED
        );
        for (let i = 0; i < enabled.length; i++) {
          const idx = (this._rrIndex + i) % enabled.length;
          const cand = enabled[idx];
          if (pool.some((p) => p.id === cand.id)) {
            chosen = cand;
            this._rrIndex = (idx + 1) % enabled.length;
            break;
          }
        }
        if (!chosen) chosen = pool[0];
        break;
      }
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
  }

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
    } else if (isQuotaError(code, msg)) {
      rec.status = KEY_STATUS.RATE_LIMITED;
      rec.cooldownUntil = Date.now() + (info.retryAfterMs ?? this.rateLimitCooldownMs);
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
    });
    bus.log(`Key ${rec.label} → ${rec.status}: ${msg}`, 'warn');
  }

  releaseBusy(id) {
    const rec = this.keys.find((k) => k.id === id);
    if (!rec) return;
    if (rec.status === KEY_STATUS.BUSY) {
      rec.status = KEY_STATUS.READY;
      bus.emit(EVENTS.KEY_STATUS, { keyId: id, status: rec.status, label: rec.label });
    }
  }

  summary() {
    this._refresh();
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
    storage.set(
      STORAGE_KEYS.API_KEYS,
      this.keys.map((k) => ({
        id: k.id,
        key: k.key,
        enabled: k.enabled,
        successCount: k.successCount,
        failureCount: k.failureCount,
        requestCount: k.requestCount,
        status: k.status === KEY_STATUS.BUSY ? KEY_STATUS.READY : KEY_STATUS.READY,
        createdAt: k.createdAt,
      }))
    );
  }

  restore() {
    const data = storage.get(STORAGE_KEYS.API_KEYS, null);
    if (Array.isArray(data) && data.length) this.loadRecords(data);
  }

  _emit() {
    bus.emit(EVENTS.KEYS_UPDATED, this.summary());
  }
}
