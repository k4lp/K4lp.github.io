// main.js - Entry Point for Gemini Advanced Reasoning Lab
// This file maintains backward compatibility while providing access to enhanced features

// Check if enhanced system is requested
const isEnhancedMode = window.location.search.includes('enhanced=true') || 
                      window.location.pathname.includes('enhanced');

if (isEnhancedMode) {
    // Load enhanced system
    import('./main-enhanced.js').then(() => {
        console.log('Enhanced system loaded successfully');
    }).catch(error => {
        console.error('Failed to load enhanced system:', error);
        // Fallback to original system
        loadOriginalSystem();
    });
} else {
    // Load original system by default
    loadOriginalSystem();
}

function loadOriginalSystem() {
    // Import original UI manager
    import('./ui-manager.js').then(() => {
        console.log('Original Gemini Advanced Reasoning Lab - Ready');
        console.log('Add "?enhanced=true" to URL for enhanced vault system');
    }).catch(error => {
        console.error('Failed to load original system:', error);
        document.body.innerHTML = `
            <div style="text-align: center; padding: 50px; font-family: system-ui, sans-serif;">
                <h1>System Load Error</h1>
                <p>Failed to load the reasoning lab system.</p>
                <p>Error: ${error.message}</p>
                <button onclick="window.location.reload()">Reload Page</button>
            </div>
        `;
    });
}

// Add system switching capability
window.switchToEnhanced = () => {
    const url = new URL(window.location);
    url.searchParams.set('enhanced', 'true');
    window.location.href = url.toString();
};

window.switchToOriginal = () => {
    const url = new URL(window.location);
    url.searchParams.delete('enhanced');
    window.location.href = url.toString();
};

// Initialize system based on mode
document.addEventListener('DOMContentLoaded', () => {
    // Add mode switcher to page if not in enhanced mode
    if (!isEnhancedMode && document.querySelector('.lab-container')) {
        const switcher = document.createElement('div');
        switcher.innerHTML = `
            <div style="position: fixed; top: 10px; right: 10px; z-index: 1000;">
                <button onclick="switchToEnhanced()" style="
                    background: #007acc; 
                    color: white; 
                    border: none; 
                    padding: 8px 16px; 
                    border-radius: 4px; 
                    cursor: pointer;
                    font-size: 12px;
                ">
                    ⬆️ Enhanced Mode
                </button>
            </div>
        `;
        document.body.appendChild(switcher);
    }
});