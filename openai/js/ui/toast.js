/** @module ui/toast */
import { el } from '../utils/dom.js';
import { bus } from '../core/event-bus.js';
import { EVENTS } from '../config/constants.js';

export function initToast(root = document.body) {
  let host = root.querySelector('.toast-host');
  if (!host) {
    host = el('div', { className: 'toast-host', 'aria-live': 'polite' });
    root.appendChild(host);
  }

  function show(message, level = 'info', ms = 3200) {
    const node = el('div', { className: `toast toast-${level}`, text: message });
    host.appendChild(node);
    requestAnimationFrame(() => node.classList.add('show'));
    setTimeout(() => {
      node.classList.remove('show');
      setTimeout(() => node.remove(), 250);
    }, ms);
  }

  bus.on(EVENTS.TOAST, (evt) => {
    const { message, level } = evt.payload || {};
    if (message) show(message, level || 'info');
  });

  return { show };
}
