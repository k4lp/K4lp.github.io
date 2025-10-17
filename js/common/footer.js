export function initFooter() {
    const container = document.getElementById('footer-container');
    if (container) {
        container.className = 'footer';
        container.innerHTML = `<p>&copy; ${new Date().getFullYear()} Kalp Pariya. All Rights Reserved.</p>`;
    }
}