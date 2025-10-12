/**
 * Navigation HTML Template Generator
 * Generates consistent navigation structure for all pages
 */

// Navigation HTML template
function createNavigationHTML() {
    return `
        <nav class="navbar">
            <div class="nav-container">
                <div class="nav-brand">
                    <a href="index.html" class="nav-brand-link">K4LP</a>
                </div>
                <div class="nav-menu">
                    <a href="index.html" class="nav-link">Tools</a>
                    <a href="contact.html" class="nav-link">Contact</a>
                </div>
                <div class="nav-actions">
                    <button id="settings-btn" class="settings-btn" aria-label="Settings">Settings</button>
                </div>
            </div>
        </nav>
    `;
}

// Settings modal HTML template
function createSettingsModalHTML() {
    return `
        <div id="settings-modal" class="modal">
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Settings</h3>
                    <button id="close-settings" class="close-btn">Close</button>
                </div>
                <form id="settings-form" class="modal-body">
                    <div id="settings-content">
                        <!-- Settings content will be loaded dynamically -->
                    </div>
                </form>
            </div>
        </div>
    `;
}

// Footer HTML template
function createFooterHTML() {
    return `
        <footer class="footer">
            <div class="footer-content">
                <div class="footer-links">
                    <a href="#" class="footer-link">Privacy</a>
                    <a href="#" class="footer-link">Terms</a>
                    <a href="#" class="footer-link">Docs</a>
                </div>
                <p>&copy; <span id="footer-year">2025</span> Kalp Pariya</p>
            </div>
        </footer>
    `;
}

// Initialize navigation on page load
document.addEventListener('DOMContentLoaded', function() {
    // Insert navigation at the start of body
    const body = document.body;
    const navHTML = createNavigationHTML();
    body.insertAdjacentHTML('afterbegin', navHTML);
    
    // Insert settings modal before closing body tag
    const settingsHTML = createSettingsModalHTML();
    body.insertAdjacentHTML('beforeend', settingsHTML);
    
    // Update footer year
    const footerYear = document.getElementById('footer-year');
    if (footerYear) {
        footerYear.textContent = new Date().getFullYear();
    }
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createNavigationHTML,
        createSettingsModalHTML,
        createFooterHTML
    };
}