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

        // Rest remains the same...
        // [Omit unchanged code for brevity; assume full original except this block]
        document.getElementById('sendMessage').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.sendMessage();
            }
        });

        document.getElementById('executeCode').addEventListener('click', () => {
            this.toggleCodeSection();
        });

        document.getElementById('runCode').addEventListener('click', () => {
            this.executeCode();
        });

        document.getElementById('showCanvas').addEventListener('click', () => {
            this.toggleCanvasSection();
        });

        document.getElementById('renderHtml').addEventListener('click', () => {
            this.renderHtml();
        });

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

        document.getElementById('saveGoals').addEventListener('click', () => {
            this.saveGoals();
        });

        document.getElementById('cancelGoals').addEventListener('click', () => {
            this.hideGoalModal();
        });

        document.getElementById('resetSession').addEventListener('click', () => {
            if (confirm('Reset entire session? All data will be lost.')) {
                this.resetSession();
            }
        });

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
        // Load settings (API keys handled in geminiApi.js)
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

    // [Omit unchanged methods; full code would include all original]
    // e.g., sendMessage, processIterativeMessage, etc.
    updateUI() {
        setInterval(() => {
            dataManager.updateStatus();
            geminiAPI.updateKeyStatsUI();
        }, 5000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.geminiInterface = new GeminiAdvancedInterface();

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
