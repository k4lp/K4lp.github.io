/**
 * Core navigation and layout functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeSettingsModal();
});

function initializeNavigation() {
    // Highlight current page in navigation
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });
}

function initializeSettingsModal() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModal = document.getElementById('close-settings');
    const modalOverlay = document.querySelector('.modal-overlay');
    
    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', openSettingsModal);
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', closeSettingsModal);
    }
    
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeSettingsModal);
    }
    
    // ESC key to close modal
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && settingsModal && settingsModal.classList.contains('active')) {
            closeSettingsModal();
        }
    });
}

function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Load settings content if not already loaded
        loadSettingsContent();
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

async function loadSettingsContent() {
    const settingsContent = document.getElementById('settings-content');
    if (!settingsContent || settingsContent.dataset.loaded) return;
    
    // Settings content template
    settingsContent.innerHTML = `
        <div class="settings-section">
            <h3>API Configuration</h3>
            
            <div class="api-section">
                <h4>Digikey API</h4>
                <div class="form-group">
                    <label for="digikey-client-id">Client ID</label>
                    <input type="text" id="digikey-client-id" name="digikey-client-id" placeholder="Enter Digikey Client ID">
                </div>
                <div class="form-group">
                    <label for="digikey-client-secret">Client Secret</label>
                    <input type="password" id="digikey-client-secret" name="digikey-client-secret" placeholder="Enter Digikey Client Secret">
                </div>
                <div class="api-status-row">
                    <span>Status: <span id="digikey-status" class="status status-inactive">Inactive</span></span>
                    <button type="button" id="test-digikey" class="btn-secondary">Test Connection</button>
                </div>
            </div>
            
            <div class="api-section">
                <h4>Mouser API</h4>
                <div class="form-group">
                    <label for="mouser-api-key">API Key</label>
                    <input type="password" id="mouser-api-key" name="mouser-api-key" placeholder="Enter Mouser API Key">
                </div>
                <div class="api-status-row">
                    <span>Status: <span id="mouser-status" class="status status-inactive">Inactive</span></span>
                    <button type="button" id="test-mouser" class="btn-secondary">Test Connection</button>
                </div>
            </div>
            
            <div class="settings-actions">
                <button type="submit" class="btn-primary">Save Settings</button>
                <button type="button" class="btn-danger" onclick="clearAllSettings()">Clear All Data</button>
            </div>
        </div>
    `;
    
    settingsContent.dataset.loaded = 'true';
    
    // Initialize settings functionality
    initializeSettingsPage();
}

function clearAllSettings() {
    if (confirm('Are you sure you want to clear all saved data? This action cannot be undone.')) {
        storage.clear();
        Utils.showNotification('All data cleared successfully!', 'success');
        
        // Reload settings content
        const settingsContent = document.getElementById('settings-content');
        if (settingsContent) {
            settingsContent.dataset.loaded = 'false';
            loadSettingsContent();
        }
    }
}
