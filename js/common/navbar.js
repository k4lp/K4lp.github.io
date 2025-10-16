export function initNavbar() {
    const container = document.getElementById('navbar-container');
    if (container) {
        container.innerHTML = `
            <nav class="navbar">
                <div class="navbar-content">
                    <a href="index.html" class="navbar-brand">PCB Assembly Tools</a>
                    <button id="settings-button" class="btn">Settings</button>
                </div>
            </nav>
        `;
    }
}