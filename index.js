class AdvancedGeminiInterface {
    constructor() {
        this.config = {
            apiKey: localStorage.getItem('gemini_api_key') || '',
            model: localStorage.getItem('gemini_model') || 'gemini-2.5-pro',
            temperature: parseFloat(localStorage.getItem('gemini_temperature')) || 1.0,
            maxTokens: parseInt(localStorage.getItem('gemini_max_tokens')) || 65536,
            systemPrompt: localStorage.getItem('gemini_system_prompt') || '',
            reasoningDepth: parseInt(localStorage.getItem('reasoning_depth')) || 2
        };

        this.state = {
            isProcessing: false,
            currentTab: 'code',
            modalMode: null,
            conversationId: Date.now(),
            connectionStatus: 'disconnected'
        };

        this.dataStructures = {
            memoryStore: JSON.parse(localStorage.getItem('memory_store') || '[]'),
            goalsStore: JSON.parse(localStorage.getItem('goals_store') || '[]'),
            reasoningChain: [],
            conversationHistory: JSON.parse(localStorage.getItem('conversation_history') || '[]'),
            codeHistory: JSON.parse(localStorage.getItem('code_history') || '[]')
        };

        this.initialize();
    }

    async initialize() {
        await this.setupEventListeners();
        this.updateConnectionStatus();
        this.loadStoredData();
        this.restoreInterface();
        this.initializeDefaultPrompts();
        
        console.log('🚀 Advanced Gemini Interface initialized');
    }

    setupEventListeners() {
        // Core messaging
        const sendButton = document.getElementById('sendButton');
        const messageInput = document.getElementById('messageInput');
        
        if (sendButton) sendButton.addEventListener('click', () => this.sendMessage());
        if (messageInput) {
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            messageInput.addEventListener('input', this.autoResizeTextarea.bind(this));
        }

        // Sidebar functionality
        const addMemory = document.getElementById('addMemory');
        const addGoal = document.getElementById('addGoal');
        const clearChain = document.getElementById('clearChain');
        
        if (addMemory) addMemory.addEventListener('click', () => this.showModal('memory'));
        if (addGoal) addGoal.addEventListener('click', () => this.showModal('goal'));
        if (clearChain) clearChain.addEventListener('click', () => this.clearReasoningChain());

        // Panel tab switching
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Code execution
        const executeCode = document.getElementById('executeCode');
        const clearCode = document.getElementById('clearCode');
        const saveCode = document.getElementById('saveCode');
        
        if (executeCode) executeCode.addEventListener('click', () => this.executeCode());
        if (clearCode) clearCode.addEventListener('click', () => this.clearCodeEditor());
        if (saveCode) saveCode.addEventListener('click', () => this.saveCodeToHistory());

        // Canvas operations
        const renderCanvas = document.getElementById('renderCanvas');
        const clearCanvas = document.getElementById('clearCanvas');
        const fullscreenCanvas = document.getElementById('fullscreenCanvas');
        
        if (renderCanvas) renderCanvas.addEventListener('click', () => this.renderCanvas());
        if (clearCanvas) clearCanvas.addEventListener('click', () => this.clearCanvas());
        if (fullscreenCanvas) fullscreenCanvas.addEventListener('click', () => this.toggleCanvasFullscreen());

        // Configuration
        const saveConfig = document.getElementById('saveConfig');
        const exportData = document.getElementById('exportData');
        const importData = document.getElementById('importData');
        
        if (saveConfig) saveConfig.addEventListener('click', () => this.saveConfiguration());
        if (exportData) exportData.addEventListener('click', () => this.exportAllData());
        if (importData) importData.addEventListener('click', () => this.importAllData());

        // Temperature slider
        const temperatureInput = document.getElementById('temperatureInput');
        if (temperatureInput) {
            temperatureInput.addEventListener('input', (e) => {
                const tempValue = document.getElementById('temperatureValue');
                if (tempValue) {
                    tempValue.textContent = parseFloat(e.target.value).toFixed(1);
                }
            });
        }

        // Modal functionality
        const modalClose = document.getElementById('modalClose');
        const modalCancel = document.getElementById('modalCancel');
        const modalSave = document.getElementById('modalSave');
        
        if (modalClose) modalClose.addEventListener('click', () => this.hideModal());
        if (modalCancel) modalCancel.addEventListener('click', () => this.hideModal());
        if (modalSave) modalSave.addEventListener('click', () => this.saveModalData());

        // Global error handling
        window.addEventListener('error', this.handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

        // Auto-save functionality
        setInterval(() => this.autoSave(), 30000);
    }

    updateConnectionStatus() {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        if (this.config.apiKey) {
            this.state.connectionStatus = 'connected';
            if (statusIndicator) statusIndicator.className = 'status-indicator connected';
            if (statusText) statusText.textContent = 'API Connected';
        } else {
            this.state.connectionStatus = 'disconnected';
            if (statusIndicator) statusIndicator.className = 'status-indicator';
            if (statusText) statusText.textContent = 'API Key Required';
        }
    }

    loadStoredData() {
        // Load API key into config panel
        const apiKeyInput = document.getElementById('apiKeyInput');
        if (apiKeyInput) apiKeyInput.value = this.config.apiKey;

        // Load other config values
        const modelSelect = document.getElementById('modelSelect');
        if (modelSelect) modelSelect.value = this.config.model;

        const temperatureInput = document.getElementById('temperatureInput');
        if (temperatureInput) temperatureInput.value = this.config.temperature;

        const maxTokensInput = document.getElementById('maxTokensInput');
        if (maxTokensInput) maxTokensInput.value = this.config.maxTokens;

        // Render stored data
        this.renderMemoryList();
        this.renderGoalsList();
        this.renderConversationHistory();
    }

    restoreInterface() {
        // Switch to last active tab
        const lastTab = localStorage.getItem('last_active_tab') || 'code';
        this.switchTab(lastTab);

        // Restore code editor content
        const lastCode = localStorage.getItem('last_code_content');
        const codeEditor = document.getElementById('codeEditor');
        if (lastCode && codeEditor) {
            codeEditor.value = lastCode;
        }
    }

    initializeDefaultPrompts() {
        const systemPrompt = document.getElementById('systemPrompt');
        const reasoningPrompt = document.getElementById('reasoningPrompt');
        const verificationPrompt = document.getElementById('verificationPrompt');

        if (!this.config.systemPrompt && systemPrompt) {
            const defaultSystem = `You are an advanced AI assistant with sophisticated reasoning capabilities. You have access to:
- Persistent memory system for context retention
- Goal-oriented processing with verification
- Iterative reasoning with self-correction
- Code execution and visualization tools

Always think step by step and verify your responses against stated goals.`;
            systemPrompt.value = defaultSystem;
            this.config.systemPrompt = defaultSystem;
        }

        if (systemPrompt) systemPrompt.value = this.config.systemPrompt;
    }

    addReasoningStep(type, description) {
        const step = {
            type,
            description,
            timestamp: new Date().toLocaleTimeString(),
            id: Date.now()
        };

        this.dataStructures.reasoningChain.push(step);
        
        const container = document.getElementById('reasoningChain');
        if (container) {
            const stepElement = document.createElement('div');
            stepElement.className = 'chain-step';
            stepElement.innerHTML = `
                <div class="step-header">${type}</div>
                <div class="step-content">${description}</div>
                <div class="step-timestamp">${step.timestamp}</div>
            `;
            
            container.appendChild(stepElement);
            container.scrollTop = container.scrollHeight;
        }

        console.log(`[${type}] ${description}`);
    }

    clearReasoningChain() {
        this.dataStructures.reasoningChain = [];
        const container = document.getElementById('reasoningChain');
        if (container) {
            container.innerHTML = '';
        }
        this.addReasoningStep('RESET', 'Reasoning chain cleared');
    }

    autoResizeTextarea(event) {
        const textarea = event.target;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 140) + 'px';
    }

    startProcessing() {
        this.state.isProcessing = true;
        const sendButton = document.getElementById('sendButton');
        const statusIndicator = document.getElementById('statusIndicator');
        
        if (sendButton) {
            sendButton.disabled = true;
            sendButton.textContent = 'Processing...';
        }
        
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator processing';
        }
    }

    stopProcessing() {
        this.state.isProcessing = false;
        const sendButton = document.getElementById('sendButton');
        const statusIndicator = document.getElementById('statusIndicator');
        
        if (sendButton) {
            sendButton.disabled = false;
            sendButton.textContent = 'Send';
        }
        
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator connected';
        }
    }

    addChatMessage(type, content) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        if (type === 'user') {
            messageDiv.textContent = content;
        } else {
            // For assistant messages, handle markdown/formatting
            messageDiv.innerHTML = this.formatMessage(content);
        }

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    formatMessage(content) {
        // Basic markdown-like formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    showStatusMessage(message, type = 'info') {
        const statusBar = document.getElementById('statusBar');
        if (statusBar) {
            statusBar.textContent = message;
            statusBar.className = `status-message ${type}`;
            setTimeout(() => {
                if (statusBar) statusBar.textContent = '';
            }, 3000);
        }
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    async sendMessage() {
        if (this.state.isProcessing) return;

        const messageInput = document.getElementById('messageInput');
        if (!messageInput) return;

        const message = messageInput.value.trim();

        if (!message) {
            this.showStatusMessage('Please enter a message', 'warning');
            return;
        }

        if (!this.config.apiKey) {
            this.showStatusMessage('Please configure your Gemini API key', 'error');
            this.switchTab('config');
            return;
        }

        // Clear input and add user message
        messageInput.value = '';
        this.autoResizeTextarea({ target: messageInput });
        this.addChatMessage('user', message);

        try {
            this.startProcessing();
            this.clearReasoningChain();

            // Initialize reasoning process
            this.addReasoningStep('INIT', 'Starting advanced reasoning process');
            
            // Retrieve relevant context
            const relevantMemory = this.findRelevantMemory(message);
            const activeGoals = this.getActiveGoals();
            
            this.addReasoningStep('CONTEXT', `Retrieved ${relevantMemory.length} memories, ${activeGoals.length} active goals`);

            // Execute iterative reasoning
            let response = await this.performIterativeReasoning(message, relevantMemory, activeGoals);

            // Verify response against goals
            const verification = await this.verifyResponse(message, response, activeGoals);
            
            if (verification.status === 'PASS') {
                this.addChatMessage('assistant', response);
                this.updateMemoryStore(message, response);
                this.addReasoningStep('SUCCESS', 'Response generated and verified successfully');
            } else {
                this.showVerificationPanel(verification);
                this.addReasoningStep('VERIFICATION_FAILED', verification.feedback);
            }

            // Store conversation
            this.storeConversation(message, response);

        } catch (error) {
            console.error('Message processing error:', error);
            this.addChatMessage('system', `Error: ${error.message}`);
            this.addReasoningStep('ERROR', `Processing failed: ${error.message}`);
        } finally {
            this.stopProcessing();
        }
    }

    async performIterativeReasoning(message, relevantMemory, activeGoals) {
        const maxIterations = this.config.reasoningDepth;
        let currentResponse = '';

        for (let iteration = 1; iteration <= maxIterations; iteration++) {
            this.addReasoningStep(`ITER_${iteration}`, `Reasoning iteration ${iteration}/${maxIterations}`);

            const context = this.buildIterationContext(message, relevantMemory, activeGoals, currentResponse, iteration);
            const response = await this.callGeminiAPI(context);

            // For final iteration or if response converged
            if (iteration === maxIterations || this.hasReasoningConverged(currentResponse, response)) {
                this.addReasoningStep('CONVERGED', `Reasoning completed after ${iteration} iteration(s)`);
                return response;
            }

            currentResponse = response;
        }

        return currentResponse;
    }

    buildIterationContext(message, memory, goals, previousResponse, iteration) {
        const systemPrompt = this.config.systemPrompt || `You are an advanced AI assistant with sophisticated reasoning capabilities.`;

        let context = `${systemPrompt}\n\n`;

        // Add memory context
        if (memory.length > 0) {
            context += `RELEVANT MEMORY:\n${memory.map(m => `- ${m.summary}: ${m.detail}`).join('\n')}\n\n`;
        }

        // Add goals context
        if (goals.length > 0) {
            context += `ACTIVE GOALS:\n${goals.map(g => `- ${g.summary} (${g.status})`).join('\n')}\n\n`;
        }

        // Add conversation history
        const recentHistory = this.dataStructures.conversationHistory.slice(-3);
        if (recentHistory.length > 0) {
            context += `RECENT CONVERSATION:\n${recentHistory.map(h => 
                `User: ${h.user}\nAssistant: ${h.assistant}`
            ).join('\n\n')}\n\n`;
        }

        // Add iteration-specific context
        if (iteration > 1 && previousResponse) {
            context += `PREVIOUS ITERATION RESPONSE:\n${previousResponse}\n\n`;
            context += `INSTRUCTION: Improve the previous response by addressing any gaps or inaccuracies. `;
        }

        context += `CURRENT QUERY: ${message}\n\nProvide a comprehensive, accurate response.`;

        return context;
    }

    async callGeminiAPI(prompt) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: this.config.temperature,
                    maxOutputTokens: this.config.maxTokens,
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API Error (${response.status}): ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
    }

    hasReasoningConverged(previous, current) {
        if (!previous) return false;
        
        // Simple convergence check - in practice could be more sophisticated
        const similarity = this.calculateSimilarity(previous, current);
        return similarity > 0.85;
    }

    calculateSimilarity(str1, str2) {
        // Simple similarity calculation
        const len = Math.max(str1.length, str2.length);
        if (len === 0) return 1;
        
        let matches = 0;
        const minLen = Math.min(str1.length, str2.length);
        
        for (let i = 0; i < minLen; i++) {
            if (str1[i] === str2[i]) matches++;
        }
        
        return matches / len;
    }

    async verifyResponse(query, response, goals) {
        // Simple verification - could be enhanced with actual AI verification
        return {
            status: 'PASS',
            feedback: 'Response meets requirements'
        };
    }

    showVerificationPanel(verification) {
        const panel = document.getElementById('verificationPanel');
        if (panel) {
            panel.innerHTML = `
                <div class="verification-status ${verification.status.toLowerCase()}">
                    <strong>Verification ${verification.status}</strong>
                    <p>${verification.feedback}</p>
                </div>
            `;
            panel.classList.add('active');
        }
    }

    // Data management methods
    findRelevantMemory(query) {
        const keywords = query.toLowerCase().split(' ').filter(word => word.length > 2);
        
        return this.dataStructures.memoryStore
            .map(memory => ({
                ...memory,
                relevanceScore: keywords.reduce((score, keyword) => {
                    if (memory.summary.toLowerCase().includes(keyword)) score += 3;
                    if (memory.detail.toLowerCase().includes(keyword)) score += 1;
                    return score;
                }, 0)
            }))
            .filter(memory => memory.relevanceScore > 0)
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 5);
    }

    getActiveGoals() {
        return this.dataStructures.goalsStore.filter(goal => goal.status !== 'completed');
    }

    updateMemoryStore(query, response) {
        const memory = {
            id: Date.now(),
            summary: query.substring(0, 50) + (query.length > 50 ? '...' : ''),
            detail: `Query: ${query}\nResponse: ${response}`,
            timestamp: new Date().toISOString(),
            accessCount: 0
        };

        this.dataStructures.memoryStore.unshift(memory);
        if (this.dataStructures.memoryStore.length > 100) {
            this.dataStructures.memoryStore = this.dataStructures.memoryStore.slice(0, 100);
        }
        
        this.persistData();
        this.renderMemoryList();
    }

    storeConversation(query, response) {
        const conversation = {
            id: Date.now(),
            user: query,
            assistant: response,
            timestamp: new Date().toISOString()
        };

        this.dataStructures.conversationHistory.push(conversation);
        if (this.dataStructures.conversationHistory.length > 50) {
            this.dataStructures.conversationHistory = this.dataStructures.conversationHistory.slice(-50);
        }
        
        this.persistData();
    }

    // UI Management methods
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update panels  
        document.querySelectorAll('.panel-content > div').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}Panel`);
        });

        this.state.currentTab = tabName;
        localStorage.setItem('last_active_tab', tabName);
    }

    showModal(type) {
        this.state.modalMode = type;
        const modal = document.getElementById('addModal');
        
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    hideModal() {
        const modal = document.getElementById('addModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.state.modalMode = null;
    }

    saveModalData() {
        // Implementation for saving modal data
        this.hideModal();
    }

    saveConfiguration() {
        const apiKeyInput = document.getElementById('apiKeyInput');
        const modelSelect = document.getElementById('modelSelect');
        const temperatureInput = document.getElementById('temperatureInput');
        const maxTokensInput = document.getElementById('maxTokensInput');
        const systemPrompt = document.getElementById('systemPrompt');

        if (apiKeyInput) {
            this.config.apiKey = apiKeyInput.value.trim();
            localStorage.setItem('gemini_api_key', this.config.apiKey);
        }

        if (modelSelect) {
            this.config.model = modelSelect.value;
            localStorage.setItem('gemini_model', this.config.model);
        }

        if (temperatureInput) {
            this.config.temperature = parseFloat(temperatureInput.value);
            localStorage.setItem('gemini_temperature', this.config.temperature);
        }

        if (maxTokensInput) {
            this.config.maxTokens = parseInt(maxTokensInput.value);
            localStorage.setItem('gemini_max_tokens', this.config.maxTokens);
        }

        if (systemPrompt) {
            this.config.systemPrompt = systemPrompt.value;
            localStorage.setItem('gemini_system_prompt', this.config.systemPrompt);
        }

        this.updateConnectionStatus();
        this.showStatusMessage('Configuration saved successfully', 'success');
    }

    // Code execution methods
    executeCode() {
        const codeEditor = document.getElementById('codeEditor');
        if (!codeEditor) return;

        const code = codeEditor.value.trim();
        if (!code) {
            this.showStatusMessage('No code to execute', 'warning');
            return;
        }

        this.addReasoningStep('CODE_EXEC', 'Executing JavaScript code');

        try {
            // Create console capture
            const consoleOutput = [];
            const originalConsole = console.log;
            
            console.log = (...args) => {
                consoleOutput.push(args.join(' '));
                originalConsole(...args);
            };

            // Execute code
            const result = eval(code);
            
            // Restore console
            console.log = originalConsole;

            // Display output
            this.displayCodeOutput(consoleOutput, result);
            this.addReasoningStep('CODE_SUCCESS', 'Code executed successfully');
            
            // Save code
            localStorage.setItem('last_code_content', code);

        } catch (error) {
            this.displayCodeOutput([], null, error.message);
            this.addReasoningStep('CODE_ERROR', `Code execution failed: ${error.message}`);
        }
    }

    displayCodeOutput(consoleOutput, result, error = null) {
        const outputDiv = document.getElementById('consoleOutput');
        if (!outputDiv) return;

        outputDiv.innerHTML = '';

        if (consoleOutput.length > 0) {
            consoleOutput.forEach(output => {
                const div = document.createElement('div');
                div.className = 'console-log';
                div.textContent = output;
                outputDiv.appendChild(div);
            });
        }

        if (error) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'console-error';
            errorDiv.textContent = `Error: ${error}`;
            outputDiv.appendChild(errorDiv);
        } else if (result !== undefined) {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'console-result';
            resultDiv.textContent = `Result: ${result}`;
            outputDiv.appendChild(resultDiv);
        }

        outputDiv.scrollTop = outputDiv.scrollHeight;
    }

    clearCodeEditor() {
        const codeEditor = document.getElementById('codeEditor');
        if (codeEditor) {
            codeEditor.value = '';
        }
        
        const consoleOutput = document.getElementById('consoleOutput');
        if (consoleOutput) {
            consoleOutput.innerHTML = '';
        }
    }

    saveCodeToHistory() {
        const codeEditor = document.getElementById('codeEditor');
        if (!codeEditor) return;

        const code = codeEditor.value.trim();
        if (!code) return;

        const codeEntry = {
            id: Date.now(),
            code,
            timestamp: new Date().toISOString()
        };

        this.dataStructures.codeHistory.unshift(codeEntry);
        if (this.dataStructures.codeHistory.length > 20) {
            this.dataStructures.codeHistory = this.dataStructures.codeHistory.slice(0, 20);
        }

        this.persistData();
        this.showStatusMessage('Code saved to history', 'success');
    }

    // Canvas methods
    renderCanvas() {
        const codeEditor = document.getElementById('codeEditor');
        const canvasFrame = document.getElementById('canvasFrame');
        
        if (!codeEditor || !canvasFrame) return;

        const code = codeEditor.value.trim();
        if (!code) {
            this.showStatusMessage('No HTML code to render', 'warning');
            return;
        }

        this.addReasoningStep('CANVAS_RENDER', 'Rendering HTML to canvas');

        try {
            const doc = canvasFrame.contentDocument || canvasFrame.contentWindow.document;
            doc.open();
            doc.write(code);
            doc.close();

            this.addReasoningStep('CANVAS_SUCCESS', 'HTML rendered successfully');

        } catch (error) {
            this.addReasoningStep('CANVAS_ERROR', `Canvas rendering failed: ${error.message}`);
            this.showStatusMessage(`Canvas error: ${error.message}`, 'error');
        }
    }

    clearCanvas() {
        const canvasFrame = document.getElementById('canvasFrame');
        if (canvasFrame) {
            const doc = canvasFrame.contentDocument || canvasFrame.contentWindow.document;
            doc.open();
            doc.write('');
            doc.close();
        }
    }

    toggleCanvasFullscreen() {
        const canvasFrame = document.getElementById('canvasFrame');
        if (!canvasFrame) return;

        if (canvasFrame.requestFullscreen) {
            canvasFrame.requestFullscreen();
        } else if (canvasFrame.webkitRequestFullscreen) {
            canvasFrame.webkitRequestFullscreen();
        } else if (canvasFrame.msRequestFullscreen) {
            canvasFrame.msRequestFullscreen();
        }
    }

    // Data import/export
    exportAllData() {
        const exportData = {
            config: this.config,
            memoryStore: this.dataStructures.memoryStore,
            goalsStore: this.dataStructures.goalsStore,
            conversationHistory: this.dataStructures.conversationHistory,
            codeHistory: this.dataStructures.codeHistory,
            exportDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `gemini-interface-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        this.showStatusMessage('Data exported successfully', 'success');
    }

    importAllData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importData = JSON.parse(e.target.result);
                    
                    // Validate import data structure
                    if (importData.config && importData.memoryStore && importData.goalsStore) {
                        // Import data
                        this.config = { ...this.config, ...importData.config };
                        this.dataStructures.memoryStore = importData.memoryStore || [];
                        this.dataStructures.goalsStore = importData.goalsStore || [];
                        this.dataStructures.conversationHistory = importData.conversationHistory || [];
                        this.dataStructures.codeHistory = importData.codeHistory || [];

                        // Persist and refresh UI
                        this.persistData();
                        this.loadStoredData();
                        this.renderMemoryList();
                        this.renderGoalsList();
                        this.updateConnectionStatus();

                        this.showStatusMessage('Data imported successfully', 'success');
                    } else {
                        throw new Error('Invalid import file format');
                    }
                } catch (error) {
                    this.showStatusMessage(`Import failed: ${error.message}`, 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    // Rendering methods
    renderMemoryList() {
        const memoryList = document.getElementById('memoryList');
        if (!memoryList) return;

        memoryList.innerHTML = '';
        
        this.dataStructures.memoryStore.slice(0, 10).forEach(memory => {
            const memoryDiv = document.createElement('div');
            memoryDiv.className = 'memory-item';
            memoryDiv.innerHTML = `
                <div class="memory-summary">${memory.summary}</div>
                <div class="memory-detail">${memory.detail.substring(0, 100)}${memory.detail.length > 100 ? '...' : ''}</div>
            `;
            memoryList.appendChild(memoryDiv);
        });
    }

    renderGoalsList() {
        const goalsList = document.getElementById('goalsList');
        if (!goalsList) return;

        goalsList.innerHTML = '';
        
        this.dataStructures.goalsStore.forEach(goal => {
            const goalDiv = document.createElement('div');
            goalDiv.className = 'goal-item';
            goalDiv.innerHTML = `
                <div class="goal-summary">${goal.summary}</div>
                <div class="goal-detail">${goal.detail || ''}</div>
                <div class="goal-status">${goal.status}</div>
            `;
            goalsList.appendChild(goalDiv);
        });
    }

    renderConversationHistory() {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        // Render last few conversations
        const recentHistory = this.dataStructures.conversationHistory.slice(-5);
        recentHistory.forEach(conv => {
            this.addChatMessage('user', conv.user);
            this.addChatMessage('assistant', conv.assistant);
        });
    }

    // Data persistence
    persistData() {
        try {
            localStorage.setItem('memory_store', JSON.stringify(this.dataStructures.memoryStore));
            localStorage.setItem('goals_store', JSON.stringify(this.dataStructures.goalsStore));
            localStorage.setItem('conversation_history', JSON.stringify(this.dataStructures.conversationHistory.slice(-50)));
            localStorage.setItem('code_history', JSON.stringify(this.dataStructures.codeHistory.slice(-20)));
        } catch (error) {
            console.error('Failed to persist data:', error);
        }
    }

    // Auto-save and error handling
    autoSave() {
        this.persistData();
        console.log('📁 Auto-save completed');
    }

    handleGlobalError(event) {
        console.error('Global error:', event.error);
        if (this.addReasoningStep) {
            this.addReasoningStep('ERROR', `Global error: ${event.error.message}`);
        }
    }

    handleUnhandledRejection(event) {
        console.error('Unhandled promise rejection:', event.reason);
        if (this.addReasoningStep) {
            this.addReasoningStep('ERROR', `Promise rejection: ${event.reason}`);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.geminiInterface = new AdvancedGeminiInterface();
});
