/**
 * Core navigation and settings functionality
 * Clean and minimal implementation
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
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        
        // Load settings content if not already loaded
        loadSettingsContent();
        
        // Focus management
        const closeButton = modal.querySelector('#close-settings');
        if (closeButton) {
            closeButton.focus();
        }
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        
        // Return focus to settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.focus();
        }
    }
}

function loadSettingsContent() {
    const settingsContent = document.getElementById('settings-content');
    if (!settingsContent || settingsContent.dataset.loaded) return;
    
    settingsContent.innerHTML = `
        <div class="settings-section">
            <h4>API Configuration</h4>
            
            <div class="api-section">
                <h5>Digikey API</h5>
                <div class="form-group">
                    <label for="digikey-client-id">Client ID</label>
                    <input type="text" id="digikey-client-id" name="digikey-client-id" placeholder="Enter Client ID">
                </div>
                <div class="form-group">
                    <label for="digikey-client-secret">Client Secret</label>
                    <input type="password" id="digikey-client-secret" name="digikey-client-secret" placeholder="Enter Client Secret">
                </div>
                <div class="api-status-row">
                    <span>Status: <span id="digikey-status" class="status status-inactive">Inactive</span></span>
                    <button type="button" id="test-digikey" class="btn-secondary">Test Connection</button>
                </div>
            </div>
            
            <div class="api-section">
                <h5>Mouser API</h5>
                <div class="form-group">
                    <label for="mouser-api-key">API Key</label>
                    <input type="password" id="mouser-api-key" name="mouser-api-key" placeholder="Enter API Key">
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
    
    // Initialize settings form handlers
    initializeSettingsHandlers();
}

function initializeSettingsHandlers() {
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', handleSettingsSave);
    }

    // Load existing settings
    loadCurrentSettings();
    updateApiStatuses();
    
    // Test connection buttons
    const testDigikeyBtn = document.getElementById('test-digikey');
    const testMouserBtn = document.getElementById('test-mouser');

    if (testDigikeyBtn) {
        testDigikeyBtn.addEventListener('click', testDigikeyConnection);
    }

    if (testMouserBtn) {
        testMouserBtn.addEventListener('click', testMouserConnection);
    }
}

function loadCurrentSettings() {
    if (typeof storage === 'undefined') return;
    
    const digikeyCredentials = storage.getDigikeyApiKey();
    const mouserApiKey = storage.getMouserApiKey();

    const digikeyClientId = document.getElementById('digikey-client-id');
    const digikeyClientSecret = document.getElementById('digikey-client-secret');
    
    if (digikeyClientId && digikeyCredentials.clientId) {
        digikeyClientId.value = digikeyCredentials.clientId;
    }
    
    if (digikeyClientSecret && digikeyCredentials.clientSecret) {
        digikeyClientSecret.value = '••••••••••••';
    }

    const mouserApiKeyInput = document.getElementById('mouser-api-key');
    if (mouserApiKeyInput && mouserApiKey) {
        mouserApiKeyInput.value = '••••••••••••';
    }
}

function handleSettingsSave(event) {
    event.preventDefault();
    
    if (typeof storage === 'undefined') {
        showNotification('Storage not available', 'error');
        return;
    }
    
    const formData = new FormData(event.target);
    
    // Save Digikey credentials
    const digikeyClientId = formData.get('digikey-client-id');
    const digikeyClientSecret = formData.get('digikey-client-secret');
    
    if (digikeyClientId && digikeyClientSecret && !digikeyClientSecret.includes('•')) {
        storage.setDigikeyApiKey(digikeyClientId, digikeyClientSecret);
    }
    
    // Save Mouser API key
    const mouserApiKey = formData.get('mouser-api-key');
    if (mouserApiKey && !mouserApiKey.includes('•')) {
        storage.setMouserApiKey(mouserApiKey);
    }
    
    showNotification('Settings saved', 'success');
}

async function testDigikeyConnection() {
    const testBtn = document.getElementById('test-digikey');
    
    if (!testBtn) return;
    
    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    
    try {
        let success = false;
        if (typeof apiManager !== 'undefined') {
            success = await apiManager.testDigikeyConnection();
        }
        
        const message = success ? 'Digikey connection successful' : 'Digikey connection failed';
        const type = success ? 'success' : 'error';
        showNotification(message, type);
    } catch (error) {
        showNotification('Connection test failed', 'error');
    }
    
    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
    
    updateApiStatuses();
}

async function testMouserConnection() {
    const testBtn = document.getElementById('test-mouser');
    
    if (!testBtn) return;
    
    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    
    try {
        let success = false;
        if (typeof apiManager !== 'undefined') {
            success = await apiManager.testMouserConnection();
        }
        
        const message = success ? 'Mouser connection successful' : 'Mouser connection failed';
        const type = success ? 'success' : 'error';
        showNotification(message, type);
    } catch (error) {
        showNotification('Connection test failed', 'error');
    }
    
    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
    
    updateApiStatuses();
}

function updateApiStatuses() {
    if (typeof apiManager === 'undefined') return;
    
    const statuses = apiManager.getApiStatuses();
    
    const digikeyStatus = document.getElementById('digikey-status');
    const mouserStatus = document.getElementById('mouser-status');
    
    if (digikeyStatus) {
        digikeyStatus.textContent = statuses.digikey || 'Inactive';
        digikeyStatus.className = `status status-${(statuses.digikey || 'inactive').toLowerCase()}`;
    }
    
    if (mouserStatus) {
        mouserStatus.textContent = statuses.mouser || 'Inactive';
        mouserStatus.className = `status status-${(statuses.mouser || 'inactive').toLowerCase()}`;
    }
}

function clearAllSettings() {
    if (confirm('Clear all saved data? This cannot be undone.')) {
        if (typeof storage !== 'undefined') {
            storage.clear();
            showNotification('All data cleared', 'success');
            
            // Reload settings content
            const settingsContent = document.getElementById('settings-content');
            if (settingsContent) {
                settingsContent.dataset.loaded = 'false';
                loadSettingsContent();
            }
        } else {
            showNotification('Storage not available', 'error');
        }
    }
}

function showNotification(message, type = 'info') {
    // Simple notification implementation
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} show`;
    notification.innerHTML = `<div class="notification-message">${message}</div>`;
    
    document.body.appendChild(notification);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}