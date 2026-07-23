/**
 * Thin Gemini v1beta REST client.
 * Uses key manager for rotation; never hardcodes a single key.
 *
 * On quota / resource-exhausted: park that key and immediately try
 * the next key in the pool until healthy keys are exhausted (then
 * optionally wait for the soonest cooldown).
 *
 * @module core/gemini-client
 */

import { GEMINI_API_BASE, EVENTS } from '../config/constants.js';
import { bus } from './event-bus.js';
import { uid } from '../utils/id.js';
import { sleep } from '../utils/time.js';
import { isQuotaOrRateLimitError } from './key-manager.js';

/**
 * Normalize model id to `models/xxx` path segment form without double prefix.
 * @param {string} model
 */
export function normalizeModelName(model) {
  const m = String(model || '').trim();
  if (!m) return '';
  return m.startsWith('models/') ? m.slice('models/'.length) : m;
}

/**
 * Parse generateContent response into text + thoughts + usage.
 * @param {object} data
 */
export function parseGenerateResponse(data) {
  const candidate = data?.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  const thoughts = [];
  const texts = [];
  const rawParts = [];

  for (const part of parts) {
    rawParts.push(part);
    if (part.thought === true || part.thought === 'true') {
      if (part.text) thoughts.push(part.text);
    } else if (part.text) {
      texts.push(part.text);
    }
  }

  return {
    text: texts.join('\n\n').trim(),
    thoughts: thoughts.join('\n\n').trim(),
    finishReason: candidate?.finishReason || null,
    safetyRatings: candidate?.safetyRatings || null,
    usage: data?.usageMetadata || null,
    modelVersion: data?.modelVersion || null,
    rawParts,
    raw: data,
  };
}

function parseRetryAfter(res) {
  const h = res.headers?.get?.('retry-after');
  if (!h) return null;
  const sec = Number(h);
  if (!Number.isNaN(sec)) return sec * 1000;
  return null;
}

function shouldRotateToNextKey(status, message) {
  if (isQuotaOrRateLimitError(status, message)) return true;
  if (status === 429 || status === 403 || status >= 500) return true;
  if (status === 400 && /api key|permission|quota|exhausted/i.test(message || '')) return true;
  // Network / transient
  if (!status) return true;
  return false;
}

export class GeminiClient {
  /**
   * @param {import('./key-manager.js').KeyManager} keyManager
   * @param {{baseUrl?: string, maxRetries?: number, maxCooldownWaitMs?: number}} [opts]
   */
  constructor(keyManager, opts = {}) {
    this.keys = keyManager;
    this.baseUrl = opts.baseUrl || GEMINI_API_BASE;
    /** Floor for attempts; actual = max(this, enabled key count, 1) per cycle */
    this.maxRetries = opts.maxRetries ?? 4;
    /** How long to wait for a cooling key before giving up (one wait cycle) */
    this.maxCooldownWaitMs = opts.maxCooldownWaitMs ?? 45_000;
  }

  /**
   * How many keys we should try before waiting on cooldowns.
   */
  _attemptBudget() {
    const n = Math.max(1, this.keys.enabledCount() || this.keys.keys.length || 1);
    // At least one full pass over every enabled key, plus a couple extras
    return Math.max(this.maxRetries, n, n + 2);
  }

