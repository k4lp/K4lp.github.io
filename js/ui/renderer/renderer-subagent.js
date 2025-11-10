import { Storage } from '../../storage/storage.js';

export function renderSubAgentStatus() {
  const pill = document.getElementById('subAgentStatusPill');
  const body = document.getElementById('subAgentStatusBody');
  if (!pill || !body) {
    return;
  }

  const settings = Storage.loadSubAgentSettings?.() || {};
  const lastResult = Storage.loadSubAgentLastResult?.();
  const history = Storage.loadSubAgentTraceHistory?.(1) || [];
  const latestTrace = history[0] || null;

  if (!settings.enableSubAgent) {
    pill.textContent = 'Disabled';
    pill.className = 'pill pill-muted';
    body.innerHTML = '<p class="field-hint">Enable the sub-agent toggle to fetch external knowledge automatically.</p>';
    return;
  }

  const agentLabel = latestTrace?.agentName || latestTrace?.agentId || lastResult?.agentName || lastResult?.agentId || settings.defaultAgent || 'Sub-agent';
  const timeLabel = latestTrace?.finishedAt
    ? new Date(latestTrace.finishedAt).toLocaleString()
    : lastResult?.timestamp
      ? new Date(lastResult.timestamp).toLocaleString()
      : 'Pending';

  if (!latestTrace && !lastResult?.content) {
    pill.textContent = 'IDLE';
    pill.className = 'pill pill-warning';
    body.innerHTML = [
      `<p class="status-meta">Agent: ${escapeHtml(agentLabel)} - Status: waiting for next run</p>`,
      '<p class="field-hint">Trigger the sub-agent via the button or the {{<subagent/>}} tool.</p>'
    ].join('');
    return;
  }

  const status = latestTrace?.status || (lastResult?.content ? 'ready' : 'idle');
  const statusClass = status === 'error'
    ? 'pill pill-danger'
    : status === 'cached'
      ? 'pill pill-info'
      : status === 'running'
        ? 'pill pill-warning'
        : 'pill pill-success';

  pill.textContent = status.toUpperCase();
  pill.className = statusClass;

  const snippetSource = latestTrace?.summary || lastResult?.content || 'No summary available yet.';
  const snippet = escapeHtml(snippetSource).split('\n').slice(0, 3).join('<br>');

  body.innerHTML = [
    `<p class="status-meta">Agent: ${escapeHtml(agentLabel)} - Updated: ${escapeHtml(timeLabel)}</p>`,
    `<div class="status-content">${snippet}</div>`
  ].join('');
}

export function renderSubAgentPanel() {
  const container = document.getElementById('subAgentTraceBody');
  if (!container) {
    return;
  }

  const history = Storage.loadSubAgentTraceHistory?.(5) || [];
  if (history.length === 0) {
    container.innerHTML = '<p class="field-hint">No sub-agent activity yet. Run a research query to populate this console.</p>';
    return;
  }

  container.innerHTML = history
    .map((trace, index) => renderTraceEntry(trace, index))
    .join('\n');
}

function renderTraceEntry(trace, index) {
  const parts = [];
  parts.push(`<div class="subagent-trace-entry">
    <header class="subagent-entry-header">
      <span class="entry-title">Invocation #${index + 1}</span>
      <span class="pill ${trace.status === 'error' ? 'pill-danger' : trace.status === 'cached' ? 'pill-info' : 'pill-success'}">${escapeHtml(capitalize(trace.status || 'unknown'))}</span>
    </header>`);
  parts.push(renderSummary(trace));
  parts.push(renderTools(trace));
  parts.push(renderPrompt(trace));
  parts.push('</div>');
  return parts.join('\n');
}

function renderSummary(trace) {
  const rows = [
    ['Status', capitalize(trace.status || 'unknown')],
    ['Agent', trace.agentName || trace.agentId || 'N/A'],
    ['Query', trace.query || 'N/A'],
    ['Started', trace.startedAt ? new Date(trace.startedAt).toLocaleString() : 'N/A'],
    ['Finished', trace.finishedAt ? new Date(trace.finishedAt).toLocaleString() : '—'],
    ['Error', trace.error || '—']
  ];

  return `
    <section class="subagent-section">
      <h3>Invocation Summary</h3>
      <dl class="subagent-meta">
        ${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(String(value))}</dd></div>`).join('')}
      </dl>
    </section>
  `;
}

function renderTools(trace) {
  const tools = trace.toolResults || [];
  if (tools.length === 0) {
    return `
      <section class="subagent-section">
        <h3>Tool Output</h3>
        <p class="field-hint">No tool activity recorded.</p>
      </section>
    `;
  }

  const rendered = tools.map((tool, index) => {
    if (tool.error) {
      return `
        <div class="subagent-tool">
          <header>
            <strong>${escapeHtml(tool.name || tool.id || `Tool ${index + 1}`)}</strong>
            <span class="pill pill-warning">Error</span>
          </header>
          <pre class="subagent-tool-log">${escapeHtml(tool.error)}</pre>
        </div>
      `;
    }

    const payload = Array.isArray(tool.items)
      ? tool.items.map(renderToolItem).join('')
      : `<pre class="subagent-tool-log">${escapeHtml(JSON.stringify(tool.items, null, 2))}</pre>`;

    return `
      <div class="subagent-tool">
        <header>
          <strong>${escapeHtml(tool.name || tool.id || `Tool ${index + 1}`)}</strong>
          <span class="pill pill-success">Success</span>
        </header>
        ${payload}
      </div>
    `;
  });

  return `
    <section class="subagent-section">
      <h3>Tool Output</h3>
      ${rendered.join('')}
    </section>
  `;
}

function renderPrompt(trace) {
  if (!trace.prompt) {
    return '';
  }

  return `
    <section class="subagent-section">
      <h3>Gemini Prompt Context</h3>
      <pre class="subagent-prompt">${escapeHtml(trace.prompt)}</pre>
    </section>
  `;
}

function renderToolItem(item) {
  if (typeof item === 'string') {
    return `<pre class="subagent-tool-log">${escapeHtml(item)}</pre>`;
  }

  if (item && typeof item === 'object') {
    const title = item.title || item.label || 'Result';
    const url = item.url ? `<a href="${escapeAttribute(item.url)}" target="_blank">${escapeHtml(item.url)}</a>` : '';
    const summary = item.summary || item.snippet || item.extract || JSON.stringify(item, null, 2);
    return `
      <div class="subagent-tool-item">
        <p class="tool-item-title">${escapeHtml(title)}</p>
        ${url ? `<p class="tool-item-link">${url}</p>` : ''}
        <pre class="subagent-tool-log">${escapeHtml(summary)}</pre>
      </div>
    `;
  }

  return `<pre class="subagent-tool-log">${escapeHtml(String(item))}</pre>`;
}

function escapeHtml(input = '') {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(input = '') {
  return escapeHtml(input).replace(/"/g, '&quot;');
}

function capitalize(text = '') {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default {
  renderSubAgentStatus,
  renderSubAgentPanel
};
