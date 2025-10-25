// ui-manager.js - UI Manager for Gemini Reasoning Lab (Enhanced Compatible)

import { storageManager } from './storage.js';
import { geminiAPI } from './gemini-api.js';
import { enhancedToolExecutor } from './tool-executor-enhanced.js';
import { enhancedDataVault } from './data-vault-enhanced.js';

// Create compatibility aliases for the enhanced system
const toolExecutor = enhancedToolExecutor;
const dataVault = enhancedDataVault;

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
        if (this.elements.modelSelect) {
            this.elements.modelSelect.value = savedModel;
            this.elements.modelSelect.addEventListener('change', (e) => {
                storageManager.saveSelectedModel(e.target.value);
            });
        }

        if (this.elements.addGoalBtn) {
            this.elements.addGoalBtn.addEventListener('click', () => this.addGoal());
        }
        if (this.elements.goalInput) {
            this.elements.goalInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addGoal();
            });
        }

        if (this.elements.sendBtn) {
            this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        }
        if (this.elements.chatInput) {
            this.elements.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        if (this.elements.memoriesContainer) {
            this.elements.memoriesContainer.addEventListener('click', (event) => {
                this.handleMemoryContainerClick(event);
            });
        }

        if (this.elements.resetBtn) {
            this.elements.resetBtn.addEventListener('click', () => this.resetAll());
        }

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

    // Add simplified methods for compatibility
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
        // Simple status update for compatibility
        const keys = storageManager.getApiKeys();
        this.elements.keyStatusIndicators.forEach((indicator, index) => {
            if (!indicator) return;
            
            const hasKey = keys[index] && keys[index].trim().length > 0;
            indicator.textContent = hasKey ? '●' : '○';
            indicator.style.color = hasKey ? '#28a745' : '#6c757d';
            indicator.title = hasKey ? 'API key configured' : 'No API key';
        });
    }

    async refreshModelList() {
        // Simplified model list for compatibility
        const keys = storageManager.getApiKeys().filter(k => k && k.trim());
        const preferredModel = storageManager.getSelectedModel();
        
        if (!this.elements.modelSelect) return;
        
        if (keys.length === 0) {
            this.elements.modelSelect.innerHTML = this.defaultModels
                .map(model => `<option value="${model}">${model}</option>`)
                .join('');
            this.elements.modelSelect.value = preferredModel || this.defaultModels[0];
            return;
        }
        
        try {
            const models = await geminiAPI.fetchModels() || this.defaultModels;
            this.elements.modelSelect.innerHTML = models
                .map(model => `<option value="${model}">${model}</option>`)
                .join('');
            this.elements.modelSelect.value = preferredModel || models[0];
        } catch (error) {
            console.warn('Model refresh failed:', error);
            this.elements.modelSelect.innerHTML = this.defaultModels
                .map(model => `<option value="${model}">${model}</option>`)
                .join('');
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
    }

    renderMemories() {
        if (!this.elements.memoriesContainer) return;
        
        const memories = storageManager.getMemories();
        if (memories.length === 0) {
            this.elements.memoriesContainer.innerHTML = '<div class="empty-state">No memories yet</div>';
            return;
        }

        this.elements.memoriesContainer.innerHTML = memories.map(memory => `
            <div class="memory-item">
                <div class="memory-header">
                    <div class="memory-summary">${this.escapeHtml(memory.summary || memory.name || 'Untitled')}</div>
                    <div class="memory-actions">
                        <button class="btn-small" onclick="window.uiManager.toggleMemory('${memory.id}')">View</button>
                        <button class="btn-small btn-danger" onclick="window.uiManager.deleteMemory('${memory.id}')">Del</button>
                    </div>
                </div>
                <div class="memory-content" id="memory-${memory.id}" style="display:none;">${this.formatMultilineHtml(memory.content || '')}</div>
            </div>
        `).join('');
    }

    toggleMemory(id) {
        const el = document.getElementById(`memory-${id}`);
        if (el) {
            el.style.display = el.style.display === 'none' ? 'block' : 'none';
        }
    }

    deleteMemory(id) {
        if (confirm('Delete this memory?')) {
            storageManager.deleteMemory(id);
            this.renderMemories();
        }
    }

    handleMemoryContainerClick(event) {
        // Handle any memory container clicks
    }

    renderGoals() {
        if (!this.elements.goalsContainer) return;
        
        const goals = storageManager.getGoals();
        if (goals.length === 0) {
            this.elements.goalsContainer.innerHTML = '<div class="empty-state">No goals yet</div>';
            return;
        }

        this.elements.goalsContainer.innerHTML = goals.map(goal => `
            <div class="goal-item">
                <div class="goal-content">
                    ${this.escapeHtml(goal.content || goal.name || 'Untitled')}
                    <div class="goal-meta">By: ${goal.createdBy}</div>
                </div>
                ${goal.createdBy === 'user' ? 
                    `<button class="btn-small btn-danger" onclick="window.uiManager.deleteGoal('${goal.id}')">Del</button>` 
                    : ''}
            </div>
        `).join('');
    }

    addGoal() {
        if (!this.elements.goalInput) return;
        
        const content = this.elements.goalInput.value.trim();
        if (!content) return;

        storageManager.addGoal({
            name: content,
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
        if (!this.elements.tasksContainer) return;
        
        const tasks = storageManager.getTasks();
        if (tasks.length === 0) {
            this.elements.tasksContainer.innerHTML = '<div class="empty-state">No tasks defined</div>';
            return;
        }

        this.elements.tasksContainer.innerHTML = tasks.map(task => `
            <div class="task-item">
                <div class="task-header">
                    <div class="task-title">${this.escapeHtml(task.name || task.description || 'Untitled')}</div>
                    <span class="task-status status-${task.status || 'pending'}">${task.status || 'pending'}</span>
                </div>
                <div class="task-meta">#${task.id} • ${task.createdBy || 'system'}</div>
                ${task.notes ? `<div class="task-notes">${this.escapeHtml(task.notes)}</div>` : ''}
            </div>
        `).join('');
    }

    handleTasksContainerClick(event) {
        // Handle task clicks
    }

    openTaskModal(taskId) {
        // Simplified task modal
    }

    closeTaskModal() {
        // Close task modal
    }

    saveTaskEdits() {
        // Save task edits
    }

    renderReasoning() {
        if (!this.elements.reasoningContainer) return;
        
        const reasoning = storageManager.getReasoning();
        if (reasoning.length === 0) {
            this.elements.reasoningContainer.innerHTML = '<div class="empty-state">Awaiting user input to begin reasoning...</div>';
            return;
        }

        this.elements.reasoningContainer.innerHTML = reasoning.map(step => {
            const date = new Date(step.timestamp).toLocaleTimeString();
            const content = step.content ? this.formatMultilineHtml(step.content) : 'No content';
            
            return `
                <div class="reasoning-step">
                    <div class="reasoning-step-header">
                        <div class="reasoning-step-index">Step ${step.step}</div>
                        <div class="reasoning-step-meta">${date}</div>
                    </div>
                    <div class="reasoning-content">${content}</div>
                </div>
            `;
        }).join('');

        this.elements.reasoningContainer.scrollTop = this.elements.reasoningContainer.scrollHeight;
    }

    addReasoningStep(rawContent, toolsUsed = [], toolResults = []) {
        storageManager.addReasoningStep({
            content: rawContent,
            toolsUsed,
            toolResults
        });
        this.renderReasoning();
    }

    renderCodeExecutions() {
        if (!this.elements.codeOutputContainer) return;
        
        const executions = storageManager.getCodeExecutions();
        if (executions.length === 0) {
            this.elements.codeOutputContainer.innerHTML = '<div class="empty-state">No code executed yet</div>';
            return;
        }

        this.elements.codeOutputContainer.innerHTML = executions.map(exec => {
            const status = exec.status === 'error' ? 'error' : 'success';
            const output = exec.error ? `Error: ${exec.error}` : (exec.output || 'Success');
            
            return `
                <div class="code-exec-item code-exec-${status}">
                    <div class="code-exec-header">
                        <span class="code-exec-id">${exec.id}</span>
                        <span class="code-exec-status">${status}</span>
                    </div>
                    <pre class="code-exec-code">${this.escapeHtml(exec.code || '')}</pre>
                    <div class="code-exec-output">${this.escapeHtml(output)}</div>
                </div>
            `;
        }).join('');

        this.elements.codeOutputContainer.scrollTop = this.elements.codeOutputContainer.scrollHeight;
    }

    renderCanvases() {
        if (!this.elements.canvasContainer) return;
        
        const canvases = storageManager.getCanvases();
        if (canvases.length === 0) {
            this.elements.canvasContainer.innerHTML = '<div class="empty-state">No canvas output yet</div>';
            return;
        }

        this.elements.canvasContainer.innerHTML = canvases.map(canvas => `
            <div class="canvas-item">
                <iframe srcdoc="${this.escapeHtml(canvas.html)}" sandbox="allow-scripts allow-same-origin"></iframe>
            </div>
        `).join('');
    }

    renderDataVault() {
        if (!this.elements.vaultContainer) return;
        
        const entries = enhancedDataVault.listEntries();
        if (entries.length === 0) {
            this.elements.vaultContainer.innerHTML = '<div class="empty-state">No stored data yet</div>';
            return;
        }

        this.elements.vaultContainer.innerHTML = entries.map(entry => {
            const label = entry.label || entry.type || entry.id;
            const preview = entry.preview ? this.truncateText(entry.preview, 100) : 'No preview';
            
            return `
                <div class="vault-item">
                    <div class="vault-label">${this.escapeHtml(label)}</div>
                    <div class="vault-preview">${this.escapeHtml(preview)}</div>
                    <div class="vault-reference"><code>${this.escapeHtml(entry.reference || entry.id)}</code></div>
                </div>
            `;
        }).join('');
    }

    handleVaultContainerClick(event) {
        // Handle vault clicks
    }

    openVaultPreview(id, mode) {
        // Simplified vault preview
        console.log('Opening vault preview for:', id);
    }

    closeVaultModal() {
        // Close vault modal
    }

    renderChatHistory() {
        if (!this.elements.chatContainer) return;
        
        const history = storageManager.getChatHistory();
        if (history.length === 0) {
            this.elements.chatContainer.innerHTML = '';
            return;
        }

        this.elements.chatContainer.innerHTML = history.map(msg => `
            <div class="chat-message ${msg.role}">
                <div class="chat-message-header">${msg.role}</div>
                <div class="chat-message-content">${this.formatMultilineHtml(msg.content)}</div>
            </div>
        `).join('');

        this.elements.chatContainer.scrollTop = this.elements.chatContainer.scrollHeight;
    }

    addChatMessage(role, content) {
        storageManager.addChatMessage({ role, content });
        this.renderChatHistory();
    }

    setStatus(message) {
        if (this.elements.statusIndicator) {
            this.elements.statusIndicator.textContent = message;
        }
    }

    clearStatus() {
        if (this.elements.statusIndicator) {
            this.elements.statusIndicator.textContent = '';
        }
    }

    async sendMessage() {
        if (!this.elements.chatInput || !this.elements.sendBtn) return;
        
        const message = this.elements.chatInput.value.trim();
        if (!message || this.isProcessing) return;

        this.elements.chatInput.value = '';
        this.elements.sendBtn.disabled = true;
        this.isProcessing = true;

        this.addChatMessage('user', message);
        this.setStatus('Processing...');

        try {
            // Simple processing for compatibility
            const response = await geminiAPI.generateContent(message, '', storageManager.getSelectedModel());
            this.addChatMessage('model', response || 'No response received');
        } catch (error) {
            console.error('Error:', error);
            this.addChatMessage('model', `Error: ${error.message}`);
        } finally {
            this.elements.sendBtn.disabled = false;
            this.isProcessing = false;
            this.clearStatus();
        }
    }

    handleFreezeToggle() {
        // Simplified freeze handling
    }

    resetAll() {
        if (!confirm('This will reset all data. Continue?')) {
            return;
        }

        storageManager.resetAll();
        enhancedDataVault.clear();
        this.renderAll();
    }

    // Utility methods
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatMultilineHtml(text) {
        if (!text) return '';
        return this.escapeHtml(text).replace(/\n/g, '<br>');
    }

    truncateText(text, maxLength = 800) {
        if (typeof text !== 'string') return '';
        if (text.length <= maxLength) return text;
        return `${text.slice(0, maxLength)}...`;
    }
}

export const uiManager = new UIManager();
window.uiManager = uiManager; // Make available for inline onclick handlers