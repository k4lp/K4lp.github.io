// canvasManager.js - Manages HTML canvas rendering and display

class CanvasManager {
    constructor() {
        this.canvasContainer = document.getElementById('canvasContainer');
        this.canvasFrame = document.getElementById('canvasFrame');
        this.refreshBtn = document.getElementById('refreshCanvas');
        this.closeBtn = document.getElementById('closeCanvas');
        this.currentHTML = null;
        this.renderHistory = [];

        this.initEventListeners();
    }

    // Initialize event listeners
    initEventListeners() {
        if (this.refreshBtn) {
            this.refreshBtn.addEventListener('click', () => this.refresh());
        }

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hide());
        }
    }

    // Render HTML content in canvas
    async render(html, options = {}) {
        const renderId = this.generateRenderId();
        const timestamp = Date.now();

        try {
            // Store current HTML
            this.currentHTML = html;

            // Add to history
            this.renderHistory.push({
                id: renderId,
                html: html,
                timestamp: timestamp,
                options: options
            });

            // Sanitize HTML if requested
            const sanitizedHTML = options.sanitize !== false ? this.sanitizeHTML(html) : html;

            // Create complete HTML document
            const fullHTML = this.wrapHTML(sanitizedHTML, options);

            // Render in iframe
            const iframeDoc = this.canvasFrame.contentDocument || this.canvasFrame.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(fullHTML);
            iframeDoc.close();

            // Show canvas container
            this.show();

            // Emit render event
            document.dispatchEvent(new CustomEvent('canvas-rendered', {
                detail: {
                    id: renderId,
                    timestamp: timestamp
                }
            }));

            return {
                success: true,
                id: renderId
            };

        } catch (error) {
            console.error('Canvas render error:', error);

            document.dispatchEvent(new CustomEvent('canvas-error', {
                detail: {
                    error: error.message
                }
            }));

            return {
                success: false,
                error: error.message
            };
        }
    }

    // Wrap HTML in complete document structure
    wrapHTML(html, options = {}) {
        const title = options.title || 'Canvas Output';
        const styles = options.styles || this.getDefaultStyles();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        ${styles}
    </style>
</head>
<body>
    ${html}
</body>
</html>`;
    }

    // Get default styles for canvas content
    getDefaultStyles() {
        return `
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    padding: 20px;
    background: #ffffff;
    color: #222326;
    line-height: 1.6;
}

h1, h2, h3, h4, h5, h6 {
    margin-bottom: 0.5em;
    font-weight: 600;
}

p {
    margin-bottom: 1em;
}

pre {
    background: #f5f5f5;
    padding: 12px;
    border-radius: 4px;
    overflow-x: auto;
}

code {
    background: #f5f5f5;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Geist Mono', monospace;
}

table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
}

th, td {
    border: 1px solid #e5e6e8;
    padding: 8px 12px;
    text-align: left;
}

th {
    background: #f1f2f3;
    font-weight: 600;
}

img {
    max-width: 100%;
    height: auto;
}

a {
    color: #2a2a2b;
    text-decoration: underline;
}
        `;
    }

    // Sanitize HTML to remove potentially dangerous content
    sanitizeHTML(html) {
        let sanitized = html;

        // Remove script tags (case insensitive)
        sanitized = sanitized.replace(/<script[\s\S]*?<\/script>/gi, '');

        // Remove event handler attributes
        sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
        sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

        // Remove javascript: protocols
        sanitized = sanitized.replace(/javascript:/gi, '');

        return sanitized;
    }

    // Show canvas container
    show() {
        if (this.canvasContainer) {
            this.canvasContainer.classList.remove('hidden');

            // Scroll to canvas
            setTimeout(() => {
                this.canvasContainer.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest' 
                });
            }, 100);
        }
    }

    // Hide canvas container
    hide() {
        if (this.canvasContainer) {
            this.canvasContainer.classList.add('hidden');
        }

        document.dispatchEvent(new CustomEvent('canvas-hidden'));
    }

    // Refresh current canvas content
    refresh() {
        if (this.currentHTML) {
            this.render(this.currentHTML);
        }
    }

    // Clear canvas content
    clear() {
        if (this.canvasFrame) {
            const iframeDoc = this.canvasFrame.contentDocument || this.canvasFrame.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write('');
            iframeDoc.close();
        }
        this.currentHTML = null;
    }

    // Update canvas content (append or replace)
    update(html, mode = 'replace') {
        if (mode === 'append' && this.currentHTML) {
            this.render(this.currentHTML + '\n' + html);
        } else {
            this.render(html);
        }
    }

    // Generate unique render ID
    generateRenderId() {
        return 'render_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Get render history
    getHistory() {
        return this.renderHistory;
    }

    // Get last render
    getLastRender() {
        return this.renderHistory[this.renderHistory.length - 1] || null;
    }

    // Clear history
    clearHistory() {
        this.renderHistory = [];
    }

    // Export canvas content as HTML
    exportHTML() {
        return this.currentHTML;
    }

    // Take screenshot of canvas (returns data URL)
    async takeScreenshot() {
        try {
            // This would require html2canvas or similar library
            // For now, return the HTML content
            return {
                success: false,
                message: 'Screenshot functionality requires additional library'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Check if canvas is visible
    isVisible() {
        return this.canvasContainer && !this.canvasContainer.classList.contains('hidden');
    }

    // Toggle canvas visibility
    toggle() {
        if (this.isVisible()) {
            this.hide();
        } else {
            this.show();
        }
    }
}

// Export
window.CanvasManager = CanvasManager;
