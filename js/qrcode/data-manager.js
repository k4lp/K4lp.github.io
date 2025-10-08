/**
 * QR Code Component Scanner - Data Manager
 * Alica Technologies - BULLETPROOF VERSION with Enhanced Display
 * 
 * CRITICAL FIXES:
 * - BULLETPROOF scan results table display with multiple fallback methods
 * - Enhanced DOM element selection with comprehensive error handling
 * - FORCED table rendering with debug logging for troubleshooting
 * - Improved mobile responsiveness and error recovery
 * - GUARANTEED table display after every scan result
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
        // CRITICAL FIX: Force initial table setup
        this._ensureResultsContainer();
        window.QRScannerUtils.log.debug('Data manager initialized with enhanced display');
    },

    /**
     * CRITICAL FIX: Ensure results container exists and is properly set up
     */
    _ensureResultsContainer() {
        let container = this._findScanResultsContainer();
        
        if (!container) {
            console.error('CRITICAL: Creating scan results container as fallback');
            // Create container as absolute fallback
            const scannerSection = document.querySelector('.results-section');
            if (scannerSection) {
                const cardContainer = scannerSection.querySelector('.card:last-child');
                if (cardContainer) {
                    const cardBody = cardContainer.querySelector('div:last-child');
                    if (cardBody) {
                        const tableContainer = cardBody.querySelector('.table-container');
                        if (tableContainer) {
                            container = document.createElement('div');
                            container.id = 'scanResults';
                            container.className = 'empty';
                            container.innerHTML = 'NO SCAN RESULTS TO DISPLAY';
                            tableContainer.appendChild(container);
                            console.log('✅ Created fallback scan results container');
                        }
                    }
                }
            }
        }
        
        if (container) {
            console.log('✅ Scan results container verified:', container.id);
            // Force initial empty state display
            this._forceUpdateResultsDisplay();
        } else {
            console.error('❌ CRITICAL: Cannot find or create scan results container');
        }
    },

    /**
     * CRITICAL FIX: Multiple fallback methods to find scan results container
     */
    _findScanResultsContainer() {
        // Method 1: Standard utility
        let container = window.QRScannerUtils?.dom?.get(window.QRScannerConfig?.ELEMENTS?.SCAN_RESULTS);
        
        if (!container) {
            // Method 2: Direct getElementById
            container = document.getElementById('scanResults');
            console.warn('Using fallback method 2: getElementById');
        }
        
        if (!container) {
            // Method 3: querySelector
            container = document.querySelector('#scanResults');
            console.warn('Using fallback method 3: querySelector');
        }
        
        if (!container) {
            // Method 4: Find by class in table containers
            const tableContainers = document.querySelectorAll('.table-container');
            for (const tableContainer of tableContainers) {
                const candidate = tableContainer.querySelector('#scanResults, [id="scanResults"]');
                if (candidate) {
                    container = candidate;
                    console.warn('Using fallback method 4: found in table container');
                    break;
                }
            }
        }
        
        if (!container) {
            // Method 5: Find by text content
            const divs = document.querySelectorAll('div');
            for (const div of divs) {
                if (div.textContent.includes('NO SCAN RESULTS TO DISPLAY') || 
                    div.textContent.includes('No scan results to display')) {
                    container = div;
                    container.id = 'scanResults'; // Ensure it has the right ID
                    console.warn('Using fallback method 5: found by text content');
                    break;
                }
            }
        }
        
        return container;
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
            serial: ['serial', 'ser', 'sn', 's/n', 'serial number', 'serial no', 'item', 'id'],
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

        // Store column mapping - FIXED: Parse values as integers correctly
        this._columnMapping = {
            serial: this._parseColumnIndex(window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SERIAL_COLUMN).value),
            mpn: this._parseColumnIndex(window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.MPN_COLUMN).value),
            designators: this._parseColumnIndex(window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.DESIGNATORS_COLUMN).value),
            manufacturer: this._parseColumnIndex(window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.MANUFACTURER_COLUMN).value),
            quantity: this._parseColumnIndex(window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.QUANTITY_COLUMN).value),
            target: this._parseColumnIndex(window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.TARGET_COLUMN).value)
        };

        // Debug: Log the column mapping for troubleshooting
        window.QRScannerUtils.log.debug('Column mapping confirmed:', this._columnMapping);

        // Initialize scanner interface
        this._initializeScannerInterface();

        // Show scanner step
        window.QRScannerUtils.dom.show(window.QRScannerConfig.ELEMENTS.STEP_5);

        // Initialize range selector for scanner view
        window.QRScannerRangeSelector.createSelectableTable();

        window.QRScannerUtils.log.info('Column mapping confirmed, scanner ready');
    },

    /**
     * Parse column index value - FIXED: Better validation
     * @param {string} value - Column selector value
     * @returns {number|null} - Parsed index or null
     */
    _parseColumnIndex(value) {
        if (!value || value === '') return null;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? null : parsed;
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

        // CRITICAL FIX: Force initial results display setup
        this._forceUpdateResultsDisplay();
    },

    /**
     * CRITICAL FIX: Process scanned value with GUARANTEED table update
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

        console.log(`🔍 Processing scan #${this._stats.totalScanned}: "${trimmedValue}"`);

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
        console.log(`📋 Stored scan result #${this._stats.totalScanned}, Total results: ${this._scanResults.length}`);

        // CRITICAL FIX: FORCE table update with multiple attempts
        this._forceUpdateResultsDisplay();
        
        // CRITICAL FIX: Additional forced update after short delay
        setTimeout(() => {
            this._forceUpdateResultsDisplay();
            console.log(`🔄 Secondary table update completed for scan #${this._stats.totalScanned}`);
        }, 100);

        // Enable export if we have results
        if (this._scanResults.length > 0) {
            window.QRScannerUtils.dom.setEnabled(window.QRScannerConfig.ELEMENTS.EXPORT_RESULTS, true);
        }

        return matchResult;
    },

    /**
     * Find match in BOM data - FIXED: Better error handling and debugging
     * @param {string} value - Value to search for
     * @returns {Object} - Match result
     */
    _findMatch(value) {
        if (!this._bomData || !this._columnMapping || this._columnMapping.target === null) {
            return {
                success: false,
                scannedValue: value,
                timestamp: Date.now(),
                reason: 'No BOM data or column mapping',
                debugInfo: {
                    hasBomData: !!this._bomData,
                    hasColumnMapping: !!this._columnMapping,
                    targetColumn: this._columnMapping?.target
                }
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

                const result = {
                    success: true,
                    scannedValue: value,
                    matchedValue: cellValue,
                    rowIndex: rowIndex,
                    rowData: row,
                    serialNo: this._getColumnValueSafe(row, 'serial'),
                    mpn: this._getColumnValueSafe(row, 'mpn'),
                    designators: this._getColumnValueSafe(row, 'designators'),
                    manufacturer: this._getColumnValueSafe(row, 'manufacturer'),
                    quantity: this._getColumnValueSafe(row, 'quantity'),
                    timestamp: Date.now(),
                    // Debug info for troubleshooting
                    debugInfo: {
                        targetColumnIndex,
                        rowLength: row.length,
                        columnMapping: { ...this._columnMapping },
                        allRowData: [...row]
                    }
                };

                window.QRScannerUtils.log.debug('Match found:', result);
                return result;
            }
        }

        // No match found
        return {
            success: false,
            scannedValue: value,
            timestamp: Date.now(),
            reason: 'No matching value found in target column',
            debugInfo: {
                targetColumnIndex,
                totalRows: this._bomData.length,
                searchedRows: this._bomData.length - 1
            }
        };
    },

    /**
     * Get value from row based on column mapping - FIXED: Better validation and error handling
     * @param {Array} row - Data row
     * @param {string} columnType - Column type
     * @returns {string} - Column value
     */
    _getColumnValueSafe(row, columnType) {
        if (!this._columnMapping || !row) {
            window.QRScannerUtils.log.warn(`Missing column mapping or row data for ${columnType}`);
            return '';
        }

        const columnIndex = this._columnMapping[columnType];
        
        // Check if column is mapped
        if (columnIndex === null || columnIndex === undefined) {
            window.QRScannerUtils.log.debug(`Column ${columnType} not mapped`);
            return '';
        }

        // Check if row has enough columns
        if (columnIndex >= row.length) {
            window.QRScannerUtils.log.warn(`Column index ${columnIndex} (${columnType}) exceeds row length ${row.length}`);
            return '';
        }

        const value = String(row[columnIndex] || '').trim();
        window.QRScannerUtils.log.debug(`Column ${columnType} (index ${columnIndex}): ${value}`);
        return value;
    },

    /**
     * CRITICAL FIX: BULLETPROOF forced results display update
     */
    _forceUpdateResultsDisplay() {
        console.log('🔄 FORCE UPDATE: Starting bulletproof results display update...');
        
        try {
            // CRITICAL FIX: Find container with all available methods
            let container = this._findScanResultsContainer();
            
            if (!container) {
                console.error('❌ CRITICAL: Cannot find scan results container - creating emergency fallback');
                this._createEmergencyResultsContainer();
                container = this._findScanResultsContainer();
            }
            
            if (!container) {
                console.error('❌ FATAL: Cannot create or find results container');
                return;
            }

            console.log(`✅ Container found: ${container.id}, Results count: ${this._scanResults.length}`);

            // CRITICAL FIX: Clear existing content and update
            if (this._scanResults.length === 0) {
                container.innerHTML = '<div class="empty">No scan results to display</div>';
                container.className = 'empty';
                console.log('📋 Showing empty results state');
                return;
            }

            // CRITICAL FIX: Create and insert table with verification
            const table = this._createBulletproofResultsTable();
            if (!table) {
                console.error('❌ Table creation failed');
                container.innerHTML = '<div class="alert alert--error">Error creating results table</div>';
                return;
            }

            // CRITICAL FIX: Clear and append with extensive verification
            container.innerHTML = '';
            container.className = ''; // Remove empty class
            container.appendChild(table);
            
            // CRITICAL FIX: Verify table was inserted
            const verifyTable = container.querySelector('.results-table');
            if (!verifyTable) {
                console.error('❌ Table verification failed - table not in DOM');
                // Emergency fallback: Try innerHTML method
                container.innerHTML = table.outerHTML;
                
                // Re-verify
                const retryVerify = container.querySelector('.results-table');
                if (!retryVerify) {
                    console.error('❌ Emergency fallback also failed');
                    container.innerHTML = '<div class="alert alert--error">Table rendering failed</div>';
                    return;
                }
            }
            
            console.log(`✅ BULLETPROOF UPDATE SUCCESS: Table with ${this._scanResults.length} rows displayed`);
            
            // CRITICAL FIX: Force DOM repaint
            container.style.display = 'none';
            container.offsetHeight; // Trigger reflow
            container.style.display = '';
            
        } catch (error) {
            console.error('❌ CRITICAL ERROR in force update:', error);
            const container = this._findScanResultsContainer();
            if (container) {
                container.innerHTML = `<div class="alert alert--error">Display Error: ${error.message}</div>`;
            }
        }
    },

    /**
     * CRITICAL FIX: Create emergency results container if none exists
     */
    _createEmergencyResultsContainer() {
        console.log('🚨 EMERGENCY: Creating results container');
        
        // Find the most likely parent container
        const candidates = [
            document.querySelector('.results-section .card:last-child .table-container'),
            document.querySelector('.card .table-container'),
            document.querySelector('.table-container'),
            document.querySelector('.results-section'),
            document.querySelector('.scanner-section'),
            document.getElementById('step5')
        ];
        
        for (const candidate of candidates) {
            if (candidate) {
                const container = document.createElement('div');
                container.id = 'scanResults';
                container.className = 'empty';
                container.innerHTML = 'NO SCAN RESULTS TO DISPLAY';
                candidate.appendChild(container);
                console.log('✅ Emergency container created in:', candidate.className || candidate.tagName);
                return;
            }
        }
        
        console.error('❌ Emergency container creation failed - no suitable parent found');
    },

    /**
     * CRITICAL FIX: BULLETPROOF create results table with extensive error handling
     * @returns {HTMLElement|null} - Results table or null on error
     */
    _createBulletproofResultsTable() {
        try {
            console.log('🔨 Creating bulletproof results table...');
            
            const table = document.createElement('table');
            table.className = 'results-table';
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';

            // Create header with error handling
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');

            const headers = [
                'Scan #', 'Time', 'Scanned Value', 'Status', 'Serial No.', 
                'MPN', 'Manufacturer', 'Row #', 'Format'
            ];

            headers.forEach(header => {
                try {
                    const th = document.createElement('th');
                    th.textContent = header;
                    th.style.padding = '8px 12px';
                    th.style.borderBottom = '2px solid #000';
                    th.style.textAlign = 'left';
                    th.style.fontSize = '10px';
                    th.style.textTransform = 'uppercase';
                    th.style.backgroundColor = '#f5f5f5';
                    headerRow.appendChild(th);
                } catch (headerError) {
                    console.warn('Header creation error:', headerError);
                }
            });

            thead.appendChild(headerRow);
            table.appendChild(thead);

            // Create body with error handling
            const tbody = document.createElement('tbody');

            // Validate scan results data
            if (!Array.isArray(this._scanResults)) {
                console.error('Scan results is not an array');
                return null;
            }

            // Sort results by scan index (newest first)
            const sortedResults = [...this._scanResults].sort((a, b) => b.scanIndex - a.scanIndex);

            console.log(`📊 Creating ${sortedResults.length} table rows...`);
            
            sortedResults.forEach((result, index) => {
                try {
                    const row = this._createBulletproofResultRow(result, index);
                    if (row) {
                        tbody.appendChild(row);
                    }
                } catch (rowError) {
                    console.error('Error creating result row:', rowError);
                    // Create error row as fallback
                    const errorRow = document.createElement('tr');
                    const errorCell = document.createElement('td');
                    errorCell.colSpan = headers.length;
                    errorCell.textContent = `Error displaying row ${index + 1}`;
                    errorCell.style.color = '#ef4444';
                    errorCell.style.padding = '8px 12px';
                    errorRow.appendChild(errorCell);
                    tbody.appendChild(errorRow);
                }
            });

            table.appendChild(tbody);
            
            console.log(`✅ Bulletproof table created successfully with ${sortedResults.length} rows`);
            return table;
            
        } catch (error) {
            console.error('❌ CRITICAL: Bulletproof table creation failed:', error);
            
            // ULTIMATE FALLBACK: Create simple HTML table
            const fallbackDiv = document.createElement('div');
            fallbackDiv.innerHTML = `
                <table class="results-table" style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f5f5f5;">
                            <th style="padding:8px;border-bottom:2px solid #000;">Scan #</th>
                            <th style="padding:8px;border-bottom:2px solid #000;">Value</th>
                            <th style="padding:8px;border-bottom:2px solid #000;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this._scanResults.slice(-10).map((result, i) => `
                            <tr>
                                <td style="padding:8px;border-bottom:1px solid #e5e5e5;">${result.scanIndex}</td>
                                <td style="padding:8px;border-bottom:1px solid #e5e5e5;">${this._escapeHtml(result.scannedValue)}</td>
                                <td style="padding:8px;border-bottom:1px solid #e5e5e5;">
                                    <span style="color:${result.matchResult.success ? '#22c55e' : '#ef4444'}">
                                        ${result.matchResult.success ? 'Match' : 'No Match'}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
            console.log('🆘 Using ultimate fallback table');
            return fallbackDiv.firstElementChild;
        }
    },

    /**
     * CRITICAL FIX: Create bulletproof individual result row
     * @param {Object} result - Scan result object
     * @param {number} index - Row index
     * @returns {HTMLElement|null} - Table row or null on error
     */
    _createBulletproofResultRow(result, index) {
        try {
            const row = document.createElement('tr');

            // Validate result object
            if (!result || typeof result !== 'object') {
                console.warn('Invalid result object at index', index);
                return null;
            }

            // Status-based styling
            if (result.matchResult && result.matchResult.success) {
                row.style.borderLeft = '3px solid #22c55e';
                row.classList.add('row-success');
            } else {
                row.style.borderLeft = '3px solid #ef4444';
                row.classList.add('row-error');
            }

            // Create cells with error handling
            const cellData = [
                result.scanIndex || index + 1,
                new Date(result.timestamp || Date.now()).toLocaleTimeString(),
                this._truncateString(result.scannedValue || 'Unknown', 30),
                result.matchResult && result.matchResult.success ? 'Match' : 'No Match',
                (result.matchResult && result.matchResult.serialNo) || '—',
                (result.matchResult && result.matchResult.mpn) || '—',
                (result.matchResult && result.matchResult.manufacturer) || '—',
                (result.matchResult && result.matchResult.success) ? (result.matchResult.rowIndex + 1) : '—',
                (result.scanDetails && result.scanDetails.format) || 'Unknown'
            ];

            cellData.forEach((data, cellIndex) => {
                try {
                    const cell = document.createElement('td');
                    cell.textContent = String(data);
                    cell.style.padding = '8px 12px';
                    cell.style.borderBottom = '1px solid #e5e5e5';
                    cell.style.fontSize = '12px';
                    cell.style.wordBreak = 'break-word';
                    
                    // Special styling for status column
                    if (cellIndex === 3) {
                        cell.style.color = result.matchResult?.success ? '#22c55e' : '#ef4444';
                        cell.style.fontWeight = '600';
                    }
                    
                    row.appendChild(cell);
                } catch (cellError) {
                    console.warn('Error creating cell:', cellError);
                    // Create fallback cell
                    const fallbackCell = document.createElement('td');
                    fallbackCell.textContent = '—';
                    fallbackCell.style.padding = '8px 12px';
                    row.appendChild(fallbackCell);
                }
            });

            return row;
            
        } catch (error) {
            console.error('Error creating bulletproof result row:', error);
            return null;
        }
    },

    /**
     * Truncate string helper
     */
    _truncateString(str, maxLength) {
        if (!str || str.length <= maxLength) return str;
        return str.substring(0, maxLength - 3) + '...';
    },

    /**
     * Escape HTML characters
     */
    _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
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
            this._forceUpdateResultsDisplay();

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
                statusEl.className = 'badge badge--success';
                statusEl.textContent = 'READY';
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
    },

    /**
     * Get current column mapping - for debugging
     * @returns {Object} - Column mapping object
     */
    getColumnMapping() {
        return { ...this._columnMapping };
    },

    /**
     * CRITICAL FIX: Public method to force table update (for external calls)
     */
    updateResultsDisplay() {
        this._forceUpdateResultsDisplay();
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