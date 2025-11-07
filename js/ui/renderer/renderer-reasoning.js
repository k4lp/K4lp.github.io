/**
 * Reasoning Log Renderer
 * Handles reasoning iteration log and tool activity rendering
 */

import { Storage } from '../../storage/storage.js';
import { qs, encodeHTML } from '../../core/utils.js';
import { renderToolActivities } from './renderer-helpers.js';

const EXECUTION_BLOCK_REGEX = /(CODE|CONSOLE OUTPUT|RETURN VALUE|ERROR|STACK):\n([\s\S]*?)(?=(?:\n[A-Z ]{3,}:\n)|\n===|\n$)/g;

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

    // Clean up the entry text - remove iteration headers and session markers
    let cleanedEntry = entry
      .replace(/^=== ITERATION \d+ ===\n?/gm, '')
      .replace(/^=== SESSION START ===\n?/gm, '')
      .replace(/^=== SESSION COMPLETE ===\n?/gm, '')
      .replace(/^=== ITERATION \d+ ERROR ===\n?/gm, '')
      .replace(/^=== ITERATION \d+ OPERATION WARNINGS ===\n?/gm, '')
      .replace(/^=== SESSION TERMINATED ===\n?/gm, '')
      .trim();

    if (!cleanedEntry) return; // Skip empty entries

    const wordCount = cleanedEntry.split(/\s+/).length;
    const charCount = cleanedEntry.length;

    // Render reasoning as markdown
    const formattedEntry = applyExecutionBlockFormatting(cleanedEntry);
    const reasoningHtml = renderReasoningHtml(formattedEntry);

    // Get associated tool activities
    const iterationActivities = toolActivity.filter(act => act.iteration === iterationNumber);
    const hasActivities = iterationActivities.length > 0;

    html += `
      <div class="reasoning-block reasoning-type ${isEven ? 'even' : 'odd'}">
        <div class="block-header reasoning">
          <div class="header-left">
            <span class="iteration-badge">#${iterationNumber}</span>
            <span class="block-meta-compact">${wordCount} words · ${charCount} chars${hasActivities ? ` · ${iterationActivities.length} actions` : ''}</span>
          </div>
        </div>
        <div class="markdown-body reasoning-content">${reasoningHtml}</div>
      </div>
    `;

    // Render tool activities
    iterationActivities.forEach(activity => {
      html += renderToolActivities(activity, iterationNumber);
    });
  });

  logEl.innerHTML = html;
  logEl.scrollTop = logEl.scrollHeight;
}

function renderReasoningHtml(entry) {
  if (window.marked) {
    return marked.parse(entry);
  }
  return encodePreservingExecutionBlocks(entry);
}

function encodePreservingExecutionBlocks(entry) {
  const placeholders = [];
  let placeholderIndex = 0;
  const stripped = entry.replace(/<pre[^>]*>[\s\S]*?<\/pre>/g, (match) => {
    const token = `__PRE_BLOCK_${placeholderIndex}__`;
    placeholders.push({ token, html: match });
    placeholderIndex += 1;
    return token;
  });

  let encoded = encodeHTML(stripped).replace(/\n/g, '<br>');

  placeholders.forEach(({ token, html }) => {
    encoded = encoded.replace(token, html);
  });

  return encoded;
}

function applyExecutionBlockFormatting(entry) {
  if (!entry) return '';
  return entry.replace(EXECUTION_BLOCK_REGEX, (_, label, blockBody) => {
    const trimmed = blockBody.replace(/\s+$/, '');
    const encoded = encodeHTML(trimmed || '(empty)');
    const slug = label.toLowerCase().replace(/\s+/g, '-');
    return `${label}:\n<pre class="execution-block" data-section="${slug}">${encoded}</pre>`;
  });
}
