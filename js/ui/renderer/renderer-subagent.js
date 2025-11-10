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
  const runtime = Storage.loadSubAgentRuntimeState?.() || { status: 'idle' };

  if (!settings.enableSubAgent) {
    pill.textContent = 'Disabled';
    pill.className = 'pill pill-muted';
    body.innerHTML = '<p class="field-hint">External knowledge is disabled. Enable the toggle to allow the main loop to auto-delegate web lookups.</p>';
    return;
  }

  const agentLabel = latestTrace?.agentName || latestTrace?.agentId || lastResult?.agentName || lastResult?.agentId || settings.defaultAgent || 'Sub-agent';
  const timeLabel = latestTrace?.finishedAt
    ? new Date(latestTrace.finishedAt).toLocaleString()
    : lastResult?.timestamp
      ? new Date(lastResult.timestamp).toLocaleString()
      : 'Pending';
  const intentLabel = runtime.intent || latestTrace?.intent || '';

  if (runtime.status === 'running') {
    pill.textContent = 'RUNNING';
    pill.className = 'pill pill-warning';
    body.innerHTML = [
      `<p class="status-meta">Main loop paused while <strong>${escapeHtml(agentLabel)}</strong> resolves:</p>`,
      `<div class="status-content">"${escapeHtml(intentLabel || runtime.query || 'Loading fresh evidence')}"</div>`,
      '<p class="field-hint">This sub-agent call was issued automatically from the reasoning loop; it will release once tool evidence is captured.</p>'
    ].join('');
    return;
  }

  if (!latestTrace && !lastResult?.content) {
    pill.textContent = 'IDLE';
    pill.className = 'pill pill-warning';
    body.innerHTML = [
      `<p class="status-meta">Agent: ${escapeHtml(agentLabel)} - awaiting the first delegated lookup.</p>`,
      '<p class="field-hint">Include {{<subagent .../>}} operations inside reasoning blocks to pull live web evidence.</p>'
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
    `<p class="status-meta">Agent: ${escapeHtml(agentLabel)} • Updated: ${escapeHtml(timeLabel)}</p>`,
    intentLabel ? `<p class="status-meta">Intent: ${escapeHtml(intentLabel)}</p>` : '',
    `<div class="status-content">${snippet}</div>`,
    '<p class="field-hint">Sub-agents run in isolation and share their findings here for the main thread to reuse.</p>'
  ].join('');
}

export function renderSubAgentPanel() {
  const container = document.getElementById('subAgentTraceBody');
  if (!container) {
    return;
  }

  const history = Storage.loadSubAgentTraceHistory?.(5) || [];
  if (history.length === 0) {
    container.innerHTML = '<p class="field-hint">No sub-agent delegations yet. Use {{<subagent .../>}} inside reasoning blocks to pull live web context.</p>';
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
    ['Intent', trace.intent || 'N/A'],
    ['Scope', trace.scope || 'micro'],
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

    if (!Array.isArray(tool.items) || tool.items.length === 0) {
      return `
        <div class="subagent-tool">
          <header>
            <strong>${escapeHtml(tool.name || tool.id || `Tool ${index + 1}`)}</strong>
            <span class="pill pill-neutral">No data</span>
          </header>
          <p class="field-hint">Tool completed but did not return rows.</p>
        </div>
      `;
    }

    const payload = tool.items.map(renderToolItem).join('');
    const timestamp = tool.retrievedAt ? new Date(tool.retrievedAt).toLocaleString() : '';

    return `
      <div class="subagent-tool">
        <header>
          <strong>${escapeHtml(tool.name || tool.id || `Tool ${index + 1}`)}</strong>
          <span class="pill pill-success">Success</span>
        </header>
        ${timestamp ? `<p class="tool-meta">Captured: ${escapeHtml(timestamp)}</p>` : ''}
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
    const source = item.source ? `<span class="tool-item-source">${escapeHtml(item.source)}</span>` : '';
    const retrieved = item.retrievedAt
      ? `<span class="tool-item-source">${escapeHtml(new Date(item.retrievedAt).toLocaleString())}</span>`
      : '';
    return `
      <div class="subagent-tool-item">
        <p class="tool-item-title">${escapeHtml(title)}</p>
        ${(source || retrieved) ? `<p class="tool-item-meta">${source}${source && retrieved ? ' • ' : ''}${retrieved}</p>` : ''}
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
