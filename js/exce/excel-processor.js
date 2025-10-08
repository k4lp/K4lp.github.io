/**
 * Excel API Processor - Excel File Processing
 * Alica Technologies
 */

window.ExcelProcessorExcel = {
    // Internal state
    _workbook: null,
    _originalWorkbook: null,
    _currentSheet: null,
    _sheetData: null,
    _sourceColumns: {
        mpn: null,
        manufacturer: null,
        quantity: null
    },
    _outputColumns: [],
    _processedData: null,
    _isProcessing: false,

    /**
     * Initialize Excel processor
     */
    init() {
        this._bindEvents();
        window.ExcelProcessorUtils.log.info('Excel processor initialized');
    },

    /**
     * Bind event listeners
     */
    _bindEvents() {
        // File upload
        const fileInput = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.EXCEL_FILE);
        if (fileInput) {
            fileInput.addEventListener('change', this._handleFileSelect.bind(this));
        }

        // Sheet selection
        const sheetSelect = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.SHEET_SELECT);
        if (sheetSelect) {
            sheetSelect.addEventListener('change', this._handleSheetSelect.bind(this));
        }

        // Column mapping
        const addColumnBtn = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.ADD_OUTPUT_COLUMN);
        if (addColumnBtn) {
            addColumnBtn.addEventListener('click', this._addOutputColumn.bind(this));
        }

        const processBtn = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.PROCESS_DATA);
        if (processBtn) {
            processBtn.addEventListener('click', this._processData.bind(this));
        }

        const clearMappingBtn = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.CLEAR_MAPPING);
        if (clearMappingBtn) {
            clearMappingBtn.addEventListener('click', this._clearMapping.bind(this));
        }
    },

    /**
     * Handle file selection
     */
    async _handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file
        if (!this._validateFile(file)) {
            return;
        }

        if (this._isProcessing) {
            window.ExcelProcessorUtils.log.warn('File processing already in progress');
            return;
        }

        this._isProcessing = true;
        window.ExcelProcessorUtils.status.showProcessing(true);

        try {
            window.ExcelProcessorUtils.status.setSystemStatus('Loading file...');

            // Read file
            const data = await this._readFile(file);

            // Parse Excel
            this._workbook = XLSX.read(data, { type: 'binary' });
            this._originalWorkbook = XLSX.read(data, { type: 'binary' }); // Keep original for export

            if (!this._workbook || !this._workbook.SheetNames || this._workbook.SheetNames.length === 0) {
                throw new Error('No sheets found in Excel file');
            }

            // Show file info
            this._showFileInfo(file);

            // Populate sheet selector
            this._populateSheetSelector();

            window.ExcelProcessorUtils.dom.show(window.ExcelProcessorConfig.ELEMENTS.SHEET_SELECTION);
            window.ExcelProcessorUtils.status.setSystemStatus('File loaded');
            window.ExcelProcessorUtils.log.info('Excel file loaded successfully:', file.name);

        } catch (error) {
            window.ExcelProcessorUtils.log.error('File loading error:', error.message);
            alert('Error loading Excel file: ' + error.message);
            window.ExcelProcessorUtils.status.setSystemStatus('Error');
        } finally {
            this._isProcessing = false;
            window.ExcelProcessorUtils.status.showProcessing(false);
        }
    },

    /**
     * Validate file
     */
    _validateFile(file) {
        // Check file type
        if (!window.ExcelProcessorUtils.file.isTypeSupported(file.name, window.ExcelProcessorConfig.EXCEL.SUPPORTED_FORMATS)) {
            alert(window.ExcelProcessorConfig.MESSAGES.INVALID_FILE_TYPE);
            return false;
        }

        // Check file size
        if (!window.ExcelProcessorUtils.file.isValidSize(file.size, window.ExcelProcessorConfig.EXCEL.MAX_FILE_SIZE)) {
            alert(window.ExcelProcessorConfig.MESSAGES.FILE_TOO_LARGE);
            return false;
        }

        return true;
    },

    /**
     * Read file as binary string
     */
    _readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsBinaryString(file);
        });
    },

    /**
     * Show file information
     */
    _showFileInfo(file) {
        window.ExcelProcessorUtils.dom.setText(window.ExcelProcessorConfig.ELEMENTS.FILE_NAME, file.name);
        window.ExcelProcessorUtils.dom.setText(window.ExcelProcessorConfig.ELEMENTS.FILE_SIZE, window.ExcelProcessorUtils.file.formatSize(file.size));
        window.ExcelProcessorUtils.dom.setText(window.ExcelProcessorConfig.ELEMENTS.SHEET_COUNT, this._workbook.SheetNames.length);
        window.ExcelProcessorUtils.dom.show(window.ExcelProcessorConfig.ELEMENTS.FILE_INFO);
    },

    /**
     * Populate sheet selector
     */
    _populateSheetSelector() {
        const sheetSelect = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.SHEET_SELECT);
        
        // Clear existing options
        sheetSelect.innerHTML = '<option value="">Choose a sheet...</option>';

        // Add sheet options
        this._workbook.SheetNames.forEach((sheetName) => {
            const option = document.createElement('option');
            option.value = sheetName;
            
            // Get sheet info
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
            sheetSelect.dispatchEvent(new Event('change'));
        }
    },

    /**
     * Handle sheet selection
     */
    _handleSheetSelect(event) {
        const sheetName = event.target.value;
        if (!sheetName) {
            this._hideDownstreamSections();
            return;
        }

        try {
            window.ExcelProcessorUtils.status.setSystemStatus('Processing sheet...');
            
            // Get selected sheet
            this._currentSheet = this._workbook.Sheets[sheetName];

            if (!this._currentSheet) {
                throw new Error('Sheet not found: ' + sheetName);
            }

            // Convert to array format
            this._sheetData = XLSX.utils.sheet_to_json(this._currentSheet, {
                header: 1, // Array of arrays
                raw: false, // Keep as strings
                defval: '', // Default for empty cells
                blankrows: true
            });

            if (!this._sheetData || this._sheetData.length === 0) {
                throw new Error('Sheet appears to be empty');
            }

            // Clean up empty rows at the end
            this._cleanSheetData();

            // Show preview
            this._showSheetPreview();

            // Setup column mapping
            this._setupColumnMapping();

            window.ExcelProcessorUtils.dom.show(window.ExcelProcessorConfig.ELEMENTS.PREVIEW_SECTION);
            window.ExcelProcessorUtils.dom.show(window.ExcelProcessorConfig.ELEMENTS.MAPPING_SECTION);
            
            window.ExcelProcessorUtils.status.setSystemStatus('Sheet ready');
            window.ExcelProcessorUtils.log.info('Sheet processed:', sheetName, 'Rows:', this._sheetData.length);

        } catch (error) {
            window.ExcelProcessorUtils.log.error('Sheet processing error:', error.message);
            alert('Error processing sheet: ' + error.message);
            window.ExcelProcessorUtils.status.setSystemStatus('Error');
        }
    },

    /**
     * Clean sheet data by removing empty rows
     */
    _cleanSheetData() {
        while (this._sheetData.length > 0) {
            const lastRow = this._sheetData[this._sheetData.length - 1];
            const hasData = lastRow && lastRow.some(cell => cell && cell.toString().trim() !== '');
            if (hasData) break;
            this._sheetData.pop();
        }
    },

    /**
     * Hide downstream sections
     */
    _hideDownstreamSections() {
        window.ExcelProcessorUtils.dom.hide(window.ExcelProcessorConfig.ELEMENTS.PREVIEW_SECTION);
        window.ExcelProcessorUtils.dom.hide(window.ExcelProcessorConfig.ELEMENTS.MAPPING_SECTION);
        window.ExcelProcessorUtils.dom.hide(window.ExcelProcessorConfig.ELEMENTS.PROGRESS_SECTION);
        window.ExcelProcessorUtils.dom.hide(window.ExcelProcessorConfig.ELEMENTS.EXPORT_SECTION);
    },

    /**
     * Show sheet preview
     */
    _showSheetPreview() {
        const maxRows = window.ExcelProcessorConfig.EXCEL.MAX_PREVIEW_ROWS;
        const previewData = this._sheetData.slice(0, maxRows);
        const table = this._createPreviewTable(previewData);

        const container = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.SHEET_PREVIEW);
        container.innerHTML = '';
        container.appendChild(table);
    },

    /**
     * Create preview table
     */
    _createPreviewTable(data) {
        const table = document.createElement('table');
        table.className = 'results-table';

        // Header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // Row number header
        const rowHeader = document.createElement('th');
        rowHeader.textContent = '#';
        rowHeader.style.minWidth = '40px';
        headerRow.appendChild(rowHeader);

        // Column headers
        const maxCols = Math.max(...data.map(r => r ? r.length : 0));
        for (let i = 0; i < maxCols; i++) {
            const th = document.createElement('th');
            th.textContent = window.ExcelProcessorUtils.excel.numToCol(i + 1);
            th.style.minWidth = '80px';
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Body
        const tbody = document.createElement('tbody');
        data.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');
            
            // Row number
            const rowNumCell = document.createElement('td');
            rowNumCell.textContent = rowIndex + 1;
            rowNumCell.style.fontWeight = 'bold';
            tr.appendChild(rowNumCell);

            // Data columns
            for (let colIndex = 0; colIndex < maxCols; colIndex++) {
                const td = document.createElement('td');
                const cellValue = (row && row[colIndex]) ? String(row[colIndex]) : '';
                const displayValue = window.ExcelProcessorUtils.string.truncate(cellValue, 30);
                
                td.textContent = displayValue;
                td.title = cellValue;
                
                // Highlight header row
                if (rowIndex === 0) {
                    td.style.fontWeight = 'bold';
                    td.style.backgroundColor = '#f0f9ff';
                }
                
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        return table;
    },

    /**
     * Setup column mapping interface
     */
    _setupColumnMapping() {
        const maxCols = Math.max(...this._sheetData.map(r => r ? r.length : 0));
        
        // Populate source column selectors
        this._populateColumnSelector(window.ExcelProcessorConfig.ELEMENTS.MPN_COLUMN, maxCols);
        this._populateColumnSelector(window.ExcelProcessorConfig.ELEMENTS.MANUFACTURER_COLUMN, maxCols);
        this._populateColumnSelector(window.ExcelProcessorConfig.ELEMENTS.QUANTITY_COLUMN, maxCols);
        
        // Clear existing output columns
        this._outputColumns = [];
        this._renderOutputColumns();
    },

    /**
     * Populate column selector dropdown
     */
    _populateColumnSelector(elementId, maxCols) {
        const select = window.ExcelProcessorUtils.dom.get(elementId);
        if (!select) return;
        
        select.innerHTML = '<option value="">Select column...</option>';
        
        for (let i = 0; i < maxCols; i++) {
            const option = document.createElement('option');
            option.value = i;
            
            const colLetter = window.ExcelProcessorUtils.excel.numToCol(i + 1);
            const headerValue = (this._sheetData[0] && this._sheetData[0][i]) ? 
                String(this._sheetData[0][i]).substring(0, 20) : '';
            
            option.textContent = headerValue ? 
                `${colLetter} - ${headerValue}` : 
                `${colLetter}`;
            
            select.appendChild(option);
        }
    },

    /**
     * Add output column
     */
    _addOutputColumn() {
        const columnId = Date.now().toString();
        
        this._outputColumns.push({
            id: columnId,
            api: '',
            field: '',
            title: `Output Column ${this._outputColumns.length + 1}`
        });
        
        this._renderOutputColumns();
    },

    /**
     * Render output columns interface
     */
    _renderOutputColumns() {
        const container = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.OUTPUT_COLUMNS);
        if (!container) return;
        
        container.innerHTML = '';
        
        this._outputColumns.forEach((column, index) => {
            const columnDiv = this._createOutputColumnElement(column, index);
            container.appendChild(columnDiv);
        });
    },

    /**
     * Create output column element
     */
    _createOutputColumnElement(column, index) {
        const div = document.createElement('div');
        div.className = 'card p-16';
        div.innerHTML = `
            <div class="grid-12 gap-16 items-end">
                <div class="col-span-3">
                    <label class="label">API Service</label>
                    <select class="select" data-column-id="${column.id}" data-field="api">
                        <option value="">Select API...</option>
                        <option value="digikey" ${column.api === 'digikey' ? 'selected' : ''}>Digikey</option>
                        <option value="mouser" ${column.api === 'mouser' ? 'selected' : ''}>Mouser</option>
                    </select>
                </div>
                <div class="col-span-4">
                    <label class="label">Data Field</label>
                    <select class="select" data-column-id="${column.id}" data-field="field">
                        <option value="">Select field...</option>
                        ${this._getFieldOptions(column.api, column.field)}
                    </select>
                </div>
                <div class="col-span-3">
                    <label class="label">Column Title</label>
                    <input type="text" class="input" data-column-id="${column.id}" data-field="title" value="${column.title}">
                </div>
                <div class="col-span-2">
                    <button class="button button--ghost text-error" onclick="window.ExcelProcessorExcel._removeOutputColumn('${column.id}')">Remove</button>
                </div>
            </div>
        `;
        
        // Bind change events
        const selects = div.querySelectorAll('select, input');
        selects.forEach(element => {
            element.addEventListener('change', this._handleOutputColumnChange.bind(this));
            element.addEventListener('input', this._handleOutputColumnChange.bind(this));
        });
        
        return div;
    },

    /**
     * Get field options HTML
     */
    _getFieldOptions(api, selectedField) {
        const fields = api === 'digikey' ? 
            window.ExcelProcessorConfig.DIGIKEY_FIELDS : 
            api === 'mouser' ? 
            window.ExcelProcessorConfig.MOUSER_FIELDS : 
            {};
        
        return Object.entries(fields).map(([key, label]) => 
            `<option value="${key}" ${selectedField === key ? 'selected' : ''}>${label}</option>`
        ).join('');
    },

    /**
     * Handle output column changes
     */
    _handleOutputColumnChange(event) {
        const element = event.target;
        const columnId = element.getAttribute('data-column-id');
        const field = element.getAttribute('data-field');
        const value = element.value;
        
        const column = this._outputColumns.find(c => c.id === columnId);
        if (column) {
            column[field] = value;
            
            // If API changed, update field options
            if (field === 'api') {
                column.field = ''; // Reset field selection
                this._renderOutputColumns(); // Re-render to update field options
            }
        }
    },

    /**
     * Remove output column
     */
    _removeOutputColumn(columnId) {
        this._outputColumns = this._outputColumns.filter(c => c.id !== columnId);
        this._renderOutputColumns();
    },

    /**
     * Process data with API calls
     */
    async _processData() {
        // Validate configuration
        if (!this._validateProcessingConfig()) {
            return;
        }

        try {
            this._isProcessing = true;
            window.ExcelProcessorUtils.status.showProcessing(true);
            window.ExcelProcessorUtils.status.setSystemStatus('Processing data...');
            
            // Show progress section
            window.ExcelProcessorUtils.dom.show(window.ExcelProcessorConfig.ELEMENTS.PROGRESS_SECTION);
            
            // Get source columns
            this._sourceColumns.mpn = parseInt(window.ExcelProcessorUtils.dom.getValue(window.ExcelProcessorConfig.ELEMENTS.MPN_COLUMN));
            this._sourceColumns.manufacturer = parseInt(window.ExcelProcessorUtils.dom.getValue(window.ExcelProcessorConfig.ELEMENTS.MANUFACTURER_COLUMN));
            this._sourceColumns.quantity = parseInt(window.ExcelProcessorUtils.dom.getValue(window.ExcelProcessorConfig.ELEMENTS.QUANTITY_COLUMN));
            
            // Process data
            this._processedData = await this._processWithApis();
            
            // Show export section
            window.ExcelProcessorUtils.dom.show(window.ExcelProcessorConfig.ELEMENTS.EXPORT_SECTION);
            
            window.ExcelProcessorUtils.status.setSystemStatus('Processing complete');
            window.ExcelProcessorUtils.log.info('Data processing completed successfully');
            
        } catch (error) {
            window.ExcelProcessorUtils.log.error('Processing error:', error.message);
            alert('Processing failed: ' + error.message);
            window.ExcelProcessorUtils.status.setSystemStatus('Error');
        } finally {
            this._isProcessing = false;
            window.ExcelProcessorUtils.status.showProcessing(false);
        }
    },

    /**
     * Validate processing configuration
     */
    _validateProcessingConfig() {
        // Check API credentials
        if (!window.ExcelProcessorCredentials.hasActiveApis()) {
            alert(window.ExcelProcessorConfig.MESSAGES.NO_CREDENTIALS);
            return false;
        }

        // Check source columns
        const mpnCol = window.ExcelProcessorUtils.dom.getValue(window.ExcelProcessorConfig.ELEMENTS.MPN_COLUMN);
        if (!mpnCol) {
            alert('Please select MPN column');
            return false;
        }

        // Check output columns
        const validOutputs = this._outputColumns.filter(c => c.api && c.field);
        if (validOutputs.length === 0) {
            alert('Please add at least one output column');
            return false;
        }

        return true;
    },

    /**
     * Process data with API calls
     */
    async _processWithApis() {
        const dataRows = this._sheetData.slice(1); // Skip header row
        const results = [];
        const stats = { processed: 0, success: 0, error: 0, startTime: Date.now() };
        
        // Update progress display
        this._updateProgress(0, dataRows.length, stats);
        
        // Process in chunks
        const chunkSize = window.ExcelProcessorConfig.EXCEL.CHUNK_SIZE;
        
        for (let i = 0; i < dataRows.length; i += chunkSize) {
            const chunk = dataRows.slice(i, Math.min(i + chunkSize, dataRows.length));
            const chunkPromises = chunk.map((row, index) => 
                this._processRow(row, i + index + 1) // +1 for header row
            );
            
            const chunkResults = await Promise.allSettled(chunkPromises);
            
            chunkResults.forEach((result, index) => {
                stats.processed++;
                
                if (result.status === 'fulfilled') {
                    stats.success++;
                    results.push(result.value);
                } else {
                    stats.error++;
                    window.ExcelProcessorUtils.log.error(`Row ${i + index + 2} failed:`, result.reason);
                    // Add error row
                    results.push({
                        rowIndex: i + index + 1,
                        data: chunk[index],
                        apiData: {},
                        error: result.reason.message
                    });
                }
                
                this._updateProgress(stats.processed, dataRows.length, stats);
            });
            
            // Small delay between chunks to prevent overwhelming APIs
            if (i + chunkSize < dataRows.length) {
                await window.ExcelProcessorUtils.api.sleep(window.ExcelProcessorConfig.PROCESSING.REQUEST_DELAY);
            }
        }
        
        return results;
    },

    /**
     * Process single row with API calls
     */
    async _processRow(row, rowIndex) {
        const mpn = row[this._sourceColumns.mpn] || '';
        const manufacturer = row[this._sourceColumns.manufacturer] || '';
        const quantity = row[this._sourceColumns.quantity] || '';
        
        if (!mpn.trim()) {
            throw new Error('Empty MPN');
        }
        
        const apiData = {};
        
        // Group output columns by API
        const digikeyColumns = this._outputColumns.filter(c => c.api === 'digikey');
        const mouserColumns = this._outputColumns.filter(c => c.api === 'mouser');
        
        // Process Digikey columns
        if (digikeyColumns.length > 0 && window.ExcelProcessorCredentials.isDigikeyActive()) {
            try {
                const digikeyData = await window.ExcelProcessorApiClient.fetchDigikeyData(mpn, manufacturer);
                digikeyColumns.forEach(column => {
                    apiData[column.id] = this._extractFieldValue(digikeyData, column.field);
                });
            } catch (error) {
                window.ExcelProcessorUtils.log.warn(`Digikey API failed for ${mpn}:`, error.message);
                // Set empty values for failed Digikey columns
                digikeyColumns.forEach(column => {
                    apiData[column.id] = '';
                });
            }
        }
        
        // Process Mouser columns
        if (mouserColumns.length > 0 && window.ExcelProcessorCredentials.isMouserActive()) {
            try {
                const mouserData = await window.ExcelProcessorApiClient.fetchMouserData(mpn, manufacturer);
                mouserColumns.forEach(column => {
                    apiData[column.id] = this._extractFieldValue(mouserData, column.field);
                });
            } catch (error) {
                window.ExcelProcessorUtils.log.warn(`Mouser API failed for ${mpn}:`, error.message);
                // Set empty values for failed Mouser columns
                mouserColumns.forEach(column => {
                    apiData[column.id] = '';
                });
            }
        }
        
        return {
            rowIndex,
            data: row,
            apiData
        };
    },

    /**
     * Extract field value from API response
     */
    _extractFieldValue(apiResponse, field) {
        if (!apiResponse) return '';
        
        switch (field) {
            case 'unit_price':
                return apiResponse.unitPrice || '';
            case 'manufacturer':
                return apiResponse.manufacturer || '';
            case 'detailed_description':
                return apiResponse.detailedDescription || '';
            case 'datasheet':
                return apiResponse.datasheet || '';
            case 'stock_available':
                return apiResponse.stockAvailable || '';
            case 'package_case':
                return apiResponse.packageCase || '';
            case 'htsus_number':
                return apiResponse.htsusNumber || '';
            case 'htsus_stripped':
                return window.ExcelProcessorConfig.cleanHTSUS(apiResponse.htsusNumber) || '';
            default:
                return '';
        }
    },

    /**
     * Update progress display
     */
    _updateProgress(current, total, stats) {
        const percent = Math.round((current / total) * 100);
        
        // Update progress bar
        const progressBar = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.PROGRESS_BAR);
        if (progressBar) {
            progressBar.style.width = percent + '%';
        }
        
        // Update progress text
        window.ExcelProcessorUtils.dom.setText(window.ExcelProcessorConfig.ELEMENTS.PROGRESS_TEXT, 
            `${current} / ${total} (${percent}%)`);
        
        // Update stats
        window.ExcelProcessorUtils.dom.setText(window.ExcelProcessorConfig.ELEMENTS.STAT_PROCESSED, current);
        window.ExcelProcessorUtils.dom.setText(window.ExcelProcessorConfig.ELEMENTS.STAT_SUCCESS, stats.success);
        window.ExcelProcessorUtils.dom.setText(window.ExcelProcessorConfig.ELEMENTS.STAT_ERROR, stats.error);
        
        // Calculate rate
        const elapsed = (Date.now() - stats.startTime) / 1000;
        const rate = current / elapsed;
        window.ExcelProcessorUtils.dom.setText(window.ExcelProcessorConfig.ELEMENTS.STAT_RATE, 
            isFinite(rate) ? rate.toFixed(1) + '/s' : '0/s');
    },

    /**
     * Clear mapping configuration
     */
    _clearMapping() {
        if (confirm('Clear all column mapping? This will reset the mapping configuration.')) {
            // Clear source columns
            window.ExcelProcessorUtils.dom.setValue(window.ExcelProcessorConfig.ELEMENTS.MPN_COLUMN, '');
            window.ExcelProcessorUtils.dom.setValue(window.ExcelProcessorConfig.ELEMENTS.MANUFACTURER_COLUMN, '');
            window.ExcelProcessorUtils.dom.setValue(window.ExcelProcessorConfig.ELEMENTS.QUANTITY_COLUMN, '');
            
            // Clear output columns
            this._outputColumns = [];
            this._renderOutputColumns();
            
            window.ExcelProcessorUtils.log.info('Column mapping cleared');
        }
    },

    /**
     * Get processed data for export
     */
    getProcessedData() {
        return this._processedData;
    },

    /**
     * Get original workbook for export
     */
    getOriginalWorkbook() {
        return this._originalWorkbook;
    },

    /**
     * Get current sheet data with headers
     */
    getSheetDataWithHeaders() {
        return this._sheetData;
    },

    /**
     * Get output columns configuration
     */
    getOutputColumns() {
        return this._outputColumns;
    },

    /**
     * Reset processor state
     */
    reset() {
        this._workbook = null;
        this._originalWorkbook = null;
        this._currentSheet = null;
        this._sheetData = null;
        this._sourceColumns = { mpn: null, manufacturer: null, quantity: null };
        this._outputColumns = [];
        this._processedData = null;
        this._isProcessing = false;
        
        // Reset UI
        const fileInput = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.EXCEL_FILE);
        if (fileInput) fileInput.value = '';
        
        window.ExcelProcessorUtils.dom.hide(window.ExcelProcessorConfig.ELEMENTS.FILE_INFO);
        window.ExcelProcessorUtils.dom.hide(window.ExcelProcessorConfig.ELEMENTS.SHEET_SELECTION);
        this._hideDownstreamSections();
        
        window.ExcelProcessorUtils.status.setSystemStatus('Ready');
        window.ExcelProcessorUtils.log.info('Excel processor reset');
    }
};

// Make removeOutputColumn available globally for onclick handlers
window.ExcelProcessorExcel._removeOutputColumn = window.ExcelProcessorExcel._removeOutputColumn.bind(window.ExcelProcessorExcel);

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.ExcelProcessorExcel.init();
    });
} else {
    window.ExcelProcessorExcel.init();
}