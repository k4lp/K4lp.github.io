/**
 * Live network / API health badge.
 * @module ui/network-status
 */

import { $, el } from '../utils/dom.js';
import { bus } from '../core/event-bus.js';
import { EVENTS, NET_STATE } from '../config/constants.js';
import { formatDuration, formatTime } from '../utils/time.js';

const LABELS = {
  [NET_STATE.UNKNOWN]: 'Unknown',
  [NET_STATE.ONLINE]: 'API OK',
  [NET_STATE.DEGRADED]: 'Network issue',
  [NET_STATE.OFFLINE]: 'Offline',
  [NET_STATE.API_DOWN]: 'API down',
  [NET_STATE.AUTH_FAIL]: 'Auth fail',
  [NET_STATE.RATE_LIMITED]: 'Rate limited',
  [NET_STATE.PROBING]: 'Probing…',
};

export function initNetworkStatus(selector, { onProbe } = {}) {
  const root = $(selector);
  if (!root) return null;

  const dot = el('span', { className: 'net-dot' });
  const label = el('span', { className: 'net-label', text: 'Network' });
  const detail = el('span', { className: 'net-detail muted', text: '—' });
  const btn = el('button', {
    type: 'button',
    className: 'btn btn-xs',
    text: 'Probe',
    title: 'Probe OpenAI /models',
    onClick: () => onProbe?.(),
  });

  root.append(dot, label, detail, btn);
  root.dataset.state = NET_STATE.UNKNOWN;

  function paint(snap) {
    const state = snap.state || NET_STATE.UNKNOWN;
    root.dataset.state = state;
    label.textContent = LABELS[state] || state;
    const bits = [];
    if (snap.lastLatencyMs != null) bits.push(formatDuration(snap.lastLatencyMs));
    if (snap.lastProbe) bits.push(formatTime(snap.lastProbe));
    if (snap.lastError) bits.push(String(snap.lastError).slice(0, 60));
    if (snap.message && snap.message !== snap.lastError) {
      bits.push(String(snap.message).slice(0, 40));
    }
    detail.textContent = bits.filter(Boolean).join(' · ') || '—';
    detail.title = snap.lastError || snap.message || '';
  }

  bus.on(EVENTS.NET_STATUS, (e) => paint(e.payload || {}));

  return { paint };
}
