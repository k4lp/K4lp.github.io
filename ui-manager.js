// ui-manager.js - UI Manager for Gemini Reasoning Lab

import { storageManager } from './storage.js';
import { geminiAPI } from './gemini-api.js';
import { toolExecutor } from './tool-executor.js';
import { dataVault } from './data-vault.js';

class UIManager {
    constructor() {
        this.elements = {};
        this.isProcessing = false;
        this.defaultModels = [
            'gemini-2.0-flash-exp',
            'gemini-1.5-pro',
            'gemini-1.5-flash'
        ];
        this.sessionContext = null;
        this.freezeState = { mode: 'inactive' };
        this.vaultPreviewLimit = 1200;
        this.editingTaskId = null;
        this.vaultChipListenerRegistered = false;
    }

    init() {
        this.cacheElements();
        this.setupEventListeners();
        geminiAPI.initialize();
        void this.refreshModelList();
        this.renderAll();
    }

    cacheElements() {
        this.elements = {
            apiKeyInputs: Array.from({ length: 5 }, (_, i) => document.getElementById(`apiKey${i}`)),
            keyStatusIndicators: Array.from({ length: 5 }, (_, i) => document.getElementById(`keyStatus${i}`)),
            modelSelect: document.getElementById('modelSelect'),
            memoriesContainer: document.getElementById('memoriesContainer'),
            goalsContainer: document.getElementById('goalsContainer'),
            tasksContainer: document.getElementById('tasksContainer'),
            reasoningContainer: document.getElementById('reasoningContainer'),
            codeOutputContainer: document.getElementById('codeOutputContainer'),
            canvasContainer: document.getElementById('canvasContainer'),
            chatContainer: document.getElementById('chatContainer'),
            goalInput: document.getElementById('goalInput'),
            chatInput: document.getElementById('chatInput'),
            addGoalBtn: document.getElementById('addGoalBtn'),
            sendBtn: document.getElementById('sendBtn'),
            resetBtn: document.getElementById('resetBtn'),
            statusIndicator: document.getElementById('statusIndicator'),
            freezeBtn: document.getElementById('freezeBtn'),
            freezeStatus: document.getElementById('freezeStatus'),
            vaultContainer: document.getElementById('vaultContainer'),
            taskModal: document.getElementById('taskModal'),
            taskModalForm: document.getElementById('taskModalForm'),
            taskDescriptionInput: document.getElementById('taskDescriptionInput'),
            taskStatusSelect: document.getElementById('taskStatusSelect'),
            taskNotesInput: document.getElementById('taskNotesInput'),
            taskModalClose: document.getElementById('taskModalClose'),
            taskModalSave: document.getElementById('taskModalSave'),
            vaultModal: document.getElementById('vaultModal'),
            vaultModalBody: document.getElementById('vaultModalBody'),
            vaultModalClose: document.getElementById('vaultModalClose')
        };
    }