  /**
   * Low-level fetch with key rotation across the whole pool.
   * @param {string} path
   * @param {{method?: string, body?: object, query?: Record<string,string>}} options
   */
  async request(path, options = {}) {
    const method = options.method || 'GET';
    const excludeIds = [];
    let lastError = null;
    const requestId = uid('req');
    let waitedOnce = false;

    const budget = this._attemptBudget();

    for (let attempt = 0; attempt < budget; attempt++) {
      let rec = this.keys.selectKey({ excludeIds });

      // All healthy keys tried or cooling — wait once for soonest cooldown
      if (!rec) {
        const waitMs = this.keys.msUntilNextHealthy();
        if (!waitedOnce && waitMs > 0 && waitMs <= this.maxCooldownWaitMs) {
          waitedOnce = true;
          bus.log(
            `All keys cooling/exhausted — waiting ${Math.ceil(waitMs / 1000)}s for pool…`,
            'warn'
          );
          bus.emit(EVENTS.TOAST, {
            message: `Keys exhausted — waiting ${Math.ceil(waitMs / 1000)}s then rotating`,
            level: 'warn',
          });
          await sleep(waitMs + 50);
          // Fresh pass after wait
          excludeIds.length = 0;
          rec = this.keys.selectKey({ excludeIds });
        }
      }

      if (!rec) {
        const sum = this.keys.summary();
        const err = new Error(
          lastError?.message
            ? `All keys failed or cooling (${sum.healthy}/${sum.total} healthy). Last: ${lastError.message}`
            : `No healthy Gemini API keys (${sum.healthy}/${sum.total}). Add keys or Reset statuses in Settings.`
        );
        err.code = 'NO_KEYS';
        err.cause = lastError;
        throw err;
      }

      const url = new URL(`${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`);
      url.searchParams.set('key', rec.key);
      if (options.query) {
        for (const [k, v] of Object.entries(options.query)) {
          if (v != null) url.searchParams.set(k, String(v));
        }
      }

      this.keys.markBusy(rec.id);
      bus.emit(EVENTS.REQUEST_START, {
        requestId,
        attempt,
        path,
        method,
        keyId: rec.id,
        keyLabel: rec.label,
        poolHealthy: this.keys.healthyKeys().length,
      });
      bus.log(`Attempt ${attempt + 1}/${budget} with key ${rec.label}`, 'info');

      const started = performance.now();
      try {
        const res = await fetch(url.toString(), {
          method,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: options.body != null ? JSON.stringify(options.body) : undefined,
        });

        const durationMs = performance.now() - started;
        let data = null;
        const text = await res.text();
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = { rawText: text };
        }

        if (!res.ok) {
          const msg =
            data?.error?.message ||
            data?.message ||
            text?.slice?.(0, 200) ||
            `HTTP ${res.status}`;

          this.keys.markFailure(rec.id, {
            status: res.status,
            message: msg,
            retryAfterMs: parseRetryAfter(res),
          });
          excludeIds.push(rec.id);
          lastError = Object.assign(new Error(msg), {
            status: res.status,
            data,
            keyId: rec.id,
            keyLabel: rec.label,
          });

          bus.emit(EVENTS.REQUEST_ERROR, {
            requestId,
            attempt,
            status: res.status,
            message: msg,
            keyId: rec.id,
            keyLabel: rec.label,
            durationMs,
            rotating: shouldRotateToNextKey(res.status, msg),
          });

          if (shouldRotateToNextKey(res.status, msg)) {
            const left = this.keys.healthyKeys().filter((k) => !excludeIds.includes(k.id)).length;
            bus.log(
              `Key ${rec.label} failed (${res.status}): ${msg} → rotating (${left} healthy left)`,
              'warn'
            );
            continue;
          }

          // Non-rotatable (e.g. bad request body) — fail fast
          throw lastError;
        }

        this.keys.markSuccess(rec.id);
        bus.emit(EVENTS.REQUEST_END, {
          requestId,
          attempt,
          path,
          keyId: rec.id,
          keyLabel: rec.label,
          durationMs,
          ok: true,
        });
        if (attempt > 0) {
          bus.log(`Succeeded with key ${rec.label} after ${attempt} rotation(s)`, 'info');
        }
        return {
          data,
          keyId: rec.id,
          keyLabel: rec.label,
          requestId,
          durationMs,
          status: res.status,
        };
      } catch (err) {
        // HTTP errors we already decided to throw (non-rotatable)
        if (err.status && !shouldRotateToNextKey(err.status, err.message)) {
          throw err;
        }
        // Network / rotatable rethrow path: park and continue if not already marked
        if (!err.keyId) {
          this.keys.markFailure(rec.id, {
            status: err.status,
            message: err.message || 'network error',
          });
          excludeIds.push(rec.id);
          lastError = err;
          bus.emit(EVENTS.REQUEST_ERROR, {
            requestId,
            attempt,
            message: err.message,
            keyId: rec.id,
            keyLabel: rec.label,
          });
          continue;
        }
        // Already marked inside !res.ok with status — if we threw, rethrow; else continue handled above
        if (err.status && shouldRotateToNextKey(err.status, err.message)) {
          continue;
        }
        throw err;
      } finally {
        this.keys.releaseBusy(rec.id);
      }
    }

    throw (
      lastError ||
      Object.assign(new Error('Gemini request failed after trying the key pool'), {
        code: 'POOL_EXHAUSTED',
      })
    );
  }

  /**
   * List models from v1beta catalogue (paginated).
   * @returns {Promise<{models: object[], keyLabel: string}>}
   */
  async listModels() {
    bus.emit(EVENTS.MODELS_LOADING, {});
    const models = [];
    let pageToken = null;
    let keyLabel = '';
    try {
      do {
        const query = { pageSize: '100' };
        if (pageToken) query.pageToken = pageToken;
        const { data, keyLabel: kl } = await this.request('/models', { method: 'GET', query });
        keyLabel = kl;
        if (Array.isArray(data?.models)) models.push(...data.models);
        pageToken = data?.nextPageToken || null;
      } while (pageToken);

      bus.emit(EVENTS.MODELS_LOADED, { count: models.length, keyLabel });
      return { models, keyLabel };
    } catch (err) {
      bus.emit(EVENTS.MODELS_ERROR, { message: err.message });
      throw err;
    }
  }

  /**
   * generateContent with optional thinking config.
   * @param {object} params
   */
  async generateContent(params) {
    const model = normalizeModelName(params.model);
    if (!model) throw new Error('model is required');

    const body = {
      contents: params.contents,
    };
    if (params.systemInstruction) {
      body.systemInstruction = params.systemInstruction;
    }
    if (params.generationConfig) {
      body.generationConfig = params.generationConfig;
    }
    if (params.safetySettings) {
      body.safetySettings = params.safetySettings;
    }

    const result = await this.request(`/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      body,
    });

    const parsed = parseGenerateResponse(result.data);
    return {
      ...parsed,
      keyId: result.keyId,
      keyLabel: result.keyLabel,
      requestId: result.requestId,
      durationMs: result.durationMs,
      model,
    };
  }
}
