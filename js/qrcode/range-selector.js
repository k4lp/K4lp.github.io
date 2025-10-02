/**
 * QR Code Component Scanner - Range Selector (Enhanced & Robust)
 * Alica Technologies
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

    /**
     * Initialize range selector
     */
    init() {
        this._bindEvents();
        this._setupTouchSupport();
        window.QRScannerUtils.log.debug('Range selector initialized with enhanced touch support');
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
     * Validate cell element has required properties
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

        if (!cell.dataset.row || !cell.dataset.col) {
            return false;
        }

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        if (isNaN(row) || isNaN(col)) {
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
            input.style.borderColor = '#ef4444';
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

            // Add responsive wrapper
            container.style.overflowX = 'auto';
            container.style.maxHeight = '70vh';
            container.style.border = '1px solid #e0e0e0';
            container.style.borderRadius = '4px';

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
            container.innerHTML = `<div class="alert">No data available. Please select a sheet first.</div>`;
        }
    },

    /**
     * Show error message
     */
    _showErrorMessage(message) {
        const container = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SELECTABLE_TABLE);
        if (container) {
            container.innerHTML = `<div class="alert" style="color: #ef4444;">${message}</div>`;
        }
    },

    /**
     * Create interactive selectable table
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
        headerRow.style.backgroundColor = '#f8f9fa';
        headerRow.style.position = 'sticky';
        headerRow.style.top = '0';
        headerRow.style.zIndex = '10';

        // Empty cell for row numbers
        const cornerCell = document.createElement('th');
        cornerCell.textContent = '';
        cornerCell.className = 'cell-header';
        cornerCell.style.cssText = 'background-color: #e9ecef; border: 1px solid #dee2e6; padding: 8px; text-align: center; font-weight: bold; min-width: 40px;';
        headerRow.appendChild(cornerCell);

        // Column letter headers
        for (let col = 0; col < maxCols; col++) {
            const th = document.createElement('th');
            th.textContent = window.QRScannerUtils.excel.numToCol(col + 1);
            th.className = 'cell-header';
            th.style.cssText = 'background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 8px; text-align: center; font-weight: bold; min-width: 80px; max-width: 150px;';
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
            rowNumCell.style.cssText = 'background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 8px; text-align: center; font-weight: bold;';
            rowNumCell.dataset.row = rowIndex + 1;
            tr.appendChild(rowNumCell);

            // Data cells
            for (let colIndex = 0; colIndex < maxCols; colIndex++) {
                const td = document.createElement('td');
                const cellValue = (row && row[colIndex]) ? String(row[colIndex]) : '';
                const displayValue = window.QRScannerUtils.string.truncate(cellValue, 30);
                
                td.textContent = displayValue;
                td.title = cellValue;
                
                // CRITICAL: Set all data attributes
                td.dataset.row = String(rowIndex + 1);
                td.dataset.col = String(colIndex + 1);
                td.dataset.cellRef = window.QRScannerUtils.excel.getCellRef(rowIndex + 1, colIndex + 1);
                
                // Styling
                td.style.cssText = 'border: 1px solid #dee2e6; padding: 8px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; transition: background-color 0.2s;';

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

        // Hover effects (mouse only)
        cell.addEventListener('mouseenter', () => {
            if (!cell.classList.contains('cell-selected')) {
                cell.style.backgroundColor = '#f0f0f0';
            }
        });
        
        cell.addEventListener('mouseleave', () => {
            if (!cell.classList.contains('cell-selected')) {
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
            window.QRScannerUtils.log.warn('Touch start: Invalid cell');
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
        this._isSelecting = true;
        this._isDragging = false;

        // Add global mouse up listener
        document.addEventListener('mouseup', this._handleGlobalMouseUp.bind(this), { once: true });
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

    _handleCellMouseDown(event) {
        if (!event || event.button !== 0) return;

        const cell = event.currentTarget;
        
        // Robust validation
        if (!this._isValidCell(cell)) {
            window.QRScannerUtils.log.warn('Mouse down: Invalid cell');
            return;
        }

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const cellRef = cell.dataset.cellRef || window.QRScannerUtils.excel.getCellRef(row, col);

        this._startCell = {
            row: row,
            col: col,
            ref: cellRef
        };

        this._clearSelection();
        this._clearSelectionHighlight();
        this._highlightCell(cell, 'range-start');

        const startInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.START_CELL);
        if (startInput) {
            window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.START_CELL, this._startCell.ref);
        }
        
        this._isDragging = true;
    },

    _handleCellMouseUp(event) {
        if (!event) return;

        const cell = event.currentTarget;
        
        // Robust validation
        if (!this._isValidCell(cell)) {
            window.QRScannerUtils.log.warn('Mouse up: Invalid cell');
            return;
        }

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const cellRef = cell.dataset.cellRef || window.QRScannerUtils.excel.getCellRef(row, col);

        this._endCell = {
            row: row,
            col: col,
            ref: cellRef
        };

        const endInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.END_CELL);
        if (endInput) {
            window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.END_CELL, this._endCell.ref);
        }
        
        if (this._startCell) {
            this._finalizeSelection();
        }
    },

    _handleCellEnter(event) {
        if (!event || !this._isSelecting || !this._startCell) return;

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
            infoDiv.style.cssText = 'padding: 10px; background-color: #e3f2fd; border: 1px solid #2196f3; border-radius: 4px; margin-top: 10px;';
            
            const container = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SELECTABLE_TABLE);
            if (container && container.parentNode) {
                container.parentNode.insertBefore(infoDiv, container.nextSibling);
            }
        }
        
        infoDiv.innerHTML = `
            <strong>Selection:</strong> ${range.startRef}:${range.endRef} 
            <span style="margin-left: 20px;"><strong>Cells:</strong> ${cellCount}</span>
            <span style="margin-left: 20px;"><strong>Rows:</strong> ${range.endRow - range.startRow + 1}</span>
            <span style="margin-left: 20px;"><strong>Columns:</strong> ${range.endCol - range.startCol + 1}</span>
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
     * Handle clear range button
     */
    _handleClearRange() {
        this._clearSelection();
        this._clearSelectionHighlight();

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
            cell.classList.remove('cell-selected', 'range-start', 'range-end');
            if (cell.tagName === 'TD') {
                cell.style.backgroundColor = '';
            }
        });
    },

    /**
     * Highlight cell with specific class
     * @param {HTMLElement} cell - Cell element
     * @param {string} className - CSS class to add
     */
    _highlightCell(cell, className) {
        if (!cell) return;

        cell.classList.add(className);
        
        if (className === 'cell-selected') {
            cell.style.backgroundColor = '#bbdefb';
        } else if (className === 'range-start') {
            cell.style.backgroundColor = '#4caf50';
            cell.style.color = 'white';
        } else if (className === 'range-end') {
            cell.style.backgroundColor = '#2196f3';
            cell.style.color = 'white';
        }
    },

    /**
     * Public method to trigger table creation
     */
    showRangeSelector() {
        setTimeout(() => {
            this.createSelectableTable();
        }, 100);
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
