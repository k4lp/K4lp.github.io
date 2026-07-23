/**
 * OpenAI REST client — Chat Completions (stream + non-stream) + Models.
 * Bearer auth, multi-key rotation, AbortController, live net hooks.
 * @module core/openai-client
 */

import { OPENAI_API_BASE, EVENTS } from '../config/constants.js';
import { bus } from './event-bus.js';
import { uid } from '../utils/id.js';
import { sleep } from '../utils/time.js';
import { parseOpenAIChatSSE } from './stream-parser.js';
import { isQuotaError } from './key-manager.js';

/**
 * Build Chat Completions body from settings + messages.
 * Omits null/empty optional fields so the API sees a clean payload.
 * @param {object} settings
 * @param {object[]} messages
 */
export function buildChatBody(settings, messages) {
  const body = {
    model: settings.model,
    messages,
    stream: settings.stream !== false,
  };

  if (body.stream && settings.streamIncludeUsage) {
    body.stream_options = { include_usage: true };
  }

  // Sampling
  if (settings.temperature != null && settings.temperature !== '') {
    body.temperature = Number(settings.temperature);
  }
  if (settings.topP != null && settings.topP !== '') {
    body.top_p = Number(settings.topP);
  }
  if (settings.presencePenalty != null) {
    body.presence_penalty = Number(settings.presencePenalty);
  }
  if (settings.frequencyPenalty != null) {
    body.frequency_penalty = Number(settings.frequencyPenalty);
  }
  if (settings.n != null && Number(settings.n) > 0) {
    body.n = Number(settings.n);
  }
  if (settings.seed != null && settings.seed !== '' && !Number.isNaN(Number(settings.seed))) {
    body.seed = Number(settings.seed);
  }
  if (settings.user) body.user = String(settings.user);

  // Token limits — modern vs legacy
  if (settings.useMaxCompletionTokens !== false) {
    if (settings.maxCompletionTokens != null && Number(settings.maxCompletionTokens) > 0) {
      body.max_completion_tokens = Number(settings.maxCompletionTokens);
    }
  } else if (settings.maxTokens != null && Number(settings.maxTokens) > 0) {
    body.max_tokens = Number(settings.maxTokens);
  }

  // Stop sequences
  const stops = parseStop(settings.stop);
  if (stops.length) body.stop = stops.length === 1 ? stops[0] : stops;

  // Logit bias
  if (settings.logitBiasJson && String(settings.logitBiasJson).trim()) {
    try {
      body.logit_bias = JSON.parse(settings.logitBiasJson);
    } catch {
      /* ignore invalid — UI validates */
    }
  }

  if (settings.logprobs) {
    body.logprobs = true;
    if (settings.topLogprobs > 0) body.top_logprobs = Number(settings.topLogprobs);
  }

  // Response format
  if (settings.responseFormat === 'json_object') {
    body.response_format = { type: 'json_object' };
  } else if (settings.responseFormat === 'text') {
    // omit or explicit
  }

  // Reasoning effort (o-series / compatible)
  if (settings.reasoningEffort) {
    body.reasoning_effort = settings.reasoningEffort;
  }

  return body;
}

