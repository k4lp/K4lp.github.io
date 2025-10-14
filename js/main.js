// main.js - Application entry point and initialization

// Global app instance
let app = null;

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Gemini Advanced Reasoning Interface...');

    try {
        // Initialize app
        app = new GeminiApp();
        app.initialize();

        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showCriticalError('Failed to initialize application: ' + error.message);
    }
});

// Main application class
class GeminiApp {
    constructor() {
        this.components = {};
        this.initialized = false;
    }

    // Initialize all components
    initialize() {
        console.log('Initializing components...');

        // Initialize storage manager
        this.components.storage = new StorageManager();
        console.log('✓ Storage manager initialized');

        // Initialize data structures
        this.components.dataStructures = new DataStructures(this.components.storage);
        console.log('✓ Data structures initialized');

        // Initialize API manager
        this.components.apiManager = new ApiManager(this.components.storage);
        console.log('✓ API manager initialized');

        // Initialize code executor
        this.components.codeExecutor = new CodeExecutor();
        console.log('✓ Code executor initialized');

        // Initialize canvas manager
        this.components.canvasManager = new CanvasManager();
        console.log('✓ Canvas manager initialized');

        // Initialize prompt builder
        this.components.promptBuilder = new PromptBuilder(this.components.dataStructures);
        console.log('✓ Prompt builder initialized');

        // Initialize response parser
        this.components.responseParser = new ResponseParser(this.components.dataStructures);
        console.log('✓ Response parser initialized');

        // Initialize UI manager
        this.components.uiManager = new UIManager(this.components.dataStructures);
        console.log('✓ UI manager initialized');

        // Initialize chat manager
        this.components.chatManager = new ChatManager(
            this.components.apiManager,
            this.components.dataStructures,
            this.components.promptBuilder,
            this.components.responseParser,
            this.components.codeExecutor,
            this.components.canvasManager,
            this.components.uiManager
        );
        console.log('✓ Chat manager initialized');

        // Setup settings panel handlers
        this.setupSettingsHandlers();
        console.log('✓ Settings handlers initialized');

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        console.log('✓ Keyboard shortcuts initialized');

        // Load saved configuration
        this.loadConfiguration();
        console.log('✓ Configuration loaded');

        this.initialized = true;
        console.log('All components initialized successfully');

        // Check for API keys
        if (!this.components.apiManager.hasApiKeys()) {
            this.components.uiManager.showNotification(
                'Please configure API keys in settings to begin',
                'info',
                5000
            );
        }
    }

