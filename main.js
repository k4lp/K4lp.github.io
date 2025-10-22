// main.js - Application Entry Point

import { uiManager } from './ui-manager.js';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    uiManager.init();
    console.log('Gemini Advanced Reasoning Lab initialized');
});

// Global error handlers
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
