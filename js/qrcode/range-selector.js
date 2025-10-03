/**
 * QR Code Component Scanner - Range Selector (Swiss Minimalist Design)
 * Alica Technologies - Version 2.1
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
    
    // Click-to-select state management
    _clickSelectionMode: false,
    _firstClickCell: null,
    _isWaitingForSecondClick: false,
    _clickTimeout: null,
    _clickSelectionTimeoutDuration: 15000, // 15 seconds timeout
    
    /**
     * Initialize range selector
     */
    init() {
        this._bindEvents();
        this._setupTouchSupport();
        this._setupClickSelectionToggle();
        window.QRScannerUtils.log.debug('Range selector initialized with click-to-select functionality');
    },
    
    /**
 * Setup click selection mode toggle and UI
 */
_setupClickSelectionToggle() {
    // Create toggle button container
    const controlsContainer = this._getOrCreateControlsContainer();
    
    // Add toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'click-selection-toggle';
    toggleBtn.textContent = 'ENABLE CLICK SELECTION';
    toggleBtn.className = 'button button--ghost button--sm';
    toggleBtn.title = 'Toggle between drag selection and click selection modes';
    toggleBtn.style.cssText = 'margin-bottom: 16px;';
    
    // Add toggle functionality
    toggleBtn.addEventListener('click', this._toggleClickSelectionMode.bind(this));
    
    // Add visual indicator for click selection mode
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
    
    // Add to controls container
    controlsContainer.appendChild(toggleBtn);
    controlsContainer.appendChild(indicator);
    
    // Add mode information panel
    this._createModeInfoPanel(controlsContainer);
}
    
    /**
     * Get or create controls container
     */
    /**
 * Get or create controls container
 */
