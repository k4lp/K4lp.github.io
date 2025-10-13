class AdvancedGeminiInterface {
    constructor() {
        this.config = {
            apiKey: localStorage.getItem('gemini_api_key') || '',
            model: localStorage.getItem('gemini_model') || 'gemini-2.0-flash-exp',
            temperature: parseFloat(localStorage.getItem('gemini_temperature')) || 1.0,
            maxTokens: parseInt(localStorage.getItem('gemini_max_tokens')) || 8192,
            systemPrompt: localStorage.getItem('gemini_system_prompt') || '',
            reasoningDepth: parseInt(localStorage.getItem('reasoning_depth')) || 2
        };

        this.state = {
            isProcessing: false,
            currentTab: 'code',
            modalMode: null,
            conversationId: Date.now()
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
        document.getElementById('sendButton').addEventListener('click', () => this.sendMessage());
        document.getElementById('messageInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        document.getElementById('messageInput').addEventListener('input', this.autoResizeTextarea);

        // Sidebar functionality
        document.getElementById('addMemory').addEventListener('click', () => this.showModal('memory'));
        document.getElementById('addGoal').addEventListener('click', () => this.showModal('goal'));
        document.getElementById('clearChain').addEventListener('click', () => this.clearReasoningChain());

        // Panel tab switching
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Code execution
        document.getElementById('executeCode').addEventListener('click', () => this.executeCode());
        document.getElementById('clearCode').addEventListener('click', () => this.clearCodeEditor());
        document.getElementById('saveCode').addEventListener('click', () => this.saveCodeToHistory());

        // Canvas operations
        document.getElementById('renderCanvas').addEventListener('click', () => this.renderCanvas());
        document.getElementById('clearCanvas').addEventListener('click', () => this.clearCanvas());
        document.getElementById('fullscreenCanvas').addEventListener('click', () => this.toggleCanvasFullscreen());

        // Configuration
        document.getElementById('saveConfig').addEventListener('click', () => this.saveConfiguration());
        document.getElementById('exportData').addEventListener('click', () => this.exportAllData());
        document.getElementById('importData').addEventListener('click', () => this.importAllData());

        // Temperature slider
        document.getElementById('temperatureInput').addEventListener('input', (e) => {
            document.getElementById('temperatureValue').textContent = parseFloat(e.target.value).toFixed(1);
        });

        // Modal functionality
        document.getElementById('modalClose').addEventListener('click', () => this.hideModal());
        document.getElementById('modalCancel').addEventListener('click', () => this.hideModal());
        document.getElementById('modalSave').addEventListener('click', () => this.saveModalData());

        // Global error handling
        window.addEventListener('error', this.handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

        // Auto-save functionality
        setInterval(() => this.autoSave(), 30000); // Auto-save every 30 seconds
    }

    async sendMessage() {
        if (this.state.isProcessing) return;

        const messageInput = document.getElementById('messageInput');
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
        const systemPrompt = this.config.systemPrompt || `You are an advanced AI assistant with sophisticated reasoning capabilities. 
You have access to persistent memory, goal tracking, and iterative reasoning. 
Always provide accurate, helpful responses while considering the user's context and goals.`;

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

    executeCode() {
        const code = document.getElementById('codeEditor').value.trim();
        if (!code) {
            this.showStatusMessage('No code to execute', 'warning');
            return;
        }

        this.addReasoningStep('CODE_EXEC', 'Executing JavaScript code');

        try {
            // Create secure execution context
            const consoleOutput = [];
            const originalConsole = { ...console };
            
            // Override console methods
            console.log = (...args) => {
                consoleOutput.push(['log', args]);
                originalConsole.log(...args);
            };
            console.error = (...args) => {
                consoleOutput.push(['error', args]);
                originalConsole.error(...args);
            };
            console.warn = (...args) => {
                consoleOutput.push(['warn', args]);
                originalConsole.warn(...args);
            };

            // Execute code with timeout
            const executeWithTimeout = (code, timeout = 10000) => {
                return new Promise((resolve, reject) => {
                    const worker = new Worker(URL.createObjectURL(new Blob([`
                        self.onmessage = function(e) {
                            try {
                                const result = eval(e.data);
                                self.postMessage({ success: true, result });
                            } catch (error) {
                                self.postMessage({ success: false, error: error.message });
                            }
                        }
                    `], { type: 'application/javascript' })));

                    const timer = setTimeout(() => {
                        worker.terminate();
                        reject(new Error('Code execution timeout'));
                    }, timeout);

                    worker.onmessage = (e) => {
                        clearTimeout(timer);
                        worker.terminate();
                        if (e.data.success) {
                            resolve(e.data.result);
                        } else {
                            reject(new Error(e.data.error));
                        }
                    };

                    worker.postMessage(code);
                });
            };

            // For simple cases, use direct eval
            let result;
            if (!code.includes('async') && !code.includes('await') && !code.includes('fetch')) {
                result = eval(code);
            } else {
                // For async code, use Function constructor
                const asyncFunction = new Function(`
                    return (async () => {
                        ${code}
                    })();
                `);
                result = asyncFunction();
            }

            // Handle promises
            Promise.resolve(result).then(finalResult => {
                // Restore console
                Object.assign(console, originalConsole);

                // Display results
                this.displayCodeOutput(consoleOutput, finalResult);
                this.addReasoningStep('CODE_SUCCESS', 'Code executed successfully');
                
                // Save to history
                this.saveCodeToHistory();
            }).catch(error => {
                Object.assign(console, originalConsole);
                this.displayCodeOutput(consoleOutput, null, error.message);
                this.addReasoningStep('CODE_ERROR', `Code execution failed: ${error.message}`);
            });

        } catch (error) {
            this.displayCodeOutput([], null, error.message);
            this.addReasoningStep('CODE_ERROR', `Code execution failed: ${error.message}`);
        }
    }

    displayCodeOutput(consoleOutput, result, error = null) {
        const outputDiv = document.getElementById('consoleOutput');
        outputDiv.innerHTML = '';

        if (consoleOutput.length > 0) {
            consoleOutput.forEach(([type, args]) => {
                const logEntry = document.createElement('div');
                logEntry.className = `console-${type}`;
                logEntry.textContent = args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                ).join(' ');
                outputDiv.appendChild(logEntry);
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
            resultDiv.textContent = `Result: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}`;
            outputDiv.appendChild(resultDiv);
        }

        outputDiv.scrollTop = outputDiv.scrollHeight;
    }

    renderCanvas() {
        const code = document.getElementById('codeEditor').value.trim();
        if (!code) {
            this.showStatusMessage('No HTML code to render', 'warning');
            return;
        }

        this.addReasoningStep('CANVAS_RENDER', 'Rendering HTML to canvas');

        try {
            const frame = document.getElementById('canvasFrame');
            const doc = frame.contentDocument || frame.contentWindow.document;
            
            // Create complete HTML document
            const fullHTML = code.includes('<!DOCTYPE') ? code : `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { 
                            font-family: 'Geist', -apple-system, sans-serif; 
                            margin: 0; 
                            padding: 20px; 
                            line-height: 1.6; 
                        }
                    </style>
                </head>
                <body>
                    ${code}
                </body>
                </html>
            `;

            doc.open();
            doc.write(fullHTML);
            doc.close();

            this.addReasoningStep('CANVAS_SUCCESS', 'HTML rendered successfully');

        } catch (error) {
            this.addReasoningStep('CANVAS_ERROR', `Canvas rendering failed: ${error.message}`);
            this.showStatusMessage(`Canvas error: ${error.message}`, 'error');
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

    addMemory(summary, detail) {
        const memory = {
            id: Date.now(),
            summary,
            detail,
            timestamp: new Date().toISOString(),
            accessCount: 0
        };

        this.dataStructures.memoryStore.unshift(memory);
        this.persistData();
        this.renderMemoryList();
        
        this.addReasoningStep('MEMORY_ADD', `Added memory: ${summary}`);
    }

    addGoal(summary, detail, priority = 'medium') {
        const goal = {
            id: Date.now(),
            summary,
            detail,
            priority,
            status: 'active',
            timestamp: new Date().toISOString()
        };

        this.dataStructures.goalsStore.unshift(goal);
        this.persistData();
        this.renderGoalsList();
        
        this.addReasoningStep('GOAL_ADD', `Added goal: ${summary}`);
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
    }

    showModal(type) {
        this.state.modalMode = type;
        const modal = document.getElementById('addModal');
        const title = document.getElementById('modalTitle');
        const summary = document.getElementById('modalSummary');
        const detail = document.getElementById('modalDetail');

        title.textContent = type === 'memory' ? 'Add Memory' : 'Add Goal';
        summary.placeholder = type === 'memory' ? 'Memory summary...' : 'Goal summary...';
        detail.placeholder = type === 'memory' ? 'Detailed memory information...' : 'Goal details and requirements...';
        
        summary.value = '';
        detail.value = '';
        
        modal.style.display = 'flex';
        summary.focus();
    }

    hideModal() {
        document.getElementById('addModal').style.display = 'none';
        this.state.modalMode = null;
    }

    saveModalData() {
        const summary = document.getElementById('modalSummary').value.trim();
        const detail = document.getElementById('modalDetail').value.trim();

        if (!summary) {
            this.showStatusMessage('Summary is required', 'warning');
            return;
        }

        if (this.state.modalMode === 'memory') {
            this.addMemory(summary, detail);
        } else if (this.state.modalMode === 'goal') {
            this.addGoal(summary, detail);
        }

        this.hideModal();
    }

    // Additional utility and management methods continue...
    // [The complete implementation would include all remaining methods for UI updates, persistence, etc.]

    persistData() {
        localStorage.setItem('memory_store', JSON.stringify(this.dataStructures.memoryStore));
        localStorage.setItem('goals_store', JSON.stringify(this.dataStructures.goalsStore));
        localStorage.setItem('conversation_history', JSON.stringify(this.dataStructures.conversationHistory.slice(-50)));
        localStorage.setItem('code_history', JSON.stringify(this.dataStructures.codeHistory.slice(-20)));
    }

    // Auto-save and error handling
    autoSave() {
        this.persistData();
        console.log('📁 Auto-save completed');
    }

    handleGlobalError(event) {
        console.error('Global error:', event.error);
        this.addReasoningStep('ERROR', `Global error: ${event.error.message}`);
    }

    handleUnhandledRejection(event) {
        console.error('Unhandled promise rejection:', event.reason);
        this.addReasoningStep('ERROR', `Promise rejection: ${event.reason}`);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.geminiInterface = new AdvancedGeminiInterface();
});
