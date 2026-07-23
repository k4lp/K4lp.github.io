/**
 * Renders the live multi-speaker transcript.
 * @module ui/chat-view
 */

import { $, clear, el, escapeHtml } from '../utils/dom.js';
import { formatTime, formatDuration } from '../utils/time.js';
import { bus } from '../core/event-bus.js';
import { EVENTS } from '../config/constants.js';

export class ChatView {
  /**
   * @param {HTMLElement} root
   * @param {{autoScroll?: () => boolean}} opts
   */
  constructor(root, opts = {}) {
    this.root = root;
    this.autoScroll = opts.autoScroll || (() => true);
    this._bind();
  }

  _bind() {
    bus.on(EVENTS.SESSION_RESET, () => this.clear());
    bus.on(EVENTS.TRANSCRIPT_APPEND, (e) => this.appendTurn(e.payload.turn));
  }

  clear() {
    clear(this.root);
    this.root.appendChild(
      el('div', {
        className: 'chat-empty',
        text: 'No turns yet. Configure keys & candidates, then Start.',
      })
    );
  }

  /**
   * @param {import('../core/transcript.js').TranscriptTurn} turn
   */
  appendTurn(turn) {
    const empty = this.root.querySelector('.chat-empty');
    if (empty) empty.remove();

    const color = turn.meta?.color || (turn.role === 'moderator' ? '#94a3b8' : '#64748b');
    const isSystem = turn.role === 'system';
    const isMod = turn.role === 'moderator';

    const card = el('article', {
      className: `turn-card role-${turn.role}${isSystem ? ' is-error' : ''}`,
      dataset: { turnId: turn.id },
      style: `--speaker-color: ${color}`,
    });

    const head = el('header', { className: 'turn-head' }, [
      el('span', { className: 'turn-avatar', text: (turn.speakerName || '?').slice(0, 1).toUpperCase() }),
      el('div', { className: 'turn-meta' }, [
        el('div', { className: 'turn-name-row' }, [
          el('strong', { className: 'turn-name', text: turn.speakerName }),
          el('span', {
            className: 'turn-badge',
            text: isMod ? 'seed' : isSystem ? 'system' : 'candidate',
          }),
        ]),
        el('div', { className: 'turn-sub' }, [
          el('span', { text: formatTime(turn.at) }),
          turn.meta?.model
            ? el('span', { className: 'mono', text: turn.meta.model })
            : null,
          turn.meta?.keyLabel
            ? el('span', { text: `key ${turn.meta.keyLabel}` })
            : null,
          turn.meta?.durationMs != null
            ? el('span', { text: formatDuration(turn.meta.durationMs) })
            : null,
        ].filter(Boolean)),
      ]),
      el('span', { className: 'turn-index', text: `#${turn.index + 1}` }),
    ]);

    const body = el('div', { className: 'turn-body' });
    body.innerHTML = `<p class="turn-text">${escapeHtml(turn.text).replace(/\n/g, '<br>')}</p>`;

    card.appendChild(head);
    card.appendChild(body);

    if (turn.reasoning) {
      const details = el('details', { className: 'turn-reasoning' }, [
        el('summary', { text: 'Reasoning / thoughts' }),
        el('pre', { className: 'reasoning-pre', text: turn.reasoning }),
      ]);
      card.appendChild(details);
    }

    this.root.appendChild(card);
    if (this.autoScroll()) {
      card.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }

  /** Full re-render from transcript */
  renderAll(turns) {
    clear(this.root);
    if (!turns?.length) {
      this.clear();
      return;
    }
    for (const t of turns) this.appendTurn(t);
  }
}

export function mountChatView(selector, opts) {
  const root = $(selector);
  if (!root) throw new Error(`Chat root not found: ${selector}`);
  const view = new ChatView(root, opts);
  view.clear();
  return view;
}
