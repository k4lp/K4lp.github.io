/**
 * Final Output Renderer - SIMPLE VERSION
 */

import { Storage } from '../../storage/storage.js';
import { qs } from '../../core/utils.js';

export function renderFinalOutput() {
  const output = Storage.loadFinalOutput();
  const finalEl = qs('#finalOutput');
  const statusEl = qs('#finalStatus');

  if (finalEl) {
    if (!output.html || output.html.includes('goal validation')) {
      finalEl.innerHTML = '<div class="output-placeholder"><p>Report will render here...</p></div>';
    } else {
      // Just render as markdown, period.
      const html = window.marked ? marked.parse(output.html) : output.html;
      finalEl.innerHTML = `<div class="markdown-body">${html}</div>`;
    }
  }

  if (statusEl) {
    if (output.verified && output.source === 'llm') {
      statusEl.textContent = '✅ verified';
      statusEl.style.background = 'var(--success)';
      statusEl.style.color = 'white';
    } else if (output.source === 'auto') {
      statusEl.textContent = '⚠️ unverified';
      statusEl.style.background = 'var(--warning)';
      statusEl.style.color = 'white';
    } else {
      statusEl.textContent = 'analyzing';
      statusEl.style.background = '';
      statusEl.style.color = '';
    }
  }
}