function parseStop(stop) {
  if (!stop) return [];
  if (Array.isArray(stop)) return stop.filter(Boolean);
  return String(stop)
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export class OpenAIClient {
  /**
   * @param {import('./key-manager.js').KeyManager} keyManager
   * @param {object} [opts]
   * @param {() => object} [opts.getSettings]
   * @param {import('./network-monitor.js').NetworkMonitor} [opts.network]
   */
  constructor(keyManager, opts = {}) {
    this.keys = keyManager;
    this.getSettings = opts.getSettings || (() => ({}));
    this.network = opts.network || null;
    this.maxRetries = opts.maxRetries ?? 4;
  }

  baseUrl() {
    const s = this.getSettings();
    return (s.apiBase || OPENAI_API_BASE).replace(/\/$/, '');
  }

  _headers(apiKey) {
    const s = this.getSettings();
    const h = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (s.organization) h['OpenAI-Organization'] = s.organization;
    if (s.project) h['OpenAI-Project'] = s.project;
    return h;
  }

  /**
   * Low-level fetch with key rotation.
   * @param {string} path
   * @param {{method?: string, body?: object, signal?: AbortSignal, raw?: boolean}} options
   */
  async request(path, options = {}) {
    const method = options.method || 'GET';
    const excludeIds = [];
    let lastError = null;
    const requestId = uid('req');
    const budget = Math.max(this.maxRetries, this.keys.enabledCount() || 1);

    for (let attempt = 0; attempt < budget; attempt++) {
      let rec = this.keys.selectKey({ excludeIds });
      if (!rec) {
        const wait = this.keys.msUntilNextHealthy();
        if (wait > 0 && wait < 45_000) {
          bus.log(`All keys cooling — wait ${Math.ceil(wait / 1000)}s`, 'warn');
          await sleep(wait + 50);
          rec = this.keys.selectKey({ excludeIds: [] });
        }
      }
      if (!rec) {
        const err = new Error(
          lastError?.message ||
            'No healthy OpenAI API keys. Add keys in Settings and reset statuses.'
        );
        err.code = 'NO_KEYS';
        throw err;
      }

      const url = `${this.baseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
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
        const res = await fetch(url, {
          method,
          headers: this._headers(rec.key),
          body: options.body != null ? JSON.stringify(options.body) : undefined,
          signal: options.signal,
        });

        const latencyMs = performance.now() - started;

        if (!res.ok) {
          let message = res.statusText;
          let data = null;
          try {
            data = await res.json();
            message = data?.error?.message || message;
          } catch {
            try {
              message = (await res.text()) || message;
            } catch {
              /* ignore */
            }
          }

          this.keys.markFailure(rec.id, {
            status: res.status,
            message,
            retryAfterMs: parseRetryAfter(res),
          });
          excludeIds.push(rec.id);
          lastError = Object.assign(new Error(message), {
            status: res.status,
            data,
            keyId: rec.id,
            keyLabel: rec.label,
          });

          this.network?.observeRequest({
            ok: false,
            status: res.status,
            latencyMs,
            message,
          });

          bus.emit(EVENTS.REQUEST_ERROR, {
            requestId,
            attempt,
            status: res.status,
            message,
            keyId: rec.id,
            keyLabel: rec.label,
            latencyMs,
          });

          const rotatable =
            isQuotaError(res.status, message) ||
            res.status === 429 ||
            res.status === 503 ||
            res.status >= 500 ||
            res.status === 401 ||
            res.status === 403;
          if (rotatable && attempt < budget - 1) continue;
          throw lastError;
        }

        this.keys.markSuccess(rec.id);
        this.network?.observeRequest({ ok: true, status: res.status, latencyMs });
        bus.emit(EVENTS.REQUEST_END, {
          requestId,
          attempt,
          path,
          keyId: rec.id,
          keyLabel: rec.label,
          latencyMs,
          ok: true,
        });

        return {
          res,
          keyId: rec.id,
          keyLabel: rec.label,
          requestId,
          latencyMs,
        };
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        if (err.status) throw err; // already handled HTTP

        this.keys.markFailure(rec.id, { message: err.message || 'network error' });
        excludeIds.push(rec.id);
        lastError = err;
        const latencyMs = performance.now() - started;
        this.network?.observeRequest({
          ok: false,
          networkError: true,
          latencyMs,
          message: err.message,
        });
        bus.emit(EVENTS.REQUEST_ERROR, {
          requestId,
          attempt,
          message: err.message,
          keyId: rec.id,
          keyLabel: rec.label,
          networkError: true,
          latencyMs,
        });
      } finally {
        this.keys.releaseBusy(rec.id);
      }
    }

    throw lastError || new Error('OpenAI request failed after key pool retries');
  }

  /**
   * GET /models
   */
  async listModels() {
    bus.emit(EVENTS.MODELS_LOADING, {});
    try {
      const { res, keyLabel } = await this.request('/models', { method: 'GET' });
      const data = await res.json();
      const models = Array.isArray(data?.data) ? data.data : [];
      bus.emit(EVENTS.MODELS_LOADED, { count: models.length, keyLabel });
      return { models, keyLabel };
    } catch (err) {
      bus.emit(EVENTS.MODELS_ERROR, { message: err.message });
      throw err;
    }
  }

  /**
   * Non-streaming chat completion.
   */
  async chatComplete(messages, settings, { signal } = {}) {
    const body = buildChatBody({ ...settings, stream: false }, messages);
    const { res, keyId, keyLabel, requestId, latencyMs } = await this.request(
      '/chat/completions',
      { method: 'POST', body, signal }
    );
    const data = await res.json();
    const choice = data.choices?.[0];
    return {
      text: choice?.message?.content || '',
      role: choice?.message?.role || 'assistant',
      finishReason: choice?.finish_reason,
      usage: data.usage,
      model: data.model,
      id: data.id,
      keyId,
      keyLabel,
      requestId,
      latencyMs,
      raw: data,
    };
  }

  /**
   * Streaming chat completion — yields deltas; returns final aggregate.
   * @param {object[]} messages
   * @param {object} settings
   * @param {{signal?: AbortSignal, onDelta?: (p: {text: string, delta: string}) => void}} [opts]
   */
  async chatStream(messages, settings, opts = {}) {
    const body = buildChatBody({ ...settings, stream: true }, messages);
    const requestId = uid('stream');

    bus.emit(EVENTS.STREAM_START, { requestId, model: settings.model });

    const { res, keyId, keyLabel, latencyMs: ttfb } = await this.request('/chat/completions', {
      method: 'POST',
      body,
      signal: opts.signal,
    });

    let text = '';
    let usage = null;
    let finishReason = null;
    let model = settings.model;
    let id = null;
    const started = performance.now();

    try {
      for await (const chunk of parseOpenAIChatSSE(res.body, { signal: opts.signal })) {
        if (chunk.done) break;
        if (chunk.content) {
          text += chunk.content;
          bus.emit(EVENTS.STREAM_DELTA, {
            requestId,
            delta: chunk.content,
            text,
          });
          opts.onDelta?.({ text, delta: chunk.content });
        }
        if (chunk.usage) usage = chunk.usage;
        if (chunk.finishReason) finishReason = chunk.finishReason;
        if (chunk.model) model = chunk.model;
        if (chunk.id) id = chunk.id;
      }

      const totalMs = performance.now() - started;
      bus.emit(EVENTS.STREAM_END, {
        requestId,
        text,
        usage,
        finishReason,
        model,
        keyLabel,
        totalMs,
        ttfb,
      });

      return {
        text,
        role: 'assistant',
        finishReason,
        usage,
        model,
        id,
        keyId,
        keyLabel,
        requestId,
        latencyMs: totalMs,
        ttfb,
        streamed: true,
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        bus.emit(EVENTS.STREAM_ABORT, { requestId, text });
        throw err;
      }
      bus.emit(EVENTS.STREAM_ERROR, { requestId, message: err.message });
      throw err;
    }
  }
}

function parseRetryAfter(res) {
  const h = res.headers?.get?.('retry-after');
  if (!h) return null;
  const sec = Number(h);
  if (!Number.isNaN(sec)) return sec * 1000;
  return null;
}
