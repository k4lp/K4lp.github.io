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
    // Render reasoning as markdown, just like final output
    const reasoningHtml = window.marked ? marked.parse(entry) : encodeHTML(entry);
    html += `
      <div class="li reasoning-entry">
        <div>
          <div class="mono">#${i + 1}</div>
          <div class="markdown-body reasoning-text">${reasoningHtml}</div>
        </div>
      </div>
    `;

    // Render associated tool activities
    const iterationActivities = toolActivity.filter(act => act.iteration === i + 1);
    if (iterationActivities.length > 0) {
      html += renderToolActivities(iterationActivities);
    }
  });

  logEl.innerHTML = html;
  logEl.scrollTop = logEl.scrollHeight;
}
