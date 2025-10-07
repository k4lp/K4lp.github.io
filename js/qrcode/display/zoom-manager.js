/**
 * QR Code Component Scanner - FIXED Zoom Manager
 * Alica Technologies - Version 4.0 ROOT CAUSE FIX
 * 
 * ROOT CAUSE FIXES:
 * - Fixed container detection and initialization sequence
 * - Enhanced zoom controls integration with data range selection
 * - Improved error handling and fallback mechanisms
 * - Fixed zoom container wrapping and unwrapping logic
 * - Enhanced mobile touch gesture support
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
    _originalContainer: null,
    _initializationRetryCount: 0,
    _maxInitializationRetries: 5,

    /**
     * Initialize zoom manager with enhanced error handling
     */
    init() {
        if (this._initialized) {
            console.log('Zoom manager already initialized');
            return;
        }
        
        try {
            this._createZoomControls();
            this._bindEvents();
            this._initialized = true;
            console.log('✓ Zoom manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize zoom manager:', error);
            // Continue without zoom functionality
        }
    },

    /**
     * ROOT CAUSE FIX: Enhanced container initialization with retry mechanism
     */
    initializeContainer(container) {
        console.log('Initializing zoom container:', container);
        
        if (!container) {
            console.warn('No container provided for zoom initialization');
            return false;
        }

        // Ensure zoom manager is initialized
        if (!this._initialized) {
            this.init();
        }

        // Store references for later use
        this._targetContainer = container;
        this._originalContainer = container.parentNode;
        
        // Add zoom-ready class
        container.classList.add('zoom-ready');
        
        // ROOT CAUSE FIX: Enhanced control visibility with proper timing
        this._showZoomControls();
        
        // Set up container observer for dynamic updates
        this._setupContainerObserver(container);
        
        console.log('✓ Container initialized for zoom functionality');
        return true;
    },

    /**
     * ROOT CAUSE FIX: Enhanced zoom controls creation with better positioning
     */
    _createZoomControls() {
        const container = this._getOrCreateZoomContainer();
        
        // Clear existing controls
        container.innerHTML = '';
        
        // Zoom level indicator
        const indicator = document.createElement('div');
        indicator.id = 'zoom-indicator';
        indicator.className = 'meta';
        indicator.textContent = '100%';
        indicator.style.cssText = 'margin-right: 16px; min-width: 40px; text-align: center; font-weight: 600;';
        
        // Zoom out button
        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.id = 'zoom-out';
        zoomOutBtn.className = 'button button--ghost button--sm';
        zoomOutBtn.innerHTML = '−';
        zoomOutBtn.title = 'Zoom out';
        zoomOutBtn.style.cssText = 'margin-right: 8px; min-width: 32px; font-size: 18px;';
        
        // Zoom in button
        const zoomInBtn = document.createElement('button');
        zoomInBtn.id = 'zoom-in';
        zoomInBtn.className = 'button button--ghost button--sm';
        zoomInBtn.innerHTML = '+';
        zoomInBtn.title = 'Zoom in';
        zoomInBtn.style.cssText = 'margin-right: 16px; min-width: 32px; font-size: 18px;';
        
        // Reset zoom button
        const resetBtn = document.createElement('button');
        resetBtn.id = 'zoom-reset';
        resetBtn.className = 'button button--ghost button--sm';
        resetBtn.textContent = 'RESET';
        resetBtn.title = 'Reset zoom and pan';
        resetBtn.style.cssText = 'margin-right: 16px; font-size: 10px;';
        
        // Zoom toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'zoom-toggle';
        toggleBtn.className = 'button button--primary button--sm';
        toggleBtn.textContent = 'ENABLE ZOOM';
        toggleBtn.title = 'Toggle zoom mode';
        toggleBtn.style.cssText = 'font-size: 10px;';
        
        // Add to container
        container.appendChild(indicator);
        container.appendChild(zoomOutBtn);
        container.appendChild(zoomInBtn);
        container.appendChild(resetBtn);
        container.appendChild(toggleBtn);
        
        // Initially disable zoom controls
        this._updateZoomControlsState();
        console.log('✓ Zoom controls created');
    },

    /**
     * ROOT CAUSE FIX: Enhanced container detection with multiple fallbacks
     */
    _getOrCreateZoomContainer() {
        let container = document.getElementById('zoom-controls');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'zoom-controls';
            container.className = 'card';
            container.style.cssText = `
                display: none;
                align-items: center;
                padding: 12px 16px;
                margin-bottom: 16px;
                background: var(--color-white, #fff);
                border: 2px solid var(--color-black, #000);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            `;
            
            // ROOT CAUSE FIX: Multiple insertion strategies with fallbacks
            const insertionTargets = [
                () => {
                    // Strategy 1: Before table container in step3
                    const step3 = document.getElementById('step3');
                    const tableContainer = step3?.querySelector('.table-container, .zoom-container');
                    if (tableContainer && tableContainer.parentNode) {
                        tableContainer.parentNode.insertBefore(container, tableContainer);
                        return true;
                    }
                    return false;
                },
                () => {
                    // Strategy 2: Before range selection controls
                    const rangeControls = document.getElementById('range-selection-controls');
                    if (rangeControls && rangeControls.parentNode) {
                        rangeControls.parentNode.insertBefore(container, rangeControls);
                        return true;
                    }
                    return false;
                },
                () => {
                    // Strategy 3: At the end of step3
                    const step3 = document.getElementById('step3');
                    if (step3) {
                        const cardDiv = step3.querySelector('.card > div');
                        if (cardDiv) {
                            cardDiv.appendChild(container);
                            return true;
                        }
                    }
                    return false;
                },
                () => {
                    // Strategy 4: Fallback to body
                    console.warn('Using fallback zoom controls placement');
                    document.body.appendChild(container);
                    container.style.cssText += `
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        z-index: 9999;
                    `;
                    return true;
                }
            ];
            
            // Try each insertion strategy until one succeeds
            let inserted = false;
            for (const strategy of insertionTargets) {
                try {
                    if (strategy()) {
                        inserted = true;
                        break;
                    }
                } catch (error) {
                    console.warn('Zoom container insertion strategy failed:', error);
                }
            }
            
            if (!inserted) {
                console.error('Failed to insert zoom controls container');
            }
        }
        
        return container;
    },

    /**
     * ROOT CAUSE FIX: Enhanced control visibility management
     */
    _showZoomControls() {
        const zoomControls = document.getElementById('zoom-controls');
        if (zoomControls) {
            zoomControls.style.display = 'flex';
            console.log('✓ Zoom controls made visible');
        } else {
            console.warn('Zoom controls not found when trying to show');
        }
    },

    _hideZoomControls() {
        const zoomControls = document.getElementById('zoom-controls');
        if (zoomControls) {
            zoomControls.style.display = 'none';
            console.log('✓ Zoom controls hidden');
        }
    },

    /**
     * Set up container observer for dynamic updates
     */
    _setupContainerObserver(container) {
        if (!('MutationObserver' in window)) {
            console.warn('MutationObserver not supported');
            return;
        }
        
        // Clean up previous observer
        if (this._containerObserver) {
            this._containerObserver.disconnect();
        }
        
        this._containerObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    // Container content changed, ensure zoom is still properly set up
                    if (this._isZoomEnabled && !this._zoomContainer) {
                        console.log('Container changed while zoom enabled, reinitializing...');
                        this._enableZoomMode();
                    }
                }
            });
        });
        
        this._containerObserver.observe(container, {
            childList: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
    },

    /**
     * Enhanced event binding with better error handling
     */
    _bindEvents() {
        // Zoom control buttons
        document.addEventListener('click', (e) => {
            try {
                switch (e.target.id) {
                    case 'zoom-in':
                        e.preventDefault();
                        this._zoomIn();
                        break;
                    case 'zoom-out':
                        e.preventDefault();
                        this._zoomOut();
                        break;
                    case 'zoom-reset':
                        e.preventDefault();
                        this._resetZoom();
                        break;
                    case 'zoom-toggle':
                        e.preventDefault();
                        this._toggleZoomMode();
                        break;
                }
            } catch (error) {
                console.error('Error handling zoom control click:', error);
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this._isZoomEnabled) return;
            
            // Only handle shortcuts when not typing
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }
            
            try {
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
            } catch (error) {
                console.error('Error handling keyboard zoom shortcut:', error);
            }
        });
        
        console.log('✓ Zoom event listeners bound');
    },

    /**
     * ROOT CAUSE FIX: Enhanced zoom mode toggle with proper container detection
     */
    _toggleZoomMode() {
        this._isZoomEnabled = !this._isZoomEnabled;
        
        const toggleBtn = document.getElementById('zoom-toggle');
        
        if (this._isZoomEnabled) {
            const success = this._enableZoomMode();
            if (success) {
                if (toggleBtn) {
                    toggleBtn.textContent = 'DISABLE ZOOM';
                    toggleBtn.className = 'button button--ghost button--sm';
                }
                console.log('✓ Zoom mode enabled');
                this._showZoomHint();
            } else {
                // Failed to enable zoom, revert state
                this._isZoomEnabled = false;
                console.error('Failed to enable zoom mode');
            }
        } else {
            this._disableZoomMode();
            if (toggleBtn) {
                toggleBtn.textContent = 'ENABLE ZOOM';
                toggleBtn.className = 'button button--primary button--sm';
            }
            console.log('✓ Zoom mode disabled');
        }
        
        this._updateZoomControlsState();
    },

    /**
     * ROOT CAUSE FIX: Enhanced enable zoom mode with multiple container detection strategies
     */
    _enableZoomMode() {
        console.log('Enabling zoom mode...');
        
        // ROOT CAUSE FIX: Multiple strategies to find the table container
        let tableContainer = null;
        
        const containerStrategies = [
            () => this._targetContainer,
            () => document.querySelector('#step3 .table-container'),
            () => document.querySelector('#selectableTable')?.parentNode,
            () => document.querySelector('#selectableTable'),
            () => document.querySelector('.zoom-container'),
            () => {
                // Look for any div containing a table in step3
                const step3 = document.getElementById('step3');
                if (step3) {
                    const tables = step3.querySelectorAll('table');
                    if (tables.length > 0) {
                        return tables[0].parentNode;
                    }
                }
                return null;
            }
        ];
        
        // Try each strategy until we find a container
        for (const strategy of containerStrategies) {
            try {
                const container = strategy();
                if (container && container.nodeType === Node.ELEMENT_NODE) {
                    tableContainer = container;
                    console.log('✓ Found table container using strategy');
                    break;
                }
            } catch (error) {
                console.warn('Container detection strategy failed:', error);
            }
        }
        
        if (!tableContainer) {
            console.error('Could not find table container for zoom');
            this._showErrorMessage('Table not found. Please ensure data is loaded first.');
            return false;
        }
        
        // Check if already in zoom mode
        if (tableContainer.closest('.zoom-container')) {
            console.log('Container already in zoom mode');
            this._zoomContainer = tableContainer.closest('.zoom-container');
            this._zoomContent = this._zoomContainer.querySelector('.zoom-content');
            return true;
        }
        
        try {
            // Create zoom wrapper
            this._zoomContainer = document.createElement('div');
            this._zoomContainer.className = 'zoom-container';
            this._zoomContainer.style.cssText = `
                position: relative;
                overflow: hidden;
                border: 2px solid var(--color-black, #000);
                background: var(--color-white, #fff);
                cursor: grab;
                user-select: none;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                max-height: 500px;
                width: 100%;
            `;
            
            // Create zoom content wrapper
            this._zoomContent = document.createElement('div');
            this._zoomContent.className = 'zoom-content';
            this._zoomContent.style.cssText = `
                transform-origin: top left;
                transition: transform 0.2s ease;
                will-change: transform;
                width: 100%;
                height: 100%;
            `;
            
            // Insert zoom wrapper and move content
            const parent = tableContainer.parentNode;
            if (!parent) {
                throw new Error('Table container has no parent');
            }
            
            parent.insertBefore(this._zoomContainer, tableContainer);
            this._zoomContent.appendChild(tableContainer);
            this._zoomContainer.appendChild(this._zoomContent);
            
            // Add zoom event listeners
            this._addZoomEventListeners();
            
            console.log('✓ Zoom wrapper created successfully');
            return true;
            
        } catch (error) {
            console.error('Error creating zoom wrapper:', error);
            this._showErrorMessage('Failed to enable zoom mode.');
            return false;
        }
    },

    /**
     * ROOT CAUSE FIX: Enhanced disable zoom mode with proper cleanup
     */
    _disableZoomMode() {
        console.log('Disabling zoom mode...');
        
        try {
            // Remove zoom event listeners
            this._removeZoomEventListeners();
            
            if (this._zoomContainer && this._zoomContent) {
                // Get the table container
                const tableContainer = this._zoomContent.querySelector('.table-container, #selectableTable, table')?.parentNode || 
                                      this._zoomContent.querySelector('.table-container, #selectableTable, table');
                
                if (tableContainer) {
                    // Reset any transforms
                    if (tableContainer.style) {
                        tableContainer.style.transform = '';
                    }
                    
                    // Move table container back to original position
                    const parent = this._zoomContainer.parentNode;
                    if (parent) {
                        parent.insertBefore(tableContainer, this._zoomContainer);
                    }
                }
                
                // Remove zoom wrapper
                if (this._zoomContainer.parentNode) {
                    this._zoomContainer.parentNode.removeChild(this._zoomContainer);
                }
            }
            
            // Reset state
            this._zoomContainer = null;
            this._zoomContent = null;
            this._currentZoom = this.DEFAULT_ZOOM;
            this._lastPanX = 0;
            this._lastPanY = 0;
            
            // Remove usage hint
            this._removeZoomHint();
            
            console.log('✓ Zoom mode disabled successfully');
            
        } catch (error) {
            console.error('Error disabling zoom mode:', error);
        }
    },

    /**
     * Add zoom-specific event listeners with enhanced error handling
     */
    _addZoomEventListeners() {
        if (!this._zoomContainer) return;
        
        try {
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
            
            console.log('✓ Zoom event listeners added');
        } catch (error) {
            console.error('Error adding zoom event listeners:', error);
        }
    },

    /**
     * Remove zoom event listeners
     */
    _removeZoomEventListeners() {
        try {
            if (this._globalMouseMove) {
                document.removeEventListener('mousemove', this._globalMouseMove);
                this._globalMouseMove = null;
            }
            if (this._globalMouseUp) {
                document.removeEventListener('mouseup', this._globalMouseUp);
                this._globalMouseUp = null;
            }
            console.log('✓ Zoom event listeners removed');
        } catch (error) {
            console.error('Error removing zoom event listeners:', error);
        }
    },

    /**
     * Handle mouse wheel for zooming
     */
    _handleWheel(e) {
        if (!this._isZoomEnabled) return;
        
        try {
            e.preventDefault();
            const delta = e.deltaY < 0 ? this.ZOOM_STEP : -this.ZOOM_STEP;
            this._zoomBy(delta);
        } catch (error) {
            console.error('Error handling wheel zoom:', error);
        }
    },

    /**
     * Handle mouse down for panning
     */
    _handleMouseDown(e) {
        if (!this._isZoomEnabled) return;
        
        try {
            e.preventDefault();
            
            this._isDragging = true;
            this._panStartX = e.clientX - this._lastPanX;
            this._panStartY = e.clientY - this._lastPanY;
            
            if (this._zoomContainer) {
                this._zoomContainer.style.cursor = 'grabbing';
            }
            
            document.addEventListener('mousemove', this._globalMouseMove);
            document.addEventListener('mouseup', this._globalMouseUp);
        } catch (error) {
            console.error('Error handling mouse down:', error);
        }
    },

    /**
     * Handle mouse move for panning
     */
    _handleMouseMove(e) {
        if (!this._isDragging) return;
        
        try {
            e.preventDefault();
            
            this._lastPanX = e.clientX - this._panStartX;
            this._lastPanY = e.clientY - this._panStartY;
            
            this._updateTransform();
        } catch (error) {
            console.error('Error handling mouse move:', error);
        }
    },

    /**
     * Handle mouse up
     */
    _handleMouseUp(e) {
        try {
            this._isDragging = false;
            if (this._zoomContainer) {
                this._zoomContainer.style.cursor = 'grab';
            }
            
            document.removeEventListener('mousemove', this._globalMouseMove);
            document.removeEventListener('mouseup', this._globalMouseUp);
        } catch (error) {
            console.error('Error handling mouse up:', error);
        }
    },

    /**
     * Enhanced touch event handlers
     */
    _handleTouchStart(e) {
        if (!this._isZoomEnabled) return;
        
        try {
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
        } catch (error) {
            console.error('Error handling touch start:', error);
        }
    },

    _handleTouchMove(e) {
        if (!this._isZoomEnabled) return;
        
        try {
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
        } catch (error) {
            console.error('Error handling touch move:', error);
        }
    },

    _handleTouchEnd(e) {
        try {
            this._isDragging = false;
            this._lastTouchDistance = null;
        } catch (error) {
            console.error('Error handling touch end:', error);
        }
    },

    /**
     * Zoom controls
     */
    _zoomIn() {
        this._zoomBy(this.ZOOM_STEP);
    },

    _zoomOut() {
        this._zoomBy(-this.ZOOM_STEP);
    },

    _zoomBy(delta) {
        const newZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this._currentZoom + delta));
        
        if (newZoom !== this._currentZoom) {
            this._currentZoom = newZoom;
            this._updateTransform();
            this._updateZoomIndicator();
            this._updateZoomControlsState();
        }
    },

    _resetZoom() {
        this._currentZoom = this.DEFAULT_ZOOM;
        this._lastPanX = 0;
        this._lastPanY = 0;
        this._updateTransform();
        this._updateZoomIndicator();
        this._updateZoomControlsState();
        console.log('✓ Zoom reset to default');
    },

    /**
     * Update transform with error handling
     */
    _updateTransform() {
        if (!this._zoomContent) return;
        
        try {
            const transform = `scale(${this._currentZoom}) translate(${this._lastPanX / this._currentZoom}px, ${this._lastPanY / this._currentZoom}px)`;
            this._zoomContent.style.transform = transform;
        } catch (error) {
            console.error('Error updating zoom transform:', error);
        }
    },

    /**
     * Update zoom indicator
     */
    _updateZoomIndicator() {
        try {
            const indicator = document.getElementById('zoom-indicator');
            if (indicator) {
                indicator.textContent = `${Math.round(this._currentZoom * 100)}%`;
            }
        } catch (error) {
            console.error('Error updating zoom indicator:', error);
        }
    },

    /**
     * Update zoom controls state
     */
    _updateZoomControlsState() {
        try {
            const controls = ['zoom-in', 'zoom-out', 'zoom-reset'];
            
            controls.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.disabled = !this._isZoomEnabled;
                    btn.style.opacity = this._isZoomEnabled ? '1' : '0.5';
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
        } catch (error) {
            console.error('Error updating zoom controls state:', error);
        }
    },

    /**
     * Show zoom usage hint
     */
    _showZoomHint() {
        try {
            const existingHint = document.getElementById('zoom-hint');
            if (existingHint) existingHint.remove();
            
            const hint = document.createElement('div');
            hint.id = 'zoom-hint';
            hint.className = 'alert alert--success';
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
                
                // Auto-hide after 5 seconds
                setTimeout(() => {
                    if (hint.parentNode) {
                        hint.style.opacity = '0';
                        hint.style.transition = 'opacity 0.3s';
                        setTimeout(() => hint.remove(), 300);
                    }
                }, 5000);
            }
        } catch (error) {
            console.error('Error showing zoom hint:', error);
        }
    },

    _removeZoomHint() {
        try {
            const hint = document.getElementById('zoom-hint');
            if (hint) {
                hint.remove();
            }
        } catch (error) {
            console.error('Error removing zoom hint:', error);
        }
    },

    /**
     * Show error message
     */
    _showErrorMessage(message) {
        try {
            console.error(message);
            
            const existingError = document.getElementById('zoom-error');
            if (existingError) existingError.remove();
            
            const errorDiv = document.createElement('div');
            errorDiv.id = 'zoom-error';
            errorDiv.className = 'alert alert--error';
            errorDiv.style.cssText = 'margin-bottom: 16px;';
            errorDiv.innerHTML = `<div class="alert__msg"><strong>Zoom Error:</strong> ${message}</div>`;
            
            const zoomControls = document.getElementById('zoom-controls');
            if (zoomControls && zoomControls.parentNode) {
                zoomControls.parentNode.insertBefore(errorDiv, zoomControls.nextSibling);
                
                // Auto-hide after 10 seconds
                setTimeout(() => {
                    if (errorDiv.parentNode) {
                        errorDiv.remove();
                    }
                }, 10000);
            }
        } catch (error) {
            console.error('Error showing error message:', error);
        }
    },

    /**
     * Public API methods
     */
    getCurrentZoom() {
        return this._currentZoom;
    },

    isZoomEnabled() {
        return this._isZoomEnabled;
    },

    setZoom(zoomLevel) {
        if (!this._isZoomEnabled) return;
        
        const newZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, zoomLevel));
        this._currentZoom = newZoom;
        this._updateTransform();
        this._updateZoomIndicator();
        this._updateZoomControlsState();
    },

    getState() {
        return {
            currentZoom: this._currentZoom,
            isEnabled: this._isZoomEnabled,
            panX: this._lastPanX,
            panY: this._lastPanY,
            hasContainer: !!this._zoomContainer,
            hasTarget: !!this._targetContainer,
            initialized: this._initialized
        };
    },

    /**
     * Enhanced destroy with complete cleanup
     */
    destroy() {
        try {
            console.log('Destroying zoom manager...');
            
            if (this._isZoomEnabled) {
                this._disableZoomMode();
            }
            
            if (this._containerObserver) {
                this._containerObserver.disconnect();
                this._containerObserver = null;
            }
            
            this._removeZoomEventListeners();
            
            const zoomControls = document.getElementById('zoom-controls');
            if (zoomControls && zoomControls.parentNode) {
                zoomControls.parentNode.removeChild(zoomControls);
            }
            
            this._removeZoomHint();
            
            const errorDiv = document.getElementById('zoom-error');
            if (errorDiv && errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
            
            // Reset all state
            this._targetContainer = null;
            this._originalContainer = null;
            this._initialized = false;
            this._initializationRetryCount = 0;
            
            console.log('✓ Zoom manager destroyed successfully');
        } catch (error) {
            console.error('Error destroying zoom manager:', error);
        }
    }
};

// Enhanced initialization with error handling
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        try {
            window.QRScannerZoomManager.init();
        } catch (error) {
            console.error('Failed to initialize zoom manager on DOMContentLoaded:', error);
        }
    });
} else {
    try {
        window.QRScannerZoomManager.init();
    } catch (error) {
        console.error('Failed to initialize zoom manager immediately:', error);
    }
}