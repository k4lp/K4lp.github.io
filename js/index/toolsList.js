import { initNavbar } from '/js/common/navbar.js';
import { initFooter } from '/js/common/footer.js';
import { initSettingsModal } from '/js/common/settings.js';

function renderToolsList() {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <h1>Tool Directory</h1>
            <a href="advancedapi.html" class="btn">Advanced BOM Processor</a>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initFooter();
    initSettingsModal();
    renderToolsList();
});