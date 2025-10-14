// uiManager.js - Manages UI interactions and updates

class UIManager {
    constructor(dataStructures) {
        this.ds = dataStructures;

        // Get DOM elements
        this.settingsPanel = document.getElementById('settingsPanel');
        this.settingsToggle = document.getElementById('settingsToggle');
        this.closeSettings = document.getElementById('closeSettings');

        this.messagesContainer = document.getElementById('messagesContainer');
        this.userInput = document.getElementById('userInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.charCount = document.getElementById('charCount');

        this.reasoningIndicator = document.getElementById('reasoningIndicator');
        this.reasoningStatus = document.getElementById('reasoningStatus');

        this.codeExecutionPanel = document.getElementById('codeExecutionPanel');
        this.codeDisplay = document.getElementById('codeDisplay');
        this.executionOutput = document.getElementById('executionOutput');
        this.closeExecution = document.getElementById('closeExecution');

        // Data structure display elements
        this.memoryItems = document.getElementById('memoryItems');
        this.memoryCount = document.getElementById('memoryCount');
        this.reasoningItems = document.getElementById('reasoningItems');
        this.reasoningCount = document.getElementById('reasoningCount');
        this.goalsItems = document.getElementById('goalsItems');
        this.goalsCount = document.getElementById('goalsCount');
        this.checkpointsItems = document.getElementById('checkpointsItems');
        this.checkpointsCount = document.getElementById('checkpointsCount');

        this.currentMessageElement = null;

        this.initEventListeners();
    }

    // Initialize all event listeners
    initEventListeners() {
        // Settings panel
        if (this.settingsToggle) {
            this.settingsToggle.addEventListener('click', () => this.toggleSettings());
        }

        if (this.closeSettings) {
            this.closeSettings.addEventListener('click', () => this.hideSettings());
        }

        // Input handling
        if (this.userInput) {
            this.userInput.addEventListener('input', () => this.handleInputChange());
            this.userInput.addEventListener('keydown', (e) => this.handleInputKeydown(e));
        }

        if (this.sendBtn) {
            this.sendBtn.addEventListener('click', () => this.handleSendClick());
        }

        // Code execution panel
        if (this.closeExecution) {
            this.closeExecution.addEventListener('click', () => this.hideCodeExecution());
        }

        // Data structures updates
        document.addEventListener('data-structures-updated', (e) => this.updateDataStructuresDisplay(e.detail));

        // Auto-resize textarea
        if (this.userInput) {
            this.userInput.addEventListener('input', () => this.autoResizeTextarea());
        }
    }

    // Toggle settings panel
    toggleSettings() {
        if (this.settingsPanel) {
            this.settingsPanel.classList.toggle('open');
        }
    }

    // Show settings panel
    showSettings() {
        if (this.settingsPanel) {
            this.settingsPanel.classList.add('open');
        }
    }

    // Hide settings panel
    hideSettings() {
        if (this.settingsPanel) {
            this.settingsPanel.classList.remove('open');
        }
    }

    // Handle input change
    handleInputChange() {
        if (!this.userInput) return;

        const length = this.userInput.value.length;
        if (this.charCount) {
            this.charCount.textContent = `${length} / ${CONFIG.MAX_INPUT_LENGTH}`;
        }

        // Enable/disable send button
        if (this.sendBtn) {
            this.sendBtn.disabled = length === 0;
        }
    }

    // Handle input keydown
    handleInputKeydown(e) {
        // Send on Enter (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSendClick();
        }
    }

    // Handle send button click
    handleSendClick() {
        const message = this.userInput?.value.trim();
        if (!message) return;

        // Emit send event
        document.dispatchEvent(new CustomEvent('user-message-send', {
            detail: { message: message }
        }));

        // Clear input
        if (this.userInput) {
            this.userInput.value = '';
            this.handleInputChange();
            this.autoResizeTextarea();
        }
    }

    // Auto-resize textarea
    autoResizeTextarea() {
        if (!this.userInput) return;

        this.userInput.style.height = 'auto';
        this.userInput.style.height = Math.min(this.userInput.scrollHeight, 115) + 'px';
    }

    // Add user message to chat
    addUserMessage(message) {
        const messageDiv = this.createMessageElement('user', message);
        this.appendMessage(messageDiv);
        this.scrollToBottom();
    }

    // Add assistant message to chat
    addAssistantMessage(message = '') {
        const messageDiv = this.createMessageElement('assistant', message);
        this.currentMessageElement = messageDiv.querySelector('.message-content');
        this.appendMessage(messageDiv);
        this.scrollToBottom();
        return this.currentMessageElement;
    }

    // Create message element
    createMessageElement(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;

        messageDiv.appendChild(contentDiv);
        return messageDiv;
    }

    // Append message to container
    appendMessage(messageElement) {
        if (this.messagesContainer) {
            // Remove welcome message if present
            const welcomeMsg = this.messagesContainer.querySelector('.welcome-message');
            if (welcomeMsg) {
                welcomeMsg.remove();
            }

            this.messagesContainer.appendChild(messageElement);
        }
    }

    // Stream text to current message
    streamToCurrentMessage(text) {
        if (this.currentMessageElement) {
            this.currentMessageElement.textContent += text;
            this.scrollToBottom();
        }
    }

