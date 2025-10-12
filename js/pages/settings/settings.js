/**
 * Settings page functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeSettingsPage();
});

function initializeSettingsPage() {
    loadCurrentSettings();
    setupSettingsForm();
    updateApiStatuses();
    
    // Update statuses every 30 seconds
    setInterval(updateApiStatuses, 30000);
}

function loadCurrentSettings() {
    const digikeyCredentials = storage.getDigikeyApiKey();
    const mouserApiKey = storage.getMouserApiKey();

    // Load Digikey settings
    const digikeyClientId = document.getElementById('digikey-client-id');
    const digikeyClientSecret = document.getElementById('digikey-client-secret');
    
    if (digikeyClientId && digikeyCredentials.clientId) {
        digikeyClientId.value = digikeyCredentials.clientId;
    }
    
    if (digikeyClientSecret && digikeyCredentials.clientSecret) {
        digikeyClientSecret.value = '••••••••••••••••'; // Mask the secret
    }

    // Load Mouser settings
    const mouserApiKeyInput = document.getElementById('mouser-api-key');
    if (mouserApiKeyInput && mouserApiKey) {
        mouserApiKeyInput.value = '••••••••••••••••'; // Mask the key
    }
}

function setupSettingsForm() {
    const settingsForm = document.getElementById('settings-form');
    if (!settingsForm) return;

    settingsForm.addEventListener('submit', handleSettingsSave);

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

function handleSettingsSave(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    
    // Save Digikey credentials
    const digikeyClientId = formData.get('digikey-client-id');
    const digikeyClientSecret = formData.get('digikey-client-secret');
    
    if (digikeyClientId && digikeyClientSecret && digikeyClientSecret !== '••••••••••••••••') {
        storage.setDigikeyApiKey(digikeyClientId, digikeyClientSecret);
    }
    
    // Save Mouser API key
    const mouserApiKey = formData.get('mouser-api-key');
    if (mouserApiKey && mouserApiKey !== '••••••••••••••••') {
        storage.setMouserApiKey(mouserApiKey);
    }
    
    Utils.showNotification('Settings saved successfully!', 'success');
}

async function testDigikeyConnection() {
    const testBtn = document.getElementById('test-digikey');
    const statusElement = document.getElementById('digikey-status');
    
    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    
    const success = await apiManager.testDigikeyConnection();
    
    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
    
    updateApiStatuses();
    
    const message = success ? 'Digikey connection successful!' : 'Digikey connection failed!';
    const type = success ? 'success' : 'error';
    Utils.showNotification(message, type);
}

async function testMouserConnection() {
    const testBtn = document.getElementById('test-mouser');
    const statusElement = document.getElementById('mouser-status');
    
    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    
    const success = await apiManager.testMouserConnection();
    
    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
    
    updateApiStatuses();
    
    const message = success ? 'Mouser connection successful!' : 'Mouser connection failed!';
    const type = success ? 'success' : 'error';
    Utils.showNotification(message, type);
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
