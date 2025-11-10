/**
 * Sub-Agent UI Module
 *
 * Comprehensive UI for sub-agent execution visualization:
 * - Real-time execution status
 * - Iteration tracking with progress
 * - Code execution details
 * - Complete state and data structure visualization
 * - Reasoning log display
 * - Execution history
 *
 * Listens to sub-agent events and updates UI dynamically.
 */

import { eventBus, Events } from '../core/event-bus.js';
import { Storage } from '../storage/storage.js';

export class SubAgentUI {
  constructor() {
    this.currentExecution = null;
    this.iterationLog = [];
    this.executionLog = [];
    this.isVisible = false;

    this._initializeUI();
    this._bindEvents();
    this._loadInitialState();
  }

  /**
   * Initialize UI elements
   * @private
   */
  _initializeUI() {
    // Check if container already exists
    if (document.getElementById('subAgentPanel')) {
      return;
    }

    // Create main panel
    const panel = document.createElement('div');
    panel.id = 'subAgentPanel';
    panel.className = 'subagent-panel hidden';
    panel.innerHTML = `
      <div class="subagent-header">
        <h3>🤖 Sub-Agent Execution Monitor</h3>
        <button id="subagentToggle" class="subagent-toggle" title="Toggle Sub-Agent Panel">−</button>
        <button id="subagentClear" class="subagent-clear" title="Clear Current Result">🗑️</button>
      </div>

      <div class="subagent-body">
        <!-- Status Section -->
        <div class="subagent-section status-section">
          <h4>Status</h4>
          <div id="subagentStatus" class="status-display">
            <div class="status-badge">IDLE</div>
            <div class="status-details">Waiting for sub-agent invocation...</div>
          </div>
        </div>

        <!-- Current Execution Section -->
        <div class="subagent-section execution-section">
          <h4>Current Execution</h4>
          <div id="subagentExecution" class="execution-display">
            <div class="execution-info">
              <div class="info-row">
                <span class="info-label">Agent:</span>
                <span id="execAgent" class="info-value">—</span>
              </div>
              <div class="info-row">
                <span class="info-label">Query:</span>
                <span id="execQuery" class="info-value">—</span>
              </div>
              <div class="info-row">
                <span class="info-label">Model:</span>
                <span id="execModel" class="info-value">—</span>
              </div>
              <div class="info-row">
                <span class="info-label">Iteration:</span>
                <span id="execIteration" class="info-value">—</span>
              </div>
              <div class="info-row">
                <span class="info-label">Time:</span>
                <span id="execTime" class="info-value">—</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Iteration Log Section -->
        <div class="subagent-section iteration-section">
          <h4>Iteration Log <span id="iterationCount" class="count-badge">0</span></h4>
          <div id="iterationLog" class="iteration-log">
            <div class="log-placeholder">Iteration details will appear here during execution...</div>
          </div>
        </div>

        <!-- Code Execution Section -->
        <div class="subagent-section code-section">
          <h4>Code Executions <span id="codeExecCount" class="count-badge">0</span></h4>
          <div id="codeExecutions" class="code-executions">
            <div class="log-placeholder">Code execution details will appear here...</div>
          </div>
        </div>

        <!-- Result Section -->
        <div class="subagent-section result-section">
          <h4>Final Result</h4>
          <div id="subagentResult" class="result-display">
            <div class="log-placeholder">Final result will appear here after completion...</div>
          </div>
        </div>

        <!-- State Visualization Section -->
        <div class="subagent-section state-section collapsible">
          <h4>
            <button class="section-toggle" data-target="stateVisualization">▼</button>
            State & Data Structures
          </h4>
          <div id="stateVisualization" class="state-visualization">
            <pre id="stateData" class="state-data">No state data available</pre>
          </div>
        </div>

        <!-- Execution History Section -->
        <div class="subagent-section history-section collapsible">
          <h4>
            <button class="section-toggle" data-target="executionHistory">▼</button>
            Execution History <span id="historyCount" class="count-badge">0</span>
          </h4>
          <div id="executionHistory" class="execution-history collapsed">
            <div class="log-placeholder">No execution history yet...</div>
          </div>
        </div>
      </div>
    `;

    // Add styles
    this._addStyles();

    // Insert panel into page (after reasoning log section if it exists)
    const reasoningSection = document.getElementById('reasoningLogSection');
    if (reasoningSection && reasoningSection.parentNode) {
      reasoningSection.parentNode.insertBefore(panel, reasoningSection.nextSibling);
    } else {
      // Fallback: append to main or body
      const main = document.querySelector('main') || document.body;
      main.appendChild(panel);
    }

    // Bind UI interactions
    this._bindUIInteractions();
  }

