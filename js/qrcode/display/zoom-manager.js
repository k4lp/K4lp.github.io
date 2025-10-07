/**
 * QR Code Component Scanner - Enhanced Zoom Manager
 * Alica Technologies - Version 3.1 FIXED
 * 
 * CRITICAL FIX: Proper initializeContainer function and enhanced zoom support
 * Handles zoomable table interface with touch and mouse support
 */

window.QRScannerZoomManager = {
    // Configuration
    MIN_ZOOM: 0.5,
    MAX_ZOOM: 3.0,
    ZOOM_STEP: 0.1,
    DEFAULT_ZOOM: 1.0,
    
    // State
    _currentZoom: 1.0,
    _isZoomEnabled: false,
    _zoomContainer: null,
    _zoomContent: null,
    _isDragging: false,
    _lastPanX: 0,
    _lastPanY: 0,
    _panStartX: 0,
    _panStartY: 0,
    _initialized: false,
    _targetContainer: null,

    /**
     * Initialize zoom manager
     */
    init() {
        if (this._initialized) return;
        
        this._createZoomControls();
        this._bindEvents();
        this._initialized = true;
        window.QRScannerUtils?.log?.debug('Zoom manager initialized') || console.log('Zoom manager initialized');
    },

    /**
     * CRITICAL FIX: Initialize zoom functionality for a specific container
     * This is called by the range selector when creating the selectable table
     */
    initializeContainer(container) {
        if (!container) {
            window.QRScannerUtils?.log?.warn('No container provided for zoom initialization') || console.warn('No container provided for zoom initialization');
            return;
        }

        // Ensure zoom manager is initialized
        if (!this._initialized) {
            this.init();
        }

        // Store reference to the container for later use
        this._targetContainer = container;
        
        // Add zoom-ready class to indicate container is ready for zoom
        container.classList.add('zoom-ready');
        
        // Show zoom controls
        const zoomControls = document.getElementById('zoom-controls');
        if (zoomControls) {
            zoomControls.style.display = 'flex';
        }
        
        window.QRScannerUtils?.log?.debug('Container initialized for zoom functionality') || console.log('Container initialized for zoom functionality');
    },

    /**
     * Create zoom controls interface
     */
    _createZoomControls() {
        const container = this._getOrCreateZoomContainer();
        
        // Zoom level indicator
        const indicator = document.createElement('div');
        indicator.id = 'zoom-indicator';
        indicator.className = 'meta';
        indicator.textContent = '100%';
        indicator.style.cssText = 'margin-right: 16px; min-width: 40px; text-align: center;';
        
        // Zoom out button
        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.id = 'zoom-out';
        zoomOutBtn.className = 'button button--ghost button--sm';
        zoomOutBtn.innerHTML = '−';
        zoomOutBtn.title = 'Zoom out';
        zoomOutBtn.style.cssText = 'margin-right: 8px; min-width: 32px;';
        
        // Zoom in button
        const zoomInBtn = document.createElement('button');
        zoomInBtn.id = 'zoom-in';
        zoomInBtn.className = 'button button--ghost button--sm';
        zoomInBtn.innerHTML = '+';
        zoomInBtn.title = 'Zoom in';
        zoomInBtn.style.cssText = 'margin-right: 16px; min-width: 32px;';
        
        // Reset zoom button
        const resetBtn = document.createElement('button');
        resetBtn.id = 'zoom-reset';
        resetBtn.className = 'button button--ghost button--sm';
        resetBtn.textContent = 'RESET';
        resetBtn.title = 'Reset zoom and pan';
        resetBtn.style.cssText = 'margin-right: 16px;';
        
        // Zoom toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'zoom-toggle';
        toggleBtn.className = 'button button--primary button--sm';
        toggleBtn.textContent = 'ENABLE ZOOM';
        toggleBtn.title = 'Toggle zoom mode';
        
        // Add to container
        container.appendChild(indicator);
        container.appendChild(zoomOutBtn);
        container.appendChild(zoomInBtn);
        container.appendChild(resetBtn);
        container.appendChild(toggleBtn);
        
        // Initially hide zoom controls until a container is ready
        container.style.display = 'none';
        
        // Initially disable zoom controls
        this._updateZoomControlsState();
    },

    /**
     * Get or create zoom controls container
     */
    _getOrCreateZoomContainer() {
        let container = document.getElementById('zoom-controls');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'zoom-controls';
            container.className = 'card';
            container.style.cssText = `
                display: flex;
                align-items: center;
                padding: 12px 16px;
                margin-bottom: 16px;
                background: var(--gray-100, #f5f5f5);
                border: 1px solid var(--gray-200, #e5e5e5);
            `;
            
            // Insert before the table container in step 3
            const step3 = document.getElementById('step3');
            if (step3) {
                const tableContainer = step3.querySelector('.table-container') || step3.querySelector('.zoom-container');
                
                if (tableContainer && tableContainer.parentNode) {
                    tableContainer.parentNode.insertBefore(container, tableContainer);
                } else {
                    // Fallback: append to step3 if table container not found yet
                    step3.appendChild(container);
                }
            }
        }
        
        return container;
    },

    /**
     * Bind event listeners
     */
    _bindEvents() {
        // Zoom control buttons
        document.addEventListener('click', (e) => {
            switch (e.target.id) {
                case 'zoom-in':
                    this._zoomIn();
                    break;
                case 'zoom-out':
                    this._zoomOut();
                    break;
                case 'zoom-reset':
                    this._resetZoom();
                    break;
                case 'zoom-toggle':
                    this._toggleZoomMode();
                    break;
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this._isZoomEnabled) return;
            
            // Only handle shortcuts when not typing
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '+':
                    case '=':
                        e.preventDefault();
                        this._zoomIn();
                        break;
                    case '-':
                        e.preventDefault();
                        this._zoomOut();
                        break;
                    case '0':
                        e.preventDefault();
                        this._resetZoom();
                        break;
                }
            }
        });
    },

    /**
     * Toggle zoom mode
     */
    _toggleZoomMode() {
        this._isZoomEnabled = !this._isZoomEnabled;
        
        const toggleBtn = document.getElementById('zoom-toggle');
        
        if (this._isZoomEnabled) {
            this._enableZoomMode();
            if (toggleBtn) {
                toggleBtn.textContent = 'DISABLE ZOOM';
                toggleBtn.className = 'button button--ghost button--sm';
            }
        } else {
            this._disableZoomMode();
            if (toggleBtn) {
                toggleBtn.textContent = 'ENABLE ZOOM';
                toggleBtn.className = 'button button--primary button--sm';
            }
        }
        
        this._updateZoomControlsState();
        
        window.QRScannerUtils?.log?.debug('Zoom mode', this._isZoomEnabled ? 'enabled' : 'disabled') || console.log('Zoom mode', this._isZoomEnabled ? 'enabled' : 'disabled');
    },

    /**
     * Enable zoom mode
     */
    _enableZoomMode() {
        // Use the target container if available, otherwise find the table container
        let tableContainer = this._targetContainer;
        
        if (!tableContainer) {
            tableContainer = document.querySelector('#step3 .table-container') || document.querySelector('#selectableTable');
        }
        
        if (!tableContainer) {
            window.QRScannerUtils?.log?.warn('Table container not found for zoom') || console.warn('Table container not found for zoom');
            return;
        }
        
        // Don't wrap if already wrapped
        if (tableContainer.closest('.zoom-container')) {
            window.QRScannerUtils?.log?.debug('Container already in zoom mode') || console.log('Container already in zoom mode');
            return;
        }
        
        // Wrap table container in zoom wrapper
        this._zoomContainer = document.createElement('div');
        this._zoomContainer.className = 'zoom-container';
        this._zoomContainer.style.cssText = `
            position: relative;
            overflow: hidden;
            border: 2px solid var(--black, #000);
            background: var(--white, #fff);
            cursor: grab;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            max-height: 500px;
        `;
        
        // Create zoom content wrapper
        this._zoomContent = document.createElement('div');
        this._zoomContent.className = 'zoom-content';
        this._zoomContent.style.cssText = `
            transform-origin: top left;
            transition: transform 0.2s ease;
            will-change: transform;
        `;
        
        // Move table container into zoom wrapper
        const parent = tableContainer.parentNode;
        parent.insertBefore(this._zoomContainer, tableContainer);
        this._zoomContent.appendChild(tableContainer);
        this._zoomContainer.appendChild(this._zoomContent);
        
        // Add zoom event listeners
        this._addZoomEventListeners();
        
        // Show usage hint
        this._showZoomHint();
    },

    /**
     * Disable zoom mode
     */
    _disableZoomMode() {
        if (!this._zoomContainer || !this._zoomContent) return;
        
        // Remove zoom event listeners
        this._removeZoomEventListeners();
        
        // Get the table container
        const tableContainer = this._zoomContent.querySelector('.table-container, #selectableTable');
        if (tableContainer) {
            // Reset any transforms
            tableContainer.style.transform = '';
            
            // Move table container back to original position
            const parent = this._zoomContainer.parentNode;
            parent.insertBefore(tableContainer, this._zoomContainer);
        }
        
        // Remove zoom wrapper
        if (this._zoomContainer.parentNode) {
            this._zoomContainer.parentNode.removeChild(this._zoomContainer);
        }
        
        this._zoomContainer = null;
        this._zoomContent = null;
        this._currentZoom = 1.0;
        this._lastPanX = 0;
        this._lastPanY = 0;
        
        // Remove usage hint
        this._removeZoomHint();
    },

    /**
     * Add zoom-specific event listeners
     */
    _addZoomEventListeners() {
        if (!this._zoomContainer) return;
        
        // Mouse events
        this._zoomContainer.addEventListener('wheel', this._handleWheel.bind(this), { passive: false });
        this._zoomContainer.addEventListener('mousedown', this._handleMouseDown.bind(this));
        
        // Touch events
        this._zoomContainer.addEventListener('touchstart', this._handleTouchStart.bind(this), { passive: false });
        this._zoomContainer.addEventListener('touchmove', this._handleTouchMove.bind(this), { passive: false });
        this._zoomContainer.addEventListener('touchend', this._handleTouchEnd.bind(this), { passive: true });
        
        // Global mouse events for dragging
        this._globalMouseMove = this._handleMouseMove.bind(this);
        this._globalMouseUp = this._handleMouseUp.bind(this);
    },

    /**
     * Remove zoom event listeners
     */
    _removeZoomEventListeners() {
        if (this._globalMouseMove) {
            document.removeEventListener('mousemove', this._globalMouseMove);
        }
        if (this._globalMouseUp) {
            document.removeEventListener('mouseup', this._globalMouseUp);
        }
    },

    /**
     * Handle mouse wheel for zooming
     */
    _handleWheel(e) {
        if (!this._isZoomEnabled) return;
        
        e.preventDefault();
        
        const delta = e.deltaY < 0 ? this.ZOOM_STEP : -this.ZOOM_STEP;
        this._zoomBy(delta);
    },

    /**
     * Handle mouse down for panning
     */
    _handleMouseDown(e) {
        if (!this._isZoomEnabled) return;
        
        e.preventDefault();
        
        this._isDragging = true;
        this._panStartX = e.clientX - this._lastPanX;
        this._panStartY = e.clientY - this._lastPanY;
        
        this._zoomContainer.style.cursor = 'grabbing';
        
        document.addEventListener('mousemove', this._globalMouseMove);
        document.addEventListener('mouseup', this._globalMouseUp);
    },

    /**
     * Handle mouse move for panning
     */
    _handleMouseMove(e) {
        if (!this._isDragging) return;
        
        e.preventDefault();
        
        this._lastPanX = e.clientX - this._panStartX;
        this._lastPanY = e.clientY - this._panStartY;
        
        this._updateTransform();
    },

    /**
     * Handle mouse up
     */
    _handleMouseUp(e) {
        this._isDragging = false;
        if (this._zoomContainer) {
            this._zoomContainer.style.cursor = 'grab';
        }
        
        document.removeEventListener('mousemove', this._globalMouseMove);
        document.removeEventListener('mouseup', this._globalMouseUp);
    },

    /**
     * Handle touch events
     */
    _handleTouchStart(e) {
        if (!this._isZoomEnabled) return;
        
        if (e.touches.length === 1) {
            // Single touch - start panning
            const touch = e.touches[0];
            this._isDragging = true;
            this._panStartX = touch.clientX - this._lastPanX;
            this._panStartY = touch.clientY - this._lastPanY;
        } else if (e.touches.length === 2) {
            // Two touches - prepare for pinch zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            this._lastTouchDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
        }
        
        e.preventDefault();
    },

    _handleTouchMove(e) {
        if (!this._isZoomEnabled) return;
        
        if (e.touches.length === 1 && this._isDragging) {
            // Single touch - pan
            const touch = e.touches[0];
            this._lastPanX = touch.clientX - this._panStartX;
            this._lastPanY = touch.clientY - this._panStartY;
            
            this._updateTransform();
        } else if (e.touches.length === 2) {
            // Two touches - pinch zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            const currentDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            
            if (this._lastTouchDistance) {
                const scale = currentDistance / this._lastTouchDistance;
                const zoomDelta = (scale - 1) * 0.5; // Dampen the zoom speed
                this._zoomBy(zoomDelta);
            }
            
            this._lastTouchDistance = currentDistance;
        }
        
        e.preventDefault();
    },

    _handleTouchEnd(e) {
        this._isDragging = false;
        this._lastTouchDistance = null;
    },

    /**
     * Zoom in
     */
    _zoomIn() {
        this._zoomBy(this.ZOOM_STEP);
    },

    /**
     * Zoom out
     */
    _zoomOut() {
        this._zoomBy(-this.ZOOM_STEP);
    },

    /**
     * Zoom by delta amount
     */
    _zoomBy(delta) {
        const newZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this._currentZoom + delta));
        
        if (newZoom !== this._currentZoom) {
            this._currentZoom = newZoom;
            this._updateTransform();
            this._updateZoomIndicator();
            this._updateZoomControlsState();
        }
    },

    /**
     * Reset zoom and pan
     */
    _resetZoom() {
        this._currentZoom = this.DEFAULT_ZOOM;
        this._lastPanX = 0;
        this._lastPanY = 0;
        this._updateTransform();
        this._updateZoomIndicator();
        this._updateZoomControlsState();
    },

    /**
     * Update transform of zoom content
     */
    _updateTransform() {
        if (!this._zoomContent) return;
        
        const transform = `scale(${this._currentZoom}) translate(${this._lastPanX / this._currentZoom}px, ${this._lastPanY / this._currentZoom}px)`;
        this._zoomContent.style.transform = transform;
    },

    /**
     * Update zoom indicator
     */
    _updateZoomIndicator() {
        const indicator = document.getElementById('zoom-indicator');
        if (indicator) {
            indicator.textContent = `${Math.round(this._currentZoom * 100)}%`;
        }
    },

    /**
     * Update zoom controls state
     */
    _updateZoomControlsState() {
        const controls = ['zoom-in', 'zoom-out', 'zoom-reset'];
        
        controls.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.disabled = !this._isZoomEnabled;
                if (this._isZoomEnabled) {
                    btn.classList.remove('disabled');
                } else {
                    btn.classList.add('disabled');
                }
            }
        });
        
        // Update specific button states
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');
        
        if (zoomInBtn && this._isZoomEnabled) {
            zoomInBtn.disabled = this._currentZoom >= this.MAX_ZOOM;
        }
        
        if (zoomOutBtn && this._isZoomEnabled) {
            zoomOutBtn.disabled = this._currentZoom <= this.MIN_ZOOM;
        }
    },

    /**
     * Show zoom usage hint
     */
    _showZoomHint() {
        const existingHint = document.getElementById('zoom-hint');
        if (existingHint) existingHint.remove();
        
        const hint = document.createElement('div');
        hint.id = 'zoom-hint';
        hint.className = 'alert alert--info';
        hint.style.cssText = 'margin-bottom: 16px;';
        
        hint.innerHTML = `
            <div class="alert__msg">
                <strong>ZOOM MODE ACTIVE</strong><br>
                <small>
                    <strong>Mouse:</strong> Scroll to zoom, drag to pan<br>
                    <strong>Touch:</strong> Pinch to zoom, drag to pan<br>
                    <strong>Keys:</strong> Ctrl +/- to zoom, Ctrl+0 to reset
                </small>
            </div>
        `;
        
        const zoomControls = document.getElementById('zoom-controls');
        if (zoomControls && zoomControls.parentNode) {
            zoomControls.parentNode.insertBefore(hint, zoomControls.nextSibling);
        }
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (hint.parentNode) {
                hint.style.opacity = '0';
                hint.style.transition = 'opacity 0.3s';
                setTimeout(() => hint.remove(), 300);
            }
        }, 5000);
    },

    /**
     * Remove zoom hint
     */
    _removeZoomHint() {
        const hint = document.getElementById('zoom-hint');
        if (hint) {
            hint.remove();
        }
    },

    /**
     * Get current zoom level
     */
    getCurrentZoom() {
        return this._currentZoom;
    },

    /**
     * Check if zoom is enabled
     */
    isZoomEnabled() {
        return this._isZoomEnabled;
    },

    /**
     * Programmatically set zoom level
     */
    setZoom(zoomLevel) {
        if (!this._isZoomEnabled) return;
        
        const newZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, zoomLevel));
        this._currentZoom = newZoom;
        this._updateTransform();
        this._updateZoomIndicator();
        this._updateZoomControlsState();
    },

    /**
     * Get zoom state for debugging
     */
    getState() {
        return {
            currentZoom: this._currentZoom,
            isEnabled: this._isZoomEnabled,
            panX: this._lastPanX,
            panY: this._lastPanY,
            hasContainer: !!this._zoomContainer,
            hasTarget: !!this._targetContainer
        };
    },

    /**
     * Clean up resources
     */
    destroy() {
        if (this._isZoomEnabled) {
            this._disableZoomMode();
        }
        
        const zoomControls = document.getElementById('zoom-controls');
        if (zoomControls && zoomControls.parentNode) {
            zoomControls.parentNode.removeChild(zoomControls);
        }
        
        this._removeZoomHint();
        this._targetContainer = null;
        this._initialized = false;
    }
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.QRScannerZoomManager.init();
    });
} else {
    window.QRScannerZoomManager.init();
}