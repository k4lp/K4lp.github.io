/**
 * QR Code Component Scanner - Data Manager
 * Alica Technologies
 */

window.QRScannerDataManager = {
    // Internal state
    _bomData: null,
    _columnMapping: null,
    _scanResults: [],
    _stats: {
        totalScanned: 0,
        successfulMatches: 0,
        duplicateScans: 0,
        startTime: null
    },

    /**
     * Initialize data manager
     */
    init() {
        this._bindEvents();
        this._resetStats();
        window.QRScannerUtils.log.debug('Data manager initialized');
    },

    /**
     * Bind event listeners
     */
    _bindEvents() {
        const confirmMappingBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.CONFIRM_MAPPING);
        const backToRangeBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.BACK_TO_RANGE);
        const exportBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.EXPORT_RESULTS);
        const clearBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.CLEAR_RESULTS);
        const resetBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.RESET_SCANNER);

        if (confirmMappingBtn) confirmMappingBtn.addEventListener('click', this._handleConfirmMapping.bind(this));
        if (backToRangeBtn) backToRangeBtn.addEventListener('click', this._handleBackToRange.bind(this));
        if (exportBtn) exportBtn.addEventListener('click', this._handleExportResults.bind(this));
        if (clearBtn) clearBtn.addEventListener('click', this._handleClearResults.bind(this));
        if (resetBtn) resetBtn.addEventListener('click', this._handleResetScanner.bind(this));
    },

    /**
     * Initialize column mapping interface
     * @param {Array} rangeData - Selected range data
     */
    initializeColumnMapping(rangeData) {
        if (!rangeData || rangeData.length === 0) {
            window.QRScannerUtils.log.error('No range data provided for column mapping');
            return;
        }

        // Store BOM data
        this._bomData = rangeData;

        // Get header row (first row)
        const headers = rangeData[0] || [];

        // Populate column selectors
        this._populateColumnSelectors(headers);

        // Auto-detect columns if possible
        this._autoDetectColumns(headers);

        window.QRScannerUtils.log.debug('Column mapping initialized with', headers.length, 'columns');
    },

    /**
     * Populate column selector dropdowns
     * @param {Array} headers - Header row data
     */
    _populateColumnSelectors(headers) {
        const selectors = [
            window.QRScannerConfig.ELEMENTS.SERIAL_COLUMN,
            window.QRScannerConfig.ELEMENTS.MPN_COLUMN,
            window.QRScannerConfig.ELEMENTS.DESIGNATORS_COLUMN,
            window.QRScannerConfig.ELEMENTS.MANUFACTURER_COLUMN,
            window.QRScannerConfig.ELEMENTS.QUANTITY_COLUMN,
            window.QRScannerConfig.ELEMENTS.TARGET_COLUMN
        ];

        selectors.forEach(selectorId => {
            const select = window.QRScannerUtils.dom.get(selectorId);
            if (!select) return;

            // Clear existing options
            select.innerHTML = '<option value="">Select column...</option>';

            // Add column options
            headers.forEach((header, index) => {
                const option = document.createElement('option');
                option.value = index;
                const displayName = window.QRScannerUtils.string.truncate(header || `Column ${index + 1}`, 50);
                option.textContent = `${window.QRScannerUtils.excel.numToCol(index + 1)}: ${displayName}`;
                select.appendChild(option);
            });

            // Add change event listener
            select.addEventListener('change', this._validateMapping.bind(this));
        });
    },

    /**
     * Auto-detect column mappings based on header names
     * @param {Array} headers - Header row data
     */
    _autoDetectColumns(headers) {
        const detectionMap = {
            serial: ['serial', 'ser', 'sn', 's/n', 'serial number', 'serial no', 'item'],
            mpn: ['mpn', 'part number', 'part no', 'partnumber', 'partno', 'manufacturer part number'],
            designators: ['designator', 'designators', 'ref', 'reference', 'references', 'refdes'],
            manufacturer: ['manufacturer', 'mfr', 'mfg', 'vendor', 'brand', 'make'],
            quantity: ['quantity', 'qty', 'q', 'count', 'amount', 'total'],
            target: ['mpn', 'part number', 'serial', 'barcode', 'qr', 'code', 'id']
        };

        // Try to match headers to columns
        Object.entries(detectionMap).forEach(([columnType, keywords]) => {
            const matchedIndex = this._findBestMatch(headers, keywords);
            if (matchedIndex !== -1) {
                const elementId = this._getColumnElementId(columnType);
                const select = window.QRScannerUtils.dom.get(elementId);
                if (select) {
                    select.value = matchedIndex;
                    window.QRScannerUtils.log.debug(`Auto-detected ${columnType} column:`, headers[matchedIndex]);
                }
            }
        });

        // Validate after auto-detection
        this._validateMapping();
    },

    /**
     * Find best matching column index for keywords
     * @param {Array} headers - Header row data
     * @param {Array} keywords - Keywords to match
     * @returns {number} - Best match index or -1
     */
    _findBestMatch(headers, keywords) {
        let bestMatch = -1;
        let bestScore = 0;

        headers.forEach((header, index) => {
            if (!header) return;

            const headerLower = header.toLowerCase().trim();
            keywords.forEach(keyword => {
                const keywordLower = keyword.toLowerCase();

                // Exact match gets highest score
                if (headerLower === keywordLower) {
                    if (10 > bestScore) {
                        bestScore = 10;
                        bestMatch = index;
                    }
                }
                // Partial match gets lower score
                else if (headerLower.includes(keywordLower)) {
                    const score = keywordLower.length / headerLower.length;
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = index;
                    }
                }
            });
        });

        return bestMatch;
    },

    /**
     * Get element ID for column type
     * @param {string} columnType - Column type
     * @returns {string} - Element ID
     */
    _getColumnElementId(columnType) {
        const mapping = {
            serial: window.QRScannerConfig.ELEMENTS.SERIAL_COLUMN,
            mpn: window.QRScannerConfig.ELEMENTS.MPN_COLUMN,
            designators: window.QRScannerConfig.ELEMENTS.DESIGNATORS_COLUMN,
            manufacturer: window.QRScannerConfig.ELEMENTS.MANUFACTURER_COLUMN,
            quantity: window.QRScannerConfig.ELEMENTS.QUANTITY_COLUMN,
            target: window.QRScannerConfig.ELEMENTS.TARGET_COLUMN
        };
        return mapping[columnType];
    },

    /**
     * Validate column mapping selections
     */
    _validateMapping() {
        const targetColumn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.TARGET_COLUMN).value;
        const confirmBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.CONFIRM_MAPPING);

        // At minimum, target column must be selected
        const isValid = targetColumn !== '';

        window.QRScannerUtils.dom.setEnabled(confirmBtn, isValid);

        if (!isValid) {
            window.QRScannerUtils.log.debug('Column mapping validation failed: no target column selected');
        }

        return isValid;
    },

    /**
     * Handle confirm mapping button
     */
    _handleConfirmMapping() {
        if (!this._validateMapping()) {
            alert(window.QRScannerConfig.MESSAGES.INVALID_COLUMN_MAPPING);
            return;
        }

        // Store column mapping
        this._columnMapping = {
            serial: parseInt(window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SERIAL_COLUMN).value) || null,
            mpn: parseInt(window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.MPN_COLUMN).value) || null,
            designators: parseInt(window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.DESIGNATORS_COLUMN).value) || null,
            manufacturer: parseInt(window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.MANUFACTURER_COLUMN).value) || null,
            quantity: parseInt(window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.QUANTITY_COLUMN).value) || null,
            target: parseInt(window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.TARGET_COLUMN).value)
        };

        // Initialize scanner interface
        this._initializeScannerInterface();

        // Show scanner step
        window.QRScannerUtils.dom.show(window.QRScannerConfig.ELEMENTS.STEP_5);

        // Initialize range selector for scanner view
        window.QRScannerRangeSelector.createSelectableTable();

        window.QRScannerUtils.log.info('Column mapping confirmed, scanner ready');
    },

    /**
     * Handle back to range button
     */
    _handleBackToRange() {
        window.QRScannerUtils.dom.hide(window.QRScannerConfig.ELEMENTS.STEP_4);
        window.QRScannerUtils.log.debug('Returned to range selection');
    },

    /**
     * Initialize scanner interface
     */
    _initializeScannerInterface() {
        // Reset stats
        this._resetStats();

        // Enable export button initially disabled
        window.QRScannerUtils.dom.setEnabled(window.QRScannerConfig.ELEMENTS.EXPORT_RESULTS, false);

        // Clear results display
        this._updateResultsDisplay();
    },

    /**
     * Process scanned value against BOM data
     * @param {string} scannedValue - The scanned value
     * @param {Object} scanResult - Complete scan result
     * @returns {Object} - Match result
     */
    processScannedValue(scannedValue, scanResult) {
        const trimmedValue = scannedValue.trim();

        // Update stats
        this._stats.totalScanned++;
        if (!this._stats.startTime) {
            this._stats.startTime = Date.now();
        }

        // Search for match in BOM data
        const matchResult = this._findMatch(trimmedValue);

        // Create scan record
        const scanRecord = {
            id: Date.now() + Math.random(), // Unique ID
            scannedValue: trimmedValue,
            timestamp: Date.now(),
            scanIndex: this._stats.totalScanned,
            matchResult: matchResult,
            scanDetails: {
                format: scanResult?.result?.format || 'Unknown',
                bounds: scanResult?.result?.bounds || null
            }
        };

        // Store scan result
        this._scanResults.push(scanRecord);

        // Update results display
        this._updateResultsDisplay();

        // Enable export if we have results
        if (this._scanResults.length > 0) {
            window.QRScannerUtils.dom.setEnabled(window.QRScannerConfig.ELEMENTS.EXPORT_RESULTS, true);
        }

        return matchResult;
    },

    /**
     * Find match in BOM data
     * @param {string} value - Value to search for
     * @returns {Object} - Match result
     */
    _findMatch(value) {
        if (!this._bomData || !this._columnMapping || this._columnMapping.target === null) {
            return {
                success: false,
                scannedValue: value,
                timestamp: Date.now(),
                reason: 'No BOM data or column mapping'
            };
        }

        const targetColumnIndex = this._columnMapping.target;

        // Search through data rows (skip header)
        for (let rowIndex = 1; rowIndex < this._bomData.length; rowIndex++) {
            const row = this._bomData[rowIndex];
            if (!row || row.length <= targetColumnIndex) continue;

            const cellValue = String(row[targetColumnIndex] || '').trim();

            // Check for exact match (case-insensitive)
            if (cellValue.toLowerCase() === value.toLowerCase()) {
                this._stats.successfulMatches++;

                return {
                    success: true,
                    scannedValue: value,
                    matchedValue: cellValue,
                    rowIndex: rowIndex,
                    rowData: row,
                    serialNo: this._getColumnValue(row, 'serial'),
                    mpn: this._getColumnValue(row, 'mpn'),
                    designators: this._getColumnValue(row, 'designators'),
                    manufacturer: this._getColumnValue(row, 'manufacturer'),
                    quantity: this._getColumnValue(row, 'quantity'),
                    timestamp: Date.now()
                };
            }
        }

        // No match found
        return {
            success: false,
            scannedValue: value,
            timestamp: Date.now(),
            reason: 'No matching value found in target column'
        };
    },

    /**
     * Get value from row based on column mapping
     * @param {Array} row - Data row
     * @param {string} columnType - Column type
     * @returns {string} - Column value
     */
    _getColumnValue(row, columnType) {
        const columnIndex = this._columnMapping[columnType];
        if (columnIndex === null || columnIndex >= row.length) {
            return '';
        }
        return String(row[columnIndex] || '').trim();
    },

    /**
     * Update results display
     */
    _updateResultsDisplay() {
        const container = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SCAN_RESULTS);
        if (!container) return;

        if (this._scanResults.length === 0) {
            container.innerHTML = '<div class="empty">No scan results to display</div>';
            return;
        }

        // Create results table
        const table = this._createResultsTable();
        container.innerHTML = '';
        container.appendChild(table);
    },

    /**
     * Create results table
     * @returns {HTMLElement} - Results table
     */
    _createResultsTable() {
        const table = document.createElement('table');
        table.className = 'table-hover';

        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        const headers = [
            'Scan #', 'Time', 'Scanned Value', 'Status', 'Serial No.', 
            'MPN', 'Manufacturer', 'Row #', 'Format'
        ];

        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create body
        const tbody = document.createElement('tbody');

        // Sort results by scan index (newest first)
        const sortedResults = [...this._scanResults].sort((a, b) => b.scanIndex - a.scanIndex);

        sortedResults.forEach(result => {
            const row = document.createElement('tr');

            // Status-based styling
            if (result.matchResult.success) {
                row.classList.add('row-highlight');
            }

            // Scan index
            const scanCell = document.createElement('td');
            scanCell.textContent = result.scanIndex;
            scanCell.className = 'cell-center mono';
            row.appendChild(scanCell);

            // Timestamp
            const timeCell = document.createElement('td');
            timeCell.textContent = new Date(result.timestamp).toLocaleTimeString();
            timeCell.className = 'mono';
            row.appendChild(timeCell);

            // Scanned value
            const valueCell = document.createElement('td');
            valueCell.textContent = window.QRScannerUtils.string.truncate(result.scannedValue, 30);
            valueCell.title = result.scannedValue;
            valueCell.className = 'mono';
            row.appendChild(valueCell);

            // Status
            const statusCell = document.createElement('td');
            if (result.matchResult.success) {
                statusCell.innerHTML = '<span class="text-success">✓ Match</span>';
            } else {
                statusCell.innerHTML = '<span class="text-error">✗ No Match</span>';
            }
            row.appendChild(statusCell);

            // Serial No.
            const serialCell = document.createElement('td');
            serialCell.textContent = result.matchResult.serialNo || '—';
            row.appendChild(serialCell);

            // MPN
            const mpnCell = document.createElement('td');
            mpnCell.textContent = result.matchResult.mpn || '—';
            row.appendChild(mpnCell);

            // Manufacturer
            const mfrCell = document.createElement('td');
            mfrCell.textContent = result.matchResult.manufacturer || '—';
            row.appendChild(mfrCell);

            // Row number
            const rowCell = document.createElement('td');
            rowCell.textContent = result.matchResult.success ? (result.matchResult.rowIndex + 1) : '—';
            rowCell.className = 'cell-center';
            row.appendChild(rowCell);

            // Format
            const formatCell = document.createElement('td');
            formatCell.textContent = result.scanDetails.format;
            formatCell.className = 'mono';
            row.appendChild(formatCell);

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        return table;
    },

    /**
     * Handle export results button
     */
    _handleExportResults() {
        if (this._scanResults.length === 0) {
            alert('No results to export');
            return;
        }

        try {
            const exportData = this._prepareExportData();
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `QR_Scanner_Results_${timestamp}.xlsx`;

            window.QRScannerExcelHandler.exportToExcel(exportData, filename);

            window.QRScannerUtils.log.info('Results exported successfully');
            alert(window.QRScannerConfig.MESSAGES.EXPORT_SUCCESS);

        } catch (error) {
            window.QRScannerUtils.log.error('Export failed:', error);
            alert('Failed to export results: ' + error.message);
        }
    },

    /**
     * Prepare data for export
     * @returns {Array} - Export data array
     */
    _prepareExportData() {
        // Export headers
        const headers = [
            'Scan Index', 'Scan Time', 'Scanned Value', 'Match Status', 
            'Matched Row', 'Serial No.', 'MPN', 'Designators', 
            'Manufacturer', 'Quantity', 'Scan Format'
        ];

        const exportData = [headers];

        // Sort by scan index
        const sortedResults = [...this._scanResults].sort((a, b) => a.scanIndex - b.scanIndex);

        // Export data rows
        sortedResults.forEach(result => {
            const row = [
                result.scanIndex,
                new Date(result.timestamp).toLocaleString(),
                result.scannedValue,
                result.matchResult.success ? 'Match Found' : 'No Match',
                result.matchResult.success ? result.matchResult.rowIndex + 1 : '',
                result.matchResult.serialNo || '',
                result.matchResult.mpn || '',
                result.matchResult.designators || '',
                result.matchResult.manufacturer || '',
                result.matchResult.quantity || '',
                result.scanDetails.format
            ];
            exportData.push(row);
        });

        // Add summary section
        exportData.push([]);
        exportData.push(['SUMMARY']);
        exportData.push(['Total Scanned', this._stats.totalScanned]);
        exportData.push(['Successful Matches', this._stats.successfulMatches]);
        exportData.push(['Match Rate', `${((this._stats.successfulMatches / this._stats.totalScanned) * 100).toFixed(1)}%`]);

        if (this._stats.startTime) {
            const duration = (Date.now() - this._stats.startTime) / 60000;
            exportData.push(['Session Duration', `${duration.toFixed(1)} minutes`]);
        }

        return exportData;
    },

    /**
     * Handle clear results button
     */
    _handleClearResults() {
        if (this._scanResults.length === 0) {
            alert('No results to clear');
            return;
        }

        if (confirm('Clear all scan results? This action cannot be undone.')) {
            this._scanResults = [];
            this._resetStats();
            this._updateResultsDisplay();

            // Clear current match display
            const currentMatch = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.CURRENT_MATCH);
            if (currentMatch) {
                currentMatch.innerHTML = '<div class="empty">No scan results yet</div>';
            }

            // Disable export button
            window.QRScannerUtils.dom.setEnabled(window.QRScannerConfig.ELEMENTS.EXPORT_RESULTS, false);

            window.QRScannerUtils.log.info('Scan results cleared');
        }
    },

    /**
     * Handle reset scanner button
     */
    _handleResetScanner() {
        if (confirm('Reset the entire scanner? This will clear all data and return to the file selection step.')) {
            // Stop scanner if running
            if (window.QRScannerManager.getState().isScanning) {
                window.QRScannerManager._handleStopCamera();
            }

            // Reset all data
            this._bomData = null;
            this._columnMapping = null;
            this._scanResults = [];
            this._resetStats();

            // Hide all steps except first
            window.QRScannerUtils.dom.hide(window.QRScannerConfig.ELEMENTS.STEP_2);
            window.QRScannerUtils.dom.hide(window.QRScannerConfig.ELEMENTS.STEP_3);
            window.QRScannerUtils.dom.hide(window.QRScannerConfig.ELEMENTS.STEP_4);
            window.QRScannerUtils.dom.hide(window.QRScannerConfig.ELEMENTS.STEP_5);

            // Clear file input
            const fileInput = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.EXCEL_FILE);
            if (fileInput) fileInput.value = '';

            // Hide file info
            window.QRScannerUtils.dom.hide(window.QRScannerConfig.ELEMENTS.FILE_INFO);

            // Reset status
            const statusEl = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SCANNER_STATUS);
            if (statusEl) {
                statusEl.className = 'status-ready';
                statusEl.textContent = 'Ready';
            }

            window.QRScannerUtils.log.info('Scanner reset completed');
        }
    },

    /**
     * Reset statistics
     */
    _resetStats() {
        this._stats = {
            totalScanned: 0,
            successfulMatches: 0,
            duplicateScans: 0,
            startTime: null
        };

        // Update display
        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.TOTAL_SCANNED, 0);
        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.SUCCESS_MATCHES, 0);
        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.SCAN_COUNT, 0);
        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.MATCH_COUNT, 0);
        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.SCAN_RATE, '0.0/min');
    },

    /**
     * Get current statistics
     * @returns {Object} - Statistics object
     */
    getStats() {
        return { ...this._stats };
    },

    /**
     * Get scan results
     * @returns {Array} - Scan results array
     */
    getScanResults() {
        return [...this._scanResults];
    }
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.QRScannerDataManager.init();
    });
} else {
    window.QRScannerDataManager.init();
}
