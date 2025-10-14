// Main Application Controller
class GeminiAdvancedInterface {
    constructor() {
        this.isInitialized = false;
        this.messageHistory = [];
        this.initialize();
    }

    async initialize() {
        try {
            this.setupEventListeners();
            this.loadSettings();
            this.updateUI();
            this.isInitialized = true;
            console.log('Gemini Advanced Interface initialized successfully');
        } catch (error) {
            console.error('Initialization error:', error);
        }
    }

    setupEventListeners() {
        // API Configuration - Updated for multi-keys
        document.getElementById('saveKeys').addEventListener('click', () => {
            const keys = [];
            for (let i = 1; i <= 6; i++) {
                const key = document.getElementById(`apiKey${i}`).value.trim();
                if (key) keys.push(key);
                document.getElementById(`apiKey${i}`).value = '';
            }
            if (keys.length > 0) {
                geminiAPI.setApiKeys(keys);
            }
        });

        // Chat Interface
        document.getElementById('sendMessage').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.sendMessage();
            }
        });

        // Code Execution
        document.getElementById('executeCode').addEventListener('click', () => {
            this.toggleCodeSection();
        });

        document.getElementById('runCode').addEventListener('click', () => {
            this.executeCode();
        });

        // Canvas Display
        document.getElementById('showCanvas').addEventListener('click', () => {
            this.toggleCanvasSection();
        });

        document.getElementById('renderHtml').addEventListener('click', () => {
            this.renderHtml();
        });

        // Data Management
        document.getElementById('clearMemory').addEventListener('click', () => {
            if (confirm('Clear all memory? This action cannot be undone.')) {
                dataManager.clearMemory();
            }
        });

        document.getElementById('setGoals').addEventListener('click', () => {
            this.showGoalModal();
        });

        document.getElementById('clearReasoning').addEventListener('click', () => {
            dataManager.clearReasoningChain();
        });

        // Goal Modal
        document.getElementById('saveGoals').addEventListener('click', () => {
            this.saveGoals();
        });

        document.getElementById('cancelGoals').addEventListener('click', () => {
            this.hideGoalModal();
        });

        // System Controls
        document.getElementById('resetSession').addEventListener('click', () => {
            if (confirm('Reset entire session? All data will be lost.')) {
                this.resetSession();
            }
        });

        // Settings persistence
        document.getElementById('iterativeMode').addEventListener('change', (e) => {
            localStorage.setItem('iterative_mode', e.target.checked);
        });

        document.getElementById('verificationMode').addEventListener('change', (e) => {
            localStorage.setItem('verification_mode', e.target.checked);
        });

        document.getElementById('memoryMode').addEventListener('change', (e) => {
            localStorage.setItem('memory_mode', e.target.checked);
        });
    }

    loadSettings() {
        // Load settings
        const iterativeMode = localStorage.getItem('iterative_mode');
        if (iterativeMode !== null) {
            document.getElementById('iterativeMode').checked = iterativeMode === 'true';
        }

        const verificationMode = localStorage.getItem('verification_mode');
        if (verificationMode !== null) {
            document.getElementById('verificationMode').checked = verificationMode === 'true';
        }

        const memoryMode = localStorage.getItem('memory_mode');
        if (memoryMode !== null) {
            document.getElementById('memoryMode').checked = memoryMode === 'true';
        }
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();

        if (!message || !geminiAPI.isConnected) {
            alert('Please enter a message and ensure API key is configured.');
            return;
        }

        try {
            // Clear input and show user message
            messageInput.value = '';
            this.addMessageToChat('user', message);

            // Show loading state
            const loadingId = this.addMessageToChat('system', 'Processing your request...');

            // Determine processing mode
            let response;
            const isIterativeMode = document.getElementById('iterativeMode').checked;

            if (isIterativeMode) {
                response = await this.processIterativeMessage(message);
            } else {
                response = await geminiAPI.makeRequest(message, true);
            }

            // Remove loading message and show response
            this.removeMessageFromChat(loadingId);
            this.addMessageToChat('assistant', response);

            // Auto-store in memory if enabled
            if (document.getElementById('memoryMode').checked && response.length > 100) {
                dataManager.addMemory(
                    `Q: ${message.substring(0, 50)}...`,
                    `Question: ${message}\n\nResponse: ${response}`,
                    'conversation'
                );
            }

            // Update session count
            dataManager.currentSession.messageCount++;

        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessageToChat('system', `Error: ${error.message}`);
        }
    }

    async processIterativeMessage(message) {
        try {
            // Use reasoning engine for complex processing
            const isComplexTask = message.length > 50 || 
                                 message.includes('analyze') ||
                                 message.includes('create') ||
                                 message.includes('solve');

            if (isComplexTask) {
                return await reasoningEngine.processWithChainOfThought(message);
            } else {
                return await geminiAPI.iterativeReasoning(message, 2);
            }
        } catch (error) {
            console.error('Error in iterative processing:', error);
            // Fallback to simple request
            return await geminiAPI.makeRequest(message, true);
        }
    }

    addMessageToChat(sender, message) {
        const chatHistory = document.getElementById('chatHistory');
        const messageId = 'msg_' + Date.now();

        const messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        messageDiv.className = `message ${sender}`;
        messageDiv.innerHTML = this.formatMessage(message, sender);

        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        return messageId;
    }

    removeMessageFromChat(messageId) {
        const messageElement = document.getElementById(messageId);
        if (messageElement) {
            messageElement.remove();
        }
    }

    formatMessage(message, sender) {
        if (sender === 'system') {
            return `<em>${message}</em>`;
        }

        // Basic markdown-like formatting
        let formatted = message
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');

        return formatted;
    }

    toggleCodeSection() {
        const codeSection = document.getElementById('codeSection');
        codeSection.classList.toggle('hidden');

        if (!codeSection.classList.contains('hidden')) {
            document.getElementById('codeInput').focus();
        }
    }

    async executeCode() {
        const codeInput = document.getElementById('codeInput');
        const code = codeInput.value.trim();

        if (!code) {
            alert('Please enter JavaScript code to execute.');
            return;
        }

        try {
            await codeExecutor.executeCode(code);

            // Add to reasoning chain
            reasoningEngine.addStep('Code Execution', `Executed: ${code.substring(0, 50)}...`);

        } catch (error) {
            console.error('Code execution error:', error);
        }
    }

    toggleCanvasSection() {
        const canvasSection = document.getElementById('canvasSection');
        canvasSection.classList.toggle('hidden');

        if (!canvasSection.classList.contains('hidden')) {
            document.getElementById('htmlInput').focus();
        }
    }

    renderHtml() {
        const htmlInput = document.getElementById('htmlInput');
        const htmlOutput = document.getElementById('htmlOutput');
        const html = htmlInput.value.trim();

        if (!html) {
            alert('Please enter HTML content to render.');
            return;
        }

        try {
            htmlOutput.innerHTML = html;
            reasoningEngine.addStep('HTML Render', `Rendered ${html.length} characters of HTML`);
        } catch (error) {
            htmlOutput.innerHTML = `<p style="color: var(--error-color);">Error rendering HTML: ${error.message}</p>`;
        }
    }

    showGoalModal() {
        document.getElementById('goalModal').classList.remove('hidden');
        document.getElementById('goalInput').focus();
    }

    hideGoalModal() {
        document.getElementById('goalModal').classList.add('hidden');
        document.getElementById('goalInput').value = '';
    }

    saveGoals() {
        const goalInput = document.getElementById('goalInput');
        const goalsText = goalInput.value.trim();

        if (!goalsText) {
            alert('Please enter your goals.');
            return;
        }

        // Parse goals (one per line)
        const goals = goalsText.split('\n').filter(goal => goal.trim());
        dataManager.setGoals(goals);

        this.hideGoalModal();

        // Add to reasoning chain
        reasoningEngine.addStep('Goals Set', `Set ${goals.length} conversation goals`);
    }

    resetSession() {
        // Clear all data
        dataManager.resetSession();
        codeExecutor.clearHistory();

        // Clear UI
        document.getElementById('chatHistory').innerHTML = '';
        document.getElementById('codeOutput').innerHTML = '';
        document.getElementById('htmlOutput').innerHTML = '';

        // Hide sections
        document.getElementById('codeSection').classList.add('hidden');
        document.getElementById('canvasSection').classList.add('hidden');

        this.addMessageToChat('system', 'Session reset. All data cleared.');
    }

    updateUI() {
        // Update status indicators
        setInterval(() => {
            dataManager.updateStatus();
            geminiAPI.updateKeyStatsUI();
        }, 5000);
    }

    // Export session data
    exportSession() {
        const sessionData = {
            ...dataManager.exportSession(),
            messageHistory: this.messageHistory,
            executionHistory: codeExecutor.executionHistory,
            settings: {
                iterativeMode: document.getElementById('iterativeMode').checked,
                verificationMode: document.getElementById('verificationMode').checked,
                memoryMode: document.getElementById('memoryMode').checked
            }
        };

        const blob = new Blob([JSON.stringify(sessionData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gemini_session_${new Date().toISOString().slice(0, 19)}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }

    // Import session data
    async importSession(file) {
        try {
            const text = await file.text();
            const sessionData = JSON.parse(text);

            dataManager.importSession(sessionData);
            this.messageHistory = sessionData.messageHistory || [];
            codeExecutor.executionHistory = sessionData.executionHistory || [];

            if (sessionData.settings) {
                document.getElementById('iterativeMode').checked = sessionData.settings.iterativeMode;
                document.getElementById('verificationMode').checked = sessionData.settings.verificationMode;
                document.getElementById('memoryMode').checked = sessionData.settings.memoryMode;
            }

            alert('Session imported successfully');

        } catch (error) {
            alert(`Import failed: ${error.message}`);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.geminiInterface = new GeminiAdvancedInterface();

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'e':
                    e.preventDefault();
                    document.getElementById('executeCode').click();
                    break;
                case 'h':
                    e.preventDefault();
                    document.getElementById('showCanvas').click();
                    break;
                case 'r':
                    e.preventDefault();
                    if (e.shiftKey) {
                        document.getElementById('resetSession').click();
                    }
                    break;
            }
        }
    });
});