  /**
   * Add CSS styles for sub-agent UI
   * @private
   */
  _addStyles() {
    if (document.getElementById('subagent-ui-styles')) {
      return; // Styles already added
    }

    const style = document.createElement('style');
    style.id = 'subagent-ui-styles';
    style.textContent = `
      .subagent-panel {
        margin: 20px 0;
        border: 2px solid #3b82f6;
        border-radius: 8px;
        background: #1e293b;
        overflow: hidden;
        transition: all 0.3s ease;
      }

      .subagent-panel.hidden {
        display: none;
      }

      .subagent-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
      }

      .subagent-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .subagent-toggle, .subagent-clear {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        margin-left: 8px;
        transition: background 0.2s;
      }

      .subagent-toggle:hover, .subagent-clear:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .subagent-body {
        padding: 16px;
      }

      .subagent-section {
        margin-bottom: 16px;
        padding: 12px;
        background: #0f172a;
        border-radius: 6px;
        border-left: 3px solid #3b82f6;
      }

      .subagent-section h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 600;
        color: #60a5fa;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .count-badge {
        display: inline-block;
        background: #3b82f6;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
      }

      .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 8px;
      }

      .status-badge.idle {
        background: #475569;
        color: #cbd5e1;
      }

      .status-badge.running {
        background: #fbbf24;
        color: #1e293b;
        animation: pulse 2s ease-in-out infinite;
      }

      .status-badge.success {
        background: #10b981;
        color: white;
      }

      .status-badge.error {
        background: #ef4444;
        color: white;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      .status-details {
        font-size: 13px;
        color: #94a3b8;
      }

      .execution-info {
        font-size: 13px;
      }

      .info-row {
        display: flex;
        margin-bottom: 6px;
        gap: 8px;
      }

      .info-label {
        font-weight: 600;
        color: #60a5fa;
        min-width: 80px;
      }

      .info-value {
        color: #e2e8f0;
        flex: 1;
        word-break: break-word;
      }

      .iteration-log, .code-executions, .result-display, .execution-history {
        max-height: 400px;
        overflow-y: auto;
        font-size: 12px;
      }

      .iteration-entry {
        padding: 8px;
        margin-bottom: 8px;
        background: #1e293b;
        border-radius: 4px;
        border-left: 3px solid #60a5fa;
      }

      .iteration-entry .iter-header {
        font-weight: 600;
        color: #60a5fa;
        margin-bottom: 4px;
      }

      .iteration-entry .iter-time {
        font-size: 11px;
        color: #94a3b8;
      }

      .code-exec-entry {
        padding: 8px;
        margin-bottom: 8px;
        background: #1e293b;
        border-radius: 4px;
      }

      .code-exec-entry.success {
        border-left: 3px solid #10b981;
      }

      .code-exec-entry.error {
        border-left: 3px solid #ef4444;
      }

      .code-exec-entry .exec-header {
        font-weight: 600;
        margin-bottom: 6px;
      }

      .code-exec-entry pre {
        background: #0f172a;
        padding: 8px;
        border-radius: 3px;
        overflow-x: auto;
        font-size: 11px;
        margin: 4px 0;
      }

      .result-display {
        padding: 12px;
        background: #0f172a;
        border-radius: 4px;
        font-size: 13px;
        line-height: 1.6;
      }

      .result-display.success {
        border-left: 3px solid #10b981;
      }

      .result-display.error {
        border-left: 3px solid #ef4444;
      }

      .state-visualization {
        max-height: 500px;
        overflow: auto;
      }

      .state-data {
        background: #0f172a;
        padding: 12px;
        border-radius: 4px;
        font-size: 11px;
        overflow-x: auto;
        margin: 0;
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      .log-placeholder {
        color: #64748b;
        font-style: italic;
        padding: 12px;
        text-align: center;
      }

      .section-toggle {
        background: none;
        border: none;
        color: #60a5fa;
        cursor: pointer;
        font-size: 12px;
        padding: 0;
        margin: 0;
        transition: transform 0.2s;
      }

      .section-toggle.collapsed {
        transform: rotate(-90deg);
      }

      .collapsible .state-visualization.collapsed,
      .collapsible .execution-history.collapsed {
        display: none;
      }

      .history-entry {
        padding: 10px;
        margin-bottom: 8px;
        background: #1e293b;
        border-radius: 4px;
        font-size: 12px;
      }

      .history-entry .history-header {
        font-weight: 600;
        color: #60a5fa;
        margin-bottom: 6px;
      }

      .history-entry .history-meta {
        font-size: 11px;
        color: #94a3b8;
        margin-bottom: 4px;
      }

      .history-entry .history-result {
        padding: 8px;
        background: #0f172a;
        border-radius: 3px;
        margin-top: 6px;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Bind UI interactions
   * @private
   */
  _bindUIInteractions() {
    // Toggle panel visibility
    const toggleBtn = document.getElementById('subagentToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const body = document.querySelector('.subagent-body');
        if (body) {
          const isCollapsed = body.style.display === 'none';
          body.style.display = isCollapsed ? 'block' : 'none';
          toggleBtn.textContent = isCollapsed ? '−' : '+';
        }
      });
    }

    // Clear current result
    const clearBtn = document.getElementById('subagentClear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear current sub-agent result?')) {
          Storage.clearSubAgentResult();
          this._resetUI();
        }
      });
    }

    // Section toggles
    document.querySelectorAll('.section-toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const targetId = toggle.dataset.target;
        const target = document.getElementById(targetId);
        if (target) {
          target.classList.toggle('collapsed');
          toggle.classList.toggle('collapsed');
        }
      });
    });
  }

  /**
   * Bind event listeners
   * @private
   */
  _bindEvents() {
    eventBus.on(Events.SUBAGENT_START, (data) => this._handleStart(data));
    eventBus.on(Events.SUBAGENT_ITERATION, (data) => this._handleIteration(data));
    eventBus.on(Events.SUBAGENT_EXECUTION, (data) => this._handleExecution(data));
    eventBus.on(Events.SUBAGENT_COMPLETE, (data) => this._handleComplete(data));
    eventBus.on(Events.SUBAGENT_ERROR, (data) => this._handleError(data));
    eventBus.on(Events.SUBAGENT_RESULT_CLEARED, () => this._resetUI());
    eventBus.on(Events.SUBAGENT_ENABLED_CHANGED, (enabled) => this._handleEnabledChanged(enabled));
  }

  /**
   * Load initial state
   * @private
   */
  _loadInitialState() {
    // Load sub-agent enabled state
    const isEnabled = Storage.loadSubAgentEnabled();
    if (!isEnabled) {
      // Keep panel hidden if sub-agent is disabled
      return;
    }

    // Show panel if enabled
    this.show();

    // Load existing result if any
    const result = Storage.loadSubAgentResult();
    if (result) {
      this._displayResult(result);
    }

    // Load execution history
    this._refreshHistory();
  }

  /**
   * Handle sub-agent start event
   * @private
   */
  _handleStart(data) {
    console.log('[SubAgentUI] Start event:', data);

    this.show();
    this.currentExecution = {
      startTime: Date.now(),
      ...data
    };
    this.iterationLog = [];
    this.executionLog = [];

    // Update status
    this._updateStatus('RUNNING', `Executing ${data.agentName} sub-agent...`);

    // Update execution info
    this._updateExecutionInfo(data);

    // Clear previous logs
    this._clearLogs();
  }

  /**
   * Handle iteration event
   * @private
   */
  _handleIteration(data) {
    console.log('[SubAgentUI] Iteration event:', data);

    this.iterationLog.push(data);

    // Update iteration counter
    const iterCountEl = document.getElementById('iterationCount');
    if (iterCountEl) {
      iterCountEl.textContent = this.iterationLog.length;
    }

    // Update current iteration
    const execIterEl = document.getElementById('execIteration');
    if (execIterEl) {
      execIterEl.textContent = `${data.iteration} / ${data.maxIterations}`;
    }

    // Add iteration entry to log
    this._addIterationEntry(data);

    // Update elapsed time
    this._updateElapsedTime();
  }

  /**
   * Handle code execution event
   * @private
   */
  _handleExecution(data) {
    console.log('[SubAgentUI] Execution event:', data);

    this.executionLog.push(data);

    // Update execution counter
    const codeCountEl = document.getElementById('codeExecCount');
    if (codeCountEl) {
      codeCountEl.textContent = this.executionLog.length;
    }

    // Add execution entry to log
    this._addExecutionEntry(data);

    // Update state visualization
    this._updateStateVisualization();
  }

  /**
   * Handle completion event
   * @private
   */
  _handleComplete(data) {
    console.log('[SubAgentUI] Complete event:', data);

    // Update status
    this._updateStatus('SUCCESS', `Completed in ${data.iterations} iteration(s)`);

    // Display final result
    this._displayResult(data);

    // Update state visualization
    this._updateStateVisualization();

    // Refresh history
    this._refreshHistory();

    // Clear current execution
    this.currentExecution = null;
  }

  /**
   * Handle error event
   * @private
   */
  _handleError(data) {
    console.log('[SubAgentUI] Error event:', data);

    // Update status
    this._updateStatus('ERROR', `Error: ${data.error}`);

    // Display error
    const resultEl = document.getElementById('subagentResult');
    if (resultEl) {
      resultEl.className = 'result-display error';
      resultEl.innerHTML = `
        <div style="color: #ef4444; font-weight: 600; margin-bottom: 8px;">❌ Execution Error</div>
        <div style="margin-bottom: 8px;">${this._escapeHtml(data.error)}</div>
        ${data.stack ? `<pre style="font-size: 10px; overflow-x: auto;">${this._escapeHtml(data.stack)}</pre>` : ''}
      `;
    }

    // Refresh history
    this._refreshHistory();

    // Clear current execution
    this.currentExecution = null;
  }

  /**
   * Handle enabled state change
   * @private
   */
  _handleEnabledChanged(enabled) {
    if (enabled) {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Update status display
   * @private
   */
  _updateStatus(status, details) {
    const statusEl = document.getElementById('subagentStatus');
    if (!statusEl) return;

    const badgeClass = status.toLowerCase();
    statusEl.innerHTML = `
      <div class="status-badge ${badgeClass}">${status}</div>
      <div class="status-details">${this._escapeHtml(details)}</div>
    `;
  }

  /**
   * Update execution info
   * @private
   */
  _updateExecutionInfo(data) {
    const setEl = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setEl('execAgent', data.agentName || data.agentId || '—');
    setEl('execQuery', data.query || '—');
    setEl('execModel', data.modelId || '—');
    setEl('execIteration', '0 / ' + (data.maxIterations || '?'));
    setEl('execTime', '0s');
  }

  /**
   * Update elapsed time
   * @private
   */
  _updateElapsedTime() {
    if (!this.currentExecution || !this.currentExecution.startTime) return;

    const elapsed = Date.now() - this.currentExecution.startTime;
    const seconds = Math.floor(elapsed / 1000);

    const timeEl = document.getElementById('execTime');
    if (timeEl) {
      timeEl.textContent = seconds + 's';
    }
  }

  /**
   * Add iteration entry to log
   * @private
   */
  _addIterationEntry(data) {
    const logEl = document.getElementById('iterationLog');
    if (!logEl) return;

    // Remove placeholder if it exists
    const placeholder = logEl.querySelector('.log-placeholder');
    if (placeholder) {
      placeholder.remove();
    }

    const entry = document.createElement('div');
    entry.className = 'iteration-entry';
    entry.innerHTML = `
      <div class="iter-header">Iteration ${data.iteration} / ${data.maxIterations}</div>
      <div class="iter-time">${new Date(data.timestamp).toLocaleTimeString()}</div>
    `;

    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
  }

  /**
   * Add execution entry to log
   * @private
   */
  _addExecutionEntry(data) {
    const logEl = document.getElementById('codeExecutions');
    if (!logEl) return;

    // Remove placeholder if it exists
    const placeholder = logEl.querySelector('.log-placeholder');
    if (placeholder) {
      placeholder.remove();
    }

    const statusClass = data.result.success ? 'success' : 'error';
    const statusIcon = data.result.success ? '✅' : '❌';

    const entry = document.createElement('div');
    entry.className = `code-exec-entry ${statusClass}`;
    entry.innerHTML = `
      <div class="exec-header">${statusIcon} Block #${data.blockNumber} (Iteration ${data.iteration})</div>
      <div style="color: #94a3b8; font-size: 11px; margin-bottom: 6px;">
        Time: ${data.executionTime}ms
      </div>
      <details>
        <summary style="cursor: pointer; color: #60a5fa; margin-bottom: 4px;">View Code</summary>
        <pre>${this._escapeHtml(data.code)}</pre>
      </details>
      ${data.result.consoleOutput ? `
        <details>
          <summary style="cursor: pointer; color: #60a5fa; margin-top: 6px;">Console Output</summary>
          <pre>${this._escapeHtml(data.result.consoleOutput)}</pre>
        </details>
      ` : ''}
      ${data.result.result !== undefined ? `
        <details>
          <summary style="cursor: pointer; color: #60a5fa; margin-top: 6px;">Return Value</summary>
          <pre>${this._escapeHtml(JSON.stringify(data.result.result, null, 2))}</pre>
        </details>
      ` : ''}
      ${data.result.error ? `
        <div style="color: #ef4444; margin-top: 6px;">
          <strong>Error:</strong> ${this._escapeHtml(data.result.error.message)}
        </div>
      ` : ''}
    `;

    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
  }

  /**
   * Display final result
   * @private
   */
  _displayResult(result) {
    const resultEl = document.getElementById('subagentResult');
    if (!resultEl) return;

    const statusClass = result.success ? 'success' : 'error';
    const statusIcon = result.success ? '✅' : '❌';

    resultEl.className = `result-display ${statusClass}`;
    resultEl.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 12px;">${statusIcon} ${result.source}</div>
      <div style="margin-bottom: 8px;">
        <strong>Query:</strong> ${this._escapeHtml(result.query || 'N/A')}
      </div>
      <div style="margin-bottom: 12px;">
        <strong>Iterations:</strong> ${result.iterations} |
        <strong>Time:</strong> ${result.executionTime}ms |
        <strong>Format:</strong> ${result.format}
      </div>
      <div style="background: #0f172a; padding: 12px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word;">
        ${this._formatMarkdown(result.content)}
      </div>
      ${result.error ? `
        <div style="color: #ef4444; margin-top: 12px; padding: 8px; background: rgba(239, 68, 68, 0.1); border-radius: 4px;">
          <strong>Error:</strong> ${this._escapeHtml(result.error)}
        </div>
      ` : ''}
    `;
  }

