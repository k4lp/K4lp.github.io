/**
 * GDRS UI Renderer - Event-Driven and Modular
 * Clean rendering system with event bus integration
 */

import { Storage } from '../storage/storage.js';
import { KeyManager } from '../api/key-manager.js';
import { ReasoningEngine } from '../reasoning/reasoning-engine.js';
import { CodeExecutor } from '../execution/code-executor.js';
import { eventBus, Events } from '../core/event-bus.js';
import { qs, qsa, encodeHTML } from '../core/utils.js';
import { openVaultModal } from './modals.js';

export const Renderer = {
  /**
   * Initialize event-driven rendering
   */
  init() {
    this.bindEventListeners();
    console.log('\ud83c\udfa8 Renderer initialized with event bus');
  },
  
  /**
   * Bind event listeners for automatic UI updates
   */
  bindEventListeners() {
    eventBus.on(Events.MEMORY_UPDATED, () => this.renderMemories());
    eventBus.on(Events.TASKS_UPDATED, () => this.renderTasks());
    eventBus.on(Events.GOALS_UPDATED, () => this.renderGoals());
    eventBus.on(Events.VAULT_UPDATED, () => this.renderVault());
    eventBus.on(Events.FINAL_OUTPUT_UPDATED, () => this.renderFinalOutput());
    eventBus.on(Events.UI_REFRESH_REQUEST, () => this.renderAll());
  },

  /**
   * API Keys rendering with clean textarea interface
   */
  renderKeys() {
    const keysContainer = qs('#keysContainer');
    if (!keysContainer) return;

    const pool = Storage.loadKeypool();
    const stats = KeyManager.getKeyStats();
    const keysText = Storage.formatKeysToText(pool);

    keysContainer.innerHTML = `
      <div class="keys-input-section">
        <label for="apiKeysTextarea" class="keys-label">API Keys (one per line)</label>
        <textarea 
          id="apiKeysTextarea" 
          class="keys-textarea" 
          placeholder="Paste your API keys here, one per line:\nAIzaSy...\nAIzaSy..."
          rows="6"
        >${encodeHTML(keysText)}</textarea>
        <div class="keys-hint">\ud83d\udca1 Paste keys separated by newlines. Stats preserved automatically.</div>
      </div>
      
      <div class="keys-stats-section">
        <div class="stats-header">
          <h3>Key Pool Statistics</h3>
          <div class="stats-summary">
            <span class="stat-badge stat-total">${stats.total} total</span>
            <span class="stat-badge stat-ready">${stats.ready} ready</span>
            <span class="stat-badge stat-cooling">${stats.cooling} cooling</span>
            <span class="stat-badge stat-invalid">${stats.invalid} invalid</span>
          </div>
        </div>
        
        <div class="stats-details">
          <div class="stat-row">
            <span class="stat-label">Valid Keys:</span>
            <span class="stat-value">${stats.valid}/${stats.total}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Total Usage:</span>
            <span class="stat-value">${stats.totalUsage} calls</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Avg Failures:</span>
            <span class="stat-value">${stats.avgFailures.toFixed(1)}</span>
          </div>
        </div>
        
        ${stats.total === 0 ? '<div class="no-keys-message">No API keys added yet</div>' : ''}
      </div>
    `;

    // Bind textarea events
    const textarea = qs('#apiKeysTextarea');
    if (textarea) {
      textarea.addEventListener('input', () => {
        KeyManager.updateKeysFromTextarea();
        setTimeout(() => this.renderKeyStats(), 500);
      });
    }

    this.updateRotationPill();
  },

  /**
   * Update key stats only (for performance)
   */
  renderKeyStats() {
    const statsSection = qs('.keys-stats-section');
    if (!statsSection) return;

    const stats = KeyManager.getKeyStats();
    const statsHTML = `
      <div class="stats-header">
        <h3>Key Pool Statistics</h3>
        <div class="stats-summary">
          <span class="stat-badge stat-total">${stats.total} total</span>
          <span class="stat-badge stat-ready">${stats.ready} ready</span>
          <span class="stat-badge stat-cooling">${stats.cooling} cooling</span>
          <span class="stat-badge stat-invalid">${stats.invalid} invalid</span>
        </div>
      </div>
      
      <div class="stats-details">
        <div class="stat-row">
          <span class="stat-label">Valid Keys:</span>
          <span class="stat-value">${stats.valid}/${stats.total}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Total Usage:</span>
          <span class="stat-value">${stats.totalUsage} calls</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Avg Failures:</span>
          <span class="stat-value">${stats.avgFailures.toFixed(1)}</span>
        </div>
      </div>
      
      ${stats.total === 0 ? '<div class="no-keys-message">No API keys added yet</div>' : ''}
    `;

    statsSection.innerHTML = statsHTML;
    this.updateRotationPill();
  },

  updateKeyMetadata() {
    this.renderKeyStats();
  },

  updateRotationPill() {
    const rotPill = qs('#keyRotationPill');
    if (!rotPill) return;
    
    const nextKey = KeyManager.chooseActiveKey();
    const availableKeys = KeyManager.getAllAvailableKeys();
    
    rotPill.textContent = nextKey ? 
      `NEXT: #${nextKey.slot} (${availableKeys.length} available)` :
      availableKeys.length > 0 ? `${availableKeys.length} keys cooling down` : 'NO KEY';
  },

  populateModelDropdown(modelsArray) {
    const modelSelect = qs('#modelSelect');
    if (!modelSelect) return;

    const currentValue = modelSelect.value;
    modelSelect.innerHTML = `<option value="">-- select model --</option>`;

    modelsArray.forEach(m => {
      const label = (m.name || '').replace(/^models\//, '');
      const opt = document.createElement('option');
      opt.value = m.name;
      opt.textContent = label;
      modelSelect.appendChild(opt);
    });

    if (currentValue && modelsArray.some(m => m.name === currentValue)) {
      modelSelect.value = currentValue;
    } else if (modelsArray.length > 0) {
      const preferred = modelsArray.find(m => m.name.includes('gemini-1.5-pro')) || modelsArray[0];
      modelSelect.value = preferred.name;
    }
  },

  /**
   * Entity rendering methods
   */
  renderTasks() {
    this._renderEntityList('#tasksList', Storage.loadTasks(), {
      placeholder: 'No tasks yet - LLM will create intelligent tasks after query analysis',
      renderItem: t => `
        <div class="li">
          <div>
            <div class="mono">${encodeHTML(t.heading)}</div>
            <div class="pm">${encodeHTML(t.content)}</div>
            ${t.notes ? `<div class="pm">Notes: ${encodeHTML(t.notes)}</div>` : ''}
          </div>
          <div class="status">${encodeHTML(t.status.toUpperCase())}</div>
        </div>
      `
    });
  },

  renderMemories() {
    this._renderEntityList('#memoryList', Storage.loadMemory(), {
      placeholder: 'No memories yet - Important findings will be stored here',
      renderItem: m => `
        <div class="li">
          <div>
            <div class="mono">${encodeHTML(m.heading)}</div>
            <div class="pm">${encodeHTML(m.content)}</div>
            ${m.notes ? `<div class="pm">Notes: ${encodeHTML(m.notes)}</div>` : ''}
          </div>
          <div class="id">${encodeHTML(m.identifier)}</div>
        </div>
      `
    });
  },

  renderGoals() {
    this._renderEntityList('#goalsList', Storage.loadGoals(), {
      placeholder: 'No goals yet - Strategic success criteria will be defined after analysis',
      renderItem: g => `
        <div class="li">
          <div>
            <div class="mono">${encodeHTML(g.heading)}</div>
            <div class="pm">${encodeHTML(g.content)}</div>
            ${g.notes ? `<div class="pm">Notes: ${encodeHTML(g.notes)}</div>` : ''}
          </div>
          <div class="id">${encodeHTML(g.identifier)}</div>
        </div>
      `
    });
  },

  renderVault() {
    const vault = Storage.loadVault();
    const vaultEl = qs('#vaultList');
    if (!vaultEl) return;

    if (vault.length === 0) {
      vaultEl.innerHTML = '<div class="storage-placeholder">No vault entries yet - Complex data and code will be stored here</div>';
      return;
    }

    vaultEl.innerHTML = vault.map(v => {
      const timestamp = v.createdAt ? new Date(v.createdAt).toLocaleTimeString() : '\u2014';
      const dataSize = String(v.content || '').length;
      return `
        <div class="li" data-vault-id="${encodeHTML(v.identifier)}">
          <div>
            <div class="mono">${encodeHTML(v.identifier)}</div>
            <div class="pm">${encodeHTML(v.description || 'No description')}</div>
            <div class="pm" style="font-size: 0.8em; color: #666;">Created: ${timestamp} \u2022 Size: ${dataSize} chars</div>
          </div>
          <div class="status" style="background: ${this._getTypeColor(v.type)}">
            ${encodeHTML(v.type.toUpperCase())}
          </div>
        </div>
      `;
    }).join('');

    // Bind vault modal handlers
    qsa('[data-vault-id]', vaultEl).forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-vault-id');
        openVaultModal(id);
      });
    });
  },

  renderReasoningLog() {
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
      html += `
        <div class="li reasoning-entry">
          <div>
            <div class="mono">#${i + 1}</div>
            <pre class="mono reasoning-text">${encodeHTML(entry)}</pre>
          </div>
        </div>
      `;

      // Render associated tool activities
      const iterationActivities = toolActivity.filter(act => act.iteration === i + 1);
      if (iterationActivities.length > 0) {
        html += this._renderToolActivities(iterationActivities);
      }
    });

    logEl.innerHTML = html;
    logEl.scrollTop = logEl.scrollHeight;
  },

  renderFinalOutput() {
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
        statusEl.textContent = '\u2705 verified';
        statusEl.style.background = 'var(--success)';
        statusEl.style.color = 'white';
      } else if (output.source === 'auto') {
        statusEl.textContent = '\u26a0\ufe0f unverified';
        statusEl.style.background = 'var(--warning)';
        statusEl.style.color = 'white';
      } else {
        statusEl.textContent = 'analyzing';
        statusEl.style.background = '';
        statusEl.style.color = '';
      }
    }
  },

  renderAll() {
    this.renderKeys();
    this.renderTasks();
    this.renderMemories();
    this.renderGoals();
    this.renderVault();
    this.renderReasoningLog();
    this.renderFinalOutput();
    CodeExecutor.restoreLastExecutedCode();
    
    eventBus.emit(Events.UI_REFRESH_COMPLETE);
  },
  
  /**
   * Generic entity list renderer (DRY principle)
   */
  _renderEntityList(selector, entities, options) {
    const element = qs(selector);
    if (!element) return;
    
    if (entities.length === 0) {
      element.innerHTML = `<div class="storage-placeholder">${options.placeholder}</div>`;
      return;
    }
    
    element.innerHTML = entities.map(options.renderItem).join('');
  },
  
  /**
   * Render tool activities for reasoning log
   */
  _renderToolActivities(activities) {
    let html = '<div class="tool-activities">';
    
    activities.forEach(activity => {
      const statusClass = activity.status === 'success' ? 'tool-success' : 'tool-error';
      const typeClass = `tool-${activity.type.replace('_', '-')}`;
      
      let details = this._formatActivityDetails(activity);
      
      html += `
        <div class="tool-activity ${statusClass} ${typeClass}">
          <div class="tool-icon">\ud83d\udd27</div>
          <div class="tool-details">
            <div class="tool-name">${activity.type.toUpperCase()}: ${activity.action}</div>
            <div class="tool-meta">${details}</div>
            ${activity.error ? `<div class="tool-error-msg">${encodeHTML(activity.error)}</div>` : ''}
          </div>
          <div class="tool-status ${activity.status}">${activity.status === 'success' ? '\u2713' : '\u2717'}</div>
        </div>
      `;
    });
    
    return html + '</div>';
  },
  
  /**
   * Format activity details based on type
   */
  _formatActivityDetails(activity) {
    switch (activity.type) {
      case 'js_execute':
        let details = `${activity.executionTime}ms \u2022 ${activity.codeSize} chars`;
        if (activity.vaultRefsUsed > 0) details += ` \u2022 ${activity.vaultRefsUsed} vault refs`;
        if (activity.wasAsync) details += ' \u2022 async';
        if (activity.complexity) details += ` \u2022 ${activity.complexity}`;
        return details;
        
      case 'vault':
        let vaultDetails = '';
        if (activity.dataSize) vaultDetails += `${activity.dataSize} chars`;
        if (activity.dataType) vaultDetails += ` \u2022 ${activity.dataType}`;
        return vaultDetails;
        
      case 'final_output':
        let outputDetails = `${activity.contentSize} chars`;
        if (activity.verified) outputDetails += ' \u2022 \u2705 verified';
        if (activity.source) outputDetails += ` \u2022 ${activity.source}`;
        return outputDetails;
        
      default:
        return activity.id || '';
    }
  },
  
  /**
   * Get color for vault entry type
   */
  _getTypeColor(type) {
    const colors = {
      data: '#e3f2fd',
      code: '#f3e5f5', 
      text: '#e8f5e8',
      json: '#fff3e0',
      result: '#e0f2f1'
    };
    return colors[type] || '#f5f5f5';
  }
};
