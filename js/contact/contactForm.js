import { initNavbar } from '/js/common/navbar.js';
import { initFooter } from '/js/common/footer.js';
import { initSettingsModal } from '/js/common/settings.js';

/*!
 * Renders the content for the contact page.
 */
function renderContactInfo() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error('Main content container not found.');
        return;
    }

    const contactHTML = `
        <div class="contact-page">
            <h1>About This Project</h1>
            <p>
                This is a client-side web application suite for PCB assembly engineers, focusing on
                component BOM processing, barcode/QR scanning, and supplier API integration.
                Everything runs in your browser with persistent local storage. No server required.
            </p>
            <h2>Contact & Links</h2>
            <ul>
                <li><strong>Email:</strong> kalp.paroya@gmail.com</li>
                <li><strong>Project Repository:</strong> <a href="https://github.com/k-paroya/pcb-bom-tools" target="_blank" rel="noopener noreferrer">GitHub</a></li>
            </ul>
            <h2>Version</h2>
            <p>Version 1.0.0 (In Development)</p>
        </div>
    `;
    mainContent.innerHTML = contactHTML;
}

// Initialize all components for the contact page
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initFooter();
    initSettingsModal();
    renderContactInfo();
});