  /**
   * Update state visualization
   * @private
   */
  _updateStateVisualization() {
    const stateEl = document.getElementById('stateData');
    if (!stateEl) return;

    const stateData = {
      currentExecution: this.currentExecution,
      iterationLog: this.iterationLog,
      executionLog: this.executionLog.map(e => ({
        iteration: e.iteration,
        blockNumber: e.blockNumber,
        success: e.result.success,
        executionTime: e.executionTime,
        hasOutput: !!e.result.consoleOutput,
        hasResult: e.result.result !== undefined,
        error: e.result.error ? e.result.error.message : null
      })),
      storage: {
        result: Storage.loadSubAgentResult(),
        enabled: Storage.loadSubAgentEnabled(),
        historyCount: Storage.loadSubAgentHistory().length
      },
      timestamp: new Date().toISOString()
    };

    stateEl.textContent = JSON.stringify(stateData, null, 2);
  }

  /**
   * Refresh execution history
   * @private
   */
  _refreshHistory() {
    const historyEl = document.getElementById('executionHistory');
    if (!historyEl) return;

    const history = Storage.loadSubAgentHistory();

    // Update count
    const countEl = document.getElementById('historyCount');
    if (countEl) {
      countEl.textContent = history.length;
    }

    // Clear current content
    historyEl.innerHTML = '';

    if (history.length === 0) {
      historyEl.innerHTML = '<div class="log-placeholder">No execution history yet...</div>';
      return;
    }

    // Display history entries (newest first)
    history.reverse().forEach((entry, index) => {
      const histEntry = document.createElement('div');
      histEntry.className = 'history-entry';

      const result = entry.result || {};
      const statusIcon = result.success ? '✅' : '❌';
      const timeAgo = this._timeAgo(entry.timestamp);

      histEntry.innerHTML = `
        <div class="history-header">${statusIcon} ${entry.agentName || entry.agentId}</div>
        <div class="history-meta">
          ${timeAgo} | Iterations: ${result.iterations || 0} | Time: ${result.executionTime || 0}ms
        </div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
          Query: ${this._escapeHtml(entry.query || 'N/A')}
        </div>
        <details style="margin-top: 6px;">
          <summary style="cursor: pointer; color: #60a5fa; font-size: 11px;">View Result</summary>
          <div class="history-result">
            ${this._formatMarkdown(result.content || 'No content')}
          </div>
        </details>
      `;

      historyEl.appendChild(histEntry);
    });
  }

