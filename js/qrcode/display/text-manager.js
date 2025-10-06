/**
 * QR Code Component Scanner - Enhanced Text Display Manager
 * Alica Technologies - Version 3.0
 * 
 * CRITICAL FIXES:
 * - Fixed serial number overflow covering screen
 * - Enhanced truncation with better break points
 * - Improved mobile modal display
 * - Better table cell text handling
 * - Responsive text management
 */

window.QRScannerTextManager = {
    // Configuration
    DEFAULT_MAX_LENGTH: 30,
    MOBILE_MAX_LENGTH: 20,
    SERIAL_OVERLAY_MAX_LENGTH: 15, // CRITICAL FIX: Shorter for better mobile experience
    SERIAL_MOBILE_MAX_LENGTH: 12,  // Even shorter on mobile
    TABLE_CELL_MAX_LENGTH: 25,
    TRUNCATE_SUFFIX: '…',
    
    /**
     * Initialize text manager
     */
    init() {
        this._setupMutationObserver();
        this._processExistingElements();
        this._setupResponsiveHandling();
        window.QRScannerUtils.log.debug('Enhanced text manager initialized');
    },

    /**
     * CRITICAL FIX: Setup responsive handling for different screen sizes
     */
    _setupResponsiveHandling() {
        // Listen for resize events to reprocess elements
        window.addEventListener('resize', this._handleResize.bind(this));
        
        // Initial mobile detection
        this._isMobile = window.innerWidth <= 768;
        
        window.QRScannerUtils.log.debug('Responsive handling enabled, mobile:', this._isMobile);
    },

    /**
     * Handle window resize
     */
    _handleResize() {
        const wasMobile = this._isMobile;
        this._isMobile = window.innerWidth <= 768;
        
        // If mobile state changed, reprocess all elements
        if (wasMobile !== this._isMobile) {
            this._processExistingElements();
        }
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
        // CRITICAL FIX: Process serial overlay elements with enhanced detection
        const serialOverlays = document.querySelectorAll('.serial-value, #serialValue, [class*="serial"]');
        serialOverlays.forEach(element => {
            this._processSerialElement(element);
        });
        
        // Process table cells that might contain long text
        const tableCells = document.querySelectorAll('.results-table td, .table td, td[data-row]');
        tableCells.forEach(element => {
            this._processTableCell(element);
        });
        
        // Process match display elements
        const matchDisplays = document.querySelectorAll('.scan-result, .kv-value, .current-match');
        matchDisplays.forEach(element => {
            this._processMatchDisplay(element);
        });
    },

    /**
     * Process any element for text truncation needs
     */
    _processElement(element) {
        if (!element || !element.classList) return;
        
        // Skip if already processed recently
        if (element.hasAttribute('data-text-processed')) {
            const processedTime = parseInt(element.getAttribute('data-text-processed'));
            if (Date.now() - processedTime < 1000) { // 1 second cooldown
                return;
            }
        }
        
        // Process based on element type/class
        if (element.classList.contains('serial-value') || 
            element.id === 'serialValue' || 
            element.className.includes('serial')) {
            this._processSerialElement(element);
        } else if (element.closest('.results-table') || 
                   element.classList.contains('kv-value') ||
                   element.tagName === 'TD') {
            this._processTableCell(element);
        } else if (element.classList.contains('scan-result') || 
                   element.classList.contains('current-match')) {
            this._processMatchDisplay(element);
        }
    },

    /**
     * CRITICAL FIX: Enhanced serial number display processing
     */
    _processSerialElement(element) {
        if (!element) return;
        
        const originalText = element.getAttribute('data-original-text') || element.textContent;
        if (!originalText || originalText.trim() === '' || originalText === '-') return;
        
        // CRITICAL FIX: Dynamic max length based on device and context
        let maxLength = this._isMobile ? this.SERIAL_MOBILE_MAX_LENGTH : this.SERIAL_OVERLAY_MAX_LENGTH;
        
        // Extra short for overlay contexts
        if (element.closest('.serial-overlay') || element.classList.contains('serial-overlay')) {
            maxLength = this._isMobile ? 10 : 12;
        }
        
        if (originalText.length > maxLength) {
            const truncated = this._truncateText(originalText, maxLength);
            
            // Store original text
            element.setAttribute('data-original-text', originalText);
            element.textContent = truncated;
            element.title = originalText; // Show full text on hover
            
            // CRITICAL FIX: Add click handler for mobile devices with enhanced modal
            if (this._isMobile) {
                element.style.cursor = 'pointer';
                element.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._showFullTextModal(originalText, 'Serial Number');
                });
            }
            
            // Add visual styling to indicate truncation
            element.style.borderBottom = '1px dashed rgba(255,255,255,0.5)';
        }
        
        element.setAttribute('data-text-processed', Date.now().toString());
    },

    /**
     * CRITICAL FIX: Enhanced table cell processing
     */
    _processTableCell(element) {
        if (!element) return;
        
        const originalText = element.getAttribute('data-original-text') || element.textContent;
        if (!originalText || originalText.trim() === '') return;
        
        const maxLength = this._isMobile ? this.MOBILE_MAX_LENGTH : this.TABLE_CELL_MAX_LENGTH;
        
        if (originalText.length > maxLength) {
            const truncated = this._truncateText(originalText, maxLength);
            
            // Store original text
            element.setAttribute('data-original-text', originalText);
            element.textContent = truncated;
            element.title = originalText;
            
            // Add expand functionality
            this._addExpandFunctionality(element, originalText);
        }
        
        element.setAttribute('data-text-processed', Date.now().toString());
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
            if (!originalText || originalText.trim() === '') return;
            
            const maxLength = this._isMobile ? this.MOBILE_MAX_LENGTH : this.DEFAULT_MAX_LENGTH;
            
            if (originalText.length > maxLength) {
                const truncated = this._truncateText(originalText, maxLength);
                
                // Store original and update display
                parent.setAttribute('data-original-text', originalText);
                textNode.textContent = truncated;
                parent.title = originalText;
                
                this._addExpandFunctionality(parent, originalText);
            }
            
            parent.setAttribute('data-text-processed', Date.now().toString());
        });
    },

    /**
     * CRITICAL FIX: Enhanced expand functionality with better mobile support
     */
    _addExpandFunctionality(element, originalText) {
        // Add expand button for desktop
        if (!this._isMobile) {
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
                border-radius: 2px;
            `;
            
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._toggleTextExpansion(element, expandBtn);
            });
            
            element.appendChild(expandBtn);
        } else {
            // Enhanced tap handler for mobile
            element.style.cursor = 'pointer';
            element.style.borderBottom = '1px dashed var(--gray-400)';
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
            const maxLength = this._isMobile ? this.MOBILE_MAX_LENGTH : this.DEFAULT_MAX_LENGTH;
            const truncated = this._truncateText(originalText, maxLength);
            
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
     * CRITICAL FIX: Enhanced modal for better mobile experience
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
            max-width: ${this._isMobile ? '95vw' : '500px'};
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            padding: 20px;
            font-family: var(--font-sans);
        `;
        
        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--gray-200); padding-bottom: 8px;">
                <h3 style="margin: 0; font-size: 14px; text-transform: uppercase; font-weight: 600;">${title}</h3>
                <button id="close-modal" style="padding: 4px 8px; border: 1px solid var(--black); background: var(--white); cursor: pointer; font-size: 18px; line-height: 1;">×</button>
            </div>
            <div style="font-family: var(--font-mono); font-size: ${this._isMobile ? '14px' : '12px'}; line-height: 1.5; word-break: break-all; user-select: text; max-height: 50vh; overflow-y: auto; padding: 8px; background: var(--gray-100); border: 1px solid var(--gray-300);">
                ${window.QRScannerUtils.string.escapeHtml(text)}
            </div>
            ${this._isMobile ? '<div style="margin-top: 12px; font-size: 11px; color: var(--gray-500); text-align: center;">Tap outside to close</div>' : ''}
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Add close handlers
        const closeBtn = modal.querySelector('#close-modal');
        const closeModal = () => {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.3s';
            setTimeout(() => overlay.remove(), 300);
        };
        
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
        
        // Auto-close after 15 seconds on mobile, 10 on desktop
        setTimeout(closeModal, this._isMobile ? 15000 : 10000);
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
     * CRITICAL FIX: Enhanced smart text truncation
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
        
        // Enhanced break point detection
        const breakChars = [' ', '-', '_', '.', '/', '\\', ':', ';', ','];
        let bestBreakIndex = -1;
        
        // Find the best break point within the last 30% of the truncated text
        const searchStart = Math.floor(truncateLength * 0.7);
        for (let i = truncateLength - 1; i >= searchStart; i--) {
            if (breakChars.includes(truncated[i])) {
                bestBreakIndex = i;
                break;
            }
        }
        
        if (bestBreakIndex > -1) {
            truncated = truncated.substring(0, bestBreakIndex);
        }
        
        return truncated + suffix;
    },

    /**
     * CRITICAL FIX: Enhanced serial overlay update with responsive handling
     */
    updateSerialOverlay(text) {
        const serialOverlay = document.getElementById('serialValue');
        if (!serialOverlay) return;
        
        // Store original text
        serialOverlay.setAttribute('data-original-text', text);
        
        // Reset processing flag to force reprocessing
        serialOverlay.removeAttribute('data-text-processed');
        
        // Process the element with current responsive settings
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
            
            // Remove any expand buttons
            const expandBtn = element.querySelector('.text-expand-btn');
            if (expandBtn) {
                expandBtn.remove();
            }
            
            // Reset styles
            element.style.cursor = '';
            element.style.borderBottom = '';
        }
    },

    /**
     * Force reprocess all elements (useful after screen size changes)
     */
    reprocessAll() {
        // Clear all processing flags
        const processedElements = document.querySelectorAll('[data-text-processed]');
        processedElements.forEach(element => {
            element.removeAttribute('data-text-processed');
        });
        
        // Reprocess all elements
        this._processExistingElements();
    },

    /**
     * Get truncation stats
     */
    getStats() {
        const processed = document.querySelectorAll('[data-text-processed]').length;
        const truncated = document.querySelectorAll('[data-original-text]').length;
        
        return {
            processedElements: processed,
            truncatedElements: truncated,
            isMobile: this._isMobile
        };
    },

    /**
     * Clean up resources
     */
    destroy() {
        if (this._observer) {
            this._observer.disconnect();
        }
        
        window.removeEventListener('resize', this._handleResize.bind(this));
        
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