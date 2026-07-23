/**
 * Thin Gemini v1beta REST client.
 * Uses key manager for rotation; never hardcodes a single key.
 *
 * Endpoints:
 *  - GET  /v1beta/models
 *  - POST /v1beta/models/{model}:generateContent
 *
 * @module core/gemini-client
 */

import { GEMINI_API_BASE, EVENTS } from '../config/constants.js';
import { bus } from './event-bus.js';
import { uid } from '../utils/id.js';

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

  // Some responses put thought summaries elsewhere
  if (!thoughts.length && data?.candidates?.[0]?.citationMetadata) {
    /* ignore */
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

export class GeminiClient {
  /**
   * @param {import('./key-manager.js').KeyManager} keyManager
   * @param {{baseUrl?: string, maxRetries?: number}} [opts]
   */
  constructor(keyManager, opts = {}) {
    this.keys = keyManager;
    this.baseUrl = opts.baseUrl || GEMINI_API_BASE;
    this.maxRetries = opts.maxRetries ?? 4;
  }

  /**
   * Low-level fetch with key rotation.
   * @param {string} path  e.g. `/models` or `/models/x:generateContent`
   * @param {{method?: string, body?: object, query?: Record<string,string>}} options
   */
  async request(path, options = {}) {
    const method = options.method || 'GET';
    const excludeIds = [];
    let lastError = null;
    const requestId = uid('req');

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const rec = this.keys.selectKey({ excludeIds });
      if (!rec) {
        const err = new Error(
          lastError?.message ||
            'No healthy Gemini API keys available. Add keys in Settings and reset statuses.'
        );
        err.code = 'NO_KEYS';
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
      });

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
          });
          bus.emit(EVENTS.REQUEST_ERROR, {
            requestId,
            attempt,
            status: res.status,
            message: msg,
            keyId: rec.id,
            keyLabel: rec.label,
            durationMs,
          });
          // retry on 429 / 5xx / 403 quota-ish
          if (res.status === 429 || res.status >= 500 || res.status === 403) {
            continue;
          }
          // 400 usually not fixed by other keys (bad request) — still try once more if multi-key
          if (res.status === 400 && attempt < this.maxRetries - 1) {
            // only continue if looks like key-related
            if (/api key|permission|quota/i.test(msg)) continue;
          }
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
        return {
          data,
          keyId: rec.id,
          keyLabel: rec.label,
          requestId,
          durationMs,
          status: res.status,
        };
      } catch (err) {
        if (err.status) throw err; // already handled HTTP error
        this.keys.markFailure(rec.id, { message: err.message || 'network error' });
        excludeIds.push(rec.id);
        lastError = err;
        bus.emit(EVENTS.REQUEST_ERROR, {
          requestId,
          attempt,
          message: err.message,
          keyId: rec.id,
          keyLabel: rec.label,
        });
      } finally {
        this.keys.releaseBusy(rec.id);
      }
    }

    throw lastError || new Error('Gemini request failed after retries');
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
   * @param {string} params.model
   * @param {object[]} params.contents
   * @param {object} [params.systemInstruction]
   * @param {object} [params.generationConfig]
   * @param {object} [params.safetySettings]
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