  /**
   * Clear all logs
   * @private
   */
  _clearLogs() {
    const clearEl = (id, placeholder) => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = `<div class="log-placeholder">${placeholder}</div>`;
      }
    };

    clearEl('iterationLog', 'Iteration details will appear here during execution...');
    clearEl('codeExecutions', 'Code execution details will appear here...');
    clearEl('subagentResult', 'Final result will appear here after completion...');

    // Reset counters
    const setCount = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setCount('iterationCount', '0');
    setCount('codeExecCount', '0');
  }

  /**
   * Reset UI to initial state
   * @private
   */
  _resetUI() {
    this.currentExecution = null;
    this.iterationLog = [];
    this.executionLog = [];

    this._updateStatus('IDLE', 'Waiting for sub-agent invocation...');
    this._clearLogs();

    // Reset execution info
    const resetInfo = (id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    };

    resetInfo('execAgent');
    resetInfo('execQuery');
    resetInfo('execModel');
    resetInfo('execIteration');
    resetInfo('execTime');

    // Update state visualization
    this._updateStateVisualization();

    // Refresh history
    this._refreshHistory();
  }

  /**
   * Show panel
   */
  show() {
    const panel = document.getElementById('subAgentPanel');
    if (panel) {
      panel.classList.remove('hidden');
      this.isVisible = true;
    }
  }

  /**
   * Hide panel
   */
  hide() {
    const panel = document.getElementById('subAgentPanel');
    if (panel) {
      panel.classList.add('hidden');
      this.isVisible = false;
    }
  }

  /**
   * Toggle panel visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Format markdown (basic)
   * @private
   */
  _formatMarkdown(text) {
    if (!text) return '';

    return this._escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  /**
   * Escape HTML
   * @private
   */
  _escapeHtml(text) {
    if (typeof text !== 'string') return '';

    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Format time ago
   * @private
   */
  _timeAgo(timestamp) {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMinutes = Math.floor(diffMs / 60000);

      if (diffMinutes < 1) return 'just now';
      if (diffMinutes === 1) return '1 minute ago';
      if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours === 1) return '1 hour ago';
      if (diffHours < 24) return `${diffHours} hours ago`;

      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return '1 day ago';
      return `${diffDays} days ago`;
    } catch (error) {
      return 'recently';
    }
  }
}

// Initialize UI when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.subAgentUI = new SubAgentUI();
    });
  } else {
    window.subAgentUI = new SubAgentUI();
  }
}

export default SubAgentUI;
