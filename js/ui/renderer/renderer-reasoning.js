/**
 * Reasoning Log Renderer
 * Handles reasoning iteration log and tool activity rendering
 */

import { Storage } from '../../storage/storage.js';
import { qs, encodeHTML } from '../../core/utils.js';
import { renderToolActivities } from './renderer-helpers.js';

/**
 * Render reasoning iteration log with tool activities
 */
export function renderReasoningLog() {
  const logEntries = Storage.loadReasoningLog();
  const toolActivity = Storage.loadToolActivityLog();
  const logEl = qs('#iterationLog');
  if (!logEl) return;

  if (logEntries.length === 0) {
    logEl.innerHTML = '<div class="log-placeholder">Intelligent reasoning iterations will appear here...</div>';
    return;
  }

  let html = '';
  logEntries.forEach((entry, i) => {
    const iterationNumber = i + 1;
    const isEven = iterationNumber % 2 === 0;

    // Render reasoning as markdown
    const reasoningHtml = window.marked ? marked.parse(entry) : encodeHTML(entry);

    // Get associated tool activities
    const iterationActivities = toolActivity.filter(act => act.iteration === iterationNumber);

    html += `
      <div class="reasoning-block ${isEven ? 'even' : 'odd'}">
        <div class="block-header">
          <span class="block-type">Iteration ${iterationNumber}</span>
        </div>
        <div class="markdown-body reasoning-content">${reasoningHtml}</div>
      </div>
    `;

    // Render tool activities
    iterationActivities.forEach(activity => {
      html += renderToolActivities(activity, i);
    });
  });

  logEl.innerHTML = html;
  logEl.scrollTop = logEl.scrollHeight;
}
