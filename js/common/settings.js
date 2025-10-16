/*!
 * Settings Modal
 *
 * Renders and controls the settings modal, which allows users to manage
 * API credentials.
 */
export function initSettingsModal() {
    const modalContainer = document.getElementById('settings-modal-container');
    const navbarContainer = document.getElementById('navbar-container');

    if (!modalContainer || !navbarContainer) {
        console.error('Required containers for settings modal not found.');
        return;
    }

    // 1. Render the Modal HTML
    const modalHTML = `
        <div id="settings-overlay" class="modal-overlay">
            <div id="settings-modal" class="modal">
                <div class="modal-header">
                    <h2>API Settings</h2>
                    <button id="close-settings-button" class="close-button">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Manage your API credentials for Digikey and Mouser.</p>

                    <!-- Digikey Form Section -->
                    <div class="form-section">
                        <h3>Digikey</h3>
                        <div class="form-group">
                            <label for="digikey-key">API Key</label>
                            <input type="password" id="digikey-key" name="digikey-key">
                        </div>
                        <div class="form-group">
                            <label for="digikey-secret">API Secret</label>
                            <input type="password" id="digikey-secret" name="digikey-secret">
                        </div>
                    </div>

                    <!-- Mouser Form Section -->
                    <div class="form-section">
                        <h3>Mouser</h3>
                        <div class="form-group">
                            <label for="mouser-key">API Key</label>
                            <input type="password" id="mouser-key" name="mouser-key">
                        </div>
                    </div>

                </div>
                <div class="modal-footer">
                    <button id="save-settings-button" class="btn">Save</button>
                </div>
            </div>
        </div>
    `;
    modalContainer.innerHTML = modalHTML;

    // 2. Get references to the elements
    const settingsOverlay = document.getElementById('settings-overlay');
    const closeSettingsButton = document.getElementById('close-settings-button');
    const saveSettingsButton = document.getElementById('save-settings-button');

    // 3. Define functions to show/hide modal
    const openModal = () => settingsOverlay.classList.add('is-active');
    const closeModal = () => settingsOverlay.classList.remove('is-active');

    // 4. Attach Event Listeners
    // Use a mutation observer to ensure the settings button exists before attaching listener
    const observer = new MutationObserver((mutations, obs) => {
        const settingsButton = document.getElementById('settings-button');
        if (settingsButton) {
            settingsButton.addEventListener('click', openModal);
            obs.disconnect(); // Stop observing once the button is found
        }
    });

    observer.observe(navbarContainer, {
        childList: true,
        subtree: true
    });

    closeSettingsButton.addEventListener('click', closeModal);
    settingsOverlay.addEventListener('click', (e) => {
        if (e.target === settingsOverlay) {
            closeModal();
        }
    });

    saveSettingsButton.addEventListener('click', () => {
        console.log('[Placeholder] Saving settings...');
        // Future logic to save credentials via ApiManager will go here.
        closeModal();
    });
}