    setupEventListeners() {
        this.elements.apiKeyInputs.forEach((input, index) => {
            input.addEventListener('change', () => this.handleApiKeyChange(index));
            const savedKeys = storageManager.getApiKeys();
            input.value = savedKeys[index] || '';
        });

        const savedModel = storageManager.getSelectedModel();
        this.elements.modelSelect.value = savedModel;
        this.elements.modelSelect.addEventListener('change', (e) => {
            storageManager.saveSelectedModel(e.target.value);
        });

        this.elements.addGoalBtn.addEventListener('click', () => this.addGoal());
        this.elements.goalInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addGoal();
        });

        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.elements.memoriesContainer.addEventListener('click', (event) => {
            this.handleMemoryContainerClick(event);
        });

        this.elements.resetBtn.addEventListener('click', () => this.resetAll());

        if (this.elements.freezeBtn) {
            this.elements.freezeBtn.addEventListener('click', () => this.handleFreezeToggle());
        }

        if (this.elements.tasksContainer) {
            this.elements.tasksContainer.addEventListener('click', (event) => this.handleTasksContainerClick(event));
        }

        if (this.elements.vaultContainer) {
            this.elements.vaultContainer.addEventListener('click', (event) => this.handleVaultContainerClick(event));
        }

        if (this.elements.taskModalClose) {
            this.elements.taskModalClose.addEventListener('click', () => this.closeTaskModal());
        }

        if (this.elements.taskModalSave) {
            this.elements.taskModalSave.addEventListener('click', () => this.saveTaskEdits());
        }

        if (this.elements.taskModal) {
            this.elements.taskModal.addEventListener('click', (event) => {
                if (event.target === this.elements.taskModal) {
                    this.closeTaskModal();
                }
            });
        }

        if (this.elements.vaultModalClose) {
            this.elements.vaultModalClose.addEventListener('click', () => this.closeVaultModal());
        }

        if (this.elements.vaultModal) {
            this.elements.vaultModal.addEventListener('click', (event) => {
                if (event.target === this.elements.vaultModal) {
                    this.closeVaultModal();
                }
            });
        }

        if (!this.vaultChipListenerRegistered) {
            document.addEventListener('click', (event) => {
                const chip = event.target.closest('.vault-chip');
                if (!chip || chip.disabled) {
                    return;
                }
                const id = chip.getAttribute('data-vault-id');
                if (id) {
                    void this.openVaultPreview(id, 'preview');
                }
            });
            this.vaultChipListenerRegistered = true;
        }
    }

    handleApiKeyChange(index) {
        const keys = storageManager.getApiKeys();
        const trimmed = this.elements.apiKeyInputs[index].value.trim();
        this.elements.apiKeyInputs[index].value = trimmed;
        keys[index] = trimmed;
        geminiAPI.updateApiKeys(keys);
        this.updateKeyStatusIndicators();
        void this.refreshModelList();
    }

    updateKeyStatusIndicators() {
        const statuses = geminiAPI.getKeyStatusForUI();
        statuses.forEach((status) => {
            const indicator = this.elements.keyStatusIndicators[status.index];
            if (!indicator) return;

            indicator.className = 'key-status';
            indicator.innerHTML = '';
            indicator.removeAttribute('title');

            if (!status.hasKey) {
                indicator.classList.add('empty');
                indicator.innerHTML = '<span class="key-status-placeholder">Empty</span>';
                indicator.title = 'No API key stored in this slot.';
                return;
            }

            if (status.active) {
                indicator.classList.add('active');
            }

            if (status.rateLimited) {
                indicator.classList.add('rate-limited');
            }

            if (status.invalid) {
                indicator.classList.add('invalid');
            }

            const usageLabel = `${status.usageCount || 0}x`;
            const cooldownMs = status.cooldownRemainingMs > 0
                ? status.cooldownRemainingMs
                : (status.cooldownTotalMs || 0);
            const cooldownLabel = cooldownMs > 0 ? this.formatDuration(cooldownMs) : '';
            const parts = [
                '<span class="key-dot"></span>',
                `<span class="key-usage">${usageLabel}</span>`
            ];

            if (cooldownLabel) {
                parts.push(`<span class="key-cooldown">${cooldownLabel}</span>`);
            }

            const showWarning = status.invalid || !!status.lastError;
            const tooltip = this.buildKeyStatusTooltip(status);

            if (showWarning) {
                indicator.classList.add('has-warning');
                parts.push(`<span class="key-warning" title="${this.escapeHtml(tooltip)}">!</span>`);
            }

            indicator.innerHTML = parts.join('');

             if (tooltip) {
                indicator.title = tooltip;
             }
        });
    }

    populateModelOptions(models, preferredModel) {
        const uniqueModels = Array.from(new Set(models));
        if (uniqueModels.length === 0) {
            return;
        }

        const select = this.elements.modelSelect;
        select.innerHTML = uniqueModels
            .map(model => `<option value="${model}">${model}</option>`)
            .join('');

        const savedModel = preferredModel || storageManager.getSelectedModel();
        const targetModel = uniqueModels.includes(savedModel) ? savedModel : uniqueModels[0];
        select.value = targetModel;

        const storedModel = storageManager.getSelectedModel();
        if (targetModel !== storedModel) {
            storageManager.saveSelectedModel(targetModel);
        }
    }

    async refreshModelList() {
        const keys = storageManager.getApiKeys().map(key => (key || '').trim()).filter(Boolean);
        const preferredModel = storageManager.getSelectedModel();

        if (keys.length === 0) {
            this.populateModelOptions(this.defaultModels, preferredModel);
            return;
        }

        try {
            const models = await geminiAPI.fetchModels();
            if (models.length === 0) {
                this.populateModelOptions(this.defaultModels, preferredModel);
                return;
            }
            this.populateModelOptions(models, preferredModel);
        } catch (error) {
            console.warn('Unable to refresh Gemini model list:', error);
            this.populateModelOptions(this.defaultModels, preferredModel);
        } finally {
            this.updateKeyStatusIndicators();
        }
    }

    renderAll() {
        this.renderMemories();
        this.renderGoals();
        this.renderTasks();
        this.renderReasoning();
        this.renderCodeExecutions();
        this.renderCanvases();
        this.renderChatHistory();
        this.renderDataVault();
        this.updateKeyStatusIndicators();
        this.updateFreezeUi();
    }

    renderMemories() {
        const memories = storageManager.getMemories();
        const container = this.elements.memoriesContainer;

        if (memories.length === 0) {
            container.innerHTML = '<div class="empty-state">No memories yet</div>';
            return;
        }

        container.innerHTML = memories.map(memory => `
            <div class="memory-item">
                <div class="memory-header">
                    <div class="memory-summary">${this.escapeHtml(memory.summary)}</div>
                    <div class="memory-actions">
                        <button class="btn-small memory-toggle" data-memory-action="toggle" data-memory-id="${memory.id}" aria-expanded="false">View</button>
                        <button class="btn-small btn-danger" data-memory-action="delete" data-memory-id="${memory.id}" aria-label="Delete memory ${memory.id}">Del</button>
                    </div>
                </div>
                <div class="memory-id">${this.escapeHtml(memory.id)}</div>
                <div class="memory-content" id="memory-${memory.id}" data-memory-content>${this.formatMultilineHtml(memory.content)}</div>
            </div>
        `).join('');
    }

    handleMemoryContainerClick(event) {
        const actionButton = event.target.closest('[data-memory-action]');
        if (!actionButton) {
            return;
        }

        const memoryId = actionButton.getAttribute('data-memory-id');
        if (!memoryId) {
            return;
        }

        const action = actionButton.getAttribute('data-memory-action');

        if (action === 'toggle') {
            this.toggleMemory(memoryId, actionButton);
        } else if (action === 'delete') {
            this.deleteMemory(memoryId);
        }
    }

    toggleMemory(id, triggerButton = null) {
        const el = document.getElementById(`memory-${id}`);
        if (!el) {
            return;
        }

        const expanded = el.classList.toggle('expanded');

        if (triggerButton) {
            triggerButton.textContent = expanded ? 'Hide' : 'View';
            triggerButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        }

        if (expanded) {
            el.scrollIntoView({ block: 'nearest' });
        }
    }

    deleteMemory(id) {
        if (confirm('Delete this memory?')) {
            storageManager.deleteMemory(id);
            this.renderMemories();
        }
    }

    renderGoals() {
        const goals = storageManager.getGoals();
        const container = this.elements.goalsContainer;

        if (goals.length === 0) {
            container.innerHTML = '<div class="empty-state">No goals yet</div>';
            return;
        }

        container.innerHTML = goals.map(goal => `
            <div class="goal-item">
                <div class="goal-content">
                    ${this.escapeHtml(goal.content)}
                    <div class="goal-meta">By: ${goal.createdBy}</div>
                </div>
                ${goal.createdBy === 'user' ? 
                    `<button class="btn-small btn-danger" onclick="window.uiManager.deleteGoal('${goal.id}')">Del</button>` 
                    : ''}
            </div>
        `).join('');
    }

    addGoal() {
        const content = this.elements.goalInput.value.trim();
        if (!content) return;

        const name = content.split('\n')[0].slice(0, 80);
        storageManager.addGoal({
            name,
            description: '',
            content,
            createdBy: 'user',
            modifiable: true
        });
        this.elements.goalInput.value = '';
        this.renderGoals();
    }

    deleteGoal(id) {
        if (confirm('Delete this goal?')) {
            storageManager.deleteGoal(id);
            this.renderGoals();
        }
    }

    renderTasks() {
        const tasks = [...storageManager.getTasks()].sort((a, b) => {
            const aTime = a.createdAt || 0;
            const bTime = b.createdAt || 0;
            return aTime - bTime;
        });
        const container = this.elements.tasksContainer;

        if (tasks.length === 0) {
            container.innerHTML = '<div class="empty-state">No tasks defined</div>';
            return;
        }

        container.innerHTML = tasks.map(task => {
            const name = task.name || task.description || `Task ${task.id}`;
            const description = task.description && task.description !== name ? task.description : '';
            const content = task.content || '';
            const notes = task.notes || '';
            const created = task.createdAt ? this.formatRelativeTime(task.createdAt) : null;
            const updated = task.updatedAt ? this.formatRelativeTime(task.updatedAt) : null;
            const statusLabel = this.formatTaskStatus(task.status);
            const statusBadge = `<span class="task-status-badge status-${this.escapeHtml((task.status || 'pending').toLowerCase())}">${this.escapeHtml(statusLabel)}</span>`;
            const meta = [
                `#${this.escapeHtml(task.id)}`,
                statusBadge,
                task.createdBy ? `By ${this.escapeHtml(task.createdBy)}` : null,
                created ? `Created ${this.escapeHtml(created)}` : null,
                updated && updated !== created ? `Updated ${this.escapeHtml(updated)}` : null
            ].filter(Boolean).join(' � ');

            return `
                <div class="task-item" data-task-id="${this.escapeAttribute(task.id)}">
                    <div class="task-header">
                        <div class="task-title">${this.escapeHtml(name)}</div>
                        <div class="task-actions">
                            <button class="btn-small" data-task-action="edit" data-task-id="${this.escapeAttribute(task.id)}">Edit</button>
                        </div>
                    </div>
                    <div class="task-meta">${meta}</div>
                    ${description ? `
                        <div class="task-section">
                            <div class="task-section-label">Description</div>
                            <div class="task-section-body">${this.formatMultilineHtml(description)}</div>
                        </div>
                    ` : ''}
                    ${content ? `
                        <div class="task-section">
                            <div class="task-section-label">Content</div>
                            <div class="task-section-body">${this.formatMultilineHtml(content)}</div>
                        </div>
                    ` : ''}
                    ${notes ? `
                        <div class="task-section">
                            <div class="task-section-label">Notes</div>
                            <div class="task-section-body">${this.formatMultilineHtml(notes)}</div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    handleTasksContainerClick(event) {
        const actionButton = event.target.closest('[data-task-action]');
        if (!actionButton) {
            return;
        }

        const taskId = actionButton.getAttribute('data-task-id');
        const action = actionButton.getAttribute('data-task-action');
        if (!taskId || !action) {
            return;
        }

        if (action === 'edit') {
            this.openTaskModal(taskId);
        }
    }

    openTaskModal(taskId) {
        const task = storageManager.getTasks().find(t => t.id === taskId);
        if (!task || !this.elements.taskModal) {
            return;
        }

        this.editingTaskId = taskId;
        if (this.elements.taskDescriptionInput) {
            this.elements.taskDescriptionInput.value = task.name || task.description || '';
        }
        if (this.elements.taskStatusSelect) {
            this.elements.taskStatusSelect.value = task.status || 'pending';
        }
        if (this.elements.taskNotesInput) {
            this.elements.taskNotesInput.value = task.notes || '';
        }

        this.elements.taskModal.classList.add('open');

        requestAnimationFrame(() => {
            if (this.elements.taskDescriptionInput) {
                this.elements.taskDescriptionInput.focus();
                this.elements.taskDescriptionInput.setSelectionRange(
                    this.elements.taskDescriptionInput.value.length,
                    this.elements.taskDescriptionInput.value.length
                );
            }
        });
    }

    closeTaskModal() {
        this.editingTaskId = null;
        if (this.elements.taskModal) {
            this.elements.taskModal.classList.remove('open');
        }
    }

    saveTaskEdits() {
        if (!this.editingTaskId) {
            this.closeTaskModal();
            return;
        }

        const description = this.elements.taskDescriptionInput
            ? this.elements.taskDescriptionInput.value.trim()
            : '';
        const status = this.elements.taskStatusSelect
            ? this.elements.taskStatusSelect.value
            : 'pending';
        const notes = this.elements.taskNotesInput
            ? this.elements.taskNotesInput.value.trim()
            : '';

        if (!description) {
            alert('Task description cannot be empty.');
            return;
        }

        storageManager.updateTask(this.editingTaskId, {
            name: description,
            description,
            status,
            notes
        });

        this.renderTasks();
        this.closeTaskModal();
    }

    renderReasoning() {
        const reasoning = storageManager.getReasoning();
        const container = this.elements.reasoningContainer;

        if (reasoning.length === 0) {
            container.innerHTML = '<div class="empty-state">Awaiting user input to begin reasoning...</div>';
            return;
        }

        container.innerHTML = reasoning.map((step) => {
            const date = new Date(step.timestamp).toLocaleTimeString();
            const sanitizedThought = this.sanitizeReasoningText(step.content || '');
            const hasTools = Array.isArray(step.toolResults) && step.toolResults.length > 0;
            const hasThought = sanitizedThought.length > 0;
            const thoughtHtml = hasThought
                ? this.formatMultilineHtml(sanitizedThought)
                : (hasTools
                    ? '<span class="reasoning-placeholder">Tool activity logged below.</span>'
                    : '<span class="reasoning-placeholder">No reasoning text recorded for this step.</span>');
            const stepClass = step.step % 2 === 0
                ? 'reasoning-step reasoning-step--even'
                : 'reasoning-step reasoning-step--odd';
            const name = step.name || this.deriveReasoningName(sanitizedThought);
            const description = step.description && step.description !== name
                ? this.formatMultilineHtml(step.description)
                : '';
            const meta = [
                `#${this.escapeHtml(step.id || '')}`,
                `Tools ${hasTools ? this.escapeHtml(String(step.toolResults.length)) : '0'}`,
                `Timestamp ${this.escapeHtml(date)}`
            ].filter(Boolean).join(' � ');

            const toolsSection = hasTools
                ? `
                    <div class="reasoning-tools">
                        <div class="reasoning-tools-title">Tool Activity</div>
                        ${step.toolResults.map((tool) => {
                            const rawType = tool.tool || tool.type || 'tool';
                            const normalizedType = this.normalizeToolType(rawType);
                            const displayName = this.getToolDisplayName(rawType);
                            const summaryHtml = this.formatMultilineHtml(tool.summary || tool.result || '');
                            const toolId = tool.id ? `<span class="tool-meta">#${this.escapeHtml(tool.id)}</span>` : '';
                            return `
                                <div class="reasoning-tool-entry tool-type-${normalizedType}">
                                    <div class="reasoning-tool-header">
                                        <span class="tool-chip">${this.escapeHtml(displayName)}</span>
                                        ${toolId}
                                    </div>
                                    <div class="reasoning-tool-summary">${summaryHtml}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `
                : '';

            return `
                <div class="${stepClass}" data-step-number="${step.step}">
                    <div class="reasoning-step-header">
                        <div class="reasoning-step-index">Step ${step.step}</div>
                        <div class="reasoning-step-meta">${meta}</div>
                    </div>
                    <div class="reasoning-body">
                        <div class="reasoning-title">${this.escapeHtml(name)}</div>
                        ${description ? `<div class="reasoning-summary">${description}</div>` : ''}
                        <div class="reasoning-text-block">${thoughtHtml}</div>
                    </div>
                    ${toolsSection}
                </div>
            `;
        }).join('');

        container.scrollTop = container.scrollHeight;
    }

    addReasoningStep(rawContent, toolsUsed = [], toolResults = []) {
        const extracted = this.extractReasoningText(rawContent);
        const sanitized = this.sanitizeReasoningText(extracted);
        const name = this.deriveReasoningName(sanitized);
        const description = this.deriveReasoningDescription(sanitized, name);

        storageManager.addReasoningStep({
            name,
            description,
            content: sanitized,
            rawContent,
            toolsUsed,
            toolResults
        });
        this.renderReasoning();
    }

    renderCodeExecutions() {
        const executions = storageManager.getCodeExecutions();
        const container = this.elements.codeOutputContainer;

        if (executions.length === 0) {
            container.innerHTML = '<div class="empty-state">No code executed yet</div>';
            return;
        }

        container.innerHTML = executions.map((exec) => {
            const executedAt = exec.executedAt ? new Date(exec.executedAt).toLocaleTimeString() : '--';
            const executionId = exec.id || 'execution';
            const status = typeof exec.status === 'string' ? exec.status.toLowerCase() : '';
            const rawOutput = exec.error ? `Error: ${exec.error}` : exec.output || '';
            const outputText = (rawOutput || '').trim();
            const isError = status === 'error' || Boolean(exec.error) || /^error[:\s]/i.test(outputText);
            const statusClass = isError ? 'error' : 'success';
            const statusLabel = statusClass === 'error' ? 'Error' : 'Success';
            const outputLabel = statusClass === 'error' ? 'Error Output' : 'Output';
            const codeHtml = this.escapeHtml(exec.code || '');
            const outputHtml = outputText
                ? this.formatMultilineHtml(outputText)
                : '<span class="code-exec-empty">No output</span>';
            const logs = Array.isArray(exec.logs) ? exec.logs : [];
            const logsHtml = logs.length > 0
                ? `<div class="code-exec-block">
                        <div class="code-exec-label">Logs</div>
                        <div class="code-exec-output-text">${this.formatMultilineHtml(logs.join('\n'))}</div>
                   </div>`
                : '';

            const vaultEntry = exec.vaultId
                ? dataVault.getEntry(exec.vaultId)
                : (exec.vaultReference ? dataVault.getEntryByReference(exec.vaultReference) : null);

            let vaultHtml = '';
            if (vaultEntry) {
                vaultHtml = `
                    <div class="code-exec-block code-exec-vault">
                        <div class="code-exec-label">Stored Result</div>
                        <div class="code-exec-vault-body">
                            <button type="button" class="vault-chip" data-vault-id="${this.escapeAttribute(vaultEntry.id)}">
                                ${this.escapeHtml(vaultEntry.label || vaultEntry.id)}
                            </button>
                            ${vaultEntry.preview ? `<div class="code-exec-vault-preview">${this.escapeHtml(this.truncateText(vaultEntry.preview, 160))}</div>` : ''}
                            ${vaultEntry.reference ? `<div class="code-exec-vault-ref"><code>${this.escapeHtml(vaultEntry.reference)}</code></div>` : ''}
                        </div>
                    </div>
                `;
            } else if (exec.vaultReference) {
                vaultHtml = `
                    <div class="code-exec-block code-exec-vault">
                        <div class="code-exec-label">Stored Result</div>
                        <div class="code-exec-vault-body">
                            <code>${this.escapeHtml(exec.vaultReference)}</code>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="code-exec-item code-exec-${statusClass}">
                    <div class="code-exec-header">
                        <div class="code-exec-meta">
                            <span class="code-exec-id">${this.escapeHtml(executionId)}</span>
                            <span class="code-exec-time">${this.escapeHtml(executedAt)}</span>
                        </div>
                        <span class="code-exec-status code-exec-status--${statusClass}">${statusLabel}</span>
                    </div>
                    <div class="code-exec-block">
                        <div class="code-exec-label">Code</div>
                        <pre class="code-exec-code"><code>${codeHtml}</code></pre>
                    </div>
                    <div class="code-exec-block">
                        <div class="code-exec-label">${outputLabel}</div>
                        <div class="code-exec-output-text">${outputHtml}</div>
                    </div>
                    ${logsHtml}
                    ${vaultHtml}
                </div>
            `;
        }).join('');

        container.scrollTop = container.scrollHeight;
    }

    renderCanvases() {
        const canvases = storageManager.getCanvases();
        const container = this.elements.canvasContainer;

        if (canvases.length === 0) {
            container.innerHTML = '<div class="empty-state">No canvas output yet</div>';
            return;
        }

        container.innerHTML = canvases.map(canvas => `
            <div class="canvas-item">
                <iframe srcdoc="${this.escapeHtml(canvas.html)}" sandbox="allow-scripts allow-same-origin"></iframe>
            </div>
        `).join('');
    }

    renderDataVault() {
        const container = this.elements.vaultContainer;
        if (!container) {
            return;
        }

        const entries = [...dataVault.listEntries()].sort((a, b) => {
            const aTime = a.updatedAt || a.createdAt || 0;
            const bTime = b.updatedAt || b.createdAt || 0;
            return bTime - aTime;
        });

        if (entries.length === 0) {
            container.innerHTML = '<div class="empty-state">No stored data yet</div>';
            return;
        }

        container.innerHTML = entries.map(entry => {
            const label = entry.label || entry.type || entry.id;
            const typeLabel = entry.type || 'unknown';
            const bytesLabel = this.formatBytes(entry.bytes);
            const timestamp = entry.updatedAt || entry.createdAt
                ? this.formatRelativeTime(entry.updatedAt || entry.createdAt)
                : '';
            const preview = entry.preview
                ? this.escapeHtml(this.truncateText(entry.preview, 200)).replace(/\n/g, '<br>')
                : '<span class="vault-preview-empty">Preview unavailable</span>';
            const reference = entry.reference || dataVault.buildReference(entry.id);
            const safeId = this.escapeAttribute(entry.id);
            const safeRef = this.escapeAttribute(reference);

            return `
                <div class="vault-item" data-vault-id="${safeId}">
                    <div class="vault-item-header">
                        <div class="vault-label">${this.escapeHtml(label)}</div>
                        <div class="vault-meta">
                            <span>${this.escapeHtml(typeLabel)}</span>
                            <span>${bytesLabel}</span>
                            ${timestamp ? `<span>${this.escapeHtml(timestamp)}</span>` : ''}
                        </div>
                    </div>
                    <div class="vault-preview">${preview}</div>
                    <div class="vault-reference">
                        <code>${this.escapeHtml(reference)}</code>
                    </div>
                    <div class="vault-actions">
                        <button class="btn-small" data-vault-action="preview" data-mode="preview" data-vault-id="${safeId}">Preview</button>
                        <button class="btn-small" data-vault-action="preview" data-mode="full" data-vault-id="${safeId}">Full</button>
                        <button class="btn-small" data-vault-action="copy" data-vault-id="${safeId}" data-reference="${safeRef}">Copy Ref</button>
                        <button class="btn-small btn-danger" data-vault-action="delete" data-vault-id="${safeId}">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    handleVaultContainerClick(event) {
        const actionButton = event.target.closest('[data-vault-action]');
        if (!actionButton) {
            return;
        }

        const id = actionButton.getAttribute('data-vault-id');
        const action = actionButton.getAttribute('data-vault-action');
        if (!id || !action) {
            return;
        }

        if (action === 'preview') {
            const modeAttr = actionButton.getAttribute('data-mode');
            const mode = modeAttr === 'full' ? 'full' : 'preview';
            const limitAttr = actionButton.getAttribute('data-limit');
            const limit = limitAttr ? Number(limitAttr) : undefined;
            void this.openVaultPreview(id, mode, limit);
            return;
        }

        if (action === 'copy') {
            const reference = actionButton.getAttribute('data-reference')
                || (dataVault.getEntry(id)?.reference);
            if (!reference) {
                alert('Reference unavailable for this entry.');
                return;
            }

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(reference).then(() => {
                    const original = actionButton.textContent;
                    actionButton.textContent = 'Copied';
                    actionButton.disabled = true;
                    setTimeout(() => {
                        actionButton.disabled = false;
                        actionButton.textContent = original;
                    }, 1200);
                }).catch(() => {
                    alert('Unable to copy reference. Please copy manually:\n' + reference);
                });
            } else {
                alert('Clipboard access not available. Copy manually:\n' + reference);
            }
            return;
        }

        if (action === 'delete') {
            const entry = dataVault.getEntry(id);
            if (!entry) {
                alert('Entry already removed.');
                this.renderDataVault();
                return;
            }

            if (confirm(`Delete stored data "${entry.label || entry.id}"?`)) {
                dataVault.delete(id);
                this.renderDataVault();
            }
        }
    }

    async openVaultPreview(id, mode = 'preview', limit) {
        if (!this.elements.vaultModal || !this.elements.vaultModalBody) {
            return;
        }

        const entry = dataVault.getEntry(id);
        if (!entry) {
            alert('Stored data not found.');
            return;
        }

        const reference = entry.reference || dataVault.buildReference(id);
        const createdLabel = entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'N/A';
        const updatedLabel = entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : 'N/A';
        const stats = entry.stats || {};
        const lengthLabel = typeof stats.length === 'number' ? String(stats.length) : null;
        const keysLabel = typeof stats.keys === 'number' ? String(stats.keys) : null;

        const metaRows = [
            { label: 'Vault ID', value: `<code>${this.escapeHtml(entry.id)}</code>` },
            reference ? { label: 'Reference', value: `<code>${this.escapeHtml(reference)}</code>` } : null,
            { label: 'Label', value: this.escapeHtml(entry.label || entry.id) },
            { label: 'Type', value: this.escapeHtml(entry.type || 'unknown') },
            { label: 'Bytes', value: this.escapeHtml(this.formatBytes(entry.bytes)) },
            lengthLabel ? { label: 'Length', value: this.escapeHtml(lengthLabel) } : null,
            keysLabel ? { label: 'Keys', value: this.escapeHtml(keysLabel) } : null,
            { label: 'Created', value: this.escapeHtml(createdLabel) },
            { label: 'Updated', value: this.escapeHtml(updatedLabel) }
        ].filter(Boolean);

        const metaHtml = metaRows.map(row => `
            <div class="vault-meta-row">
                <dt>${row.label}</dt>
                <dd>${row.value}</dd>
            </div>
        `).join('');

        this.elements.vaultModal.classList.add('open');
        this.elements.vaultModalBody.innerHTML = `
            <div class="vault-modal-header">
                <div>
                    <div class="vault-modal-title">${this.escapeHtml(entry.label || entry.id)}</div>
                    <div class="vault-modal-subtitle">${this.escapeHtml(entry.type || 'unknown')} &#8226; ${this.formatBytes(entry.bytes)}</div>
                </div>
                <div class="vault-modal-actions">
                    <button class="btn-small" data-vault-modal-mode="preview" ${mode === 'preview' ? 'disabled' : ''}>Preview</button>
                    <button class="btn-small" data-vault-modal-mode="full" ${mode === 'full' ? 'disabled' : ''}>Full</button>
                    <button class="btn-small" data-vault-modal-copy>${mode === 'full' ? 'Copy Full' : 'Copy Preview'}</button>
                </div>
            </div>
            <dl class="vault-modal-meta">${metaHtml}</dl>
            <div class="vault-modal-content">
                <div class="vault-modal-loading">Loading ${mode === 'full' ? 'full data' : 'preview'}.</div>
            </div>
        `;

        const contentEl = this.elements.vaultModalBody.querySelector('.vault-modal-content');
        try {
            const raw = mode === 'full'
                ? dataVault.getFull(id)
                : dataVault.getPreview(id, { limit: limit ?? this.vaultPreviewLimit });
            const display = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
            contentEl.innerHTML = `<pre class=\"vault-modal-pre\">${this.escapeHtml(display)}</pre>`;
            contentEl.__vaultContent = display;
            contentEl.dataset.vaultMode = mode;
        } catch (error) {
            contentEl.innerHTML = `<div class=\"vault-modal-error\">Unable to load data: ${this.escapeHtml(error.message || String(error))}</div>`;
            contentEl.__vaultContent = '';
            contentEl.dataset.vaultMode = mode;
        }

        const modeButtons = this.elements.vaultModalBody.querySelectorAll('[data-vault-modal-mode]');
        modeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const nextMode = button.getAttribute('data-vault-modal-mode') === 'full' ? 'full' : 'preview';
                if (nextMode !== mode) {
                    void this.openVaultPreview(id, nextMode, limit);
                }
            });
        });

        const copyButton = this.elements.vaultModalBody.querySelector('[data-vault-modal-copy]');
        if (copyButton) {
            copyButton.addEventListener('click', async () => {
                const payload = contentEl.__vaultContent;
                if (typeof payload !== 'string' || payload.length === 0) {
                    alert('No data available to copy yet.');
                    return;
                }
                if (!navigator.clipboard || !navigator.clipboard.writeText) {
                    alert('Clipboard access is unavailable in this browser. Select the text manually to copy.');
                    return;
                }
                try {
                    await navigator.clipboard.writeText(payload);
                    const originalLabel = contentEl.dataset.vaultMode === 'full' ? 'Copy Full' : 'Copy Preview';
                    copyButton.textContent = 'Copied!';
                    copyButton.disabled = true;
                    setTimeout(() => {
                        copyButton.disabled = false;
                        copyButton.textContent = originalLabel;
                    }, 1400);
                } catch (error) {
                    console.error('Clipboard write failed', error);
                    alert('Unable to copy automatically. Please select the text in the preview and copy it manually.');
                }
            });
        }
    }

    closeVaultModal() {
        if (this.elements.vaultModal) {
            this.elements.vaultModal.classList.remove('open');
        }
    }

    handleVaultChipClick(event) {
        const chip = event.target.closest('.vault-chip');
        if (!chip) {
            return;
        }

        const id = chip.getAttribute('data-vault-id');
        if (!id) {
            return;
        }

        void this.openVaultPreview(id, 'preview');
    }

    renderChatHistory() {
        const history = storageManager.getChatHistory();
        const container = this.elements.chatContainer;

        if (history.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = history.map(msg => `
            <div class="chat-message ${msg.role}">
                <div class="chat-message-header">${msg.role}</div>
                <div class="chat-message-content">${this.formatMultilineHtml(msg.content)}</div>
            </div>
        `).join('');

        container.scrollTop = container.scrollHeight;
    }

    addChatMessage(role, content) {
        storageManager.addChatMessage({ role, content });
        this.renderChatHistory();
    }

    setStatus(message) {
        this.elements.statusIndicator.textContent = message;
        this.elements.statusIndicator.classList.add('active');
    }

    clearStatus() {
        this.elements.statusIndicator.classList.remove('active');
    }

    formatTaskStatus(status) {
        if (!status) return 'pending';
        const normalized = String(status).replace(/_/g, ' ').toLowerCase();
        return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
    }

    formatRelativeTime(timestamp) {
        if (!timestamp) {
            return 'now';
        }
        const diff = Date.now() - timestamp;
        const seconds = Math.floor(diff / 1000);
        if (seconds < 60) return 'moments ago';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} min ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
        return new Date(timestamp).toLocaleDateString();
    }

    formatDuration(ms) {
        if (!Number.isFinite(ms) || ms <= 0) {
            return '';
        }

        const seconds = Math.ceil(ms / 1000);
        if (seconds < 60) {
            return `${seconds}s`;
        }

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        if (minutes < 60) {
            return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
        }

        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (hours < 24) {
            return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
        }

        const days = Math.floor(hours / 24);
        return `${days}d`;
    }

    formatBytes(bytes) {
        if (!Number.isFinite(bytes) || bytes < 0) {
            return '�';
        }

        if (bytes < 1024) {
            return `${bytes} B`;
        }

        const units = ['KB', 'MB', 'GB', 'TB'];
        let value = bytes / 1024;
        let unitIndex = 0;

        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex += 1;
        }

        const precision = value >= 100 ? 0 : value >= 10 ? 1 : 2;
        return `${value.toFixed(precision)} ${units[unitIndex]}`;
    }

    buildKeyStatusTooltip(status) {
        if (!status || !status.hasKey) {
            return 'No API key stored in this slot.';
        }

        const lines = [
            `Slot ${status.index + 1}`,
            `Usage this session: ${status.usageCount || 0} call${status.usageCount === 1 ? '' : 's'}`
        ];

        if (status.active) {
            lines.push('Currently active key.');
        }

        if (status.lastUsedAt) {
            lines.push(`Last used ${this.formatRelativeTime(status.lastUsedAt)}.`);
        }

        if (status.rateLimited && status.cooldownRemainingMs > 0) {
            lines.push(`Cooling down for ~${this.formatDuration(status.cooldownRemainingMs)}.`);
        }

        if (status.invalid) {
            lines.push(status.invalidMessage || 'Marked invalid.');
            lines.push('The lab will not reuse this key until it is replaced.');
        } else if (status.lastError) {
            const errorPrefix = status.lastErrorAt
                ? `Last error (${this.formatRelativeTime(status.lastErrorAt)}):`
                : 'Last error:';
            lines.push(`${errorPrefix} ${status.lastError}`);
            lines.push(status.willRetry === false
                ? 'The lab will skip this key until you update it.'
                : 'The lab will retry this key after rotating through others.');
        }

        return lines.join('\n');
    }

    truncateText(text, maxLength = 800) {
        if (typeof text !== 'string') return '';
        if (text.length <= maxLength) return text;
        return `${text.slice(0, maxLength)}... (truncated)`;
    }

    summarizeToolResults(results) {
        if (!Array.isArray(results) || results.length === 0) {
            return [];
        }

        return results.map(result => ({
            tool: result.tool || result.type,
            type: result.type,
            summary: this.describeToolResult(result)
        }));
    }

    describeToolResult(result) {
        const toolName = result.tool || result.type;
        switch (result.type) {
            case 'memory_create':
                return `create_memory -> Stored memory ${result.id} (${result.name || result.summary || 'unnamed'})`;
            case 'memory_fetch':
                if (!result.found) {
                    return `fetch_memory -> Memory ${result.id} was not found.`;
                }
                return `fetch_memory -> Memory ${result.id} (${result.name || 'unnamed'}) retrieved.`;
            case 'memory_update': {
                const updatedKeys = Object.keys(result.updates || {}).join(', ') || 'content';
                return result.success
                    ? `update_memory -> Updated memory ${result.id} fields: ${updatedKeys}`
                    : `update_memory -> Failed to update memory ${result.id}`;
            }
            case 'memory_delete':
                return `delete_memory -> Removed memory ${result.id}`;
            case 'task_create':
                return `create_task -> Created task ${result.id} (${result.name || 'unnamed'})`;
            case 'task_update': {
                const statusLabel = result.updates?.status
                    ? this.formatTaskStatus(result.updates.status)
                    : null;
                const notes = result.updates?.notes ? ` (notes: ${result.updates.notes})` : '';
                const renamed = result.updates?.name ? ` name -> ${result.updates.name}` : '';
                return result.success
                    ? `update_task -> Task ${result.id}${statusLabel ? ` status -> ${statusLabel}` : ''}${renamed}${notes}`
                    : `update_task -> Task ${result.id} not found.`;
            }
            case 'goal_create':
                return `create_goal -> Added goal ${result.id} (${result.name || 'unnamed'})`;
            case 'js_execution': {
                if (result.error) {
                    return `execute_js -> Execution failed: ${this.truncateText(result.error, 200)}`;
                }

                const entry = result.vaultId
                    ? dataVault.getEntry(result.vaultId)
                    : (result.vaultReference ? dataVault.getEntryByReference(result.vaultReference) : null);

                if (entry) {
                    return `execute_js -> Success. Result stored as ${entry.reference} (${entry.label || entry.type}). Use Lab.read() or Lab.value() to access it.`;
                }

                const output = result.output || result.result || 'Execution succeeded.';
                return `execute_js -> Success.\n${this.truncateText(output, 200)}`;
            }
            case 'canvas_create':
                return `canvas_html -> Created canvas ${result.id}`;
            case 'vault_read':
                if (!result.exists) {
                    return `vault_read -> Entry ${result.id} not found.`;
                }
                if (result.mode === 'full') {
                    // FIX: Never inline full content in tool result summary
                    return `vault_read -> Retrieved full content for ${result.id}. Use in next execute_js with Lab.value()`;
                }
                return `vault_read -> Preview for ${result.id}:\n${this.truncateText(result.result || '', 300)}`;
            case 'vault_delete':
                return result.deleted
                    ? `vault_delete -> Removed ${result.id}`
                    : `vault_delete -> Entry ${result.id} not found.`;
            default:
                return `${toolName} -> Completed.`;
        }
    }
    sanitizeReasoningText(text) {
        if (!text) return '';

        let cleaned = this.extractReasoningText(text);
        const toolTags = [
            'create_memory',
            'fetch_memory',
            'update_memory',
            'delete_memory',
            'create_goal',
            'create_task',
            'update_task',
            'execute_js',
            'canvas_html',
            'vault_read',
            'vault_delete',
            'final_output',
            'continue_reasoning'
        ];

        toolTags.forEach((tag) => {
            const blockRegex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
            const selfClosingRegex = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
            cleaned = cleaned.replace(blockRegex, '');
            cleaned = cleaned.replace(selfClosingRegex, '');
        });

        cleaned = cleaned.replace(/<tool_activity[^>]*>[\s\S]*?<\/tool_activity>/gi, '');
        cleaned = cleaned.replace(/<tool_result[^>]*>[\s\S]*?<\/tool_result>/gi, '');
        cleaned = cleaned.replace(/^[ \t]*tool call[^\n]*$/gim, '');
        cleaned = cleaned.replace(/^[ \t]*tool result[^\n]*$/gim, '');
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

        return cleaned.trim();
    }

    extractReasoningText(text) {
        if (typeof text !== 'string' || text.length === 0) {
            return '';
        }
        const matches = Array.from(text.matchAll(/<reasoning_text[^>]*>([\s\S]*?)<\/reasoning_text>/gi));
        if (matches.length > 0) {
            const segments = matches
                .map(match => match[1].trim())
                .filter(segment => segment.length > 0);
            if (segments.length > 0) {
                return segments.join('\n\n');
            }
        }
        return text.trim();
    }

    deriveReasoningName(text) {
        if (!text) {
            return 'Reasoning Step';
        }
        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        if (lines.length === 0) {
            return 'Reasoning Step';
        }
        return lines[0].slice(0, 120);
    }

    deriveReasoningDescription(text, name) {
        if (!text) {
            return '';
        }
        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        if (lines.length <= 1) {
            return '';
        }
        const remainder = lines.slice(1).join(' ');
        const summary = remainder.replace(/\s+/g, ' ').trim();
        if (!summary) {
            return '';
        }
        if (name && summary.startsWith(name)) {
            return summary.slice(name.length).trim().slice(0, 200);
        }
        return summary.slice(0, 200);
    }

    normalizeToolType(toolName) {
        if (!toolName) {
            return 'tool';
        }
        return toolName.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    getToolDisplayName(toolName) {
        const normalized = this.normalizeToolType(toolName);
        const displayMap = {
            'create-memory': 'Create Memory',
            'fetch-memory': 'Fetch Memory',
            'update-memory': 'Update Memory',
            'delete-memory': 'Delete Memory',
            'create-task': 'Create Task',
            'update-task': 'Update Task',
            'create-goal': 'Create Goal',
            'execute-js': 'Execute JS',
            'canvas-html': 'Canvas HTML'
        };

        if (displayMap[normalized]) {
            return displayMap[normalized];
        }

        if (typeof toolName === 'string' && toolName.trim().length > 0) {
            return toolName.trim();
        }

        return 'Tool';
    }

    formatMultilineHtml(text) {
        if (!text) return '';
        const decorated = this.decorateVaultTokens(text);
        return decorated.replace(/\n/g, '<br>');
    }

    async sendMessage() {
        const message = this.elements.chatInput.value.trim();
        if (!message) return;
        if (this.isProcessing) return;

        if (this.freezeState.mode === 'active') {
            this.addChatMessage('model', 'The lab is currently frozen. Resume before sending a new message.');
            return;
        }

        if (this.sessionContext && !this.sessionContext.finished) {
            this.addChatMessage('model', 'Another reasoning session is still running. Please wait or freeze/resume it before starting a new request.');
            return;
        }

        this.elements.chatInput.value = '';
        this.elements.sendBtn.disabled = true;
        this.isProcessing = true;

        this.addChatMessage('user', message);

        const context = this.createReasoningContext(message);
        this.sessionContext = context;

        try {
            await this.processReasoningIterations(context);
        } catch (error) {
            console.error('Error in reasoning loop:', error);
            this.addChatMessage('model', this.getFriendlyErrorMessage(error));
        } finally {
            const frozen = this.freezeState.mode === 'active';
            if (!frozen) {
                this.elements.sendBtn.disabled = false;
            }
            this.isProcessing = false;
            if (!frozen) {
                this.clearStatus();
            }
            this.updateKeyStatusIndicators();
        }
    }

    getFriendlyErrorMessage(error) {
        const message = error?.message || 'Unknown error occurred.';
        const normalized = message.toLowerCase();

        if (normalized.includes('no valid gemini api keys')) {
            return 'Unable to reach Gemini because no valid API keys are configured. Please update the keys above and try again.';
        }

        if (normalized.includes('api key not valid')) {
            return 'The current API key is not valid. Please replace it in the API Keys panel and try again.';
        }

        return `Error: ${message}`;
    }

    createReasoningContext(userMessage) {
        return {
            userMessage,
            systemPrompt: this.buildSystemPrompt(),
            model: storageManager.getSelectedModel(),
            iteration: 0,
            maxIterations: Number.POSITIVE_INFINITY,
            finished: false,
            paused: false
        };
    }

    async processReasoningIterations(context) {
        this.setStatus('Reasoning...');

        while (context.iteration < context.maxIterations && !context.finished) {
            if (this.freezeState.mode === 'pending') {
                this.activateFreeze(context);
                return;
            }

            context.iteration += 1;

            const iterationPrompt = this.buildIterationPrompt(context.userMessage, context.iteration);

            let fullResponse = '';
            try {
                for await (const chunk of geminiAPI.streamGenerateContent(iterationPrompt, context.systemPrompt, context.model)) {
                    fullResponse += chunk;
                }
            } catch (error) {
                throw new Error(`API call failed: ${error.message}`);
            }

            this.updateKeyStatusIndicators();

            this.setStatus('Executing tools...');
            const rawToolResults = await toolExecutor.executeTools(fullResponse);

            rawToolResults.forEach(result => {
                if (result.type.startsWith('memory')) this.renderMemories();
                if (result.type.startsWith('task')) this.renderTasks();
                if (result.type.startsWith('goal')) this.renderGoals();
                if (result.type === 'js_execution') {
                    this.renderCodeExecutions();
                    if (result.vaultId || result.vaultReference) {
                        this.renderDataVault();
                    }
                }
                if (result.type === 'canvas_create') this.renderCanvases();
                if (result.type.startsWith('vault')) this.renderDataVault();
            });

            const structuredToolResults = this.summarizeToolResults(rawToolResults);
            const toolsUsed = structuredToolResults.map(result => result.tool);
            this.addReasoningStep(fullResponse, toolsUsed, structuredToolResults);

            const finalOutput = toolExecutor.checkForFinalOutput(fullResponse);
            if (finalOutput) {
                this.setStatus('Verifying output...');

                const verified = await this.verifyOutput(finalOutput, context.systemPrompt, context.model);

                if (verified) {
                    this.addChatMessage('model', verified);
                    context.finished = true;
                    this.sessionContext = null;
                    if (this.freezeState.mode !== 'active') {
                        this.clearStatus();
                    }
                    return;
                }
            }

            if (toolExecutor.checkForContinueReasoning(fullResponse)) {
                this.setStatus('Reasoning...');
                continue;
            }

            this.setStatus('Reasoning...');
        }

        if (context.iteration >= context.maxIterations) {
            this.addChatMessage('model', 'Maximum iterations reached. Please refine your request.');
        }

        context.finished = true;
        this.sessionContext = null;
        if (this.freezeState.mode !== 'active') {
            this.clearStatus();
        }
    }

    handleFreezeToggle() {
        const btn = this.elements.freezeBtn;
        if (!btn || btn.disabled) {
            return;
        }

        btn.disabled = true;
        const state = this.freezeState.mode || 'inactive';

        if (state === 'inactive') {
            this.requestFreeze();
            btn.disabled = false;
        } else if (state === 'pending') {
            this.cancelFreezeRequest();
            btn.disabled = false;
        } else if (state === 'active') {
            void this.resumeFromFreeze().finally(() => {
                btn.disabled = false;
            });
        } else {
            btn.disabled = false;
        }
    }

    requestFreeze() {
        if (!this.isProcessing) {
            this.addChatMessage('model', 'Lab is not currently processing. Nothing to freeze.');
            return;
        }
        this.freezeState = {
            mode: 'pending',
            requestedAt: Date.now()
        };
        this.updateFreezeUi();
    }

    cancelFreezeRequest() {
        this.freezeState = { mode: 'inactive' };
        if (this.isProcessing) {
            this.setStatus('Reasoning...');
        } else {
            this.clearStatus();
        }
        this.updateFreezeUi();
    }

    activateFreeze(context) {
        this.freezeState = {
            mode: 'active',
            requestedAt: (this.freezeState && this.freezeState.requestedAt) || Date.now()
        };

        if (context) {
            context.paused = true;
        }

        this.isProcessing = false;
        this.updateFreezeUi();
        this.setStatus('Frozen � edit tasks or data, then resume when ready.');
    }

    async resumeFromFreeze() {
        if (this.freezeState.mode !== 'active') {
            return;
        }

        const context = this.sessionContext;
        this.freezeState = { mode: 'inactive' };
        this.updateFreezeUi();

        if (context && context.paused && !context.finished) {
            context.paused = false;
            this.isProcessing = true;
            this.elements.sendBtn.disabled = true;
            this.setStatus('Resuming reasoning...');

            try {
                await this.processReasoningIterations(context);
            } catch (error) {
                console.error('Error while resuming reasoning:', error);
                this.addChatMessage('model', this.getFriendlyErrorMessage(error));
            } finally {
                const frozen = this.freezeState.mode === 'active';
                if (!frozen) {
                    this.elements.sendBtn.disabled = false;
                    this.clearStatus();
                }
                this.isProcessing = false;
                this.updateKeyStatusIndicators();
            }
        } else {
            this.clearStatus();
        }
    }

    updateFreezeUi() {
        const state = this.freezeState.mode || 'inactive';
        const btn = this.elements.freezeBtn;
        const statusEl = this.elements.freezeStatus;

        if (btn) {
            btn.classList.remove('freeze-active', 'freeze-pending');
            btn.disabled = false;

            if (state === 'inactive') {
                btn.textContent = 'Freeze';
            } else if (state === 'pending') {
                btn.textContent = 'Waiting�';
                btn.classList.add('freeze-pending');
            } else if (state === 'active') {
                btn.textContent = 'Resume';
                btn.classList.add('freeze-active');
            } else {
                btn.textContent = 'Freeze';
            }
        }

        if (statusEl) {
            statusEl.classList.remove('is-pending', 'is-active', 'active');
            if (state === 'inactive') {
                statusEl.textContent = '';
            } else if (state === 'pending') {
                statusEl.textContent = 'Freeze queued. Pausing after this iteration.';
                statusEl.classList.add('is-pending', 'active');
            } else if (state === 'active') {
                statusEl.textContent = 'Frozen. Resume when ready.';
                statusEl.classList.add('is-active', 'active');
            } else {
                statusEl.textContent = '';
            }
        }

        if (state === 'active') {
            this.elements.sendBtn.disabled = true;
        } else if (!this.isProcessing) {
            this.elements.sendBtn.disabled = false;
        }
    }

    buildSystemPrompt() {
        return `You are the coordinator of the Gemini Advanced Reasoning Lab, an in-browser workspace with unlimited tool calls and iterations. Stay methodical, keep the workspace organised, and do not stop until the user's goals are satisfied or blocked with clear reasons.

## Mindset & Workflow
1. Understand the latest user input and restate the objectives in your own plan.
2. Break the work into tasks/goals; keep them updated after every meaningful action.
3. Think inside <reasoning_text>...</reasoning_text> and call tools to execute the plan.
4. Persist artefacts, large data, and reusable knowledge in the appropriate stores.
5. Verify results when possible, then close out with <final_output> only when truly done.

## Toolset Reference
### Planning & Tracking
- <create_goal>Goal description</create_goal>
  Purpose: capture a top-level objective. Immutable; mark completion in the final output.
- <create_task description="..." [notes="..."] [status="pending|ongoing|complete"]>Optional details</create_task>
  Purpose: break work into actionable steps. Default status is pending.
- <update_task id="task_ID" status="pending|ongoing|complete" [notes="..."] [description="..."]>Optional details</update_task>
  Purpose: advance or revise an existing task. Always update notes when progress is made and cite vault tokens if relevant.

### Knowledge Management
- <create_memory summary="why this matters" [name="..."] [description="..."]>Full content</create_memory>
  Stores durable insights. Summaries must explain future usefulness.
- <fetch_memory id="mem_ID" /> retrieves the stored memory.
- <update_memory id="mem_ID" ...>New content</update_memory> revises name/summary/description/content.
- <delete_memory id="mem_ID" /> removes obsolete knowledge.

### Execution & Artefacts
- <execute_js>JavaScript using Lab helpers</execute_js>
  Runs synchronously in the browser. Use Lab.store/Lab.read/Lab.value/etc. for data exchange. Handle errors and return tokens or concise results.
- <canvas_html>HTML document</canvas_html>
  Creates a persistent interactive canvas for dashboards, reports, or mini-apps.
- <vault_read id="data_ID" mode="preview|full" [limit="n"] /> inspects stored data outside JS execution.
- <vault_delete id="data_ID" /> cleans up vault entries that are no longer needed.
- <final_output>Summary for the user with optional [[vault:ID]] references</final_output>
  Ends the session; only emit when all goals are handled and handoffs are clear.

## Data Vault Discipline
- Vault any object/array/Map/Set, any string >500 characters, binary/blob data, API responses, CSV/file contents, and functions.
- Provide descriptive labels and helpful tags when storing so entries are discoverable.
- Lab.store returns [[vault:id]] tokens; reuse tokens everywhere instead of copying raw content.
- Lab.read, Lab.value, Lab.info, Lab.list, and Lab.drop are synchronous; never await them.
- Stored functions return metadata objects ({ __storedFunction: true, source, name, ... }). Reconstruct with eval(source) before invoking.

## Reasoning & Safety Rules
- Keep <reasoning_text> concise; reference task/goal ids and vault tokens for traceability.
- Do not fabricate tool results. If something fails, record the error, decide whether to retry, and note it in tasks.
- Never expose API keys or sensitive system details to the user.
- Remove temporary vault entries once they are integrated or no longer needed.
- Respect browser security constraints (CORS, permissions); report any limitations honestly.

## Coding Guidelines inside <execute_js>
- Use the provided Lab helpers; do not redeclare them.
- Validate inputs when feasible and guard against runtime errors.
- Store large outputs via Lab.store and return the reference token instead of inline data.
- Wrap async work in try/catch and surface failures clearly (e.g., return an error message or store details in the vault).

## Outcome Expectations
- Maintain an up-to-date task board: every multi-step effort needs a task, and statuses must reflect real progress.
- Only create memories for durable insights or decisions that will help future iterations.
- Before emitting <final_output>, confirm: goals satisfied or blocked with explanation, tasks resolved or handed off, key artefacts vaulted or summarised, and remaining next steps (if any) are explicit for the user.

Proceed with disciplined reasoning. The current workspace state follows.`;
    }
    buildIterationPrompt(userMessage, iteration) {
        const memories = storageManager.getMemories();
        const goals = storageManager.getGoals();
        const tasks = [...storageManager.getTasks()].sort((a, b) => {
            const aTime = a.createdAt || 0;
            const bTime = b.createdAt || 0;
            return aTime - bTime;
        });
        const reasoning = storageManager.getReasoning();

        const lines = [
            '## Operating Reminder:',
            '- Use the XML tools exactly as defined (no JavaScript helpers for memory, goals, or tasks).',
            '- Wait for the system-provided "Tool Activity" summaries before relying on tool results.',
            '- Keep task progress current with <update_task id="..."> using the IDs shown below.',
            '- When you encounter [[vault:...]] references, inspect them with <vault_read id="vault_id" mode="preview" limit="1200" /> (or mode="full") and continue using the token instead of copying raw data.',
            '- Wrap all narrative thoughts inside <reasoning_text>...</reasoning_text> and run any actual code through <execute_js>; do not inline commented code in the reasoning channel.',
            '',
            '## User Request:',
            userMessage,
            ''
        ];

        if (iteration === 1) {
            lines.push('This is your first iteration. Please break down the task and create initial tasks.', '');
        }

        if (memories.length > 0) {
            lines.push('## Memories Available (summaries only):');
            memories.slice(-10).forEach(m => {
                lines.push(`- ${m.id}: ${m.summary}`);
            });
            lines.push('');
        }

        if (goals.length > 0) {
            lines.push('## Active Goals:');
            goals.forEach(g => {
                lines.push(`- ${g.content}`);
            });
            lines.push('');
        }

        if (tasks.length > 0) {
            lines.push('## Task List:');
            tasks.forEach(t => {
                lines.push(`- [${t.status}] (id: ${t.id}) ${t.description}`);
                if (t.notes) {
                    lines.push(`  Notes: ${t.notes}`);
                }
            });
            lines.push('');
        }

        if (reasoning.length > 0) {
            lines.push('## Recent Lab Activity:');
            reasoning.slice(-3).forEach(r => {
                const sanitized = this.sanitizeReasoningText(r.content || '');
                const thought = this.truncateText(sanitized, 300);
                if (thought) {
                    lines.push(`Step ${r.step}: ${thought}`);
                }

                if (Array.isArray(r.toolResults) && r.toolResults.length > 0) {
                    const toolSummary = r.toolResults.map(t => {
                        const tool = t.tool || 'tool';
                        if (t.summary && t.summary.includes('[[vault:')) {
                            const vaultMatch = t.summary.match(/\[\[vault:[^\]]+\]\]/);
                            return `${tool} -> ${vaultMatch ? vaultMatch[0] : 'completed'}`;
                        }
                        return `${tool} -> ${this.truncateText(t.summary || 'completed', 80)}`;
                    }).join(', ');
                    lines.push(`  Tools: ${toolSummary}`);
                }
            });
            lines.push('');
        }

        const vaultEntries = dataVault.listEntries();
        if (vaultEntries.length > 0) {
            lines.push('## Data Vault Status:');
            lines.push(`You have ${vaultEntries.length} stored items. Use Lab.list() to see them all.`);
            lines.push('Recent vault entries:');
            vaultEntries.slice(-5).forEach(entry => {
                lines.push(`- ${entry.reference}: ${entry.label || entry.type} (${this.formatBytes(entry.bytes)})`);
            });
            lines.push('');
        }

        lines.push('Continue your reasoning and use tools as needed. Fetch all the tasks, memories and goals to know the current status. When completely done, output <final_output>.');

        return lines.join('\n');
    }

    async verifyOutput(output, systemPrompt, model) {
        const goals = storageManager.getGoals();
        const tasks = storageManager.getTasks();

        const verificationPrompt = `You previously output a final answer for verification.

## Your Goals Were:
${goals.map(g => '- ' + g.content).join('\n')}

## Your Task Status:
${tasks.map(t => `- [${t.status}] (id: ${t.id}) ${t.description}` + (t.notes ? ` | Notes: ${t.notes}` : '')).join('\n')}

## Your Proposed Output Was:
${output}

Verify this output meets ALL goals and is complete. 
If yes, output it as final answer (can include {{VARIABLES}}).
If no, output <continue_reasoning> and explain what's missing.`;

        try {
            const response = await geminiAPI.generateContent(verificationPrompt, systemPrompt, model);

            if (toolExecutor.checkForContinueReasoning(response)) {
                return null;
            }

            return toolExecutor.replaceVariables(output);

        } catch (error) {
            console.error('Verification error:', error);
            this.updateKeyStatusIndicators();
            return toolExecutor.replaceVariables(output);
        }
    }

    resetAll() {
        if (!confirm('This will reset all memories, goals, tasks, reasoning, code executions, canvases, and chat history. API keys and selected model will be preserved. Continue?')) {
            return;
        }

        storageManager.resetAll();
        this.renderAll();
    }

    decorateVaultTokens(text) {
        if (typeof text !== 'string' || text.length === 0) {
            return this.escapeHtml(text || '');
        }

        const regex = /\[\[\s*vault:([^\]]+)\s*\]\]/gi;
        let cursor = 0;
        let result = '';
        let match;

        while ((match = regex.exec(text)) !== null) {
            const preceding = text.slice(cursor, match.index);
            if (preceding) {
                result += this.escapeHtml(preceding);
            }

            const id = match[1].trim();
            const entry = dataVault.getEntry(id);
            const label = entry ? (entry.label || entry.type || id) : `vault:${id}`;
            const statusClass = entry ? '' : ' vault-chip--missing';
            const preview = entry && entry.preview
                ? this.escapeAttribute(this.truncateText(entry.preview, 160))
                : '';
            const titleAttr = preview ? ` title="${preview}"` : '';

            result += `<button type="button" class="vault-chip${statusClass}" data-vault-id="${this.escapeAttribute(id)}"${titleAttr}>${this.escapeHtml(label)}</button>`;
            cursor = regex.lastIndex;
        }

        const trailing = text.slice(cursor);
        if (trailing) {
            result += this.escapeHtml(trailing);
        }

        return result;
    }

    escapeAttribute(value) {
        if (value === null || value === undefined) {
            return '';
        }
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export const uiManager = new UIManager();
window.uiManager = uiManager; // Make available for inline onclick handlers








