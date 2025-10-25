// ui-manager-enhanced.js - Enhanced UI Manager with Vault System Integration

import { storageManager } from './storage.js';
import { geminiApi } from './gemini-api.js';
import { enhancedToolExecutor } from './tool-executor-enhanced.js';
import { enhancedDataVault } from './data-vault-enhanced.js';
import { vaultTagProcessor } from './vault-tag-processor.js';
import { vaultLLMProcedures } from './vault-llm-procedures.js';

class EnhancedUIManager {
    constructor() {
        this.isReasoning = false;
        this.streamingContent = '';
        this.reasoningStep = 0;
        this.renderSystem();
        this.attachEventListeners();
        this.loadAvailableModels();
        this.updateUI();
    }

    renderSystem() {
        document.body.innerHTML = `
            <div class="lab-container">
                <header class="lab-header">
                    <h1>Gemini Advanced Reasoning Lab <span class="version">v2.0 Enhanced</span></h1>
                    <div class="header-actions">
                        <button id="vault-help" class="btn btn-secondary">Vault System Help</button>
                        <button id="reset-all" class="btn btn-danger">Reset All</button>
                    </div>
                </header>

                <div class="warning-banner">
                    ⚠️ This lab executes JavaScript code without restrictions. The model has complete browser access. Use only with trusted API keys.
                </div>

                <div class="control-panel">
                    <div class="panel-section">
                        <h3>API Configuration</h3>
                        <div class="api-keys-grid">
                            <div class="input-group">
                                <label>API Key 1</label>
                                <input type="password" id="api-key-1" class="api-key-input" placeholder="Enter Gemini API key 1" autocomplete="off">
                                <span class="key-status" id="status-1">●</span>
                            </div>
                            <div class="input-group">
                                <label>API Key 2</label>
                                <input type="password" id="api-key-2" class="api-key-input" placeholder="Enter Gemini API key 2" autocomplete="off">
                                <span class="key-status" id="status-2">●</span>
                            </div>
                            <div class="input-group">
                                <label>API Key 3</label>
                                <input type="password" id="api-key-3" class="api-key-input" placeholder="Enter Gemini API key 3" autocomplete="off">
                                <span class="key-status" id="status-3">●</span>
                            </div>
                            <div class="input-group">
                                <label>API Key 4</label>
                                <input type="password" id="api-key-4" class="api-key-input" placeholder="Enter Gemini API key 4" autocomplete="off">
                                <span class="key-status" id="status-4">●</span>
                            </div>
                            <div class="input-group">
                                <label>API Key 5</label>
                                <input type="password" id="api-key-5" class="api-key-input" placeholder="Enter Gemini API key 5" autocomplete="off">
                                <span class="key-status" id="status-5">●</span>
                            </div>
                        </div>
                        <div class="model-selection">
                            <label for="model-select">Model:</label>
                            <select id="model-select" class="model-dropdown">
                                <option value="">Loading models...</option>
                            </select>
                        </div>
                    </div>

                    <div class="panel-section">
                        <h3>System Status & Vault Statistics</h3>
                        <div class="status-grid">
                            <div class="status-item">
                                <span class="status-label">Vault Entries:</span>
                                <span id="vault-count" class="status-value">0</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">Memory Items:</span>
                                <span id="memory-count" class="status-value">0</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">Active Tasks:</span>
                                <span id="task-count" class="status-value">0</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">Goals Set:</span>
                                <span id="goal-count" class="status-value">0</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="main-content">
                    <div class="left-panel">
                        <div class="panel-section">
                            <h3>Memory System</h3>
                            <div id="memories-list" class="memories-container"></div>
                            <div class="add-memory">
                                <input type="text" id="memory-summary" placeholder="Memory summary">
                                <textarea id="memory-content" placeholder="Memory content"></textarea>
                                <button id="add-memory" class="btn btn-primary">Add Memory</button>
                            </div>
                        </div>

                        <div class="panel-section">
                            <h3>Goals</h3>
                            <div id="goals-list" class="goals-container"></div>
                            <div class="add-goal">
                                <input type="text" id="new-goal" placeholder="Add a goal...">
                                <button id="add-goal" class="btn btn-primary">Add Goal</button>
                            </div>
                        </div>

                        <div class="panel-section">
                            <h3>Data Vault Browser</h3>
                            <div id="vault-browser" class="vault-container"></div>
                            <div class="vault-actions">
                                <button id="refresh-vault" class="btn btn-secondary">Refresh</button>
                                <button id="export-vault" class="btn btn-secondary">Export All</button>
                            </div>
                        </div>
                    </div>

                    <div class="center-panel">
                        <div class="panel-section">
                            <h3>Current Tasks</h3>
                            <div id="tasks-list" class="tasks-container"></div>
                        </div>

                        <div class="panel-section">
                            <h3>Reasoning Chain</h3>
                            <div id="reasoning-chain" class="reasoning-container"></div>
                        </div>

                        <div class="panel-section">
                            <h3>Tool Execution Results</h3>
                            <div id="tool-results" class="tools-container"></div>
                        </div>
                    </div>

                    <div class="right-panel">
                        <div class="panel-section">
                            <h3>Code Execution</h3>
                            <div id="code-execution" class="code-container"></div>
                        </div>

                        <div class="panel-section">
                            <h3>Canvas Outputs</h3>
                            <div id="canvas-outputs" class="canvas-container"></div>
                        </div>
                    </div>
                </div>

                <div class="chat-section">
                    <div id="chat-history" class="chat-container"></div>
                    <div class="chat-input-area">
                        <textarea id="user-input" placeholder="Enter your request..." rows="3"></textarea>
                        <button id="send-message" class="btn btn-primary">Send</button>
                        <button id="stop-reasoning" class="btn btn-danger" style="display: none;">Stop</button>
                    </div>
                    <div class="system-status">
                        <span id="status-message">Ready</span>
                        <span id="reasoning-progress"></span>
                    </div>
                </div>
            </div>

            <!-- Vault Help Modal -->
            <div id="vault-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Data Vault System Guide</h2>
                        <button id="close-modal" class="btn btn-secondary">×</button>
                    </div>
                    <div class="modal-body">
                        <div id="vault-help-content"></div>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // API key management
        for (let i = 1; i <= 5; i++) {
            const keyInput = document.getElementById(`api-key-${i}`);
            keyInput.addEventListener('input', () => this.saveApiKey(i, keyInput.value));
            keyInput.addEventListener('blur', () => this.validateApiKey(i));
        }

        // Model selection
        document.getElementById('model-select').addEventListener('change', (e) => {
            storageManager.setSelectedModel(e.target.value);
        });

        // Memory management
        document.getElementById('add-memory').addEventListener('click', () => this.addMemory());
        
        // Goals management
        document.getElementById('add-goal').addEventListener('click', () => this.addGoal());
        document.getElementById('new-goal').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.addGoal();
            }
        });

        // Vault management
        document.getElementById('refresh-vault').addEventListener('click', () => this.updateVaultBrowser());
        document.getElementById('export-vault').addEventListener('click', () => this.exportVault());
        
        // Chat functionality
        document.getElementById('send-message').addEventListener('click', () => this.sendMessage());
        document.getElementById('stop-reasoning').addEventListener('click', () => this.stopReasoning());
        document.getElementById('user-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // System controls
        document.getElementById('reset-all').addEventListener('click', () => this.resetAll());
        document.getElementById('vault-help').addEventListener('click', () => this.showVaultHelp());
        document.getElementById('close-modal').addEventListener('click', () => this.hideVaultHelp());
        
        // Modal click outside to close
        document.getElementById('vault-modal').addEventListener('click', (e) => {
            if (e.target.id === 'vault-modal') {
                this.hideVaultHelp();
            }
        });
    }

    async loadAvailableModels() {
        try {
            const models = await geminiApi.getAvailableModels();
            const modelSelect = document.getElementById('model-select');
            modelSelect.innerHTML = '';
            
            if (models.length === 0) {
                modelSelect.innerHTML = '<option value="">No models available</option>';
                return;
            }

            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.name;
                option.textContent = model.displayName || model.name;
                modelSelect.appendChild(option);
            });

            const savedModel = storageManager.getSelectedModel();
            if (savedModel && models.some(m => m.name === savedModel)) {
                modelSelect.value = savedModel;
            } else {
                modelSelect.value = models[0].name;
                storageManager.setSelectedModel(models[0].name);
            }
        } catch (error) {
            console.error('Failed to load models:', error);
            const modelSelect = document.getElementById('model-select');
            modelSelect.innerHTML = '<option value="">Failed to load models</option>';
        }
    }

    updateUI() {
        this.loadApiKeys();
        this.updateMemoriesList();
        this.updateGoalsList();
        this.updateTasksList();
        this.updateReasoningChain();
        this.updateChatHistory();
        this.updateCodeExecution();
        this.updateCanvasOutputs();
        this.updateVaultBrowser();
        this.updateSystemStats();
        this.updateApiKeyStatuses();
    }

    updateSystemStats() {
        const vaultEntries = enhancedDataVault.listEntries();
        const memories = storageManager.getMemories();
        const tasks = storageManager.getTasks();
        const goals = storageManager.getGoals();
        
        document.getElementById('vault-count').textContent = vaultEntries.length;
        document.getElementById('memory-count').textContent = memories.length;
        document.getElementById('task-count').textContent = tasks.filter(t => t.status !== 'complete').length;
        document.getElementById('goal-count').textContent = goals.length;
    }

    updateVaultBrowser() {
        const container = document.getElementById('vault-browser');
        const entries = enhancedDataVault.listEntries();
        
        if (entries.length === 0) {
            container.innerHTML = '<div class="empty-state">No vault entries yet</div>';
            return;
        }
        
        container.innerHTML = entries.map(entry => {
            const preview = entry.preview ? entry.preview.substring(0, 100) + (entry.preview.length > 100 ? '...' : '') : '';
            return `
                <div class="vault-entry" data-id="${entry.id}">
                    <div class="vault-entry-header">
                        <span class="vault-id">${entry.id}</span>
                        <span class="vault-type">${entry.type}</span>
                        <button class="btn-small btn-danger" onclick="enhancedUIManager.deleteVaultEntry('${entry.id}')">×</button>
                    </div>
                    <div class="vault-label">${entry.label || 'Unlabeled'}</div>
                    <div class="vault-preview">${preview}</div>
                    <div class="vault-meta">
                        <span class="vault-size">${entry.bytes} bytes</span>
                        <span class="vault-tags">${(entry.tags || []).join(', ')}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    deleteVaultEntry(id) {
        if (confirm('Delete this vault entry?')) {
            enhancedDataVault.delete(id);
            this.updateVaultBrowser();
            this.updateSystemStats();
        }
    }

    exportVault() {
        const entries = enhancedDataVault.listEntries();
        const exportData = {
            timestamp: new Date().toISOString(),
            entries: entries.map(entry => ({
                id: entry.id,
                label: entry.label,
                type: entry.type,
                content: enhancedDataVault.getFull(entry.id),
                tags: entry.tags,
                metadata: entry.metadata
            }))
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vault-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showVaultHelp() {
        const modal = document.getElementById('vault-modal');
        const content = document.getElementById('vault-help-content');
        
        // Generate comprehensive help content
        const instructions = vaultLLMProcedures.generateLLMInstructions();
        const quickRef = vaultLLMProcedures.generateQuickReference();
        
        content.innerHTML = `
            <div class="help-section">
                <h3>Quick Reference</h3>
                <pre>${quickRef}</pre>
            </div>
            <div class="help-section">
                <h3>Complete Usage Guide</h3>
                <div class="instructions-content">${this.markdownToHtml(instructions)}</div>
            </div>
        `;
        
        modal.style.display = 'flex';
    }

    hideVaultHelp() {
        document.getElementById('vault-modal').style.display = 'none';
    }

    markdownToHtml(markdown) {
        return markdown
            .replace(/^### (.*$)/gim, '<h4>$1</h4>')
            .replace(/^## (.*$)/gim, '<h3>$1</h3>')
            .replace(/^# (.*$)/gim, '<h2>$1</h2>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    loadApiKeys() {
        const keys = storageManager.getApiKeys();
        keys.forEach((key, index) => {
            const input = document.getElementById(`api-key-${index + 1}`);
            if (input && key) {
                input.value = key;
            }
        });
    }

    saveApiKey(keyNumber, value) {
        const keys = storageManager.getApiKeys();
        keys[keyNumber - 1] = value;
        storageManager.setApiKeys(keys);
        geminiApi.updateApiKeys(keys.filter(k => k));
    }

    validateApiKey(keyNumber) {
        // Visual validation could be added here
        this.updateApiKeyStatuses();
    }

    updateApiKeyStatuses() {
        const keyStatus = geminiApi.getKeyStatuses();
        for (let i = 1; i <= 5; i++) {
            const statusElement = document.getElementById(`status-${i}`);
            const status = keyStatus.statuses[i - 1];
            
            statusElement.className = 'key-status';
            if (status === 'active') {
                statusElement.className += ' status-active';
                statusElement.title = 'Key is active';
            } else if (status === 'rate-limited') {
                statusElement.className += ' status-rate-limited';
                statusElement.title = 'Key is rate limited';
            } else {
                statusElement.className += ' status-inactive';
                statusElement.title = 'Key not configured or inactive';
            }
        }
    }

    addMemory() {
        const summaryInput = document.getElementById('memory-summary');
        const contentInput = document.getElementById('memory-content');
        
        const summary = summaryInput.value.trim();
        const content = contentInput.value.trim();
        
        if (!summary || !content) {
            alert('Please provide both summary and content');
            return;
        }
        
        storageManager.addMemory({
            name: summary,
            summary,
            content,
            description: ''
        });
        
        summaryInput.value = '';
        contentInput.value = '';
        
        this.updateMemoriesList();
        this.updateSystemStats();
    }

    addGoal() {
        const goalInput = document.getElementById('new-goal');
        const content = goalInput.value.trim();
        
        if (!content) return;
        
        storageManager.addGoal({
            name: content,
            content,
            createdBy: 'user',
            modifiable: true
        });
        
        goalInput.value = '';
        this.updateGoalsList();
        this.updateSystemStats();
    }

    updateMemoriesList() {
        const container = document.getElementById('memories-list');
        const memories = storageManager.getMemories();
        
        if (memories.length === 0) {
            container.innerHTML = '<div class="empty-state">No memories stored</div>';
            return;
        }
        
        container.innerHTML = memories.map(memory => `
            <div class="memory-item" data-id="${memory.id}">
                <div class="memory-header">
                    <span class="memory-name">${memory.name || memory.summary}</span>
                    <button class="btn-small btn-danger" onclick="enhancedUIManager.deleteMemory('${memory.id}')">×</button>
                </div>
                <div class="memory-content">${(memory.content || '').substring(0, 100)}${memory.content && memory.content.length > 100 ? '...' : ''}</div>
            </div>
        `).join('');
    }

    deleteMemory(id) {
        if (confirm('Delete this memory?')) {
            storageManager.deleteMemory(id);
            this.updateMemoriesList();
            this.updateSystemStats();
        }
    }

    updateGoalsList() {
        const container = document.getElementById('goals-list');
        const goals = storageManager.getGoals();
        
        if (goals.length === 0) {
            container.innerHTML = '<div class="empty-state">No goals set</div>';
            return;
        }
        
        container.innerHTML = goals.map(goal => `
            <div class="goal-item" data-id="${goal.id}">
                <div class="goal-content">${goal.content}</div>
                <div class="goal-meta">
                    <span class="goal-creator">by ${goal.createdBy}</span>
                    ${goal.modifiable ? `<button class="btn-small btn-danger" onclick="enhancedUIManager.deleteGoal('${goal.id}')">×</button>` : ''}
                </div>
            </div>
        `).join('');
    }

    deleteGoal(id) {
        if (confirm('Delete this goal?')) {
            storageManager.deleteGoal(id);
            this.updateGoalsList();
            this.updateSystemStats();
        }
    }

    updateTasksList() {
        const container = document.getElementById('tasks-list');
        const tasks = storageManager.getTasks();
        
        if (tasks.length === 0) {
            container.innerHTML = '<div class="empty-state">No tasks created</div>';
            return;
        }
        
        container.innerHTML = tasks.map(task => `
            <div class="task-item task-${task.status}" data-id="${task.id}">
                <div class="task-header">
                    <span class="task-name">${task.name || task.description}</span>
                    <span class="task-status status-${task.status}">${task.status}</span>
                </div>
                <div class="task-description">${task.description || ''}</div>
                ${task.notes ? `<div class="task-notes">${task.notes}</div>` : ''}
            </div>
        `).join('');
    }

    updateReasoningChain() {
        const container = document.getElementById('reasoning-chain');
        const reasoning = storageManager.getReasoningChain();
        
        if (reasoning.length === 0) {
            container.innerHTML = '<div class="empty-state">No reasoning steps yet</div>';
            return;
        }
        
        container.innerHTML = reasoning.map(step => `
            <div class="reasoning-step" data-step="${step.step}">
                <div class="step-header">
                    <span class="step-number">Step ${step.step}</span>
                    <span class="step-timestamp">${new Date(step.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="step-content">${this.formatContent(step.content)}</div>
                ${step.toolsUsed && step.toolsUsed.length > 0 ? 
                    `<div class="tools-used">Tools: ${step.toolsUsed.join(', ')}</div>` : ''}
            </div>
        `).join('');
        
        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    updateChatHistory() {
        const container = document.getElementById('chat-history');
        const history = storageManager.getChatHistory();
        
        container.innerHTML = history.map(message => `
            <div class="chat-message chat-${message.role}">
                <div class="message-role">${message.role === 'user' ? 'You' : 'Assistant'}</div>
                <div class="message-content">${this.formatContent(message.content)}</div>
            </div>
        `).join('');
        
        container.scrollTop = container.scrollHeight;
    }

    updateCodeExecution() {
        const container = document.getElementById('code-execution');
        const executions = storageManager.getCodeExecutions();
        
        if (executions.length === 0) {
            container.innerHTML = '<div class="empty-state">No code executed yet</div>';
            return;
        }
        
        container.innerHTML = executions.slice(-10).map(exec => `
            <div class="code-execution-item execution-${exec.status}" data-id="${exec.id}">
                <div class="execution-header">
                    <span class="execution-id">${exec.id}</span>
                    <span class="execution-status status-${exec.status}">${exec.status}</span>
                </div>
                <pre class="code-block"><code>${exec.code}</code></pre>
                ${exec.output ? `<pre class="output-block"><code>${exec.output}</code></pre>` : ''}
                ${exec.error ? `<pre class="error-block"><code>${exec.error}</code></pre>` : ''}
            </div>
        `).join('');
        
        container.scrollTop = container.scrollHeight;
    }

    updateCanvasOutputs() {
        const container = document.getElementById('canvas-outputs');
        const canvases = storageManager.getCanvasOutputs();
        
        if (canvases.length === 0) {
            container.innerHTML = '<div class="empty-state">No canvas outputs yet</div>';
            return;
        }
        
        container.innerHTML = canvases.map(canvas => `
            <div class="canvas-item" data-id="${canvas.id}">
                <div class="canvas-header">
                    <span class="canvas-id">Canvas ${canvas.id}</span>
                    <span class="canvas-step">Step ${canvas.step}</span>
                </div>
                <iframe class="canvas-frame" srcdoc="${canvas.html.replace(/"/g, '&quot;')}"></iframe>
            </div>
        `).join('');
    }

    formatContent(content) {
        if (!content) return '';
        
        return content
            .replace(/\n/g, '<br>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    async sendMessage() {
        const input = document.getElementById('user-input');
        const message = input.value.trim();
        
        if (!message || this.isReasoning) return;
        
        const apiKeys = storageManager.getApiKeys().filter(k => k);
        if (apiKeys.length === 0) {
            alert('Please configure at least one API key');
            return;
        }
        
        input.value = '';
        
        // Add user message to chat
        storageManager.addChatMessage('user', message);
        this.updateChatHistory();
        
        // Start reasoning process
        this.isReasoning = true;
        this.reasoningStep = 0;
        this.streamingContent = '';
        
        document.getElementById('send-message').style.display = 'none';
        document.getElementById('stop-reasoning').style.display = 'inline-block';
        document.getElementById('status-message').textContent = 'Starting reasoning...';
        
        try {
            await this.startReasoningLoop(message);
        } catch (error) {
            console.error('Reasoning failed:', error);
            document.getElementById('status-message').textContent = 'Error: ' + error.message;
        } finally {
            this.isReasoning = false;
            document.getElementById('send-message').style.display = 'inline-block';
            document.getElementById('stop-reasoning').style.display = 'none';
            document.getElementById('status-message').textContent = 'Ready';
            document.getElementById('reasoning-progress').textContent = '';
        }
    }

    async startReasoningLoop(userMessage) {
        let finalOutput = null;
        let maxIterations = 50; // Safety limit
        let iteration = 0;
        
        while (!finalOutput && iteration < maxIterations && this.isReasoning) {
            iteration++;
            this.reasoningStep = iteration;
            
            document.getElementById('status-message').textContent = `Reasoning (iteration ${iteration})`;
            document.getElementById('reasoning-progress').textContent = `Step ${iteration}`;
            
            try {
                // Build context for this iteration
                const context = this.buildReasoningContext(userMessage, iteration === 1);
                
                // Call Gemini API with streaming
                let responseContent = '';
                await geminiApi.generateResponse(
                    context,
                    (chunk) => {
                        responseContent += chunk;
                        this.streamingContent = responseContent;
                        
                        // Update UI with streaming content
                        this.updateStreamingReasoning(iteration, responseContent);
                    }
                );
                
                // Store reasoning step
                const toolResults = await enhancedToolExecutor.executeTools(responseContent);
                
                storageManager.addReasoningStep({
                    step: iteration,
                    content: responseContent,
                    toolsUsed: toolResults.map(r => r.tool),
                    timestamp: new Date().toISOString()
                });
                
                // Update UI with tool results
                this.updateToolResults(toolResults);
                this.updateUI(); // Refresh all panels
                
                // Check for final output
                finalOutput = enhancedToolExecutor.checkForFinalOutput(responseContent);
                
                if (finalOutput) {
                    // Verification step
                    document.getElementById('status-message').textContent = 'Verifying output...';
                    const verifiedOutput = await this.verifyOutput(finalOutput);
                    
                    // Add assistant's final response
                    storageManager.addChatMessage('assistant', verifiedOutput);
                    this.updateChatHistory();
                    
                    break;
                }
                
                // Check if should continue
                const shouldContinue = enhancedToolExecutor.checkForContinueReasoning(responseContent);
                if (!shouldContinue && iteration > 1) {
                    // Model didn't output continue signal, might be stuck
                    document.getElementById('status-message').textContent = 'Reasoning paused - no continue signal';
                    break;
                }
                
            } catch (error) {
                console.error(`Iteration ${iteration} failed:`, error);
                document.getElementById('status-message').textContent = `Error in iteration ${iteration}: ${error.message}`;
                
                if (error.message.includes('rate limit') || error.message.includes('quota')) {
                    // Rate limit hit, wait and retry
                    document.getElementById('status-message').textContent = 'Rate limited, waiting...';
                    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
                } else {
                    break; // Other errors, stop reasoning
                }
            }
        }
        
        if (iteration >= maxIterations) {
            document.getElementById('status-message').textContent = 'Reasoning stopped - maximum iterations reached';
        }
    }

    buildReasoningContext(userMessage, isFirstIteration) {
        const memories = storageManager.getMemories();
        const goals = storageManager.getGoals();
        const tasks = storageManager.getTasks();
        const reasoning = storageManager.getReasoningChain();
        const chatHistory = storageManager.getChatHistory();
        
        let context = '';
        
        // System prompt with vault instructions
        context += vaultLLMProcedures.generateLLMInstructions();
        context += '\n\n';
        
        // Add chat history
        if (chatHistory.length > 0) {
            context += '## Conversation History:\n';
            chatHistory.forEach(msg => {
                context += `**${msg.role}**: ${msg.content}\n\n`;
            });
        }
        
        // Add current state
        if (memories.length > 0) {
            context += '## Available Memories:\n';
            memories.forEach(memory => {
                context += `- **${memory.id}**: ${memory.summary}\n`;
            });
            context += '\n';
        }
        
        if (goals.length > 0) {
            context += '## Active Goals:\n';
            goals.forEach(goal => {
                context += `- ${goal.content}\n`;
            });
            context += '\n';
        }
        
        if (tasks.length > 0) {
            context += '## Current Tasks:\n';
            tasks.forEach(task => {
                context += `- **${task.id}** (${task.status}): ${task.name || task.description}`;
                if (task.notes) context += ` - ${task.notes}`;
                context += '\n';
            });
            context += '\n';
        }
        
        if (reasoning.length > 0) {
            context += '## Previous Reasoning Steps:\n';
            reasoning.forEach(step => {
                context += `**Step ${step.step}**: ${step.content.substring(0, 200)}${step.content.length > 200 ? '...' : ''}\n\n`;
            });
        }
        
        // Add vault statistics
        const vaultEntries = enhancedDataVault.listEntries();
        if (vaultEntries.length > 0) {
            context += '## Vault Entries Available:\n';
            vaultEntries.forEach(entry => {
                context += `- **${entry.id}**: ${entry.label} (${entry.type})\n`;
            });
            context += '\n';
        }
        
        if (isFirstIteration) {
            context += `\n## Your Task:\n${userMessage}\n\n`;
            context += 'Begin by breaking this down into specific tasks, then proceed step by step. Use the enhanced vault system for storing large content.';
        } else {
            context += '\nContinue your reasoning. When completely finished, use <final_output> tags.';
        }
        
        return context;
    }

    updateStreamingReasoning(step, content) {
        // Update the reasoning chain display with streaming content
        const container = document.getElementById('reasoning-chain');
        const existing = container.querySelector(`[data-step="${step}"]`);
        
        if (existing) {
            existing.querySelector('.step-content').innerHTML = this.formatContent(content);
        } else {
            const stepElement = document.createElement('div');
            stepElement.className = 'reasoning-step';
            stepElement.setAttribute('data-step', step);
            stepElement.innerHTML = `
                <div class="step-header">
                    <span class="step-number">Step ${step}</span>
                    <span class="step-timestamp">${new Date().toLocaleTimeString()}</span>
                </div>
                <div class="step-content">${this.formatContent(content)}</div>
            `;
            container.appendChild(stepElement);
        }
        
        container.scrollTop = container.scrollHeight;
    }

    updateToolResults(results) {
        const container = document.getElementById('tool-results');
        
        if (results.length === 0) {
            return;
        }
        
        const resultsHtml = results.map(result => `
            <div class="tool-result tool-${result.type}">
                <div class="tool-header">
                    <span class="tool-name">${result.tool}</span>
                    <span class="tool-status ${result.success !== false ? 'success' : 'error'}">
                        ${result.success !== false ? '✓' : '✗'}
                    </span>
                </div>
                <div class="tool-content">${this.formatToolResult(result)}</div>
            </div>
        `).join('');
        
        container.innerHTML += resultsHtml;
        container.scrollTop = container.scrollHeight;
    }

    formatToolResult(result) {
        let content = '';
        
        if (result.error) {
            content += `<div class="error">Error: ${result.error}</div>`;
        }
        
        if (result.message) {
            content += `<div class="message">${result.message}</div>`;
        }
        
        if (result.result) {
            content += `<div class="result">${this.formatContent(String(result.result))}</div>`;
        }
        
        if (result.vaultEntry) {
            content += `<div class="vault-ref">Stored: ${result.vaultEntry.reference}</div>`;
        }
        
        return content || '<div class="no-content">No additional details</div>';
    }

    async verifyOutput(output) {
        try {
            const goals = storageManager.getGoals();
            const reasoning = storageManager.getReasoningChain();
            
            const verificationContext = `
You previously completed a reasoning process and produced this output:

${output}

## Your Goals Were:
${goals.map(g => `- ${g.content}`).join('\n')}

## Your Reasoning Process:
${reasoning.map(r => `Step ${r.step}: ${r.content.substring(0, 150)}...`).join('\n')}

Verify this output meets all goals and is complete. If yes, output it as the final answer (you may improve formatting). If no, output <continue_reasoning> to go back.
`;

            let verifiedOutput = '';
            await geminiApi.generateResponse(
                verificationContext,
                (chunk) => {
                    verifiedOutput += chunk;
                }
            );
            
            // Check if verification failed
            if (verifiedOutput.includes('<continue_reasoning>')) {
                // Verification failed, continue reasoning
                this.isReasoning = true;
                return this.startReasoningLoop('Continue based on verification feedback');
            }
            
            // Apply variable replacement
            return enhancedToolExecutor.replaceVariables(verifiedOutput);
            
        } catch (error) {
            console.error('Verification failed:', error);
            return enhancedToolExecutor.replaceVariables(output);
        }
    }

    stopReasoning() {
        this.isReasoning = false;
        document.getElementById('status-message').textContent = 'Stopped by user';
    }

    resetAll() {
        if (!confirm('This will delete ALL data (memories, tasks, goals, reasoning, vault entries). Continue?')) {
            return;
        }
        
        storageManager.clearMemories();
        storageManager.clearGoals();
        storageManager.clearTasks();
        storageManager.clearReasoningChain();
        storageManager.clearCodeExecutions();
        storageManager.clearCanvasOutputs();
        storageManager.clearChatHistory();
        enhancedDataVault.clear();
        
        this.updateUI();
        
        document.getElementById('status-message').textContent = 'All data cleared';
    }
}

// Global instance for use in inline event handlers
window.enhancedUIManager = new EnhancedUIManager();

export { EnhancedUIManager };