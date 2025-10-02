/**
 * QR Code Component Scanner - Excel File Handler (Enhanced)
 * Alica Technologies
 */

window.QRScannerExcelHandler = {
    // Internal state
    _workbook: null,
    _currentSheet: null,
    _sheetData: null,
    _selectedRange: null,
    _isProcessing: false,

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

        if (this._isProcessing) {
            window.QRScannerUtils.log.warn('File processing already in progress');
            return;
        }

        this._isProcessing = true;

        try {
            // Show loading state
            this._setStatus('loading', 'Loading Excel file...');
            this._showLoadingProgress(0);

            // Read file with progress
            const data = await this._readFileWithProgress(file);

            // Parse Excel file
            this._setStatus('loading', 'Parsing Excel data...');
            this._workbook = XLSX.read(data, { type: 'binary' });

            if (!this._workbook || !this._workbook.SheetNames || this._workbook.SheetNames.length === 0) {
                throw new Error('No sheets found in Excel file');
            }

            // Show file info
            this._showFileInfo(file);

            // Populate sheet selector
            this._populateSheetSelector();

            // Show next step
            window.QRScannerUtils.dom.show(window.QRScannerConfig.ELEMENTS.STEP_2);
            
            // Scroll to next step
            this._scrollToElement(window.QRScannerConfig.ELEMENTS.STEP_2);

            this._setStatus('ready', 'File loaded successfully');
            window.QRScannerUtils.log.info('Excel file loaded:', file.name);

        } catch (error) {
            this._setStatus('error', 'Error loading file');
            window.QRScannerUtils.log.error('File loading error:', error);
            alert('Error loading Excel file: ' + error.message);
        } finally {
            this._isProcessing = false;
            this._hideLoadingProgress();
        }
    },

    /**
     * Show loading progress
     */
    _showLoadingProgress(percent) {
        let progressBar = document.getElementById('loadingProgress');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.id = 'loadingProgress';
            progressBar.style.cssText = `
                width: 100%;
                height: 4px;
                background: #f0f0f0;
                border-radius: 2px;
                margin: 10px 0;
                overflow: hidden;
            `;
            
            const progressFill = document.createElement('div');
            progressFill.style.cssText = `
                height: 100%;
                background: #2563eb;
                width: 0%;
                transition: width 0.3s ease;
            `;
            
            progressBar.appendChild(progressFill);
            
            const fileInfo = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.FILE_INFO);
            if (fileInfo) {
                fileInfo.appendChild(progressBar);
            }
        }
        
        const progressFill = progressBar.querySelector('div');
        if (progressFill) {
            progressFill.style.width = percent + '%';
        }
    },

    /**
     * Hide loading progress
     */
    _hideLoadingProgress() {
        const progressBar = document.getElementById('loadingProgress');
        if (progressBar) {
            progressBar.remove();
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
     * Read file as binary string with progress
     * @param {File} file - File to read
     * @returns {Promise<string>} - File data
     */
    _readFileWithProgress(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onloadstart = () => {
                this._showLoadingProgress(0);
            };

            reader.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = (e.loaded / e.total) * 100;
                    this._showLoadingProgress(percent);
                }
            };

            reader.onload = (e) => {
                this._showLoadingProgress(100);
                resolve(e.target.result);
            };

            reader.onerror = (error) => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsBinaryString(file);
        });
    },

    /**
     * Read file as binary string
     * @param {File} file - File to read
     * @returns {Promise<string>} - File data
     */
    _readFile(file) {
        return this._readFileWithProgress(file);
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

        // Add sheet options with enhanced info
        this._workbook.SheetNames.forEach((sheetName, index) => {
            const option = document.createElement('option');
            option.value = sheetName;
            
            // Get sheet info for display
            const sheet = this._workbook.Sheets[sheetName];
            const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
            const rowCount = range ? (range.e.r - range.s.r + 1) : 0;
            const colCount = range ? (range.e.c - range.s.c + 1) : 0;
            
            option.textContent = `${sheetName} (${rowCount} rows, ${colCount} cols)`;
            sheetSelect.appendChild(option);
        });
        
        // Auto-select first sheet if only one exists
        if (this._workbook.SheetNames.length === 1) {
            sheetSelect.value = this._workbook.SheetNames[0];
            // Trigger change event
            sheetSelect.dispatchEvent(new Event('change'));
        }
    },

    /**
     * Handle sheet selection
     * @param {Event} event - Select change event
     */
    _handleSheetSelect(event) {
        const sheetName = event.target.value;
        if (!sheetName) {
            // Hide subsequent steps
            window.QRScannerUtils.dom.hide(window.QRScannerConfig.ELEMENTS.STEP_3);
            window.QRScannerUtils.dom.hide(window.QRScannerConfig.ELEMENTS.STEP_4);
            window.QRScannerUtils.dom.hide(window.QRScannerConfig.ELEMENTS.STEP_5);
            return;
        }

        try {
            // Show processing state
            this._setStatus('loading', 'Processing sheet data...');
            
            // Get selected sheet
            this._currentSheet = this._workbook.Sheets[sheetName];

            if (!this._currentSheet) {
                throw new Error('Sheet not found: ' + sheetName);
            }

            // Convert to JSON for processing
            this._sheetData = XLSX.utils.sheet_to_json(this._currentSheet, {
                header: 1, // Use array of arrays format
                raw: false, // Keep as strings
                defval: '', // Default value for empty cells
                blankrows: true // Include blank rows
            });

            if (!this._sheetData || this._sheetData.length === 0) {
                throw new Error('Sheet appears to be empty');
            }

            // Filter out completely empty rows at the end
            while (this._sheetData.length > 0) {
                const lastRow = this._sheetData[this._sheetData.length - 1];
                const hasData = lastRow && lastRow.some(cell => cell && cell.toString().trim() !== '');
                if (hasData) break;
                this._sheetData.pop();
            }

            // Show sheet preview
            this._showSheetPreview();

            // Show range selection step
            window.QRScannerUtils.dom.show(window.QRScannerConfig.ELEMENTS.STEP_3);
            
            // Trigger range selector to create table
            this._initializeRangeSelector();
            
            // Scroll to next step
            this._scrollToElement(window.QRScannerConfig.ELEMENTS.STEP_3);

            this._setStatus('ready', 'Sheet loaded successfully');
            window.QRScannerUtils.log.debug('Sheet selected:', sheetName, 'Rows:', this._sheetData.length);

        } catch (error) {
            this._setStatus('error', 'Error loading sheet');
            window.QRScannerUtils.log.error('Sheet selection error:', error);
            alert('Error loading sheet: ' + error.message);
        }
    },

    /**
     * Initialize range selector with current sheet data
     */
    _initializeRangeSelector() {
        // Clear any existing range selection
        this._selectedRange = null;
        
        // Ensure range selector is ready and trigger table creation
        if (window.QRScannerRangeSelector) {
            // Use a timeout to ensure DOM is ready
            setTimeout(() => {
                window.QRScannerRangeSelector.showRangeSelector();
            }, 150);
        } else {
            window.QRScannerUtils.log.error('Range selector not available');
        }
    },

    /**
     * Scroll to element smoothly
     */
    _scrollToElement(elementId) {
        setTimeout(() => {
            const element = window.QRScannerUtils.dom.get(elementId);
            if (element) {
                element.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start',
                    inline: 'nearest'
                });
            }
        }, 100);
    },

    /**
     * Show sheet preview
     */
    _showSheetPreview() {
        const maxPreviewRows = window.QRScannerConfig.EXCEL.MAX_PREVIEW_ROWS;
        const previewData = this._sheetData.slice(0, maxPreviewRows);
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
        table.className = 'table-compact preview-table';
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize = '12px';

        // Add table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.style.backgroundColor = '#f8f9fa';

        // Row number header
        const rowHeader = document.createElement('th');
        rowHeader.textContent = '#';
        rowHeader.style.cssText = `
            padding: 6px 8px;
            border: 1px solid #dee2e6;
            font-weight: bold;
            text-align: center;
            background: #e9ecef;
            min-width: 40px;
        `;
        headerRow.appendChild(rowHeader);

        // Column headers
        const maxCols = Math.max(...data.map(r => r ? r.length : 0));
        for (let i = 0; i < maxCols; i++) {
            const th = document.createElement('th');
            th.textContent = window.QRScannerUtils.excel.numToCol(i + 1);
            th.style.cssText = `
                padding: 6px 8px;
                border: 1px solid #dee2e6;
                font-weight: bold;
                text-align: center;
                background: #f8f9fa;
                min-width: 80px;
                max-width: 120px;
            `;
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Add table body
        const tbody = document.createElement('tbody');
        data.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');
            
            // Alternate row colors
            if (rowIndex % 2 === 1) {
                tr.style.backgroundColor = '#f8f9fa';
            }

            // Add row number cell
            const rowNumCell = document.createElement('td');
            rowNumCell.textContent = rowIndex + 1;
            rowNumCell.style.cssText = `
                padding: 6px 8px;
                border: 1px solid #dee2e6;
                font-weight: bold;
                text-align: center;
                background: #f8f9fa;
            `;
            tr.appendChild(rowNumCell);

            // Add data columns
            for (let colIndex = 0; colIndex < maxCols; colIndex++) {
                const td = document.createElement('td');
                const cellValue = (row && row[colIndex]) ? String(row[colIndex]) : '';
                const displayValue = window.QRScannerUtils.string.truncate(cellValue, 25);
                
                td.textContent = displayValue;
                td.title = cellValue; // Full value on hover
                td.style.cssText = `
                    padding: 6px 8px;
                    border: 1px solid #dee2e6;
                    max-width: 120px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                `;

                // Highlight header row
                if (rowIndex === 0) {
                    td.style.fontWeight = 'bold';
                    td.style.backgroundColor = '#e3f2fd';
                }

                tr.appendChild(td);
            }

            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

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
        if (!this._sheetData || !range) return [];

        try {
            const result = [];
            for (let row = range.startRow - 1; row < Math.min(range.endRow, this._sheetData.length); row++) {
                if (this._sheetData[row]) {
                    const rowData = [];
                    const currentRow = this._sheetData[row] || [];
                    for (let col = range.startCol - 1; col < range.endCol; col++) {
                        const cellValue = currentRow[col] || '';
                        rowData.push(cellValue);
                    }
                    result.push(rowData);
                } else {
                    // Add empty row if row doesn't exist in data
                    const emptyRow = new Array(range.endCol - range.startCol).fill('');
                    result.push(emptyRow);
                }
            }
            return result;
        } catch (error) {
            window.QRScannerUtils.log.error('Error getting range data:', error);
            return [];
        }
    },

    /**
     * Set selected range
     * @param {Object} range - Range object
     */
    setSelectedRange(range) {
        this._selectedRange = range;
        
        if (range) {
            window.QRScannerUtils.log.debug('Range set:', range);
        }
    },

    /**
     * Get selected range
     * @returns {Object} - Range object
     */
    getSelectedRange() {
        return this._selectedRange;
    },

    /**
     * Get sheet statistics
     * @returns {Object} - Sheet stats
     */
    getSheetStats() {
        if (!this._sheetData) return null;
        
        const nonEmptyRows = this._sheetData.filter(row => 
            row && row.some(cell => cell && cell.toString().trim() !== '')
        ).length;
        
        const maxCols = Math.max(...this._sheetData.map(r => r ? r.length : 0));
        
        return {
            totalRows: this._sheetData.length,
            nonEmptyRows,
            maxColumns: maxCols,
            hasHeaders: this._detectHeaders()
        };
    },

    /**
     * Detect if first row contains headers
     */
    _detectHeaders() {
        if (!this._sheetData || this._sheetData.length < 2) return false;
        
        const firstRow = this._sheetData[0] || [];
        const secondRow = this._sheetData[1] || [];
        
        // Check if first row has more text values compared to second row
        const firstRowTextCount = firstRow.filter(cell => 
            cell && isNaN(parseFloat(cell))
        ).length;
        
        const secondRowTextCount = secondRow.filter(cell => 
            cell && isNaN(parseFloat(cell))
        ).length;
        
        return firstRowTextCount > secondRowTextCount;
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

            // Add some styling to the worksheet
            if (data.length > 0) {
                // Style header row
                const headerRange = XLSX.utils.decode_range(ws['!ref']);
                for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
                    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
                    if (ws[cellRef]) {
                        ws[cellRef].s = {
                            font: { bold: true },
                            fill: { fgColor: { rgb: "FFFFAA00" } }
                        };
                    }
                }
            }

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Scan Results');

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substr(0, 16);
            const finalFilename = filename.replace('.xlsx', `_${timestamp}.xlsx`);

            // Save file
            XLSX.writeFile(wb, finalFilename);

            window.QRScannerUtils.log.info('Data exported to:', finalFilename);
            return finalFilename;

        } catch (error) {
            window.QRScannerUtils.log.error('Export error:', error);
            throw error;
        }
    },

    /**
     * Reset Excel handler state
     */
    reset() {
        this._workbook = null;
        this._currentSheet = null;
        this._sheetData = null;
        this._selectedRange = null;
        this._isProcessing = false;
        
        // Reset UI
        const fileInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.EXCEL_FILE);
        if (fileInput) {
            fileInput.value = '';
        }
        
        const sheetSelect = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SHEET_SELECT);
        if (sheetSelect) {
            sheetSelect.value = '';
        }
        
        // Hide progress and info
        this._hideLoadingProgress();
        window.QRScannerUtils.dom.hide(window.QRScannerConfig.ELEMENTS.FILE_INFO);
        window.QRScannerUtils.dom.hide(window.QRScannerConfig.ELEMENTS.SHEET_PREVIEW);
        
        window.QRScannerUtils.log.debug('Excel handler reset');
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
    },

    /**
     * Get current state
     */
    getState() {
        return {
            hasWorkbook: !!this._workbook,
            currentSheet: this._currentSheet ? Object.keys(this._workbook.Sheets).find(name => this._workbook.Sheets[name] === this._currentSheet) : null,
            hasSheetData: !!this._sheetData,
            sheetRowCount: this._sheetData ? this._sheetData.length : 0,
            hasSelectedRange: !!this._selectedRange,
            selectedRange: this._selectedRange,
            isProcessing: this._isProcessing
        };
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