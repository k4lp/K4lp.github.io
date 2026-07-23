/**
 * Single-model chat session — messages, stream, abort.
 * @module core/chat-session
 */

import { EVENTS } from '../config/constants.js';
import { bus } from './event-bus.js';
import { uid } from '../utils/id.js';
import { nowIso } from '../utils/time.js';

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {'system'|'user'|'assistant'|'error'} role
 * @property {string} content
 * @property {string} at
 * @property {boolean} [streaming]
 * @property {object} [meta]
 */

export class ChatSession {
  /**
   * @param {object} deps
   * @param {import('./openai-client.js').OpenAIClient} deps.client
   * @param {() => object} deps.getSettings
   */
  constructor({ client, getSettings }) {
    this.client = client;
    this.getSettings = getSettings;
    /** @type {ChatMessage[]} */
    this.messages = [];
    this.sessionId = uid('chat');
    this.busy = false;
    /** @type {AbortController|null} */
    this._abort = null;
  }

  reset() {
    this.abort();
    this.messages = [];
    this.sessionId = uid('chat');
    bus.emit(EVENTS.CHAT_RESET, { sessionId: this.sessionId });
  }

  /**
   * API-facing messages (system + user/assistant turns).
   */
  toApiMessages() {
    const settings = this.getSettings();
    const out = [];
    const sys = (settings.systemPrompt || '').trim();
    if (sys) out.push({ role: 'system', content: sys });

    for (const m of this.messages) {
      if (m.role === 'error') continue;
      if (m.role === 'system') continue; // system only from settings
      if (!m.content && m.streaming) continue;
      out.push({ role: m.role, content: m.content || '' });
    }
    return out;
  }

  /**
   * Send a user message and stream (or complete) the assistant reply.
   * @param {string} text
   */
  async send(text) {
    const content = String(text || '').trim();
    if (!content) return null;
    if (this.busy) throw new Error('Already generating a reply — stop first or wait.');

    const userMsg = {
      id: uid('msg'),
      role: 'user',
      content,
      at: nowIso(),
    };
    this.messages.push(userMsg);
    bus.emit(EVENTS.CHAT_MESSAGE, { message: userMsg });

    const assistantMsg = {
      id: uid('msg'),
      role: 'assistant',
      content: '',
      at: nowIso(),
      streaming: true,
      meta: {},
    };
    this.messages.push(assistantMsg);
    bus.emit(EVENTS.CHAT_MESSAGE, { message: assistantMsg });

    this.busy = true;
    this._abort = new AbortController();
    const settings = this.getSettings();

    try {
      const apiMessages = this.toApiMessages().filter(
        // exclude the empty streaming assistant we just added
        (m, i, arr) => !(m.role === 'assistant' && i === arr.length - 1 && m.content === '')
      );
      // Rebuild: system + all non-error messages except empty trailing assistant
      const payload = [];
      const sys = (settings.systemPrompt || '').trim();
      if (sys) payload.push({ role: 'system', content: sys });
      for (const m of this.messages) {
        if (m.role === 'error') continue;
        if (m.id === assistantMsg.id) continue;
        payload.push({ role: m.role, content: m.content });
      }

      if (settings.stream !== false) {
        const result = await this.client.chatStream(payload, settings, {
          signal: this._abort.signal,
          onDelta: ({ text }) => {
            assistantMsg.content = text;
            bus.emit(EVENTS.CHAT_UPDATE, { message: assistantMsg });
          },
        });
        assistantMsg.content = result.text;
        assistantMsg.streaming = false;
        assistantMsg.meta = {
          model: result.model,
          usage: result.usage,
          finishReason: result.finishReason,
          keyLabel: result.keyLabel,
          latencyMs: result.latencyMs,
          ttfb: result.ttfb,
          streamed: true,
          requestId: result.requestId,
        };
      } else {
        const result = await this.client.chatComplete(payload, settings, {
          signal: this._abort.signal,
        });
        assistantMsg.content = result.text;
        assistantMsg.streaming = false;
        assistantMsg.meta = {
          model: result.model,
          usage: result.usage,
          finishReason: result.finishReason,
          keyLabel: result.keyLabel,
          latencyMs: result.latencyMs,
          streamed: false,
          requestId: result.requestId,
        };
      }

      bus.emit(EVENTS.CHAT_UPDATE, { message: assistantMsg });
      return assistantMsg;
    } catch (err) {
      if (err.name === 'AbortError') {
        assistantMsg.streaming = false;
        if (!assistantMsg.content) {
          assistantMsg.content = '_(generation stopped)_';
        } else {
          assistantMsg.content += '\n\n_(stopped)_';
        }
        assistantMsg.meta = { ...(assistantMsg.meta || {}), aborted: true };
        bus.emit(EVENTS.CHAT_UPDATE, { message: assistantMsg });
        return assistantMsg;
      }

      assistantMsg.streaming = false;
      // Convert failed assistant bubble into error annotation
      const errMsg = {
        id: uid('msg'),
        role: 'error',
        content: err.message || String(err),
        at: nowIso(),
        meta: { status: err.status, keyLabel: err.keyLabel },
      };
      // Remove empty assistant placeholder if nothing streamed
      if (!assistantMsg.content) {
        this.messages = this.messages.filter((m) => m.id !== assistantMsg.id);
      } else {
        assistantMsg.meta = { ...(assistantMsg.meta || {}), error: err.message };
        bus.emit(EVENTS.CHAT_UPDATE, { message: assistantMsg });
      }
      this.messages.push(errMsg);
      bus.emit(EVENTS.CHAT_MESSAGE, { message: errMsg });
      throw err;
    } finally {
      this.busy = false;
      this._abort = null;
    }
  }

  abort() {
    if (this._abort) {
      this._abort.abort();
      this._abort = null;
    }
    this.busy = false;
  }

  toJSON() {
    return {
      sessionId: this.sessionId,
      messages: this.messages,
      exportedAt: nowIso(),
    };
  }

  toMarkdown() {
    const lines = [`# Chat session \`${this.sessionId}\``, ''];
    for (const m of this.messages) {
      lines.push(`## ${m.role}`);
      lines.push('');
      lines.push(m.content || '_(empty)_');
      lines.push('');
      if (m.meta?.usage) {
        lines.push(
          `> tokens: prompt ${m.meta.usage.prompt_tokens ?? '—'} · completion ${m.meta.usage.completion_tokens ?? '—'} · total ${m.meta.usage.total_tokens ?? '—'}`
        );
        lines.push('');
      }
    }
    return lines.join('\n');
  }
}
