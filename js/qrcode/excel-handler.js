/**
 * QR Code Component Scanner - Excel File Handler
 * Alica Technologies
 */

window.QRScannerExcelHandler = {
    // Internal state
    _workbook: null,
    _currentSheet: null,
    _sheetData: null,
    _selectedRange: null,

    /**
     * Initialize Excel handler
     */
    init() {
        this._bindEvents();
        window.QRScannerUtils.log.debug('Excel handler initialized');
    },

    /**
     * Bind event listeners
     */
    _bindEvents() {
        const fileInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.EXCEL_FILE);
        if (fileInput) {
            fileInput.addEventListener('change', this._handleFileSelect.bind(this));
        }

        const sheetSelect = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SHEET_SELECT);
        if (sheetSelect) {
            sheetSelect.addEventListener('change', this._handleSheetSelect.bind(this));
        }
    },

    /**
     * Handle file selection
     * @param {Event} event - File input change event
     */
    async _handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file
        if (!this._validateFile(file)) {
            return;
        }

        try {
            // Show loading state
            this._setStatus('loading', 'Loading Excel file...');

            // Read file
            const data = await this._readFile(file);

            // Parse Excel file
            this._workbook = XLSX.read(data, { type: 'binary' });

            // Show file info
            this._showFileInfo(file);

            // Populate sheet selector
            this._populateSheetSelector();

            // Show next step
            window.QRScannerUtils.dom.show(window.QRScannerConfig.ELEMENTS.STEP_2);

            this._setStatus('ready', 'File loaded successfully');
            window.QRScannerUtils.log.info('Excel file loaded:', file.name);

        } catch (error) {
            this._setStatus('error', 'Error loading file');
            window.QRScannerUtils.log.error('File loading error:', error);
            alert('Error loading Excel file: ' + error.message);
        }
    },

    /**
     * Validate selected file
     * @param {File} file - Selected file
     * @returns {boolean} - Validation result
     */
    _validateFile(file) {
        // Check file type
        if (!window.QRScannerUtils.file.isTypeSupported(file.name, window.QRScannerConfig.SUPPORTED_FORMATS.EXCEL)) {
            alert(window.QRScannerConfig.MESSAGES.INVALID_FILE_TYPE);
            return false;
        }

        // Check file size
        if (!window.QRScannerUtils.file.isValidSize(file.size, window.QRScannerConfig.EXCEL.MAX_FILE_SIZE)) {
            alert(window.QRScannerConfig.MESSAGES.FILE_TOO_LARGE);
            return false;
        }

        return true;
    },

    /**
     * Read file as binary string
     * @param {File} file - File to read
     * @returns {Promise<string>} - File data
     */
    _readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                resolve(e.target.result);
            };

            reader.onerror = (error) => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsBinaryString(file);
        });
    },

    /**
     * Show file information
     * @param {File} file - Selected file
     */
    _showFileInfo(file) {
        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.FILE_NAME, file.name);
        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.FILE_SIZE, window.QRScannerUtils.file.formatSize(file.size));
        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.SHEET_COUNT, this._workbook.SheetNames.length);
        window.QRScannerUtils.dom.show(window.QRScannerConfig.ELEMENTS.FILE_INFO);
    },

    /**
     * Populate sheet selector dropdown
     */
    _populateSheetSelector() {
        const sheetSelect = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SHEET_SELECT);

        // Clear existing options
        sheetSelect.innerHTML = '<option value="">Select a sheet...</option>';

        // Add sheet options
        this._workbook.SheetNames.forEach((sheetName, index) => {
            const option = document.createElement('option');
            option.value = sheetName;
            option.textContent = `${sheetName} (Sheet ${index + 1})`;
            sheetSelect.appendChild(option);
        });
    },

    /**
     * Handle sheet selection
     * @param {Event} event - Select change event
     */
    _handleSheetSelect(event) {
        const sheetName = event.target.value;
        if (!sheetName) return;

        try {
            // Get selected sheet
            this._currentSheet = this._workbook.Sheets[sheetName];

            // Convert to JSON for processing
            this._sheetData = XLSX.utils.sheet_to_json(this._currentSheet, {
                header: 1, // Use array of arrays format
                raw: false, // Keep as strings
                defval: '' // Default value for empty cells
            });

            // Show sheet preview
            this._showSheetPreview();

            // Show range selection step
            window.QRScannerUtils.dom.show(window.QRScannerConfig.ELEMENTS.STEP_3);

            window.QRScannerUtils.log.debug('Sheet selected:', sheetName);

        } catch (error) {
            window.QRScannerUtils.log.error('Sheet selection error:', error);
            alert('Error loading sheet: ' + error.message);
        }
    },

    /**
     * Show sheet preview
     */
    _showSheetPreview() {
        const previewData = this._sheetData.slice(0, window.QRScannerConfig.EXCEL.MAX_PREVIEW_ROWS);
        const table = this._createPreviewTable(previewData);

        const previewContainer = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.PREVIEW_TABLE);
        previewContainer.innerHTML = '';
        previewContainer.appendChild(table);

        window.QRScannerUtils.dom.show(window.QRScannerConfig.ELEMENTS.SHEET_PREVIEW);
    },

    /**
     * Create preview table
     * @param {Array} data - Sheet data
     * @returns {HTMLElement} - Table element
     */
    _createPreviewTable(data) {
        const table = document.createElement('table');
        table.className = 'table-compact';

        data.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');

            // Add row number column
            const rowNumCell = document.createElement('td');
            rowNumCell.textContent = rowIndex + 1;
            rowNumCell.className = 'cell-center';
            rowNumCell.style.fontWeight = 'bold';
            rowNumCell.style.backgroundColor = '#f5f5f5';
            tr.appendChild(rowNumCell);

            // Add data columns
            const maxCols = Math.max(...data.map(r => r.length));
            for (let colIndex = 0; colIndex < maxCols; colIndex++) {
                const td = document.createElement('td');
                const cellValue = row[colIndex] || '';
                td.textContent = window.QRScannerUtils.string.truncate(cellValue, 30);
                td.title = cellValue; // Full value on hover

                // Highlight header row
                if (rowIndex === 0) {
                    td.style.fontWeight = 'bold';
                    td.style.backgroundColor = '#f0f0f0';
                }

                tr.appendChild(td);
            }

            table.appendChild(tr);
        });

        // Add column headers
        if (data.length > 0) {
            const headerRow = document.createElement('tr');
            headerRow.style.backgroundColor = '#e0e0e0';

            // Empty cell for row numbers
            const emptyCell = document.createElement('th');
            emptyCell.textContent = '#';
            emptyCell.className = 'cell-center';
            headerRow.appendChild(emptyCell);

            // Column letters
            const maxCols = Math.max(...data.map(r => r.length));
            for (let i = 0; i < maxCols; i++) {
                const th = document.createElement('th');
                th.textContent = window.QRScannerUtils.excel.numToCol(i + 1);
                th.className = 'cell-center';
                headerRow.appendChild(th);
            }

            table.insertBefore(headerRow, table.firstChild);
        }

        return table;
    },

    /**
     * Get sheet data for range selector
     * @returns {Array} - Sheet data
     */
    getSheetData() {
        return this._sheetData;
    },

    /**
     * Get data for selected range
     * @param {Object} range - Range object {startRow, startCol, endRow, endCol}
     * @returns {Array} - Range data
     */
    getRangeData(range) {
        if (!this._sheetData) return [];

        const result = [];
        for (let row = range.startRow - 1; row < range.endRow; row++) {
            if (this._sheetData[row]) {
                const rowData = [];
                for (let col = range.startCol - 1; col < range.endCol; col++) {
                    rowData.push(this._sheetData[row][col] || '');
                }
                result.push(rowData);
            }
        }

        return result;
    },

    /**
     * Set selected range
     * @param {Object} range - Range object
     */
    setSelectedRange(range) {
        this._selectedRange = range;
    },

    /**
     * Get selected range
     * @returns {Object} - Range object
     */
    getSelectedRange() {
        return this._selectedRange;
    },

    /**
     * Export data to Excel
     * @param {Array} data - Data to export
     * @param {string} filename - Export filename
     */
    exportToExcel(data, filename = 'QR_Scanner_Results.xlsx') {
        try {
            // Create new workbook
            const wb = XLSX.utils.book_new();

            // Convert data to worksheet
            const ws = XLSX.utils.aoa_to_sheet(data);

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Scan Results');

            // Save file
            XLSX.writeFile(wb, filename);

            window.QRScannerUtils.log.info('Data exported to:', filename);

        } catch (error) {
            window.QRScannerUtils.log.error('Export error:', error);
            throw error;
        }
    },

    /**
     * Set status indicator
     * @param {string} status - Status type
     * @param {string} message - Status message
     */
    _setStatus(status, message) {
        const statusEl = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SCANNER_STATUS);
        if (statusEl) {
            statusEl.className = `status-${status}`;
            statusEl.textContent = message;
        }
    }
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.QRScannerExcelHandler.init();
    });
} else {
    window.QRScannerExcelHandler.init();
}
