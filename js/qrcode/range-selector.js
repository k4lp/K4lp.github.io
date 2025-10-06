/**
 * QR Code Component Scanner - Enhanced Range Selector
 * Alica Technologies - Version 3.0
 * 
 * ROOT CAUSE FIX:
 * - Proper dependency management for zoom manager
 * - Robust module loading without patchy fixes
 * - Auto-updating start/end cell inputs during selection
 * - Improved mobile touch handling with scroll detection
 * - Enhanced step navigation integration
 */

window.QRScannerRangeSelector = {
    // Internal state
    _isSelecting: false,
    _startCell: null,
    _endCell: null,
    _selectedCells: new Set(),
    _isDragging: false,
    _touchStarted: false,
    _lastTouchCell: null,
    _initialized: false,
    
    // Click-to-select state management
    _clickSelectionMode: false,
    _firstClickCell: null,
    _isWaitingForSecondClick: false,
    _clickTimeout: null,
    _clickSelectionTimeoutDuration: 15000,
    
    /**
     * Initialize range selector
     */
    init() {
        if (this._initialized) return;
        
        this._bindEvents();
        this._setupTouchSupport();
        this._setupClickSelectionToggle();
        this._initialized = true;
        
        window.QRScannerUtils.log.debug('Range selector initialized with enhanced auto-update functionality');
    },
    
    /**
     * ROOT CAUSE FIX: Safe zoom manager integration with dependency checking
     */
    _initializeZoomIfAvailable(container) {
        // Check if zoom manager is available and properly initialized
        if (window.QRScannerZoomManager && 
            typeof window.QRScannerZoomManager.initializeContainer === 'function') {
            try {
                window.QRScannerZoomManager.initializeContainer(container);
                window.QRScannerUtils.log.debug('Zoom manager initialized for container');
            } catch (error) {
                window.QRScannerUtils.log.warn('Zoom manager initialization failed:', error);
                // Continue without zoom functionality
            }
        } else {
            window.QRScannerUtils.log.debug('Zoom manager not available, continuing without zoom functionality');
        }
    },
    
    /**
     * Setup click selection mode toggle and UI
     */
    _setupClickSelectionToggle() {
        const controlsContainer = this._getOrCreateControlsContainer();
        
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'click-selection-toggle';
        toggleBtn.textContent = 'ENABLE CLICK SELECTION';
        toggleBtn.className = 'button button--ghost button--sm';
        toggleBtn.title = 'Toggle between drag selection and click selection modes';
        toggleBtn.style.cssText = 'margin-bottom: 16px;';
        
        toggleBtn.addEventListener('click', this._toggleClickSelectionMode.bind(this));
        
        const indicator = document.createElement('div');
        indicator.id = 'click-selection-indicator';
        indicator.className = 'alert alert--success';
        indicator.style.cssText = 'display: none; margin-bottom: 16px;';
        indicator.innerHTML = `
            <div class="alert__msg">
                <strong>CLICK SELECTION MODE ACTIVE</strong><br>
                <small>Tap first cell, then tap second cell to complete range selection</small>
            </div>
        `;
        
        controlsContainer.appendChild(toggleBtn);
        controlsContainer.appendChild(indicator);
        
        this._createModeInfoPanel(controlsContainer);
    },
    
    /**
     * Get or create controls container
     */
    _getOrCreateControlsContainer() {
        let container = document.getElementById('range-selection-controls');
        if (!container) {
            container = document.createElement('div');
            container.id = 'range-selection-controls';
            container.style.cssText = 'margin-bottom: 24px;';
            
            const tableWrapper = document.querySelector('#step3 .table-container');
            if (tableWrapper && tableWrapper.parentNode) {
                tableWrapper.parentNode.insertBefore(container, tableWrapper);
            }
        }
        return container;
    },
    
    /**
     * Create mode information panel
     */
    _createModeInfoPanel(parent) {
        const infoPanel = document.createElement('div');
        infoPanel.id = 'selection-mode-info';
        infoPanel.className = 'alert alert--info';
        infoPanel.style.cssText = 'margin-bottom: 16px;';
        infoPanel.innerHTML = `
            <div class="alert__msg">
                <strong>SELECTION MODES</strong><br>
                <small><strong>Drag Mode (Desktop):</strong> Click and drag to select range</small><br>
                <small><strong>Click Mode (Mobile):</strong> Tap two cells to define range corners</small>
            </div>
        `;
        parent.appendChild(infoPanel);
    },
    
    /**
     * Toggle click selection mode
     */
    _toggleClickSelectionMode() {
        this._clickSelectionMode = !this._clickSelectionMode;
        const toggleBtn = document.getElementById('click-selection-toggle');
        const indicator = document.getElementById('click-selection-indicator');
        
        if (this._clickSelectionMode) {
            toggleBtn.textContent = 'DISABLE CLICK SELECTION';
            toggleBtn.className = 'button button--primary button--sm';
            
            if (indicator) {
                indicator.style.display = 'block';
            }
            
            this._resetClickSelection();
            this._clearSelectionHighlight();
            
            window.QRScannerUtils.log.debug('Click selection mode enabled');
            this._showTemporaryMessage('Click selection enabled. Tap two cells to select range.', 'success');
            
        } else {
            toggleBtn.textContent = 'ENABLE CLICK SELECTION';
            toggleBtn.className = 'button button--ghost button--sm';
            
            if (indicator) {
                indicator.style.display = 'none';
            }
            
            this._resetClickSelection();
            
            window.QRScannerUtils.log.debug('Click selection mode disabled');
            this._showTemporaryMessage('Drag selection enabled. Click and drag to select range.', 'info');
        }
    },
    
    /**
     * Show temporary message
     */
    _showTemporaryMessage(message, type = 'info') {
        const existingMsg = document.getElementById('temp-selection-message');
        if (existingMsg) {
            existingMsg.remove();
        }
        
        const msgDiv = document.createElement('div');
        msgDiv.id = 'temp-selection-message';
        msgDiv.className = `alert alert--${type}`;
        msgDiv.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        msgDiv.innerHTML = `<div class="alert__msg"><strong>${message}</strong></div>`;
        document.body.appendChild(msgDiv);
        
        setTimeout(() => {
            if (msgDiv.parentNode) {
                msgDiv.style.opacity = '0';
                msgDiv.style.transition = 'opacity 0.3s';
                setTimeout(() => msgDiv.remove(), 300);
            }
        }, 4000);
    },
    
    /**
     * Reset click selection state
     */
    _resetClickSelection() {
        this._firstClickCell = null;
        this._isWaitingForSecondClick = false;
        
        if (this._clickTimeout) {
            clearTimeout(this._clickTimeout);
            this._clickTimeout = null;
        }
        
        this._clearFirstClickHighlight();
        this._updateClickSelectionStatus();
    },
    
    /**
     * Clear first click highlighting
     */
    _clearFirstClickHighlight() {
        const container = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SELECTABLE_TABLE);
        if (!container) return;
        
        const cells = container.querySelectorAll('td.first-click, td.click-pending');
        cells.forEach(cell => {
            cell.classList.remove('first-click', 'click-pending');
            if (!cell.classList.contains('cell-selected')) {
                cell.style.backgroundColor = '';
                cell.style.color = '';
                cell.style.border = '';
                cell.style.boxShadow = '';
            }
        });
    },
    
    /**
     * Update click selection status display
     */
    _updateClickSelectionStatus() {
        let statusDiv = document.getElementById('click-selection-status');
        
        if (!this._clickSelectionMode) {
            if (statusDiv) {
                statusDiv.remove();
            }
            return;
        }
        
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'click-selection-status';
            statusDiv.className = 'alert alert--info';
            statusDiv.style.cssText = `
                position: sticky;
                top: 0;
                z-index: 100;
                margin-bottom: 16px;
                text-align: center;
            `;
            
            const tableContainer = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SELECTABLE_TABLE);
            if (tableContainer && tableContainer.parentNode) {
                tableContainer.parentNode.insertBefore(statusDiv, tableContainer);
            }
        }
        
        if (this._isWaitingForSecondClick && this._firstClickCell) {
            statusDiv.innerHTML = `
                <div class="alert__msg">
                    <strong>FIRST CELL SELECTED: ${this._firstClickCell.ref}</strong><br>
                    <small>Tap second cell to complete range</small>
                </div>
            `;
            statusDiv.className = 'alert alert--success';
        } else {
            statusDiv.innerHTML = `
                <div class="alert__msg">
                    <strong>CLICK SELECTION MODE</strong><br>
                    <small>Tap on first cell to start</small>
                </div>
            `;
            statusDiv.className = 'alert alert--info';
        }
    },

    /**
     * CRITICAL FIX: Enhanced event binding with auto-update support
     */
    _bindEvents() {
        const confirmBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.CONFIRM_RANGE);
        const clearBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.CLEAR_RANGE);
        const startCellInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.START_CELL);
        const endCellInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.END_CELL);

        if (confirmBtn) {
            confirmBtn.addEventListener('click', this._handleConfirmRange.bind(this));
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', this._handleClearRange.bind(this));
        }

        // CRITICAL FIX: Enhanced manual cell input support with real-time feedback
        if (startCellInput) {
            startCellInput.readOnly = false; // Make editable
            startCellInput.addEventListener('input', this._handleManualCellInput.bind(this));
            startCellInput.addEventListener('blur', this._validateAndUpdateRange.bind(this));
            startCellInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    startCellInput.blur(); // Trigger validation
                }
            });
        }

        if (endCellInput) {
            endCellInput.readOnly = false; // Make editable
            endCellInput.addEventListener('input', this._handleManualCellInput.bind(this));
            endCellInput.addEventListener('blur', this._validateAndUpdateRange.bind(this));
            endCellInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    endCellInput.blur(); // Trigger validation
                }
            });
        }
    },

    /**
     * Setup touch support for mobile devices
     */
    _setupTouchSupport() {
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        
        if (isTouchDevice) {
            document.documentElement.classList.add('touch-device');
            window.QRScannerUtils.log.debug('Touch device detected, enabling enhanced touch support');
        }
    },

    /**
     * Validate cell element has required properties
     */
    _isValidCell(cell) {
        if (!cell || cell.tagName !== 'TD' || !cell.dataset) {
            return false;
        }

        if (!cell.dataset.row || !cell.dataset.col) {
            return false;
        }

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        if (isNaN(row) || isNaN(col) || row <= 0 || col <= 0) {
            return false;
        }

        return true;
    },

    /**
     * CRITICAL FIX: Enhanced manual cell input with visual feedback
     */
    _handleManualCellInput(event) {
        const input = event.target;
        if (!input) return;

        const value = input.value.trim().toUpperCase();
        
        if (value && !this._isValidCellRef(value)) {
            input.style.borderColor = 'var(--error)';
            input.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        } else {
            input.style.borderColor = '';
            input.style.backgroundColor = '';
        }
    },

    /**
     * Validate cell reference format
     */
    _isValidCellRef(cellRef) {
        return /^[A-Z]+[1-9]\d*$/.test(cellRef);
    },

    /**
     * CRITICAL FIX: Enhanced validate and update range with immediate visual feedback
     */
    _validateAndUpdateRange() {
        const startCellInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.START_CELL);
        const endCellInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.END_CELL);
        
        if (!startCellInput || !endCellInput) return;

        const startRef = startCellInput.value.trim().toUpperCase();
        const endRef = endCellInput.value.trim().toUpperCase();

        // Reset styles first
        startCellInput.style.borderColor = '';
        startCellInput.style.backgroundColor = '';
        endCellInput.style.borderColor = '';
        endCellInput.style.backgroundColor = '';

        if (startRef && endRef && this._isValidCellRef(startRef) && this._isValidCellRef(endRef)) {
            const startPos = window.QRScannerUtils.excel.cellRefToPosition(startRef);
            const endPos = window.QRScannerUtils.excel.cellRefToPosition(endRef);

            if (startPos && endPos) {
                this._startCell = {
                    row: startPos.row,
                    col: startPos.col,
                    ref: startRef
                };

                this._endCell = {
                    row: endPos.row,
                    col: endPos.col,
                    ref: endRef
                };

                // Update visual selection immediately
                this._updateSelectionFromManualInput();
                this._finalizeSelection();
                
                // Show success indicators
                startCellInput.style.borderColor = 'var(--success)';
                startCellInput.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                endCellInput.style.borderColor = 'var(--success)';
                endCellInput.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                
                // Clear success indicators after 2 seconds
                setTimeout(() => {
                    startCellInput.style.borderColor = '';
                    startCellInput.style.backgroundColor = '';
                    endCellInput.style.borderColor = '';
                    endCellInput.style.backgroundColor = '';
                }, 2000);
            }
        } else if (startRef || endRef) {
            // Show error for invalid format
            if (startRef && !this._isValidCellRef(startRef)) {
                startCellInput.style.borderColor = 'var(--error)';
                startCellInput.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            }
            if (endRef && !this._isValidCellRef(endRef)) {
                endCellInput.style.borderColor = 'var(--error)';
                endCellInput.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            }
        }
    },

    /**
     * Update visual selection from manual input
     */
    _updateSelectionFromManualInput() {
        if (!this._startCell || !this._endCell) return;

        const minRow = Math.min(this._startCell.row, this._endCell.row);
        const maxRow = Math.max(this._startCell.row, this._endCell.row);
        const minCol = Math.min(this._startCell.col, this._endCell.col);
        const maxCol = Math.max(this._startCell.col, this._endCell.col);

        this._clearSelectionHighlight();

        const container = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SELECTABLE_TABLE);
        if (!container) return;

        const table = container.querySelector('table');
        if (!table) return;

        const cells = table.querySelectorAll('td[data-row][data-col]');
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);

            if (!isNaN(row) && !isNaN(col) && row >= minRow && row <= maxRow && col >= minCol && col <= maxCol) {
                this._highlightCell(cell, 'cell-selected');
            }
        });
    },

    /**
     * Create selectable table from sheet data
     */
    createSelectableTable() {
        const sheetData = window.QRScannerExcelHandler.getSheetData();
        if (!sheetData || sheetData.length === 0) {
            window.QRScannerUtils.log.error('No sheet data available for range selection');
            this._showNoDataMessage();
            return;
        }

        try {
            const table = this._createSelectableTable(sheetData);
            const container = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SELECTABLE_TABLE);

            if (!container) {
                window.QRScannerUtils.log.error('Selectable table container not found');
                return;
            }

            container.innerHTML = '';
            container.appendChild(table);

            // ROOT CAUSE FIX: Safe zoom manager initialization with dependency checking
            this._initializeZoomIfAvailable(container);

            this._updateClickSelectionStatus();

            window.QRScannerUtils.log.debug('Selectable table created successfully');
        } catch (error) {
            window.QRScannerUtils.log.error('Error creating selectable table:', error);
            this._showErrorMessage('Failed to create data table. Please try again.');
        }
    },

    /**
     * Show no data message
     */
    _showNoDataMessage() {
        const container = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SELECTABLE_TABLE);
        if (container) {
            container.innerHTML = `<div class="empty">NO DATA AVAILABLE. PLEASE SELECT A SHEET FIRST.</div>`;
        }
    },

    /**
     * Show error message
     */
    _showErrorMessage(message) {
        const container = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SELECTABLE_TABLE);
        if (container) {
            container.innerHTML = `<div class="alert alert-error" style="text-align: center;">${message}</div>`;
        }
    },

    /**
     * Create interactive selectable table
     */
    _createSelectableTable(data) {
        const table = document.createElement('table');
        table.className = 'table-hover';
        table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        `;

        const maxCols = Math.max(...data.map(r => r ? r.length : 0));
        if (maxCols === 0) {
            throw new Error('No data columns found');
        }

        // Create header row with column letters
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        // Empty cell for row numbers
        const cornerCell = document.createElement('th');
        cornerCell.textContent = '';
        cornerCell.style.cssText = `
            position: sticky;
            top: 0;
            left: 0;
            z-index: 3;
            background: #f5f5f5;
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
            font-weight: 600;
            min-width: 50px;
        `;
        headerRow.appendChild(cornerCell);

        // Column letter headers
        for (let col = 0; col < maxCols; col++) {
            const th = document.createElement('th');
            th.textContent = window.QRScannerUtils.excel.numToCol(col + 1);
            th.dataset.col = col + 1;
            th.style.cssText = `
                position: sticky;
                top: 0;
                z-index: 2;
                background: #f5f5f5;
                border: 1px solid #000;
                padding: 8px;
                text-align: center;
                font-weight: 600;
                min-width: 100px;
            `;
            headerRow.appendChild(th);
        }

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create data rows
        const tbody = document.createElement('tbody');
        data.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');

            // Row number cell
            const rowNumCell = document.createElement('th');
            rowNumCell.textContent = rowIndex + 1;
            rowNumCell.dataset.row = rowIndex + 1;
            rowNumCell.style.cssText = `
                position: sticky;
                left: 0;
                z-index: 1;
                background: #f5f5f5;
                border: 1px solid #000;
                padding: 8px;
                text-align: center;
                font-weight: 600;
            `;
            tr.appendChild(rowNumCell);

            // Data cells
            for (let colIndex = 0; colIndex < maxCols; colIndex++) {
                const td = document.createElement('td');
                const cellValue = (row && row[colIndex]) ? String(row[colIndex]) : '';
                const displayValue = window.QRScannerUtils.string.truncate(cellValue, 30);
                
                td.textContent = displayValue;
                td.title = cellValue;
                
                const rowNum = rowIndex + 1;
                const colNum = colIndex + 1;
                
                td.dataset.row = String(rowNum);
                td.dataset.col = String(colNum);
                
                try {
                    td.dataset.cellRef = window.QRScannerUtils.excel.getCellRef(rowNum, colNum);
                } catch (error) {
                    td.dataset.cellRef = window.QRScannerUtils.excel.numToCol(colNum) + rowNum;
                }
                
                td.style.cssText = `
                    border: 1px solid #e5e5e5;
                    padding: 8px;
                    min-width: 100px;
                    transition: background-color 0.15s ease;
                `;
                
                this._addCellEventListeners(td);

                tr.appendChild(td);
            }

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        this._addTableEventListeners(table);

        return table;
    },

    /**
     * Add event listeners to cell
     */
    _addCellEventListeners(cell) {
        if (!cell || cell.tagName !== 'TD') return;

        // Mouse events
        cell.addEventListener('mouseenter', this._handleCellEnter.bind(this));
        cell.addEventListener('mousedown', this._handleCellMouseDown.bind(this));
        cell.addEventListener('mouseup', this._handleCellMouseUp.bind(this));
        
        // Touch events for mobile
        cell.addEventListener('touchstart', this._handleCellTouchStart.bind(this), { passive: true });
        cell.addEventListener('touchmove', this._handleCellTouchMove.bind(this), { passive: false });
        cell.addEventListener('touchend', this._handleCellTouchEnd.bind(this), { passive: false });

        // Hover effects (mouse only)
        cell.addEventListener('mouseenter', () => {
            if (!cell.classList.contains('cell-selected') && 
                !cell.classList.contains('first-click') && 
                !cell.classList.contains('click-pending')) {
                if (this._clickSelectionMode && this._isWaitingForSecondClick) {
                    cell.style.backgroundColor = '#f5f5f5';
                } else {
                    cell.style.backgroundColor = '#fafafa';
                }
            }
        });
        
        cell.addEventListener('mouseleave', () => {
            if (!cell.classList.contains('cell-selected') && 
                !cell.classList.contains('first-click') && 
                !cell.classList.contains('click-pending')) {
                cell.style.backgroundColor = '';
            }
        });
    },

    /**
     * Add table-level event listeners
     */
    _addTableEventListeners(table) {
        if (!table) return;

        table.addEventListener('selectstart', (e) => e.preventDefault());
        table.addEventListener('dragstart', (e) => e.preventDefault());
        table.addEventListener('mousedown', this._handleMouseDown.bind(this));
        table.addEventListener('mouseleave', this._handleMouseLeave.bind(this));
        table.addEventListener('touchstart', this._handleTouchStart.bind(this), { passive: false });
    },

    /**
     * Handle cell touch start - with scroll detection
     */
    _handleCellTouchStart(event) {
        if (!event) return;
        
        const cell = event.currentTarget;
        
        if (!this._isValidCell(cell)) {
            return;
        }
        
        const touch = event.touches[0];
        this._touchStartX = touch.clientX;
        this._touchStartY = touch.clientY;
        this._touchStartTime = Date.now();
        this._touchMoved = false;
        
        this._touchStarted = true;
        this._isDragging = false;
    },

    /**
     * Handle cell touch move - detect scroll intent
     */
    _handleCellTouchMove(event) {
        if (!event || !this._touchStarted) return;
        
        const touch = event.touches[0];
        if (!touch) return;

        const deltaX = Math.abs(touch.clientX - this._touchStartX);
        const deltaY = Math.abs(touch.clientY - this._touchStartY);
        const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (totalMovement > 10) {
            this._touchMoved = true;
            
            if (this._clickSelectionMode) {
                return;
            }
            
            event.preventDefault();
            this._isDragging = true;
            
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            
            if (this._isValidCell(element)) {
                if (this._lastTouchCell !== element) {
                    this._lastTouchCell = element;
                    this._handleCellEnter({ currentTarget: element });
                }
            }
        }
    },

    /**
     * Handle cell touch end - distinguish tap from scroll
     */
    _handleCellTouchEnd(event) {
        if (!event || !this._touchStarted) return;
        
        const cell = this._lastTouchCell || event.currentTarget;
        
        if (!this._isValidCell(cell)) {
            this._resetTouchState();
            return;
        }
        
        const touchDuration = Date.now() - this._touchStartTime;
        
        if (this._clickSelectionMode && !this._touchMoved && touchDuration < 500) {
            event.preventDefault();
            this._handleCellMouseDown({ currentTarget: cell, button: 0 });
            this._handleCellMouseUp({ currentTarget: cell });
        }
        else if (!this._clickSelectionMode && this._isDragging) {
            event.preventDefault();
            this._handleCellMouseUp({ currentTarget: cell });
        }
        
        this._resetTouchState();
    },

    /**
     * Reset touch state
     */
    _resetTouchState() {
        this._touchStarted = false;
        this._isDragging = false;
        this._lastTouchCell = null;
        this._touchStartX = 0;
        this._touchStartY = 0;
        this._touchStartTime = 0;
        this._touchMoved = false;
    },

    _handleTouchStart(event) {
        if (!event || !event.target) return;
        
        if (event.target.tagName === 'TD' && this._isValidCell(event.target)) {
            this._isSelecting = true;
        }
    },

    _handleMouseDown(event) {
        if (!event || event.button !== 0) return;

        event.preventDefault();
        
        if (!this._clickSelectionMode) {
            this._isSelecting = true;
            this._isDragging = false;

            document.addEventListener('mouseup', this._handleGlobalMouseUp.bind(this), { once: true });
        }
    },

    _handleGlobalMouseUp(event) {
        this._isSelecting = false;
        this._isDragging = false;
        if (this._startCell && this._endCell) {
            this._finalizeSelection();
        }
    },

    _handleMouseLeave(event) {
        if (this._isSelecting && this._startCell && this._endCell) {
            this._finalizeSelection();
        }
    },

    /**
     * CRITICAL FIX: Enhanced cell mouse down with immediate input update
     */
    _handleCellMouseDown(event) {
        if (!event || event.button !== 0) return;

        const cell = event.currentTarget;
        
        if (!this._isValidCell(cell)) {
            window.QRScannerUtils.log.warn('Mouse down: Invalid cell');
            return;
        }

        if (!cell.dataset || 
            typeof cell.dataset.row === 'undefined' || 
            typeof cell.dataset.col === 'undefined') {
            window.QRScannerUtils.log.warn('Mouse down: Cell missing dataset properties');
            return;
        }

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        if (isNaN(row) || isNaN(col) || row <= 0 || col <= 0) {
            window.QRScannerUtils.log.warn('Mouse down: Invalid row/col values');
            return;
        }

        let cellRef = cell.dataset.cellRef;
        if (!cellRef) {
            try {
                cellRef = window.QRScannerUtils.excel.getCellRef(row, col);
                cell.dataset.cellRef = cellRef;
            } catch (error) {
                window.QRScannerUtils.log.error('Failed to generate cellRef:', error);
                return;
            }
        }

        // Handle click selection mode
        if (this._clickSelectionMode) {
            this._handleClickSelection(cell, row, col, cellRef);
            return;
        }

        // Enhanced drag selection logic with immediate input update
        this._clearSelectionHighlight();
        
        this._startCell = {
            row: row,
            col: col,
            ref: cellRef
        };

        this._endCell = null;
        this._selectedCells.clear();
        
        this._highlightCell(cell, 'range-start');

        // CRITICAL FIX: Immediately update start cell input with visual feedback
        const startInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.START_CELL);
        if (startInput && this._startCell) {
            startInput.value = this._startCell.ref;
            startInput.style.borderColor = 'var(--info)';
            startInput.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        }
        
        this._isDragging = true;
    },

    /**
     * Handle click selection logic
     */
    _handleClickSelection(cell, row, col, cellRef) {
        if (!this._isWaitingForSecondClick) {
            // First click
            this._firstClickCell = {
                row: row,
                col: col,
                ref: cellRef,
                element: cell
            };
            
            this._isWaitingForSecondClick = true;
            
            this._clearSelectionHighlight();
            this._highlightCell(cell, 'first-click');
            
            // CRITICAL FIX: Update start cell input immediately on first click
            const startInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.START_CELL);
            if (startInput) {
                startInput.value = cellRef;
                startInput.style.borderColor = 'var(--success)';
                startInput.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
            }
            
            // Clear end cell input
            const endInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.END_CELL);
            if (endInput) {
                endInput.value = '';
                endInput.style.borderColor = '';
                endInput.style.backgroundColor = '';
            }
            
            this._clickTimeout = setTimeout(() => {
                this._resetClickSelection();
                this._showTemporaryMessage('Click selection timed out. Please try again.', 'warning');
            }, this._clickSelectionTimeoutDuration);
            
            this._updateClickSelectionStatus();
            
        } else {
            // Second click
            clearTimeout(this._clickTimeout);
            this._clickTimeout = null;
            
            if (this._firstClickCell && 
                this._firstClickCell.row === row && 
                this._firstClickCell.col === col) {
                this._resetClickSelection();
                this._showTemporaryMessage('Selection cancelled. Click a different cell to create a range.', 'info');
                return;
            }
            
            this._startCell = this._firstClickCell;
            this._endCell = {
                row: row,
                col: col,
                ref: cellRef
            };
            
            this._createClickSelectionRange();
            this._resetClickSelection();
            
            this._showTemporaryMessage(`Range selected: ${this._startCell.ref}:${this._endCell.ref}`, 'success');
        }
    },

    /**
     * Create selection range from click selection
     */
    _createClickSelectionRange() {
        if (!this._startCell || !this._endCell) return;
        
        const minRow = Math.min(this._startCell.row, this._endCell.row);
        const maxRow = Math.max(this._startCell.row, this._endCell.row);
        const minCol = Math.min(this._startCell.col, this._endCell.col);
        const maxCol = Math.max(this._startCell.col, this._endCell.col);
        
        this._clearSelectionHighlight();
        
        const container = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SELECTABLE_TABLE);
        if (!container) return;
        
        const table = container.querySelector('table');
        if (!table) return;
        
        const cells = table.querySelectorAll('td[data-row][data-col]');
        cells.forEach(cell => {
            if (!this._isValidCell(cell)) return;
            
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            if (!isNaN(row) && !isNaN(col) && 
                row >= minRow && row <= maxRow && 
                col >= minCol && col <= maxCol) {
                this._highlightCell(cell, 'cell-selected');
            }
        });
        
        const startRef = window.QRScannerUtils.excel.getCellRef(minRow, minCol);
        const endRef = window.QRScannerUtils.excel.getCellRef(maxRow, maxCol);
        
        const startInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.START_CELL);
        const endInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.END_CELL);
        
        // CRITICAL FIX: Update both inputs immediately
        if (startInput) {
            startInput.value = startRef;
            startInput.style.borderColor = 'var(--success)';
            startInput.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
        }
        if (endInput) {
            endInput.value = endRef;
            endInput.style.borderColor = 'var(--success)';
            endInput.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
        }
        
        this._startCell = { row: minRow, col: minCol, ref: startRef };
        this._endCell = { row: maxRow, col: maxCol, ref: endRef };
        
        this._finalizeSelection();
    },

    /**
     * CRITICAL FIX: Enhanced mouse up with immediate input update
     */
    _handleCellMouseUp(event) {
        if (!event) return;

        const cell = event.currentTarget;
        
        if (this._clickSelectionMode) {
            return;
        }
        
        if (!this._isValidCell(cell)) {
            return;
        }

        if (!cell.dataset || 
            typeof cell.dataset.row === 'undefined' || 
            typeof cell.dataset.col === 'undefined') {
            return;
        }

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        if (isNaN(row) || isNaN(col) || row <= 0 || col <= 0) {
            return;
        }

        let cellRef = cell.dataset.cellRef;
        if (!cellRef) {
            try {
                cellRef = window.QRScannerUtils.excel.getCellRef(row, col);
                cell.dataset.cellRef = cellRef;
            } catch (error) {
                return;
            }
        }

        this._endCell = {
            row: row,
            col: col,
            ref: cellRef
        };

        // CRITICAL FIX: Immediately update end cell input with visual feedback
        const endInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.END_CELL);
        if (endInput && this._endCell) {
            endInput.value = this._endCell.ref;
            endInput.style.borderColor = 'var(--info)';
            endInput.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        }
        
        if (this._startCell) {
            this._finalizeSelection();
        }
    },

    _handleCellEnter(event) {
        if (!event || !this._isSelecting || !this._startCell) return;
        
        if (this._clickSelectionMode) return;

        const cell = event.currentTarget;
        
        if (!this._isValidCell(cell)) return;

        const endRow = parseInt(cell.dataset.row);
        const endCol = parseInt(cell.dataset.col);

        if (isNaN(endRow) || isNaN(endCol)) return;

        this._updateSelectionDisplay(endRow, endCol);
    },

    /**
     * CRITICAL FIX: Enhanced selection display with immediate input update
     */
    _updateSelectionDisplay(endRow, endCol) {
        if (!this._startCell) return;

        const minRow = Math.min(this._startCell.row, endRow);
        const maxRow = Math.max(this._startCell.row, endRow);
        const minCol = Math.min(this._startCell.col, endCol);
        const maxCol = Math.max(this._startCell.col, endCol);

        this._clearSelectionHighlight();

        const container = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SELECTABLE_TABLE);
        if (!container) return;

        const table = container.querySelector('table');
        if (!table) return;
        
        const cells = table.querySelectorAll('td[data-row][data-col]');

        cells.forEach(cell => {
            if (!this._isValidCell(cell)) return;

            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);

            if (!isNaN(row) && !isNaN(col) && row >= minRow && row <= maxRow && col >= minCol && col <= maxCol) {
                this._highlightCell(cell, 'cell-selected');
            }
        });

        // CRITICAL FIX: Update end cell input immediately during drag
        const endRef = window.QRScannerUtils.excel.getCellRef(endRow, endCol);
        const endInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.END_CELL);
        if (endInput) {
            endInput.value = endRef;
            endInput.style.borderColor = 'var(--info)';
            endInput.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        }
    },

    /**
     * Finalize selection
     */
    _finalizeSelection() {
        if (!this._startCell || !this._endCell) return;

        const minRow = Math.min(this._startCell.row, this._endCell.row);
        const maxRow = Math.max(this._startCell.row, this._endCell.row);
        const minCol = Math.min(this._startCell.col, this._endCell.col);
        const maxCol = Math.max(this._startCell.col, this._endCell.col);

        const range = {
            startRow: minRow,
            startCol: minCol,
            endRow: maxRow,
            endCol: maxCol,
            startRef: window.QRScannerUtils.excel.getCellRef(minRow, minCol),
            endRef: window.QRScannerUtils.excel.getCellRef(maxRow, maxCol)
        };

        const startInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.START_CELL);
        const endInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.END_CELL);

        // CRITICAL FIX: Update inputs with final values and success styling
        if (startInput) {
            startInput.value = range.startRef;
            startInput.style.borderColor = 'var(--success)';
            startInput.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
        }
        if (endInput) {
            endInput.value = range.endRef;
            endInput.style.borderColor = 'var(--success)';
            endInput.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
        }

        window.QRScannerExcelHandler.setSelectedRange(range);

        const confirmBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.CONFIRM_RANGE);
        if (confirmBtn) {
            window.QRScannerUtils.dom.setEnabled(confirmBtn, true);
        }

        const cellCount = (maxRow - minRow + 1) * (maxCol - minCol + 1);
        this._showSelectionInfo(range, cellCount);
        
        // Clear styling after 3 seconds
        setTimeout(() => {
            if (startInput) {
                startInput.style.borderColor = '';
                startInput.style.backgroundColor = '';
            }
            if (endInput) {
                endInput.style.borderColor = '';
                endInput.style.backgroundColor = '';
            }
        }, 3000);
    },

    /**
     * Show selection information
     */
    _showSelectionInfo(range, cellCount) {
        let infoDiv = document.getElementById('selectionInfo');
        if (!infoDiv) {
            infoDiv = document.createElement('div');
            infoDiv.id = 'selectionInfo';
            infoDiv.className = 'panel';
            infoDiv.style.cssText = 'margin-top: var(--space-4);';
            
            const container = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SELECTABLE_TABLE);
            if (container && container.parentNode) {
                container.parentNode.insertBefore(infoDiv, container.nextSibling);
            }
        }
        
        infoDiv.innerHTML = `
            <div class="kv-list">
                <div class="kv-item">
                    <div class="kv-key">SELECTION</div>
                    <div class="kv-value">${range.startRef}:${range.endRef}</div>
                </div>
                <div class="kv-item">
                    <div class="kv-key">CELLS</div>
                    <div class="kv-value">${cellCount}</div>
                </div>
                <div class="kv-item">
                    <div class="kv-key">ROWS</div>
                    <div class="kv-value">${range.endRow - range.startRow + 1}</div>
                </div>
                <div class="kv-item">
                    <div class="kv-key">COLUMNS</div>
                    <div class="kv-value">${range.endCol - range.startCol + 1}</div>
                </div>
            </div>
        `;
    },

    /**
     * CRITICAL FIX: Enhanced confirm range with step navigation integration
     */
    _handleConfirmRange() {
        const range = window.QRScannerExcelHandler.getSelectedRange();
        if (!range) {
            alert(window.QRScannerConfig.MESSAGES.NO_DATA_SELECTED);
            return;
        }

        const rangeData = window.QRScannerExcelHandler.getRangeData(range);
        if (!rangeData || rangeData.length === 0) {
            alert(window.QRScannerConfig.MESSAGES.EMPTY_RANGE);
            return;
        }

        window.QRScannerDataManager.initializeColumnMapping(rangeData);
        window.QRScannerUtils.dom.show(window.QRScannerConfig.ELEMENTS.STEP_4);
        
        // CRITICAL FIX: Safe step navigation integration
        if (window.QRScannerStepManager && 
            typeof window.QRScannerStepManager.markStepCompleted === 'function' &&
            typeof window.QRScannerStepManager.activateStep === 'function') {
            try {
                window.QRScannerStepManager.markStepCompleted(3);
                window.QRScannerStepManager.activateStep(4);
            } catch (error) {
                window.QRScannerUtils.log.warn('Step manager integration failed:', error);
                // Continue without step management
            }
        }
        
        window.QRScannerUtils.log.info('Range confirmed, proceeding to column mapping');
    },

    /**
     * Handle clear range button
     */
    _handleClearRange() {
        this._clearSelection();
        this._clearSelectionHighlight();
        this._resetClickSelection();

        const startInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.START_CELL);
        const endInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.END_CELL);

        if (startInput) {
            startInput.value = '';
            startInput.style.borderColor = '';
            startInput.style.backgroundColor = '';
        }
        if (endInput) {
            endInput.value = '';
            endInput.style.borderColor = '';
            endInput.style.backgroundColor = '';
        }

        const confirmBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.CONFIRM_RANGE);
        if (confirmBtn) {
            window.QRScannerUtils.dom.setEnabled(confirmBtn, false);
        }

        window.QRScannerExcelHandler.setSelectedRange(null);
        
        const infoDiv = document.getElementById('selectionInfo');
        if (infoDiv && infoDiv.parentNode) {
            infoDiv.parentNode.removeChild(infoDiv);
        }

        window.QRScannerUtils.log.debug('Range selection cleared');
    },

    /**
     * Clear selection state
     */
    _clearSelection() {
        this._startCell = null;
        this._endCell = null;
        this._selectedCells.clear();
        this._isSelecting = false;
        this._isDragging = false;
        this._touchStarted = false;
        this._lastTouchCell = null;
        
        this._resetClickSelection();
    },

    /**
     * Clear selection highlighting
     */
    _clearSelectionHighlight() {
        const container = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SELECTABLE_TABLE);
        if (!container) return;

        const table = container.querySelector('table');
        if (!table) return;

        const cells = table.querySelectorAll('td, th');
        cells.forEach(cell => {
            if (!cell) return;
            
            cell.classList.remove('cell-selected', 'range-start', 'range-end', 'first-click', 'click-pending');
            
            if (cell.tagName === 'TD') {
                cell.style.backgroundColor = '';
                cell.style.color = '';
                cell.style.border = '';
                cell.style.boxShadow = '';
                cell.style.fontWeight = '';
            }
        });
    },

    /**
     * Highlight cell with specific class
     */
    _highlightCell(cell, className) {
        if (!cell) return;

        cell.classList.add(className);
        
        if (className === 'cell-selected') {
            cell.style.backgroundColor = '#000';
            cell.style.color = '#fff';
            cell.style.border = '2px solid #000';
            cell.style.fontWeight = '600';
        } else if (className === 'range-start') {
            cell.style.backgroundColor = '#000';
            cell.style.color = '#fff';
            cell.style.border = '3px solid #000';
            cell.style.fontWeight = '700';
            cell.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.2)';
        } else if (className === 'range-end') {
            cell.style.backgroundColor = '#000';
            cell.style.color = '#fff';
            cell.style.border = '3px solid #000';
            cell.style.fontWeight = '700';
            cell.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.2)';
        } else if (className === 'first-click') {
            cell.style.backgroundColor = '#000';
            cell.style.color = '#fff';
            cell.style.border = '3px solid #000';
            cell.style.fontWeight = '700';
            cell.style.boxShadow = '0 0 0 4px rgba(0,0,0,0.3), inset 0 0 0 2px #fff';
        } else if (className === 'click-pending') {
            cell.style.backgroundColor = '#f5f5f5';
            cell.style.color = '#000';
            cell.style.border = '2px dashed #999';
        }
    },

    /**
     * Public method to trigger table creation
     */
    showRangeSelector() {
        setTimeout(() => {
            this.createSelectableTable();
        }, 300);
    },

    /**
     * Get current state for debugging
     */
    getState() {
        return {
            initialized: this._initialized,
            isSelecting: this._isSelecting,
            clickSelectionMode: this._clickSelectionMode,
            hasStartCell: !!this._startCell,
            hasEndCell: !!this._endCell,
            startCell: this._startCell,
            endCell: this._endCell
        };
    }
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.QRScannerRangeSelector.init();
    });
} else {
    window.QRScannerRangeSelector.init();
}