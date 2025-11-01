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
    const timestamp = new Date().toLocaleTimeString();

    // Render reasoning as markdown
    const reasoningHtml = window.marked ? marked.parse(entry) : encodeHTML(entry);

    // Get associated tool activities
    const iterationActivities = toolActivity.filter(act => act.iteration === iterationNumber);
    const hasActivities = iterationActivities.length > 0;

    html += `
      <div class="reasoning-iteration">
        <div class="iteration-header">
          <div class="iteration-badge">
            <span class="iteration-number">${iterationNumber}</span>
            <span class="iteration-label">ITERATION</span>
          </div>
          <div class="iteration-meta">
            <span class="iteration-time">${timestamp}</span>
            ${hasActivities ? `<span class="iteration-activities-count">${iterationActivities.length} ${iterationActivities.length === 1 ? 'activity' : 'activities'}</span>` : ''}
          </div>
        </div>

        <div class="iteration-content">
          <div class="reasoning-block">
            <div class="reasoning-header">
              <span class="reasoning-icon">💭</span>
              <span class="reasoning-title">Reasoning</span>
            </div>
            <div class="markdown-body reasoning-text">${reasoningHtml}</div>
          </div>

          ${hasActivities ? renderToolActivities(iterationActivities) : ''}
        </div>

        ${i < logEntries.length - 1 ? '<div class="iteration-connector"></div>' : ''}
      </div>
    `;
  });

  logEl.innerHTML = html;
  logEl.scrollTop = logEl.scrollHeight;
}
