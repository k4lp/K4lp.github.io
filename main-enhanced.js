// main-enhanced.js - Enhanced Entry Point for Gemini Advanced Reasoning Lab

import './ui-manager-enhanced.js';

// Initialize the enhanced application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Gemini Advanced Reasoning Lab v2.0 Enhanced - Ready');
    console.log('Features: Enhanced Data Vault, Improved Tag Processing, Modular Architecture');
    
    // Add enhanced CSS styles
    const enhancedStyles = document.createElement('style');
    enhancedStyles.textContent = `
        /* Enhanced Vault System Styles */
        .vault-container {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 8px;
        }
        
        .vault-entry {
            border: 1px solid var(--border-light);
            border-radius: 4px;
            padding: 8px;
            margin-bottom: 8px;
            background: var(--bg-secondary);
        }
        
        .vault-entry-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        }
        
        .vault-id {
            font-family: var(--font-mono);
            font-size: 0.8em;
            color: var(--text-secondary);
        }
        
        .vault-type {
            background: var(--accent-color);
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.7em;
            text-transform: uppercase;
        }
        
        .vault-label {
            font-weight: 500;
            margin-bottom: 4px;
        }
        
        .vault-preview {
            font-family: var(--font-mono);
            font-size: 0.85em;
            color: var(--text-secondary);
            background: var(--bg-code);
            padding: 4px;
            border-radius: 2px;
            margin-bottom: 4px;
        }
        
        .vault-meta {
            display: flex;
            justify-content: space-between;
            font-size: 0.75em;
            color: var(--text-muted);
        }
        
        .vault-actions {
            display: flex;
            gap: 8px;
            margin-top: 8px;
        }
        
        /* Enhanced Tool Results */
        .tool-result {
            border: 1px solid var(--border-light);
            border-radius: 4px;
            padding: 8px;
            margin-bottom: 8px;
            background: var(--bg-secondary);
        }
        
        .tool-result.tool-vault_operation {
            border-left: 4px solid var(--accent-color);
        }
        
        .tool-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        }
        
        .tool-name {
            font-family: var(--font-mono);
            font-weight: 500;
        }
        
        .tool-status.success {
            color: var(--success-color);
            font-weight: bold;
        }
        
        .tool-status.error {
            color: var(--error-color);
            font-weight: bold;
        }
        
        .vault-ref {
            font-family: var(--font-mono);
            background: var(--bg-code);
            padding: 2px 4px;
            border-radius: 2px;
            font-size: 0.9em;
        }
        
        /* Enhanced Modal Styles */
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        
        .modal-content {
            background: var(--bg-primary);
            border-radius: 8px;
            max-width: 800px;
            max-height: 80vh;
            width: 90%;
            display: flex;
            flex-direction: column;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-color);
        }
        
        .modal-header h2 {
            margin: 0;
            font-size: 1.25em;
        }
        
        .modal-body {
            padding: 20px;
            overflow-y: auto;
            flex: 1;
        }
        
        .help-section {
            margin-bottom: 24px;
        }
        
        .help-section h3 {
            margin-top: 0;
            margin-bottom: 12px;
            color: var(--accent-color);
        }
        
        .instructions-content {
            line-height: 1.6;
        }
        
        .instructions-content h2,
        .instructions-content h3,
        .instructions-content h4 {
            margin-top: 24px;
            margin-bottom: 12px;
        }
        
        .instructions-content pre {
            background: var(--bg-code);
            padding: 12px;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 0.9em;
        }
        
        .instructions-content code {
            background: var(--bg-code);
            padding: 2px 4px;
            border-radius: 2px;
            font-family: var(--font-mono);
            font-size: 0.9em;
        }
        
        /* Enhanced Status Indicators */
        .key-status {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-left: 8px;
        }
        
        .key-status.status-active {
            background-color: var(--success-color);
        }
        
        .key-status.status-rate-limited {
            background-color: var(--error-color);
        }
        
        .key-status.status-inactive {
            background-color: var(--text-muted);
        }
        
        /* Enhanced System Stats */
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
            margin-bottom: 16px;
        }
        
        .status-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            background: var(--bg-secondary);
            border-radius: 4px;
        }
        
        .status-label {
            font-size: 0.9em;
            color: var(--text-secondary);
        }
        
        .status-value {
            font-weight: 600;
            font-family: var(--font-mono);
        }
        
        /* Version indicator */
        .version {
            font-size: 0.7em;
            background: var(--accent-color);
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            margin-left: 8px;
        }
        
        /* Enhanced button styles */
        .btn-small {
            padding: 2px 6px;
            font-size: 0.8em;
            border: none;
            border-radius: 2px;
            cursor: pointer;
        }
        
        .btn-small.btn-danger {
            background: var(--error-color);
            color: white;
        }
        
        .btn-small.btn-danger:hover {
            background: #c53030;
        }
        
        /* Responsive enhancements */
        @media (max-width: 768px) {
            .api-keys-grid {
                grid-template-columns: 1fr;
            }
            
            .status-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .main-content {
                flex-direction: column;
            }
            
            .left-panel,
            .center-panel,
            .right-panel {
                width: 100%;
            }
        }
    `;
    
    document.head.appendChild(enhancedStyles);
    
    // Add global error handler for unhandled vault operations
    window.addEventListener('error', (event) => {
        if (event.error && event.error.message && event.error.message.includes('vault')) {
            console.error('Vault system error:', event.error);
            // Could show user notification here
        }
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        // Ctrl/Cmd + Enter to send message
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            const sendButton = document.getElementById('send-message');
            if (sendButton && sendButton.style.display !== 'none') {
                sendButton.click();
            }
        }
        
        // Escape to close modal
        if (event.key === 'Escape') {
            const modal = document.getElementById('vault-modal');
            if (modal && modal.style.display !== 'none') {
                modal.style.display = 'none';
            }
        }
        
        // Ctrl/Cmd + R to reset (with confirmation)
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
            event.preventDefault();
            const resetButton = document.getElementById('reset-all');
            if (resetButton) {
                resetButton.click();
            }
        }
    });
    
    console.log('Enhanced system initialized successfully');
});