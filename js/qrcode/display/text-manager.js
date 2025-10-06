/**
 * QR Code Component Scanner - Text Display Manager
 * Alica Technologies
 * 
 * Handles smart text truncation and display management
 */

window.QRScannerTextManager = {
    // Configuration
    DEFAULT_MAX_LENGTH: 30,
    MOBILE_MAX_LENGTH: 20,
    SERIAL_OVERLAY_MAX_LENGTH: 25,
    TRUNCATE_SUFFIX: '...',
    
    /**
     * Initialize text manager
     */
    init() {
        this._setupMutationObserver();
        this._processExistingElements();
        window.QRScannerUtils.log.debug('Text manager initialized');
    },

    /**
     * Setup mutation observer to handle dynamic content
     */
    _setupMutationObserver() {
        if (!('MutationObserver' in window)) {
            window.QRScannerUtils.log.warn('MutationObserver not supported');
            return;
        }
        
        this._observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this._processElement(node);
                        }
                    });
                }
                
                if (mutation.type === 'characterData' || 
                    (mutation.type === 'attributes' && mutation.attributeName === 'data-original-text')) {
                    this._processElement(mutation.target.parentElement);
                }
            });
        });
        
        this._observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['data-original-text']
        });
    },

    /**
     * Process existing elements on page
     */
    _processExistingElements() {
        // Process serial overlay elements
        const serialOverlays = document.querySelectorAll('.serial-value, #serialValue');
        serialOverlays.forEach(element => {
            this._processSerialElement(element);
        });
        
        // Process table cells that might contain long text
        const tableCells = document.querySelectorAll('.results-table td, .table td');
        tableCells.forEach(element => {
            this._processTableCell(element);
        });
        
        // Process match display elements
        const matchDisplays = document.querySelectorAll('.scan-result, .kv-value');
        matchDisplays.forEach(element => {
            this._processMatchDisplay(element);
        });
    },

    /**
     * Process any element for text truncation needs
     */
    _processElement(element) {
        if (!element || !element.classList) return;
        
        // Skip if already processed
        if (element.hasAttribute('data-text-processed')) return;
        
        // Process based on element type/class
        if (element.classList.contains('serial-value') || element.id === 'serialValue') {
            this._processSerialElement(element);
        } else if (element.closest('.results-table') || element.classList.contains('kv-value')) {
            this._processTableCell(element);
        } else if (element.classList.contains('scan-result') || element.classList.contains('current-match')) {
            this._processMatchDisplay(element);
        }
    },

    /**
     * Process serial number display elements
     */
    _processSerialElement(element) {
        if (!element) return;
        
        const originalText = element.getAttribute('data-original-text') || element.textContent;
        
        if (originalText && originalText.length > this.SERIAL_OVERLAY_MAX_LENGTH) {
            const truncated = this._truncateText(originalText, this.SERIAL_OVERLAY_MAX_LENGTH);
            
            // Store original text
            element.setAttribute('data-original-text', originalText);
            element.textContent = truncated;
            element.title = originalText; // Show full text on hover
            
            // Add visual indicator
            element.style.cursor = 'help';
            
            // Add click handler for mobile devices
            if (window.QRScannerUtils.device.isMobile()) {
                element.addEventListener('click', () => {
                    this._showFullTextModal(originalText, 'Serial Number');
                });
            }
        }
        
        element.setAttribute('data-text-processed', 'true');
    },

    /**
     * Process table cell elements
     */
    _processTableCell(element) {
        if (!element) return;
        
        const originalText = element.getAttribute('data-original-text') || element.textContent;
        const maxLength = window.QRScannerUtils.device.isMobile() ? this.MOBILE_MAX_LENGTH : this.DEFAULT_MAX_LENGTH;
        
        if (originalText && originalText.length > maxLength) {
            const truncated = this._truncateText(originalText, maxLength);
            
            // Store original text
            element.setAttribute('data-original-text', originalText);
            element.textContent = truncated;
            element.title = originalText;
            
            // Add expand functionality
            this._addExpandFunctionality(element, originalText);
        }
        
        element.setAttribute('data-text-processed', 'true');
    },

    /**
     * Process match display elements
     */
    _processMatchDisplay(element) {
        if (!element) return;
        
        // Process all text nodes within the element
        const textNodes = this._getTextNodes(element);
        
        textNodes.forEach(textNode => {
            const parent = textNode.parentElement;
            if (!parent || parent.hasAttribute('data-text-processed')) return;
            
            const originalText = textNode.textContent;
            const maxLength = this.DEFAULT_MAX_LENGTH;
            
            if (originalText && originalText.length > maxLength) {
                const truncated = this._truncateText(originalText, maxLength);
                
                // Store original and update display
                parent.setAttribute('data-original-text', originalText);
                textNode.textContent = truncated;
                parent.title = originalText;
                
                this._addExpandFunctionality(parent, originalText);
            }
            
            parent.setAttribute('data-text-processed', 'true');
        });
    },

    /**
     * Add expand/collapse functionality to elements
     */
    _addExpandFunctionality(element, originalText) {
        // Add expand button for desktop
        if (!window.QRScannerUtils.device.isMobile()) {
            const expandBtn = document.createElement('button');
            expandBtn.className = 'text-expand-btn';
            expandBtn.innerHTML = '+';
            expandBtn.title = 'Click to expand';
            expandBtn.style.cssText = `
                margin-left: 4px;
                padding: 0 4px;
                border: 1px solid var(--gray-400);
                background: var(--gray-100);
                color: var(--gray-600);
                font-size: 10px;
                line-height: 1;
                cursor: pointer;
                vertical-align: middle;
            `;
            
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._toggleTextExpansion(element, expandBtn);
            });
            
            element.appendChild(expandBtn);
        } else {
            // Add tap handler for mobile
            element.style.cursor = 'pointer';
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                this._showFullTextModal(originalText, 'Full Text');
            });
        }
    },

    /**
     * Toggle text expansion
     */
    _toggleTextExpansion(element, button) {
        const originalText = element.getAttribute('data-original-text');
        const isExpanded = element.hasAttribute('data-expanded');
        
        if (isExpanded) {
            // Collapse
            const maxLength = window.QRScannerUtils.device.isMobile() ? this.MOBILE_MAX_LENGTH : this.DEFAULT_MAX_LENGTH;
            const truncated = this._truncateText(originalText, maxLength);
            
            // Find and update the text node (skip the button)
            this._updateTextContent(element, truncated, button);
            
            element.removeAttribute('data-expanded');
            button.innerHTML = '+';
            button.title = 'Click to expand';
        } else {
            // Expand
            this._updateTextContent(element, originalText, button);
            
            element.setAttribute('data-expanded', 'true');
            button.innerHTML = '−';
            button.title = 'Click to collapse';
        }
    },

    /**
     * Update text content while preserving button
     */
    _updateTextContent(element, newText, excludeElement) {
        const textNodes = [];
        
        // Collect text nodes, excluding the button
        for (const node of element.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                textNodes.push(node);
            } else if (node !== excludeElement && node.nodeType === Node.ELEMENT_NODE) {
                // For elements that aren't the button, get their text
                const subTextNodes = this._getTextNodes(node);
                textNodes.push(...subTextNodes);
            }
        }
        
        // Update the first text node and remove others
        if (textNodes.length > 0) {
            textNodes[0].textContent = newText;
            for (let i = 1; i < textNodes.length; i++) {
                textNodes[i].textContent = '';
            }
        }
    },

    /**
     * Show full text in modal (mobile-friendly)
     */
    _showFullTextModal(text, title = 'Full Text') {
        // Remove existing modal
        const existingModal = document.getElementById('full-text-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'full-text-modal';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;
        
        // Create modal content
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: var(--white);
            border: 2px solid var(--black);
            max-width: 500px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            padding: 20px;
        `;
        
        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="margin: 0; font-size: 14px; text-transform: uppercase;">${title}</h3>
                <button id="close-modal" style="padding: 4px 8px; border: 1px solid var(--black); background: var(--white);">×</button>
            </div>
            <div style="font-family: var(--font-mono); font-size: 12px; line-height: 1.5; word-break: break-all; user-select: text;">
                ${window.QRScannerUtils.string.escapeHtml(text)}
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Add close handlers
        const closeBtn = modal.querySelector('#close-modal');
        const closeModal = () => overlay.remove();
        
        closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
        
        // ESC key to close
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        
        document.addEventListener('keydown', handleEsc);
        
        // Auto-close after 10 seconds
        setTimeout(closeModal, 10000);
    },

    /**
     * Get all text nodes within an element
     */
    _getTextNodes(element) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    // Skip whitespace-only nodes
                    if (node.textContent.trim() === '') {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        
        return textNodes;
    },

    /**
     * Smart text truncation
     */
    _truncateText(text, maxLength, suffix = this.TRUNCATE_SUFFIX) {
        if (!text || text.length <= maxLength) {
            return text;
        }
        
        // Smart truncation - try to break at word boundaries
        const truncateLength = maxLength - suffix.length;
        
        if (truncateLength <= 0) {
            return suffix;
        }
        
        let truncated = text.substring(0, truncateLength);
        
        // If we're in the middle of a word, try to find a better break point
        const lastSpaceIndex = truncated.lastIndexOf(' ');
        const lastDashIndex = truncated.lastIndexOf('-');
        const lastUnderscoreIndex = truncated.lastIndexOf('_');
        
        const breakIndex = Math.max(lastSpaceIndex, lastDashIndex, lastUnderscoreIndex);
        
        // If we found a good break point and it's not too close to the start
        if (breakIndex > truncateLength * 0.7) {
            truncated = truncated.substring(0, breakIndex);
        }
        
        return truncated + suffix;
    },

    /**
     * Update serial overlay text
     */
    updateSerialOverlay(text) {
        const serialOverlay = document.getElementById('serialValue');
        if (!serialOverlay) return;
        
        // Store original text
        serialOverlay.setAttribute('data-original-text', text);
        
        // Process the element
        serialOverlay.removeAttribute('data-text-processed');
        this._processSerialElement(serialOverlay);
    },

    /**
     * Update any element with smart truncation
     */
    updateElement(element, text) {
        if (!element) return;
        
        element.setAttribute('data-original-text', text);
        element.removeAttribute('data-text-processed');
        this._processElement(element);
    },

    /**
     * Get original text from element
     */
    getOriginalText(element) {
        if (!element) return null;
        return element.getAttribute('data-original-text') || element.textContent;
    },

    /**
     * Reset element to original text
     */
    resetElement(element) {
        if (!element) return;
        
        const originalText = element.getAttribute('data-original-text');
        if (originalText) {
            element.textContent = originalText;
            element.removeAttribute('data-original-text');
            element.removeAttribute('data-text-processed');
            element.removeAttribute('data-expanded');
        }
    },

    /**
     * Clean up resources
     */
    destroy() {
        if (this._observer) {
            this._observer.disconnect();
        }
        
        // Remove any active modals
        const modal = document.getElementById('full-text-modal');
        if (modal) {
            modal.remove();
        }
    }
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.QRScannerTextManager.init();
    });
} else {
    window.QRScannerTextManager.init();
}