_getOrCreateControlsContainer() {
    let container = document.getElementById('range-selection-controls');
    if (!container) {
        container = document.createElement('div');
        container.id = 'range-selection-controls';
        container.style.cssText = 'margin-bottom: 24px;';
        
        // Find the best insertion point - before the table container
        const tableWrapper = document.querySelector('#step3 .table-container');
        if (tableWrapper && tableWrapper.parentNode) {
            tableWrapper.parentNode.insertBefore(container, tableWrapper);
        }
    }
    return container;
}
    
    /**
     * Create mode information panel
     */
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
}
    
    /**
     * Toggle click selection mode
     */
    _toggleClickSelectionMode() {
        this._clickSelectionMode = !this._clickSelectionMode;
        const toggleBtn = document.getElementById('click-selection-toggle');
        const indicator = document.getElementById('click-selection-indicator');
        
        if (this._clickSelectionMode) {
            // Enable click selection mode
            toggleBtn.textContent = 'DISABLE CLICK SELECTION';
            toggleBtn.className = 'btn btn-secondary btn-sm';
            
            if (indicator) {
                indicator.style.display = 'block';
            }
            
            // Reset any active selection state
            this._resetClickSelection();
            this._clearSelectionHighlight();
            
            window.QRScannerUtils.log.debug('Click selection mode enabled');
            this._showTemporaryMessage('Click selection mode enabled. Click two cells to select range.', 'success');
            
        } else {
            // Disable click selection mode
            toggleBtn.textContent = 'ENABLE CLICK SELECTION';
            toggleBtn.className = 'btn btn-outline btn-sm';
            
            if (indicator) {
                indicator.style.display = 'none';
            }
            
            // Reset click selection state
            this._resetClickSelection();
            
            window.QRScannerUtils.log.debug('Click selection mode disabled');
            this._showTemporaryMessage('Drag selection mode enabled. Click and drag to select range.', 'info');
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
        msgDiv.className = `toast alert-${type}`;
        msgDiv.style.cssText = `
            position: fixed;
            top: var(--space-6);
            right: var(--space-6);
            z-index: var(--z-tooltip);
            min-width: 300px;
            font-size: var(--font-size-sm);
            font-weight: var(--font-weight-medium);
            text-transform: uppercase;
            letter-spacing: var(--letter-spacing-wider);
        `;
        
        msgDiv.textContent = message;
        document.body.appendChild(msgDiv);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            if (msgDiv.parentNode) {
                msgDiv.style.animation = 'fadeOut var(--transition-fast)';
                setTimeout(() => msgDiv.remove(), 200);
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
                cell.style.border = 'var(--border-width) solid var(--color-black)';
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
            statusDiv.className = 'alert';
            statusDiv.style.cssText = `
                position: sticky;
                top: 0;
                z-index: var(--z-sticky);
                margin-bottom: var(--space-3);
                font-size: var(--font-size-xs);
                font-weight: var(--font-weight-medium);
                text-transform: uppercase;
                letter-spacing: var(--letter-spacing-wider);
                text-align: center;
            `;
            
            const tableContainer = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SELECTABLE_TABLE);
            if (tableContainer && tableContainer.parentNode) {
                tableContainer.parentNode.insertBefore(statusDiv, tableContainer);
            }
        }
        
        if (this._isWaitingForSecondClick && this._firstClickCell) {
            statusDiv.innerHTML = `
                FIRST CELL SELECTED: <strong>${this._firstClickCell.ref}</strong> - CLICK SECOND CELL TO COMPLETE RANGE
            `;
            statusDiv.className = 'alert alert-success';
        } else {
            statusDiv.innerHTML = `
                CLICK SELECTION MODE - CLICK ON FIRST CELL TO START
            `;
            statusDiv.className = 'alert alert-info';
        }
    },

    /**
     * Bind event listeners
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

        // Add manual cell input support
        if (startCellInput) {
            startCellInput.readOnly = false;
            startCellInput.addEventListener('input', this._handleManualCellInput.bind(this));
            startCellInput.addEventListener('blur', this._validateAndUpdateRange.bind(this));
        }

        if (endCellInput) {
            endCellInput.readOnly = false;
            endCellInput.addEventListener('input', this._handleManualCellInput.bind(this));
            endCellInput.addEventListener('blur', this._validateAndUpdateRange.bind(this));
        }
    },

    /**
     * Setup touch support for mobile devices
     */
    _setupTouchSupport() {
        // Detect touch capability
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        
        if (isTouchDevice) {
            // Add touch-specific styles
            document.documentElement.classList.add('touch-device');
            window.QRScannerUtils.log.debug('Touch device detected, enabling enhanced touch support');
        }
    },

    /**
     * Validate cell element has required properties (ENHANCED)
     * @param {HTMLElement} cell - Cell element to validate
     * @returns {boolean} - True if valid
     */
    _isValidCell(cell) {
        if (!cell) {
            return false;
        }

        if (cell.tagName !== 'TD') {
            return false;
        }

        if (!cell.dataset) {
            return false;
        }

        // Enhanced validation for dataset properties
        if (!cell.dataset.row || !cell.dataset.col) {
            return false;
        }

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        // Validate parsed numbers and ensure they're positive
        if (isNaN(row) || isNaN(col) || row <= 0 || col <= 0) {
            return false;
        }

        return true;
    },

    /**
     * Handle manual cell input
     */
    _handleManualCellInput(event) {
        const input = event.target;
        if (!input) return;

        const value = input.value.trim().toUpperCase();
        
        // Validate cell reference format (e.g., A1, Z99, AA100)
        if (value && !this._isValidCellRef(value)) {
            input.style.borderColor = 'var(--color-error)';
        } else {
            input.style.borderColor = '';
        }
    },

    /**
     * Validate cell reference format
     */
    _isValidCellRef(cellRef) {
        return /^[A-Z]+[1-9]\d*$/.test(cellRef);
    },

    /**
     * Validate and update range from manual input
     */
    _validateAndUpdateRange() {
        const startCellInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.START_CELL);
        const endCellInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.END_CELL);
        
        if (!startCellInput || !endCellInput) return;

        const startRef = startCellInput.value.trim().toUpperCase();
        const endRef = endCellInput.value.trim().toUpperCase();

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

                this._updateSelectionFromManualInput();
                this._finalizeSelection();
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

            // Update click selection status if in click mode
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
     * Create interactive selectable table (ENHANCED)
     * @param {Array} data - Sheet data
     * @returns {HTMLElement} - Table element
     */
    _createSelectableTable(data) {
        const table = document.createElement('table');
        table.className = 'table-hover selectable-table';
        table.style.userSelect = 'none';
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';

        // Calculate max columns
        const maxCols = Math.max(...data.map(r => r ? r.length : 0));
        if (maxCols === 0) {
            throw new Error('No data columns found');
        }

        // Create header row with column letters
        const headerRow = document.createElement('tr');

        // Empty cell for row numbers
        const cornerCell = document.createElement('th');
        cornerCell.textContent = '';
        cornerCell.className = 'cell-header';
        headerRow.appendChild(cornerCell);

        // Column letter headers
        for (let col = 0; col < maxCols; col++) {
            const th = document.createElement('th');
            th.textContent = window.QRScannerUtils.excel.numToCol(col + 1);
            th.className = 'cell-header';
            th.dataset.col = col + 1;
            headerRow.appendChild(th);
        }

        table.appendChild(headerRow);

        // Create data rows
        data.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');

            // Row number cell
            const rowNumCell = document.createElement('th');
            rowNumCell.textContent = rowIndex + 1;
            rowNumCell.className = 'cell-header';
            rowNumCell.dataset.row = rowIndex + 1;
            tr.appendChild(rowNumCell);

            // Data cells
            for (let colIndex = 0; colIndex < maxCols; colIndex++) {
                const td = document.createElement('td');
                const cellValue = (row && row[colIndex]) ? String(row[colIndex]) : '';
                const displayValue = window.QRScannerUtils.string.truncate(cellValue, 30);
                
                td.textContent = displayValue;
                td.title = cellValue;
                
                // CRITICAL: Set all data attributes with validation
                const rowNum = rowIndex + 1;
                const colNum = colIndex + 1;
                
                td.dataset.row = String(rowNum);
                td.dataset.col = String(colNum);
                
                // Generate cellRef safely
                try {
                    td.dataset.cellRef = window.QRScannerUtils.excel.getCellRef(rowNum, colNum);
                } catch (error) {
                    window.QRScannerUtils.log.warn(`Failed to generate cellRef for row ${rowNum}, col ${colNum}:`, error);
                    td.dataset.cellRef = window.QRScannerUtils.excel.numToCol(colNum) + rowNum;
                }
                
                // Additional validation after setting dataset
                if (!td.dataset.row || !td.dataset.col || !td.dataset.cellRef) {
                    window.QRScannerUtils.log.error('Failed to set cell dataset properties');
                    continue; // Skip this cell
                }
                
                // Add event listeners
                this._addCellEventListeners(td);

                tr.appendChild(td);
            }

            table.appendChild(tr);
        });

        // Add table-level event listeners
        this._addTableEventListeners(table);

        return table;
    },

    /**
     * Add event listeners to cell
     * @param {HTMLElement} cell - Table cell element
     */
    _addCellEventListeners(cell) {
        if (!cell || cell.tagName !== 'TD') return;

        // Mouse events
        cell.addEventListener('mouseenter', this._handleCellEnter.bind(this));
        cell.addEventListener('mousedown', this._handleCellMouseDown.bind(this));
        cell.addEventListener('mouseup', this._handleCellMouseUp.bind(this));
        
        // Touch events for mobile
        cell.addEventListener('touchstart', this._handleCellTouchStart.bind(this), { passive: false });
        cell.addEventListener('touchmove', this._handleCellTouchMove.bind(this), { passive: false });
        cell.addEventListener('touchend', this._handleCellTouchEnd.bind(this), { passive: false });

        // Hover effects (mouse only) - enhanced for click selection mode
        cell.addEventListener('mouseenter', () => {
            if (!cell.classList.contains('cell-selected') && 
                !cell.classList.contains('first-click') && 
                !cell.classList.contains('click-pending')) {
                if (this._clickSelectionMode && this._isWaitingForSecondClick) {
                    cell.style.backgroundColor = 'var(--color-gray-100)';
                } else {
                    cell.style.backgroundColor = 'var(--color-gray-50)';
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
     * @param {HTMLElement} table - Table element
     */
    _addTableEventListeners(table) {
        if (!table) return;

        // Prevent text selection
        table.addEventListener('selectstart', (e) => e.preventDefault());
        table.addEventListener('dragstart', (e) => e.preventDefault());
        
        // Global mouse events
        table.addEventListener('mousedown', this._handleMouseDown.bind(this));
        table.addEventListener('mouseleave', this._handleMouseLeave.bind(this));
        
        // Global touch events
        table.addEventListener('touchstart', this._handleTouchStart.bind(this), { passive: false });
    },

    // Touch Event Handlers (Robust)
    _handleCellTouchStart(event) {
        if (!event) return;
        event.preventDefault();
        
        const cell = event.currentTarget;
        
        // Robust validation
        if (!this._isValidCell(cell)) {
            window.QRScannerUtils.log.warn('Touch start: Invalid cell - missing dataset properties');
            return;
        }
        
        this._touchStarted = true;
        this._isDragging = false;
        
        // Safe to proceed
        this._handleCellMouseDown({ currentTarget: cell, button: 0 });
    },

    _handleCellTouchMove(event) {
        if (!event || !this._touchStarted) return;
        
        event.preventDefault();
        this._isDragging = true;
        
        const touch = event.touches[0];
        if (!touch) return;

        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (this._isValidCell(element)) {
            if (this._lastTouchCell !== element) {
                this._lastTouchCell = element;
                this._handleCellEnter({ currentTarget: element });
            }
        }
    },

    _handleCellTouchEnd(event) {
        if (!event || !this._touchStarted) return;
        
        event.preventDefault();
        
        const cell = this._lastTouchCell || event.currentTarget;
        
        // Validate cell before proceeding
        if (this._isValidCell(cell)) {
            this._handleCellMouseUp({ currentTarget: cell });
        }
        
        this._touchStarted = false;
        this._isDragging = false;
        this._lastTouchCell = null;
    },

    _handleTouchStart(event) {
        if (!event || !event.target) return;
        
        if (event.target.tagName === 'TD' && this._isValidCell(event.target)) {
            this._isSelecting = true;
        }
    },

    // Mouse Event Handlers (Robust)
    _handleMouseDown(event) {
        if (!event || event.button !== 0) return;

        event.preventDefault();
        
        // Don't start drag selection if in click selection mode
        if (!this._clickSelectionMode) {
            this._isSelecting = true;
            this._isDragging = false;

            // Add global mouse up listener
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
     * ENHANCED: Handle cell mouse down with click selection support
     */
    _handleCellMouseDown(event) {
        if (!event || event.button !== 0) return;

        const cell = event.currentTarget;
        
        // Enhanced robust validation
        if (!this._isValidCell(cell)) {
            window.QRScannerUtils.log.warn('Mouse down: Invalid cell - missing dataset properties');
            return;
        }

        // Additional safety check for dataset properties
        if (!cell.dataset || 
            typeof cell.dataset.row === 'undefined' || 
            typeof cell.dataset.col === 'undefined') {
            window.QRScannerUtils.log.warn('Mouse down: Cell missing required dataset properties');
            return;
        }

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        // Validate parsed numbers
        if (isNaN(row) || isNaN(col) || row <= 0 || col <= 0) {
            window.QRScannerUtils.log.warn('Mouse down: Invalid row/col values');
            return;
        }

        // Safe cellRef generation with fallback
        let cellRef = cell.dataset.cellRef;
        if (!cellRef) {
            try {
                cellRef = window.QRScannerUtils.excel.getCellRef(row, col);
                // Set it for future use
                cell.dataset.cellRef = cellRef;
            } catch (error) {
                window.QRScannerUtils.log.error('Failed to generate cellRef:', error);
                return;
            }
        }

        // Handle click selection mode
        if (this._clickSelectionMode) {
            this._handleClickSelection(cell, row, col, cellRef);
            return; // Don't proceed with drag selection
        }

        // Existing drag selection logic
        this._clearSelectionHighlight();
        
        // Set new startCell AFTER clearing highlights but BEFORE accessing .ref
        this._startCell = {
            row: row,
            col: col,
            ref: cellRef
        };

        // Clear other state but preserve startCell
        this._endCell = null;
        this._selectedCells.clear();
        
        // Now safely highlight the cell
        this._highlightCell(cell, 'range-start');

        const startInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.START_CELL);
        if (startInput && this._startCell) {
            window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.START_CELL, this._startCell.ref);
        }
        
        this._isDragging = true;
    },

    /**
     * Handle click selection logic
     * @param {HTMLElement} cell - The clicked cell
     * @param {number} row - Row number
     * @param {number} col - Column number
     * @param {string} cellRef - Cell reference (e.g., A1)
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
            
            // Clear previous selection and highlight first cell
            this._clearSelectionHighlight();
            this._highlightCell(cell, 'first-click');
            
            // Update start cell input
            const startInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.START_CELL);
            if (startInput) {
                window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.START_CELL, cellRef);
            }
            
            // Clear end cell input
            const endInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.END_CELL);
            if (endInput) {
                window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.END_CELL, '');
            }
            
            // Set timeout to reset if second click doesn't happen
            this._clickTimeout = setTimeout(() => {
                this._resetClickSelection();
                this._showTemporaryMessage('Click selection timed out. Please try again.', 'warning');
                window.QRScannerUtils.log.debug('Click selection timeout - reset');
            }, this._clickSelectionTimeoutDuration);
            
            // Update status display
            this._updateClickSelectionStatus();
            
            window.QRScannerUtils.log.debug('First cell selected for click selection:', cellRef);
            
        } else {
            // Second click
            clearTimeout(this._clickTimeout);
            this._clickTimeout = null;
            
            // Check if clicking the same cell (deselect)
            if (this._firstClickCell && 
                this._firstClickCell.row === row && 
                this._firstClickCell.col === col) {
                this._resetClickSelection();
                this._showTemporaryMessage('Selection cancelled. Click a different cell to create a range.', 'info');
                return;
            }
            
            // Set range from first click to second click
            this._startCell = this._firstClickCell;
            this._endCell = {
                row: row,
                col: col,
                ref: cellRef
            };
            
            // Create selection range
            this._createClickSelectionRange();
            
            // Reset click selection state
            this._resetClickSelection();
            
            this._showTemporaryMessage(`Range selected: ${this._startCell.ref}:${this._endCell.ref}`, 'success');
            window.QRScannerUtils.log.debug('Click selection completed:', this._startCell.ref, 'to', this._endCell.ref);
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
        
        // Clear all highlights first
        this._clearSelectionHighlight();
        
        // Highlight the selected range
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
        
        // Update inputs and finalize selection
        const startRef = window.QRScannerUtils.excel.getCellRef(minRow, minCol);
        const endRef = window.QRScannerUtils.excel.getCellRef(maxRow, maxCol);
        
        const startInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.START_CELL);
        const endInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.END_CELL);
        
        if (startInput) {
            window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.START_CELL, startRef);
        }
        if (endInput) {
            window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.END_CELL, endRef);
        }
        
        // Update internal range state
        this._startCell = { row: minRow, col: minCol, ref: startRef };
        this._endCell = { row: maxRow, col: maxCol, ref: endRef };
        
        // Finalize the selection
        this._finalizeSelection();
    },

    _handleCellMouseUp(event) {
        if (!event) return;

        const cell = event.currentTarget;
        
        // In click selection mode, mouse up is handled differently
        if (this._clickSelectionMode) {
            return;
        }
        
        // Robust validation
        if (!this._isValidCell(cell)) {
            window.QRScannerUtils.log.warn('Mouse up: Invalid cell - missing dataset properties');
            return;
        }

        // Additional safety check for dataset properties
        if (!cell.dataset || 
            typeof cell.dataset.row === 'undefined' || 
            typeof cell.dataset.col === 'undefined') {
            window.QRScannerUtils.log.warn('Mouse up: Cell missing required dataset properties');
            return;
        }

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        // Validate parsed numbers
        if (isNaN(row) || isNaN(col) || row <= 0 || col <= 0) {
            window.QRScannerUtils.log.warn('Mouse up: Invalid row/col values');
            return;
        }

        // Safe cellRef generation with fallback
        let cellRef = cell.dataset.cellRef;
        if (!cellRef) {
            try {
                cellRef = window.QRScannerUtils.excel.getCellRef(row, col);
                // Set it for future use
                cell.dataset.cellRef = cellRef;
            } catch (error) {
                window.QRScannerUtils.log.error('Failed to generate cellRef:', error);
                return;
            }
        }

        this._endCell = {
            row: row,
            col: col,
            ref: cellRef
        };

        const endInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.END_CELL);
        if (endInput && this._endCell) {
            window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.END_CELL, this._endCell.ref);
        }
        
        if (this._startCell) {
            this._finalizeSelection();
        }
    },

    _handleCellEnter(event) {
        if (!event || !this._isSelecting || !this._startCell) return;
        
        // Skip if in click selection mode
        if (this._clickSelectionMode) return;

        const cell = event.currentTarget;
        
        if (!this._isValidCell(cell)) return;

        const endRow = parseInt(cell.dataset.row);
        const endCol = parseInt(cell.dataset.col);

        if (isNaN(endRow) || isNaN(endCol)) return;

        this._updateSelectionDisplay(endRow, endCol);
    },

    /**
     * Update selection display while dragging
     * @param {number} endRow - End row
     * @param {number} endCol - End column
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

        const endRef = window.QRScannerUtils.excel.getCellRef(endRow, endCol);
        const endInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.END_CELL);
        if (endInput) {
            window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.END_CELL, endRef);
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

        if (startInput) {
            window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.START_CELL, range.startRef);
        }
        if (endInput) {
            window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.END_CELL, range.endRef);
        }

        window.QRScannerExcelHandler.setSelectedRange(range);

        const confirmBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.CONFIRM_RANGE);
        if (confirmBtn) {
            window.QRScannerUtils.dom.setEnabled(confirmBtn, true);
        }

        const cellCount = (maxRow - minRow + 1) * (maxCol - minCol + 1);
        window.QRScannerUtils.log.debug(`Range selected: ${range.startRef}:${range.endRef} (${cellCount} cells)`);
        
        this._showSelectionInfo(range, cellCount);
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
     * Handle confirm range button
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
        window.QRScannerUtils.log.info('Range confirmed, proceeding to column mapping');
    },

    /**
     * ENHANCED: Handle clear range button
     */
    _handleClearRange() {
        this._clearSelection();
        this._clearSelectionHighlight();
        this._resetClickSelection(); // Also reset click selection state

        const startInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.START_CELL);
        const endInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.END_CELL);

        if (startInput) {
            window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.START_CELL, '');
            startInput.style.borderColor = '';
        }
        if (endInput) {
            window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.END_CELL, '');
            endInput.style.borderColor = '';
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
     * ENHANCED: Clear selection state
     */
    _clearSelection() {
        this._startCell = null;
        this._endCell = null;
        this._selectedCells.clear();
        this._isSelecting = false;
        this._isDragging = false;
        this._touchStarted = false;
        this._lastTouchCell = null;
        
        // Also clear click selection state
        this._resetClickSelection();
    },

    /**
     * ENHANCED: Clear selection highlighting including click selection classes
     */
    _clearSelectionHighlight() {
        const container = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SELECTABLE_TABLE);
        if (!container) return;

        const table = container.querySelector('table');
        if (!table) return;

        const cells = table.querySelectorAll('td, th');
        cells.forEach(cell => {
            if (!cell) return;
            
            // Remove all selection classes including new ones
            cell.classList.remove('cell-selected', 'range-start', 'range-end', 'first-click', 'click-pending');
            
            if (cell.tagName === 'TD') {
                cell.style.backgroundColor = '';
                cell.style.color = '';
                cell.style.border = '';
                cell.style.boxShadow = '';
            }
        });
    },

    /**
     * ENHANCED: Highlight cell with specific class including new click selection classes
     * @param {HTMLElement} cell - Cell element
     * @param {string} className - CSS class to add
     */
    _highlightCell(cell, className) {
        if (!cell) return;

        cell.classList.add(className);
        
        if (className === 'cell-selected') {
            cell.style.backgroundColor = 'var(--color-gray-200)';
            cell.style.border = 'var(--border-width-thick) solid var(--color-black)';
        } else if (className === 'range-start') {
            cell.style.backgroundColor = 'var(--color-success)';
            cell.style.color = 'var(--color-white)';
            cell.style.border = 'var(--border-width-thick) solid var(--color-success)';
        } else if (className === 'range-end') {
            cell.style.backgroundColor = 'var(--color-info)';
            cell.style.color = 'var(--color-white)';
            cell.style.border = 'var(--border-width-thick) solid var(--color-info)';
        } else if (className === 'first-click') {
            cell.style.backgroundColor = 'var(--color-black)';
            cell.style.color = 'var(--color-white)';
            cell.style.border = 'var(--border-width-thick) solid var(--color-black)';
            cell.style.boxShadow = '0 0 0 2px var(--color-gray-400)';
        } else if (className === 'click-pending') {
            cell.style.backgroundColor = 'var(--color-gray-100)';
            cell.style.color = 'var(--color-black)';
            cell.style.border = 'var(--border-width) dashed var(--color-gray-400)';
        }
    },

    /**
     * Public method to trigger table creation (ENHANCED)
     */
    showRangeSelector() {
        // Increased timeout to ensure DOM is fully rendered
        setTimeout(() => {
            this.createSelectableTable();
        }, 300);
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
