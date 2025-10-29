/**
 * GDRS UI Renderer
 * All DOM rendering functions and UI updates - NOW WITH TEXTAREA KEY INPUT!
 */

import { Storage } from '../storage/storage.js';
import { KeyManager } from '../api/key-manager.js';
import { ReasoningEngine } from '../reasoning/reasoning-engine.js';
import { CodeExecutor } from '../execution/code-executor.js';
import { qs, qsa, encodeHTML } from '../core/utils.js';
import { openVaultModal } from './modals.js';

export const Renderer = {
  /**
   * NEW: Render textarea-based key input with consolidated stats
   */
  renderKeys() {
    const keysContainer = qs('#keysContainer');
    if (!keysContainer) return;

    const pool = Storage.loadKeypool();
    const stats = KeyManager.getKeyStats();
    const keysText = Storage.formatKeysToText(pool);

    keysContainer.innerHTML = `
      <!-- API Keys Textarea -->
      <div class="keys-input-section">
        <label for="apiKeysTextarea" class="keys-label">
          API Keys (one per line)
        </label>
        <textarea 
          id="apiKeysTextarea" 
          class="keys-textarea" 
          placeholder="Paste your API keys here, one per line:\nAIzaSy...\nAIzaSy...\nAIzaSy..."
          rows="6"
        >${encodeHTML(keysText)}</textarea>
        <div class="keys-hint">
          💡 Paste as many keys as you want, separated by newlines. Stats are preserved when you modify the list.
        </div>
      </div>
      
      <!-- Consolidated Stats -->
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
          <div class="stat-row">
            <span class="stat-label">Rate Limited:</span>
            <span class="stat-value">${stats.rateLimited} keys</span>
          </div>
        </div>
        
        ${stats.total > 0 ? `
          <div class="keys-list">
            <div class="keys-list-header">Individual Key Status:</div>
            ${pool.map(k => {
              const cooldown = KeyManager.getCooldownRemainingSeconds(k);
              const status = cooldown > 0 ? 
                `cooldown ${cooldown}s` : 
                (k.rateLimited ? 'limited' : 
                  (k.failureCount > 0 ? `${k.failureCount} fails` : 
                    (k.valid ? 'ready' : 'invalid')));
              const statusClass = k.valid && !k.rateLimited && cooldown === 0 ? 'ready' : 
                                 cooldown > 0 || k.rateLimited ? 'cooling' : 'invalid';
              
              return `
                <div class="key-status-item">
                  <div class="key-number">#${k.slot}</div>
                  <div class="key-preview">${k.key.substring(0, 12)}...${k.key.substring(k.key.length - 4)}</div>
                  <div class="key-usage">${k.usage} uses</div>
                  <div class="key-status ${statusClass}">${status}</div>
                </div>
              `;
            }).join('')}
          </div>
        ` : '<div class="no-keys-message">No API keys added yet</div>'}
      </div>
    `;

    // Bind textarea events
    const textarea = qs('#apiKeysTextarea');
    if (textarea) {
      textarea.addEventListener('input', () => {
        KeyManager.updateKeysFromTextarea();
        // Re-render stats after a short delay
        setTimeout(() => this.renderKeyStats(), 500);
      });
    }

    // Update rotation pill
    this.updateRotationPill();
  },

  /**
   * NEW: Update only the stats section without rebuilding textarea
   */
  renderKeyStats() {
    const statsSection = qs('.keys-stats-section');
    if (!statsSection) return;

    const pool = Storage.loadKeypool();
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
        <div class="stat-row">
          <span class="stat-label">Rate Limited:</span>
          <span class="stat-value">${stats.rateLimited} keys</span>
        </div>
      </div>
      
      ${stats.total > 0 ? `
        <div class="keys-list">
          <div class="keys-list-header">Individual Key Status:</div>
          ${pool.map(k => {
            const cooldown = KeyManager.getCooldownRemainingSeconds(k);
            const status = cooldown > 0 ? 
              `cooldown ${cooldown}s` : 
              (k.rateLimited ? 'limited' : 
                (k.failureCount > 0 ? `${k.failureCount} fails` : 
                  (k.valid ? 'ready' : 'invalid')));
            const statusClass = k.valid && !k.rateLimited && cooldown === 0 ? 'ready' : 
                               cooldown > 0 || k.rateLimited ? 'cooling' : 'invalid';
            
            return `
              <div class="key-status-item">
                <div class="key-number">#${k.slot}</div>
                <div class="key-preview">${k.key.substring(0, 12)}...${k.key.substring(k.key.length - 4)}</div>
                <div class="key-usage">${k.usage} uses</div>
                <div class="key-status ${statusClass}">${status}</div>
              </div>
            `;
          }).join('')}
        </div>
      ` : '<div class="no-keys-message">No API keys added yet</div>'}
    `;

    statsSection.innerHTML = statsHTML;
    this.updateRotationPill();
  },

  /**
   * Update key metadata (for ticker)
   */
  updateKeyMetadata() {
    // For textarea version, just update stats
    this.renderKeyStats();
  },

  /**
   * Update rotation pill
   */
  updateRotationPill() {
    const rotPill = qs('#keyRotationPill');
    if (!rotPill) return;
    
    const nextKey = KeyManager.chooseActiveKey();
    const availableKeys = KeyManager.getAllAvailableKeys();
    
    if (nextKey) {
      rotPill.textContent = `NEXT: #${nextKey.slot} (${availableKeys.length} available)`;
    } else {
      rotPill.textContent = availableKeys.length > 0 ? `${availableKeys.length} keys cooling down` : 'NO KEY';
    }
  },

  populateModelDropdown(modelsArray) {
    const modelSelect = qs('#modelSelect');
    if (!modelSelect) return;

    const currentValue = modelSelect.value;
    
    modelSelect.innerHTML = `<option value="">-- select model --</option>`;

    modelsArray.forEach((m) => {
      const fullName = m.name || '';
      const label = fullName.replace(/^models\//, '');
      const opt = document.createElement('option');
      opt.value = fullName;
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

  renderTasks() {
    const tasks = Storage.loadTasks();
    const tasksEl = qs('#tasksList');
    if (!tasksEl) return;

    if (tasks.length === 0) {
      tasksEl.innerHTML = '<div class="storage-placeholder">No tasks yet - LLM will create intelligent tasks after query analysis</div>';
      return;
    }

    tasksEl.innerHTML = tasks.map(t => `
      <div class="li">
        <div>
          <div class="mono">${encodeHTML(t.heading)}</div>
          <div class="pm">${encodeHTML(t.content)}</div>
          ${t.notes ? `<div class="pm">Notes: ${encodeHTML(t.notes)}</div>` : ''}
        </div>
        <div class="status">${encodeHTML(t.status.toUpperCase())}</div>
      </div>
    `).join('');
  },

  renderMemories() {
    const memory = Storage.loadMemory();
    const memEl = qs('#memoryList');
    if (!memEl) return;

    if (memory.length === 0) {
      memEl.innerHTML = '<div class="storage-placeholder">No memories yet - Important findings will be stored here</div>';
      return;
    }

    memEl.innerHTML = memory.map(m => `
      <div class="li">
        <div>
          <div class="mono">${encodeHTML(m.heading)}</div>
          <div class="pm">${encodeHTML(m.content)}</div>
          ${m.notes ? `<div class="pm">Notes: ${encodeHTML(m.notes)}</div>` : ''}
        </div>
        <div class="id">${encodeHTML(m.identifier)}</div>
      </div>
    `).join('');
  },

  renderGoals() {
    const goals = Storage.loadGoals();
    const goalsEl = qs('#goalsList');
    if (!goalsEl) return;

    if (goals.length === 0) {
      goalsEl.innerHTML = '<div class="storage-placeholder">No goals yet - Strategic success criteria will be defined after analysis</div>';
      return;
    }

    goalsEl.innerHTML = goals.map(g => `
      <div class="li">
        <div>
          <div class="mono">${encodeHTML(g.heading)}</div>
          <div class="pm">${encodeHTML(g.content)}</div>
          ${g.notes ? `<div class="pm">Notes: ${encodeHTML(g.notes)}</div>` : ''}
        </div>
        <div class="id">${encodeHTML(g.identifier)}</div>
      </div>
    `).join('');
  },

  renderVault() {
    const vault = Storage.loadVault();
    const vaultEl = qs('#vaultList');
    if (!vaultEl) return;

    if (vault.length === 0) {
      vaultEl.innerHTML = '<div class="storage-placeholder">No vault entries yet - Complex data and code will be stored here</div>';
      return;
    }

    vaultEl.innerHTML = vault.map((v, index) => {
      const timestamp = v.createdAt ? new Date(v.createdAt).toLocaleTimeString() : '—';
      const dataSize = v.content ? String(v.content).length : 0;
      return `
        <div class="li" data-vault-id="${encodeHTML(v.identifier)}">
          <div>
            <div class="mono">${encodeHTML(v.identifier)}</div>
            <div class="pm">${encodeHTML(v.description || 'No description')}</div>
            <div class="pm" style="font-size: 0.8em; color: #666;">Created: ${timestamp} • Size: ${dataSize} chars</div>
          </div>
          <div class="status" style="background: ${v.type === 'data' ? '#e3f2fd' : v.type === 'code' ? '#f3e5f5' : '#e8f5e8'}">
            ${encodeHTML(v.type.toUpperCase())}
          </div>
        </div>
      `;
    }).join('');

    // Add click handlers for vault modal
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

    if (logEntries.length === 0 && toolActivity.length === 0) {
      logEl.innerHTML = '<div class="log-placeholder">Intelligent reasoning iterations will appear here...</div>';
      return;
    }

    let html = '';

    // Render reasoning entries
    logEntries.forEach((entry, i) => {
      html += `
        <div class="li reasoning-entry">
          <div>
            <div class="mono">#${i + 1}</div>
            <pre class="mono reasoning-text">${encodeHTML(entry)}</pre>
          </div>
        </div>
      `;

      // Find and render tool activities for this iteration
      const iterationNum = i + 1;
      const iterationActivities = toolActivity.filter(act => act.iteration === iterationNum);
      
      if (iterationActivities.length > 0) {
        html += '<div class="tool-activities">';
        iterationActivities.forEach(activity => {
          const statusClass = activity.status === 'success' ? 'tool-success' : 'tool-error';
          const typeClass = `tool-${activity.type.replace('_', '-')}`;
          
          let activityDetails = '';
          if (activity.type === 'js_execute') {
            activityDetails = `${activity.executionTime}ms • ${activity.codeSize} chars`;
            if (activity.vaultRefsUsed > 0) activityDetails += ` • ${activity.vaultRefsUsed} vault refs`;
          } else if (activity.type === 'vault') {
            if (activity.dataSize) activityDetails += `${activity.dataSize} chars`;
            if (activity.dataType) activityDetails += ` • ${activity.dataType}`;
          }
          
          html += `
            <div class="tool-activity ${statusClass} ${typeClass}">
              <div class="tool-icon">🔧</div>
              <div class="tool-details">
                <div class="tool-name">${activity.type.toUpperCase()}: ${activity.action}</div>
                <div class="tool-meta">${activityDetails || activity.id || ''}</div>
                ${activity.error ? `<div class="tool-error-msg">${encodeHTML(activity.error)}</div>` : ''}
              </div>
              <div class="tool-status ${activity.status}">${activity.status === 'success' ? '✓' : '✗'}</div>
            </div>
          `;
        });
        html += '</div>';
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
      finalEl.innerHTML = output.html || '<div class="output-placeholder"><p>Comprehensive research report will render here after intelligent analysis and goal completion.</p></div>';
    }
    
    if (statusEl) {
      const isComplete = ReasoningEngine.checkGoalsComplete();
      statusEl.textContent = isComplete ? 'verified' : 'analyzing';
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
    
    // Restore last executed code in the code editor if available
    CodeExecutor.restoreLastExecutedCode();
  }
};