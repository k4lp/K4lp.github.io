import { initNavbar } from '/js/common/navbar.js';
import { initFooter } from '/js/common/footer.js';
import { initSettingsModal } from '/js/common/settings.js';

function renderContactInfo() {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <h1>About & Contact</h1>
            <p>This is a client-side web application suite for PCB assembly engineers.</p>
            <p>Contact: kalp.paroya@gmail.com</p>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initFooter();
    initSettingsModal();
    renderContactInfo();
});