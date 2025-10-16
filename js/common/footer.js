/*!
 * Footer Component
 *
 * Injects a consistent footer at the bottom of every page.
 */
document.addEventListener('DOMContentLoaded', () => {
    const footerContainer = document.getElementById('footer-container');

    if (footerContainer) {
        // The container itself is the footer, so we just set its class and inner HTML
        footerContainer.className = 'footer';
        footerContainer.innerHTML = `
            <div class="footer-content">
                <p>&copy; ${new Date().getFullYear()} Kalp Pariya. All Rights Reserved.</p>
            </div>
        `;
    } else {
        console.error('Error: Footer container not found.');
    }
});