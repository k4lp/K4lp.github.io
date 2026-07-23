/**
 * Streaming chat transcript UI.
 * @module ui/chat-view
 */

import { $, clear, el, escapeHtml } from '../utils/dom.js';
import { bus } from '../core/event-bus.js';
import { EVENTS } from '../config/constants.js';
import { formatTime, formatDuration } from '../utils/time.js';

export class ChatView {
  constructor(root, { autoScroll } = {}) {
    this.root = root;
    this.autoScroll = autoScroll || (() => true);
    this._nodes = new Map();
    this._bind();
  }

  _bind() {
    bus.on(EVENTS.CHAT_RESET, () => this.clear());
    bus.on(EVENTS.CHAT_MESSAGE, (e) => this.upsert(e.payload.message));
    bus.on(EVENTS.CHAT_UPDATE, (e) => this.upsert(e.payload.message));
    bus.on(EVENTS.STREAM_DELTA, () => {
      /* CHAT_UPDATE already handles text */
    });
  }

  clear() {
    clear(this.root);
    this._nodes.clear();
    this.root.appendChild(
      el('div', {
        className: 'chat-empty',
        text: 'Start chatting. Messages stream token-by-token when Stream is on.',
      })
    );
  }

  upsert(message) {
    if (!message) return;
    const empty = this.root.querySelector('.chat-empty');
    if (empty) empty.remove();

    let card = this._nodes.get(message.id);
    if (!card) {
      card = this._buildCard(message);
      this._nodes.set(message.id, card);
      this.root.appendChild(card);
    } else {
      this._fillCard(card, message);
    }

    if (this.autoScroll()) {
      card.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }

  _buildCard(message) {
    const card = el('article', {
      className: `msg-card role-${message.role}`,
      dataset: { msgId: message.id },
    });
    this._fillCard(card, message);
    return card;
  }

  _fillCard(card, message) {
    card.className = `msg-card role-${message.role}${message.streaming ? ' is-streaming' : ''}`;
    clear(card);

    const metaBits = [formatTime(message.at)];
    if (message.meta?.model) metaBits.push(message.meta.model);
    if (message.meta?.keyLabel) metaBits.push(`key ${message.meta.keyLabel}`);
    if (message.meta?.latencyMs != null) metaBits.push(formatDuration(message.meta.latencyMs));
    if (message.meta?.ttfb != null) metaBits.push(`ttfb ${formatDuration(message.meta.ttfb)}`);
    if (message.meta?.usage?.total_tokens != null) {
      metaBits.push(`${message.meta.usage.total_tokens} tok`);
    }
    if (message.streaming) metaBits.push('streaming…');

    card.append(
      el('header', { className: 'msg-head' }, [
        el('strong', {
          className: 'msg-role',
          text: message.role === 'error' ? 'error' : message.role,
        }),
        el('span', { className: 'msg-meta muted', text: metaBits.join(' · ') }),
      ]),
      el('div', {
        className: 'msg-body',
        html: formatBody(message.content, message.streaming),
      })
    );
  }

  renderAll(messages) {
    clear(this.root);
    this._nodes.clear();
    if (!messages?.length) {
      this.clear();
      return;
    }
    for (const m of messages) this.upsert(m);
  }
}

function formatBody(text, streaming) {
  const safe = escapeHtml(text || (streaming ? '▍' : ''));
  const withBreaks = safe.replace(/\n/g, '<br>');
  const caret = streaming ? '<span class="stream-caret" aria-hidden="true"></span>' : '';
  return `<p class="msg-text">${withBreaks || (streaming ? '' : '<em class="muted">empty</em>')}${caret}</p>`;
}

export function mountChatView(selector, opts) {
  const root = $(selector);
  const view = new ChatView(root, opts);
  view.clear();
  return view;
}
