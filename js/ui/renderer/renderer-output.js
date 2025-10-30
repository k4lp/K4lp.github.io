/**
 * Final Output Renderer
 * Handles final research output and status rendering
 */

import { Storage } from '../../storage/storage.js';
import { qs } from '../../core/utils.js';

/**
 * Render final research output and status
 */
export function renderFinalOutput() {
  const output = Storage.loadFinalOutput();
  const finalEl = qs('#finalOutput');
  const statusEl = qs('#finalStatus');

  if (finalEl) {
    finalEl.innerHTML = (!output.html || output.html.includes('goal validation')) ?
      '<div class="output-placeholder"><p>Comprehensive research report will render here after intelligent analysis and goal completion.</p></div>' :
      output.html;
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
