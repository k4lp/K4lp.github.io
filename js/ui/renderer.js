/**
 * GDRS UI Renderer
 * All DOM rendering functions and UI updates
 */

import { Storage } from '../storage/storage.js';
import { KeyManager } from '../api/key-manager.js';
import { ReasoningEngine } from '../reasoning/reasoning-engine.js';
import { CodeExecutor } from '../execution/code-executor.js';
import { qs, qsa, encodeHTML } from '../core/utils.js';
import { openVaultModal } from './modals.js';

export const Renderer = {
  /**
   * Render keys with focus preservation
   */
  renderKeys(preserveFocus = true) {
    const pool = Storage.loadKeypool();
    const keysGrid = qs('#keysGrid');
    if (!keysGrid) return;

    // Focus preservation
    let focusInfo = null;
    if (preserveFocus) {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.matches('#keysGrid input[type="password"]')) {
        const keyRow = activeElement.closest('.keyrow');
        if (keyRow) {
          const allKeyRows = qsa('.keyrow', keysGrid);
          const slotIndex = allKeyRows.indexOf(keyRow);
          focusInfo = {
            slot: slotIndex + 1,
            selectionStart: activeElement.selectionStart,
            selectionEnd: activeElement.selectionEnd,
            value: activeElement.value
          };
        }
      }
    }

    keysGrid.innerHTML = '';

    pool.forEach((k) => {
      const row = document.createElement('div');
      row.className = 'keyrow';
      
      const field = document.createElement('input');
      field.type = 'password';
      field.placeholder = `API Key #${k.slot}`;
      field.value = k.key;
      field.autocomplete = 'off';
      field.spellcheck = false;
      field.addEventListener('input', (e) => {
        KeyManager.setKey(k.slot, e.target.value);
      });

      const meta = document.createElement('div');
      meta.className = 'keymeta';
      const cooldownSecs = KeyManager.getCooldownRemainingSeconds(k);
      
      const failureInfo = k.failureCount > 0 ? ` (${k.failureCount} fails)` : '';
      const statusText = cooldownSecs > 0 ? 
        `cooldown ${cooldownSecs}s` : 
        (k.rateLimited ? 'limited' : k.failureCount > 0 ? `unstable${failureInfo}` : 'ok');
          
      meta.innerHTML = `
        <div><div class="pm">valid</div><div class="mono">${k.valid ? 'yes' : 'no'}</div></div>
        <div><div class="pm">usage</div><div class="mono">${k.usage} calls</div></div>
        <div><div class="pm">status</div><div class="mono">${statusText}</div></div>
      `;

      row.appendChild(field);
      row.appendChild(meta);
      keysGrid.appendChild(row);
    });

    // Focus restoration
    if (focusInfo && preserveFocus) {
      const newKeyRows = qsa('.keyrow', keysGrid);
      if (newKeyRows[focusInfo.slot - 1]) {
        const newInput = newKeyRows[focusInfo.slot - 1].querySelector('input[type="password"]');
        if (newInput) {
          setTimeout(() => {
            newInput.focus();
            if (focusInfo.selectionStart !== null) {
              newInput.setSelectionRange(focusInfo.selectionStart, focusInfo.selectionEnd);
            }
          }, 0);
        }
      }
    }

    // Update rotation pill
    const rotPill = qs('#keyRotationPill');
    const nextKey = KeyManager.chooseActiveKey();
    const availableKeys = KeyManager.getAllAvailableKeys();
    if (rotPill) {
      if (nextKey) {
        rotPill.textContent = `NEXT: #${nextKey.slot} (${availableKeys.length} available)`;
      } else {
        rotPill.textContent = availableKeys.length > 0 ? `${availableKeys.length} keys cooling down` : 'NO KEY';
      }
    }
  },

  /**
   * Update only key metadata without rebuilding inputs
   */
  updateKeyMetadata() {
    const pool = Storage.loadKeypool();
    const keysGrid = qs('#keysGrid');
    if (!keysGrid) return;

    const keyRows = qsa('.keyrow', keysGrid);
    
    pool.forEach((k, index) => {
      const row = keyRows[index];
      if (!row) return;
      
      const meta = row.querySelector('.keymeta');
      if (!meta) return;
      
      const cooldownSecs = KeyManager.getCooldownRemainingSeconds(k);
      
      const failureInfo = k.failureCount > 0 ? ` (${k.failureCount} fails)` : '';
      const statusText = cooldownSecs > 0 ? 
        `cooldown ${cooldownSecs}s` : 
        (k.rateLimited ? 'limited' : k.failureCount > 0 ? `unstable${failureInfo}` : 'ok');
      
      meta.innerHTML = `
        <div><div class="pm">valid</div><div class="mono">${k.valid ? 'yes' : 'no'}</div></div>
        <div><div class="pm">usage</div><div class="mono">${k.usage} calls</div></div>
        <div><div class="pm">status</div><div class="mono">${statusText}</div></div>
      `;
    });

    // Update rotation pill
    const rotPill = qs('#keyRotationPill');
    const nextKey = KeyManager.chooseActiveKey();
    const availableKeys = KeyManager.getAllAvailableKeys();
    if (rotPill) {
      if (nextKey) {
        rotPill.textContent = `NEXT: #${nextKey.slot} (${availableKeys.length} available)`;
      } else {
        rotPill.textContent = availableKeys.length > 0 ? `${availableKeys.length} keys cooling down` : 'NO KEY';
      }
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