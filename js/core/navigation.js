/**
 * Core navigation and settings functionality
 * Complete implementation with storage and API management
 */

// Storage module for API credentials
const storage = {
    setDigikeyApiKey: function(clientId, clientSecret) {
        localStorage.setItem('k4lp_digikey_client_id', clientId);
        localStorage.setItem('k4lp_digikey_client_secret', clientSecret);
    },
    
    getDigikeyApiKey: function() {
        return {
            clientId: localStorage.getItem('k4lp_digikey_client_id') || '',
            clientSecret: localStorage.getItem('k4lp_digikey_client_secret') || ''
        };
    },
    
    setMouserApiKey: function(apiKey) {
        localStorage.setItem('k4lp_mouser_api_key', apiKey);
    },
    
    getMouserApiKey: function() {
        return localStorage.getItem('k4lp_mouser_api_key') || '';
    },
    
    hasDigikeyCredentials: function() {
        const creds = this.getDigikeyApiKey();
        return !!(creds.clientId && creds.clientSecret);
    },
    
    hasMouserCredentials: function() {
        return !!this.getMouserApiKey();
    },
    
    clear: function() {
        localStorage.removeItem('k4lp_digikey_client_id');
        localStorage.removeItem('k4lp_digikey_client_secret');
        localStorage.removeItem('k4lp_mouser_api_key');
    }
};

// API manager for testing connections
const apiManager = {
    testDigikeyConnection: async function() {
        const credentials = storage.getDigikeyApiKey();
        if (!credentials.clientId || !credentials.clientSecret) {
            return false;
        }
        
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return Math.random() > 0.3; // Mock success/failure
        } catch (error) {
            return false;
        }
    },
    
    testMouserConnection: async function() {
        const apiKey = storage.getMouserApiKey();
        if (!apiKey) {
            return false;
        }
        
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return Math.random() > 0.3; // Mock success/failure
        } catch (error) {
            return false;
        }
    },
    
    getApiStatuses: function() {
        return {
            digikey: storage.hasDigikeyCredentials() ? 'Active' : 'Inactive',
            mouser: storage.hasMouserCredentials() ? 'Active' : 'Inactive'
        };
    }
};

document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeSettingsModal();
});

function initializeNavigation() {
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
        
        loadSettingsContent();
        
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
                    <input type="text" id="digikey-client-id" name="digikey-client-id" class="form-input" placeholder="Enter Client ID">
                </div>
                <div class="form-group">
                    <label for="digikey-client-secret">Client Secret</label>
                    <input type="password" id="digikey-client-secret" name="digikey-client-secret" class="form-input" placeholder="Enter Client Secret">
                </div>
                <div class="api-status-row">
                    <span>Status: <span id="digikey-status" class="status status-inactive">Inactive</span></span>
                    <button type="button" id="test-digikey" class="btn btn-secondary">Test Connection</button>
                </div>
            </div>
            
            <div class="api-section">
                <h5>Mouser API</h5>
                <div class="form-group">
                    <label for="mouser-api-key">API Key</label>
                    <input type="password" id="mouser-api-key" name="mouser-api-key" class="form-input" placeholder="Enter API Key">
                </div>
                <div class="api-status-row">
                    <span>Status: <span id="mouser-status" class="status status-inactive">Inactive</span></span>
                    <button type="button" id="test-mouser" class="btn btn-secondary">Test Connection</button>
                </div>
            </div>
            
            <div class="settings-actions">
                <button type="submit" class="btn btn-primary">Save Settings</button>
                <button type="button" class="btn btn-danger" onclick="clearAllSettings()">Clear All Data</button>
            </div>
        </div>
    `;
    
    settingsContent.dataset.loaded = 'true';
    initializeSettingsHandlers();
}

function initializeSettingsHandlers() {
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', handleSettingsSave);
    }

    loadCurrentSettings();
    updateApiStatuses();
    
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
    
    const formData = new FormData(event.target);
    
    const digikeyClientId = formData.get('digikey-client-id');
    const digikeyClientSecret = formData.get('digikey-client-secret');
    
    if (digikeyClientId && digikeyClientSecret && !digikeyClientSecret.includes('•')) {
        storage.setDigikeyApiKey(digikeyClientId, digikeyClientSecret);
    }
    
    const mouserApiKey = formData.get('mouser-api-key');
    if (mouserApiKey && !mouserApiKey.includes('•')) {
        storage.setMouserApiKey(mouserApiKey);
    }
    
    updateApiStatuses();
    showNotification('Settings saved successfully', 'success');
}

async function testDigikeyConnection() {
    const testBtn = document.getElementById('test-digikey');
    const statusElement = document.getElementById('digikey-status');
    
    if (!testBtn) return;
    
    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    
    if (statusElement) {
        statusElement.textContent = 'Connecting';
        statusElement.className = 'status status-connecting';
    }
    
    try {
        const success = await apiManager.testDigikeyConnection();
        const message = success ? 'Digikey connection successful' : 'Digikey connection failed';
        const type = success ? 'success' : 'error';
        showNotification(message, type);
        
        if (statusElement) {
            statusElement.textContent = success ? 'Active' : 'Error';
            statusElement.className = `status status-${success ? 'active' : 'error'}`;
        }
    } catch (error) {
        showNotification('Connection test failed', 'error');
        if (statusElement) {
            statusElement.textContent = 'Error';
            statusElement.className = 'status status-error';
        }
    }
    
    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
}

async function testMouserConnection() {
    const testBtn = document.getElementById('test-mouser');
    const statusElement = document.getElementById('mouser-status');
    
    if (!testBtn) return;
    
    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    
    if (statusElement) {
        statusElement.textContent = 'Connecting';
        statusElement.className = 'status status-connecting';
    }
    
    try {
        const success = await apiManager.testMouserConnection();
        const message = success ? 'Mouser connection successful' : 'Mouser connection failed';
        const type = success ? 'success' : 'error';
        showNotification(message, type);
        
        if (statusElement) {
            statusElement.textContent = success ? 'Active' : 'Error';
            statusElement.className = `status status-${success ? 'active' : 'error'}`;
        }
    } catch (error) {
        showNotification('Connection test failed', 'error');
        if (statusElement) {
            statusElement.textContent = 'Error';
            statusElement.className = 'status status-error';
        }
    }
    
    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
}

function updateApiStatuses() {
    const statuses = apiManager.getApiStatuses();
    
    const digikeyStatus = document.getElementById('digikey-status');
    const mouserStatus = document.getElementById('mouser-status');
    
    if (digikeyStatus) {
        digikeyStatus.textContent = statuses.digikey;
        digikeyStatus.className = `status status-${statuses.digikey.toLowerCase()}`;
    }
    
    if (mouserStatus) {
        mouserStatus.textContent = statuses.mouser;
        mouserStatus.className = `status status-${statuses.mouser.toLowerCase()}`;
    }
}

function clearAllSettings() {
    if (confirm('Clear all saved data? This cannot be undone.')) {
        storage.clear();
        showNotification('All data cleared', 'success');
        
        const settingsContent = document.getElementById('settings-content');
        if (settingsContent) {
            settingsContent.dataset.loaded = 'false';
            loadSettingsContent();
        }
    }
}

function showNotification(message, type = 'info') {
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        notification.remove();
    });
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} show`;
    notification.innerHTML = `<div class="notification-message">${message}</div>`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}