    // Setup settings panel handlers
    setupSettingsHandlers() {
        // Save API keys
        const saveKeysBtn = document.getElementById('saveKeys');
        if (saveKeysBtn) {
            saveKeysBtn.addEventListener('click', () => this.saveApiKeys());
        }

        // Clear API keys
        const clearKeysBtn = document.getElementById('clearKeys');
        if (clearKeysBtn) {
            clearKeysBtn.addEventListener('click', () => this.clearApiKeys());
        }

        // Model selection
        const modelSelect = document.getElementById('modelName');
        if (modelSelect) {
            modelSelect.addEventListener('change', (e) => {
                this.components.apiManager.setModel(e.target.value);
                this.components.uiManager.showNotification('Model updated', 'info');
            });
        }

        // Temperature slider
        const tempSlider = document.getElementById('temperature');
        const tempValue = document.getElementById('temperatureValue');
        if (tempSlider && tempValue) {
            tempSlider.addEventListener('input', (e) => {
                tempValue.textContent = parseFloat(e.target.value).toFixed(1);
            });
        }

        // Export session data
        const exportBtn = document.getElementById('exportData');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportSessionData());
        }

        // Import session data
        const importBtn = document.getElementById('importData');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.importSessionData());
        }

        // Clear session
        const clearSessionBtn = document.getElementById('clearSession');
        if (clearSessionBtn) {
            clearSessionBtn.addEventListener('click', () => this.clearSession());
        }

        // Load saved API keys into inputs
        this.loadApiKeysToInputs();
    }

    // Save API keys
    saveApiKeys() {
        const keys = [];
        for (let i = 1; i <= 5; i++) {
            const input = document.getElementById(`apiKey${i}`);
            if (input && input.value.trim()) {
                keys.push(input.value.trim());
            }
        }

        if (keys.length === 0) {
            this.components.uiManager.showNotification('Please enter at least one API key', 'error');
            return;
        }

        const count = this.components.apiManager.saveApiKeys(keys);
        this.components.uiManager.showNotification(`${count} API key(s) saved successfully`, 'info');

        // Update status indicators
        this.updateKeyStatusIndicators();
    }

    // Clear API keys
    clearApiKeys() {
        if (!confirm('Are you sure you want to clear all API keys?')) {
            return;
        }

        this.components.apiManager.saveApiKeys([]);

        // Clear input fields
        for (let i = 1; i <= 5; i++) {
            const input = document.getElementById(`apiKey${i}`);
            if (input) input.value = '';
        }

        this.components.uiManager.showNotification('All API keys cleared', 'info');
        this.updateKeyStatusIndicators();
    }

    // Load API keys into input fields
    loadApiKeysToInputs() {
        const keys = this.components.apiManager.apiKeys;
        keys.forEach((key, index) => {
            const input = document.getElementById(`apiKey${index + 1}`);
            if (input) {
                input.value = key;
            }
        });
        this.updateKeyStatusIndicators();
    }

    // Update key status indicators
    updateKeyStatusIndicators() {
        const keyCount = this.components.apiManager.apiKeys.length;
        for (let i = 1; i <= 5; i++) {
            const status = document.getElementById(`status${i}`);
            if (status) {
                if (i <= keyCount) {
                    status.textContent = '✓';
                    status.style.color = '#57eb57';
                } else {
                    status.textContent = '';
                }
            }
        }
    }

    // Export session data
    exportSessionData() {
        const sessionData = this.components.dataStructures.exportSession();
        const dataStr = JSON.stringify(sessionData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `gemini-session-${Date.now()}.json`;
        link.click();

        URL.revokeObjectURL(url);
        this.components.uiManager.showNotification('Session data exported', 'info');
    }

    // Import session data
    importSessionData() {
        const fileInput = document.getElementById('fileInput');
        if (!fileInput) return;

        fileInput.click();
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    const success = this.components.dataStructures.importSession(data);

                    if (success) {
                        this.components.uiManager.showNotification('Session data imported successfully', 'info');
                    } else {
                        this.components.uiManager.showNotification('Failed to import session data', 'error');
                    }
                } catch (error) {
                    this.components.uiManager.showNotification('Invalid session file', 'error');
                }
            };
            reader.readAsText(file);
        };
    }

    // Clear session
    clearSession() {
        if (!confirm('Are you sure you want to clear the entire session? This cannot be undone.')) {
            return;
        }

        this.components.dataStructures.clearSession();
        this.components.chatManager.clearConversation();
        this.components.uiManager.showNotification('Session cleared', 'info');
    }

    // Load configuration from storage
    loadConfiguration() {
        const config = this.components.storage.get(CONFIG.STORAGE_KEYS.MODEL_CONFIG);
        if (config) {
            // Set model
            const modelSelect = document.getElementById('modelName');
            if (modelSelect && config.model) {
                modelSelect.value = config.model;
                this.components.apiManager.setModel(config.model);
            }
        }
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K: Focus input
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const input = document.getElementById('userInput');
                if (input) input.focus();
            }

            // Ctrl/Cmd + ,: Open settings
            if ((e.ctrlKey || e.metaKey) && e.key === ',') {
                e.preventDefault();
                this.components.uiManager.toggleSettings();
            }

            // Escape: Close settings/panels
            if (e.key === 'Escape') {
                this.components.uiManager.hideSettings();
                this.components.uiManager.hideCodeExecution();
            }
        });
    }

    // Get component
    getComponent(name) {
        return this.components[name];
    }

    // Check if initialized
    isInitialized() {
        return this.initialized;
    }
}

// Show critical error
function showCriticalError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ed3a3a;
        color: white;
        padding: 24px 32px;
        border-radius: 12px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.2);
        z-index: 99999;
        max-width: 500px;
        text-align: center;
        font-family: 'Geist', sans-serif;
    `;
    errorDiv.innerHTML = `
        <h2 style="margin: 0 0 12px 0; font-size: 1.2rem;">Initialization Error</h2>
        <p style="margin: 0; font-size: 0.95rem;">${message}</p>
        <button onclick="location.reload()" style="
            margin-top: 16px;
            padding: 8px 16px;
            background: white;
            color: #ed3a3a;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.95rem;
            font-weight: 500;
        ">Reload Page</button>
    `;
    document.body.appendChild(errorDiv);
}

// Export app instance to window
window.GeminiApp = GeminiApp;
window.app = app;
