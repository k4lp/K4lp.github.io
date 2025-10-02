/**
 * QR Code Component Scanner - Range Selector
 * Alica Technologies
 */

window.QRScannerRangeSelector = {
    // Internal state
    _isSelecting: false,
    _startCell: null,
    _endCell: null,
    _selectedCells: new Set(),

    /**
     * Initialize range selector
     */
    init() {
        this._bindEvents();
        window.QRScannerUtils.log.debug('Range selector initialized');
    },

    /**
     * Bind event listeners
     */
    _bindEvents() {
        const confirmBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.CONFIRM_RANGE);
        const clearBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.CLEAR_RANGE);

        if (confirmBtn) {
            confirmBtn.addEventListener('click', this._handleConfirmRange.bind(this));
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', this._handleClearRange.bind(this));
        }
    },

    /**
     * Create selectable table from sheet data
     */
    createSelectableTable() {
        const sheetData = window.QRScannerExcelHandler.getSheetData();
        if (!sheetData || sheetData.length === 0) {
            window.QRScannerUtils.log.error('No sheet data available for range selection');
            return;
        }

        const table = this._createSelectableTable(sheetData);
        const container = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SELECTABLE_TABLE);

        container.innerHTML = '';
        container.appendChild(table);

        window.QRScannerUtils.log.debug('Selectable table created');
    },

    /**
     * Create interactive selectable table
     * @param {Array} data - Sheet data
     * @returns {HTMLElement} - Table element
     */
    _createSelectableTable(data) {
        const table = document.createElement('table');
        table.className = 'table-hover';
        table.style.userSelect = 'none';

        // Calculate max columns
        const maxCols = Math.max(...data.map(r => r.length));

        // Create header row with column letters
        const headerRow = document.createElement('tr');
        headerRow.style.backgroundColor = '#e0e0e0';

        // Empty cell for row numbers
        const cornerCell = document.createElement('th');
        cornerCell.textContent = '';
        cornerCell.className = 'cell-center';
        cornerCell.style.backgroundColor = '#d0d0d0';
        headerRow.appendChild(cornerCell);

        // Column letter headers
        for (let col = 0; col < maxCols; col++) {
            const th = document.createElement('th');
            th.textContent = window.QRScannerUtils.excel.numToCol(col + 1);
            th.className = 'cell-center';
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
            rowNumCell.className = 'cell-center';
            rowNumCell.style.backgroundColor = '#f5f5f5';
            rowNumCell.dataset.row = rowIndex + 1;
            tr.appendChild(rowNumCell);

            // Data cells
            for (let colIndex = 0; colIndex < maxCols; colIndex++) {
                const td = document.createElement('td');
                const cellValue = row[colIndex] || '';
                td.textContent = window.QRScannerUtils.string.truncate(cellValue, 20);
                td.title = cellValue;
                td.dataset.row = rowIndex + 1;
                td.dataset.col = colIndex + 1;
                td.dataset.cellRef = window.QRScannerUtils.excel.getCellRef(rowIndex + 1, colIndex + 1);

                // Add selection event listeners
                this._addCellEventListeners(td);

                tr.appendChild(td);
            }

            table.appendChild(tr);
        });

        // Add mouse event listeners to table
        table.addEventListener('mousedown', this._handleMouseDown.bind(this));
        table.addEventListener('mouseleave', this._handleMouseLeave.bind(this));

        // Prevent text selection
        table.addEventListener('selectstart', (e) => e.preventDefault());

        return table;
    },

    /**
     * Add event listeners to cell
     * @param {HTMLElement} cell - Table cell element
     */
    _addCellEventListeners(cell) {
        cell.addEventListener('mouseenter', this._handleCellEnter.bind(this));
        cell.addEventListener('mousedown', this._handleCellMouseDown.bind(this));
        cell.addEventListener('mouseup', this._handleCellMouseUp.bind(this));
    },

    /**
     * Handle mouse down on table
     * @param {Event} event - Mouse event
     */
    _handleMouseDown(event) {
        if (event.button !== 0) return; // Only left click

        event.preventDefault();
        this._isSelecting = true;

        // Add global mouse up listener
        document.addEventListener('mouseup', this._handleGlobalMouseUp.bind(this), { once: true });
    },

    /**
     * Handle global mouse up
     * @param {Event} event - Mouse event
     */
    _handleGlobalMouseUp(event) {
        this._isSelecting = false;
        this._finalizeSelection();
    },

    /**
     * Handle mouse leave table
     * @param {Event} event - Mouse event
     */
    _handleMouseLeave(event) {
        if (this._isSelecting) {
            this._isSelecting = false;
            this._finalizeSelection();
        }
    },

    /**
     * Handle cell mouse down
     * @param {Event} event - Mouse event
     */
    _handleCellMouseDown(event) {
        if (event.button !== 0) return;

        const cell = event.currentTarget;
        this._startCell = {
            row: parseInt(cell.dataset.row),
            col: parseInt(cell.dataset.col),
            ref: cell.dataset.cellRef
        };

        this._clearSelection();
        this._highlightCell(cell, 'range-start');

        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.START_CELL, this._startCell.ref);
    },

    /**
     * Handle cell mouse up
     * @param {Event} event - Mouse event
     */
    _handleCellMouseUp(event) {
        const cell = event.currentTarget;
        this._endCell = {
            row: parseInt(cell.dataset.row),
            col: parseInt(cell.dataset.col),
            ref: cell.dataset.cellRef
        };

        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.END_CELL, this._endCell.ref);

        this._finalizeSelection();
    },

    /**
     * Handle cell enter (hover)
     * @param {Event} event - Mouse event
     */
    _handleCellEnter(event) {
        if (!this._isSelecting || !this._startCell) return;

        const cell = event.currentTarget;
        const endRow = parseInt(cell.dataset.row);
        const endCol = parseInt(cell.dataset.col);

        // Update selection display
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

        // Clear previous selection
        this._clearSelectionHighlight();

        // Highlight selected range
        const table = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SELECTABLE_TABLE).querySelector('table');
        const cells = table.querySelectorAll('td[data-row][data-col]');

        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);

            if (row >= minRow && row <= maxRow && col >= minCol && col <= maxCol) {
                this._highlightCell(cell, 'cell-selected');
            }
        });

        // Update end cell reference
        const endRef = window.QRScannerUtils.excel.getCellRef(endRow, endCol);
        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.END_CELL, endRef);
    },

    /**
     * Finalize selection
     */
    _finalizeSelection() {
        if (!this._startCell || !this._endCell) return;

        // Calculate final range
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

        // Update display
        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.START_CELL, range.startRef);
        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.END_CELL, range.endRef);

        // Store range
        window.QRScannerExcelHandler.setSelectedRange(range);

        // Enable confirm button
        window.QRScannerUtils.dom.setEnabled(window.QRScannerConfig.ELEMENTS.CONFIRM_RANGE, true);

        const cellCount = (maxRow - minRow + 1) * (maxCol - minCol + 1);
        window.QRScannerUtils.log.debug(`Range selected: ${range.startRef}:${range.endRef} (${cellCount} cells)`);
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

        // Get range data for column mapping
        const rangeData = window.QRScannerExcelHandler.getRangeData(range);
        if (!rangeData || rangeData.length === 0) {
            alert(window.QRScannerConfig.MESSAGES.EMPTY_RANGE);
            return;
        }

        // Initialize column mapping
        window.QRScannerDataManager.initializeColumnMapping(rangeData);

        // Show column mapping step
        window.QRScannerUtils.dom.show(window.QRScannerConfig.ELEMENTS.STEP_4);

        window.QRScannerUtils.log.info('Range confirmed, proceeding to column mapping');
    },

    /**
     * Handle clear range button
     */
    _handleClearRange() {
        this._clearSelection();
        this._clearSelectionHighlight();

        // Clear input fields
        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.START_CELL, '');
        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.END_CELL, '');

        // Disable confirm button
        window.QRScannerUtils.dom.setEnabled(window.QRScannerConfig.ELEMENTS.CONFIRM_RANGE, false);

        // Clear stored range
        window.QRScannerExcelHandler.setSelectedRange(null);

        window.QRScannerUtils.log.debug('Range selection cleared');
    },

    /**
     * Clear selection state
     */
    _clearSelection() {
        this._startCell = null;
        this._endCell = null;
        this._selectedCells.clear();
    },

    /**
     * Clear selection highlighting
     */
    _clearSelectionHighlight() {
        const table = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SELECTABLE_TABLE).querySelector('table');
        if (!table) return;

        const cells = table.querySelectorAll('td, th');
        cells.forEach(cell => {
            cell.classList.remove('cell-selected', 'range-start', 'range-end');
        });
    },

    /**
     * Highlight cell with specific class
     * @param {HTMLElement} cell - Cell element
     * @param {string} className - CSS class to add
     */
    _highlightCell(cell, className) {
        cell.classList.add(className);
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
