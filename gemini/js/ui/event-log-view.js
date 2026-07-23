/**
 * Live observability stream of bus events.
 * @module ui/event-log-view
 */

import { $, clear, el } from '../utils/dom.js';
import { formatTime } from '../utils/time.js';
import { bus } from '../core/event-bus.js';

export class EventLogView {
  constructor(root, { maxRows = 300 } = {}) {
    this.root = root;
    this.maxRows = maxRows;
    bus.on('*', (evt) => this._onEvent(evt));
  }

  _onEvent(evt) {
    // skip noisy toast
    if (evt.type === 'toast') return;
    const row = el('div', {
      className: `elog-row level-${evt.level || 'info'}`,
    }, [
      el('span', { className: 'elog-time', text: formatTime(evt.at) }),
      el('span', { className: 'elog-type mono', text: evt.type }),
      el('span', {
        className: 'elog-payload',
        text: summarize(evt.payload),
      }),
    ]);
    this.root.appendChild(row);
    while (this.root.children.length > this.maxRows) {
      this.root.removeChild(this.root.firstChild);
    }
    this.root.scrollTop = this.root.scrollHeight;
  }

  clear() {
    clear(this.root);
  }
}

function summarize(payload) {
  if (payload == null) return '';
  if (typeof payload === 'string') return payload;
  try {
    const s = JSON.stringify(payload);
    return s.length > 180 ? s.slice(0, 180) + '…' : s;
  } catch {
    return String(payload);
  }
}

export function mountEventLog(selector) {
  const root = $(selector);
  return new EventLogView(root);
}
