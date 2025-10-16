/*!
 * Navbar Component
 *
 * Injects a consistent navigation bar at the top of every page.
 */
export function initNavbar() {
    const navbarContainer = document.getElementById('navbar-container');

    if (navbarContainer) {
        const navbarHTML = `
            <nav class="navbar">
                <div class="navbar-content">
                    <a href="index.html" class="navbar-brand">PCB Assembly Tools</a>
                    <button id="settings-button" class="btn">Settings</button>
                </div>
            </nav>
        `;
        navbarContainer.innerHTML = navbarHTML;
    } else {
        console.error('Fatal Error: Navbar container not found. The page cannot be rendered correctly.');
    }
}