    // Set current message content
    setCurrentMessageContent(text) {
        if (this.currentMessageElement) {
            this.currentMessageElement.textContent = text;
            this.scrollToBottom();
        }
    }

    // Append to current message
    appendToCurrentMessage(text) {
        if (this.currentMessageElement) {
            this.currentMessageElement.textContent += '\n\n' + text;
            this.scrollToBottom();
        }
    }

    // Scroll messages to bottom
    scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }

    // Show reasoning indicator
    showReasoningIndicator(status = 'Reasoning...') {
        if (this.reasoningIndicator) {
            this.reasoningIndicator.classList.remove('hidden');
        }
        if (this.reasoningStatus) {
            this.reasoningStatus.textContent = status;
        }
    }

    // Hide reasoning indicator
    hideReasoningIndicator() {
        if (this.reasoningIndicator) {
            this.reasoningIndicator.classList.add('hidden');
        }
    }

    // Update reasoning indicator status
    updateReasoningStatus(status) {
        if (this.reasoningStatus) {
            this.reasoningStatus.textContent = status;
        }
    }

    // Show code execution panel
    showCodeExecution(code, output = '') {
        if (this.codeExecutionPanel) {
            this.codeExecutionPanel.classList.remove('hidden');
        }
        if (this.codeDisplay) {
            this.codeDisplay.textContent = code;
        }
        if (this.executionOutput) {
            this.executionOutput.textContent = output;
        }
    }

    // Hide code execution panel
    hideCodeExecution() {
        if (this.codeExecutionPanel) {
            this.codeExecutionPanel.classList.add('hidden');
        }
    }

    // Update code execution output
    updateCodeExecutionOutput(output) {
        if (this.executionOutput) {
            this.executionOutput.textContent = output;
        }
    }

    // Update data structures display
    updateDataStructuresDisplay(counts) {
        // Update memory
        if (this.memoryCount) {
            this.memoryCount.textContent = counts.memoryCount || 0;
        }
        if (this.memoryItems && this.ds) {
            this.updateMemoryDisplay();
        }

        // Update reasoning chain
        if (this.reasoningCount) {
            this.reasoningCount.textContent = counts.reasoningCount || 0;
        }
        if (this.reasoningItems && this.ds) {
            this.updateReasoningDisplay();
        }

        // Update goals
        if (this.goalsCount) {
            this.goalsCount.textContent = counts.goalsCount || 0;
        }
        if (this.goalsItems && this.ds) {
            this.updateGoalsDisplay();
        }

        // Update checkpoints
        if (this.checkpointsCount) {
            this.checkpointsCount.textContent = counts.checkpointsCount || 0;
        }
        if (this.checkpointsItems && this.ds) {
            this.updateCheckpointsDisplay();
        }
    }

    // Update memory items display
    updateMemoryDisplay() {
        if (!this.memoryItems) return;

        if (this.ds.memory.length === 0) {
            this.memoryItems.innerHTML = '<p class="empty-state">No memory items stored</p>';
            return;
        }

        const html = this.ds.memory.slice(-5).map(mem => 
            `<div class="data-item" title="${mem.details.substring(0, 100)}...">
                [${mem.index}] ${mem.summary}
            </div>`
        ).join('');

        this.memoryItems.innerHTML = html;
    }

    // Update reasoning chain display
    updateReasoningDisplay() {
        if (!this.reasoningItems) return;

        if (this.ds.immediateReasoningChain.length === 0) {
            this.reasoningItems.innerHTML = '<p class="empty-state">No reasoning steps</p>';
            return;
        }

        const html = this.ds.immediateReasoningChain.slice(-3).map((step, idx) => 
            `<div class="data-item">
                Step ${idx + 1}: ${step.step.substring(0, 50)}...
            </div>`
        ).join('');

        this.reasoningItems.innerHTML = html;
    }

    // Update goals display
    updateGoalsDisplay() {
        if (!this.goalsItems) return;

        if (this.ds.goals.length === 0) {
            this.goalsItems.innerHTML = '<p class="empty-state">No goals defined</p>';
            return;
        }

        const html = this.ds.goals.map(goal => 
            `<div class="data-item">
                [${goal.index}] ${goal.goal.substring(0, 40)}... (${goal.status})
            </div>`
        ).join('');

        this.goalsItems.innerHTML = html;
    }

    // Update checkpoints display
    updateCheckpointsDisplay() {
        if (!this.checkpointsItems) return;

        if (this.ds.checkpoints.length === 0) {
            this.checkpointsItems.innerHTML = '<p class="empty-state">No checkpoints saved</p>';
            return;
        }

        const html = this.ds.checkpoints.map(cp => 
            `<div class="data-item">
                [${cp.index}] ${cp.name}
            </div>`
        ).join('');

        this.checkpointsItems.innerHTML = html;
    }

    // Show notification
    showNotification(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Style notification
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${type === 'error' ? '#ed3a3a' : '#2a2a2b'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Auto-remove after duration
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    // Disable input
    disableInput() {
        if (this.userInput) this.userInput.disabled = true;
        if (this.sendBtn) this.sendBtn.disabled = true;
    }

    // Enable input
    enableInput() {
        if (this.userInput) this.userInput.disabled = false;
        if (this.sendBtn) this.sendBtn.disabled = false;
        this.handleInputChange();
    }
}

// Export
window.UIManager = UIManager;
