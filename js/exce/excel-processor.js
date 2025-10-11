/**
 * Excel API Processor - Excel Processing Module
 * Alica Technologies
 */

window.ExcelProcessorExcel = {
    // Internal state
    _workbook: null,
    _currentSheet: null,
    _sheetData: null,
    _headers: [],
    _outputColumnConfig: [],
    _processedData: null,
    _isProcessing: false,
    _isInitialized: false,

    /**
     * Initialize Excel processor
     */
    init() {
        if (this._isInitialized) {
            return;
        }

        this._bindEvents();
        this._isInitialized = true;
        window.ExcelProcessorUtils.log.info('Excel processor initialized');
    },

    /**
     * Bind event listeners
     */
    _bindEvents() {
        // File input change
        const fileInput = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.EXCEL_FILE);
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this._handleFileSelect(e));
        }

        // Sheet selection
        const sheetSelect = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.SHEET_SELECT);
        if (sheetSelect) {
            sheetSelect.addEventListener('change', (e) => this._handleSheetSelect(e));
        }

        // Row selection inputs
        const headerRow = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.HEADER_ROW);
        const startRow = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.START_ROW);
        const endRow = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.END_ROW);

        [headerRow, startRow, endRow].forEach(input => {
            if (input) {
                input.addEventListener('change', () => this._updateRowRangeInfo());
                input.addEventListener('input', () => this._updateRowRangeInfo());
            }
        });

        // Add output column button
        const addColumnBtn = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.ADD_OUTPUT_COLUMN);
        if (addColumnBtn) {
            addColumnBtn.addEventListener('click', () => this._addOutputColumn());
        }

        // Process data button
        const processBtn = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.PROCESS_DATA);
        if (processBtn) {
            processBtn.addEventListener('click', () => this._processData());
        }

        // Clear mapping button
        const clearBtn = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.CLEAR_MAPPING);
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this._clearMapping());
        }
    },

    /**
     * Handle file selection
     */
    async _handleFileSelect(event) {
        const file = event.target.files[0];
        
        if (!file) {
            return;
        }

        // Validate file type
        if (!window.ExcelProcessorUtils.file.isTypeSupported(
            file.name, 
            window.ExcelProcessorConfig.EXCEL.SUPPORTED_FORMATS
        )) {
            alert(window.ExcelProcessorConfig.MESSAGES.INVALID_FILE_TYPE);
            event.target.value = '';
            return;
        }

        // Validate file size
        if (!window.ExcelProcessorUtils.file.isValidSize(
            file.size, 
            window.ExcelProcessorConfig.EXCEL.MAX_FILE_SIZE
        )) {
            alert(window.ExcelProcessorConfig.MESSAGES.FILE_TOO_LARGE);
            event.target.value = '';
            return;
        }

        try {
            window.ExcelProcessorUtils.log.info(`Loading file: ${file.name}`);
            await this._loadExcelFile(file);
        } catch (error) {
            window.ExcelProcessorUtils.log.error('Failed to load Excel file:', error.message);
            alert('Failed to load Excel file: ' + error.message);
        }
    },

    /**
     * Load Excel file
     */
    async _loadExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    this._workbook = XLSX.read(data, { type: 'array' });

                    // Display file info
                    this._displayFileInfo(file);

                    // Populate sheet selection
                    this._populateSheetSelection();

                    window.ExcelProcessorUtils.log.info('Excel file loaded successfully');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('File reading failed'));
            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * Display file information
     */
    _displayFileInfo(file) {
        const fileInfo = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.FILE_INFO);
        
        window.ExcelProcessorUtils.dom.setText(
            window.ExcelProcessorConfig.ELEMENTS.FILE_NAME, 
            file.name
        );
        window.ExcelProcessorUtils.dom.setText(
            window.ExcelProcessorConfig.ELEMENTS.FILE_SIZE, 
            window.ExcelProcessorUtils.file.formatSize(file.size)
        );
        window.ExcelProcessorUtils.dom.setText(
            window.ExcelProcessorConfig.ELEMENTS.SHEET_COUNT, 
            this._workbook.SheetNames.length
        );

        window.ExcelProcessorUtils.dom.show(fileInfo);
        window.ExcelProcessorUtils.dom.show(window.ExcelProcessorConfig.ELEMENTS.SHEET_SELECTION);
    },

    /**
     * Populate sheet selection dropdown
     */
    _populateSheetSelection() {
        const sheetSelect = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.SHEET_SELECT);
        
        if (!sheetSelect) return;

        // Clear existing options except first
        sheetSelect.innerHTML = '<option value="">Choose a sheet...</option>';

        // Add sheet names
        this._workbook.SheetNames.forEach((name, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = name;
            sheetSelect.appendChild(option);
        });

        // Auto-select first sheet if only one exists
        if (this._workbook.SheetNames.length === 1) {
            sheetSelect.value = '0';
            sheetSelect.dispatchEvent(new Event('change'));
        }
    },

    /**
     * Handle sheet selection
     */
    _handleSheetSelect(event) {
        const sheetIndex = parseInt(event.target.value);
        
        if (isNaN(sheetIndex) || sheetIndex < 0) {
            window.ExcelProcessorUtils.dom.hide(window.ExcelProcessorConfig.ELEMENTS.PREVIEW_SECTION);
            window.ExcelProcessorUtils.dom.hide(window.ExcelProcessorConfig.ELEMENTS.MAPPING_SECTION);
            return;
        }

        const sheetName = this._workbook.SheetNames[sheetIndex];
        this._currentSheet = this._workbook.Sheets[sheetName];

        // Convert sheet to JSON
        this._sheetData = XLSX.utils.sheet_to_json(this._currentSheet, { 
            header: 1,
            defval: '',
            blankrows: true
        });

        window.ExcelProcessorUtils.log.info(`Sheet selected: ${sheetName} (${this._sheetData.length} rows)`);

        // Display preview
        this._displaySheetPreview();

        // Populate column dropdowns
        this._populateColumnDropdowns();

        // Show mapping section
        window.ExcelProcessorUtils.dom.show(window.ExcelProcessorConfig.ELEMENTS.MAPPING_SECTION);

        // Initialize row range info
        this._updateRowRangeInfo();
    },

    /**
     * Display sheet preview
     */
    _displaySheetPreview() {
        const previewDiv = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.SHEET_PREVIEW);
        
        if (!previewDiv) return;

        const maxRows = Math.min(
            this._sheetData.length, 
            window.ExcelProcessorConfig.EXCEL.MAX_PREVIEW_ROWS
        );

        let html = '<table class="table">';
        
        // Add table header
        html += '<thead><tr>';
        html += '<th>#</th>'; // Row number column
        
        const maxCols = Math.max(...this._sheetData.slice(0, maxRows).map(row => row.length));
        for (let i = 0; i < maxCols; i++) {
            html += `<th>${window.ExcelProcessorUtils.excel.numToCol(i + 1)}</th>`;
        }
        html += '</tr></thead>';

        // Add table body
        html += '<tbody>';
        for (let i = 0; i < maxRows; i++) {
            const row = this._sheetData[i] || [];
            html += `<tr><td class="text-xs text-muted">${i + 1}</td>`;
            
            for (let j = 0; j < maxCols; j++) {
                const cellValue = row[j] !== undefined ? row[j] : '';
                const truncated = window.ExcelProcessorUtils.string.truncate(String(cellValue), 30);
                html += `<td>${window.ExcelProcessorUtils.string.sanitize(truncated)}</td>`;
            }
            html += '</tr>';
        }
        html += '</tbody>';
        html += '</table>';

        if (this._sheetData.length > maxRows) {
            html += `<div class="mt-8 text-xs text-muted">Showing ${maxRows} of ${this._sheetData.length} rows</div>`;
        }

        previewDiv.innerHTML = html;
        window.ExcelProcessorUtils.dom.show(window.ExcelProcessorConfig.ELEMENTS.PREVIEW_SECTION);
    },

    /**
     * Populate column dropdowns
     */
    _populateColumnDropdowns() {
        const headerRowNum = parseInt(document.getElementById(window.ExcelProcessorConfig.ELEMENTS.HEADER_ROW)?.value || 1);
        const headerRowIndex = headerRowNum - 1;

        if (headerRowIndex < 0 || headerRowIndex >= this._sheetData.length) {
            window.ExcelProcessorUtils.log.error('Invalid header row number');
            return;
        }

        this._headers = this._sheetData[headerRowIndex] || [];

        const dropdowns = [
            window.ExcelProcessorConfig.ELEMENTS.MPN_COLUMN,
            window.ExcelProcessorConfig.ELEMENTS.MANUFACTURER_COLUMN,
            window.ExcelProcessorConfig.ELEMENTS.QUANTITY_COLUMN
        ];

        dropdowns.forEach(elementId => {
            const dropdown = document.getElementById(elementId);
            if (!dropdown) return;

            dropdown.innerHTML = '<option value="">Select column...</option>';

            this._headers.forEach((header, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${window.ExcelProcessorUtils.excel.numToCol(index + 1)} - ${header}`;
                dropdown.appendChild(option);
            });
        });
    },

    /**
     * Update row range information
     */
    _updateRowRangeInfo() {
        const headerRow = parseInt(document.getElementById(window.ExcelProcessorConfig.ELEMENTS.HEADER_ROW)?.value || 1);
        const startRow = parseInt(document.getElementById(window.ExcelProcessorConfig.ELEMENTS.START_ROW)?.value || 2);
        const endRowValue = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.END_ROW)?.value;
        const endRow = endRowValue ? parseInt(endRowValue) : this._sheetData?.length || 0;

        const infoDiv = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.ROW_RANGE_INFO);
        const messageDiv = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.ROW_RANGE_MESSAGE);

        if (!infoDiv || !messageDiv || !this._sheetData) return;

        // Validate ranges
        let message = '';
        let isValid = true;

        if (headerRow < 1 || headerRow > this._sheetData.length) {
            message = `Invalid header row. Must be between 1 and ${this._sheetData.length}`;
            isValid = false;
        } else if (startRow <= headerRow) {
            message = 'Start row must be after header row';
            isValid = false;
        } else if (endRow < startRow) {
            message = 'End row must be greater than or equal to start row';
            isValid = false;
        } else if (endRow > this._sheetData.length) {
            message = `End row exceeds sheet length (${this._sheetData.length} rows)`;
            isValid = false;
        } else {
            const rowCount = endRow - startRow + 1;
            message = `Will process ${rowCount} row${rowCount !== 1 ? 's' : ''} (Row ${startRow} to ${endRow})`;
        }

        messageDiv.textContent = message;
        infoDiv.className = isValid ? 'alert alert--info mt-16' : 'alert alert--error mt-16';
        window.ExcelProcessorUtils.dom.show(infoDiv);

        return isValid;
    },

    /**
     * Add output column configuration
     */
    _addOutputColumn() {
        const container = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.OUTPUT_COLUMNS);
        if (!container) return;

        const index = this._outputColumnConfig.length;
        const columnDiv = document.createElement('div');
        columnDiv.className = 'card p-16 mb-16';
        columnDiv.dataset.index = index;

        columnDiv.innerHTML = `
            <div class="grid-12 gap-16 mb-16">
                <div class="col-span-4">
                    <div class="form__group">
                        <label class="label">Column Name</label>
                        <input type="text" class="input output-column-name" placeholder="e.g., Unit Price">
                    </div>
                </div>
                <div class="col-span-3">
                    <div class="form__group">
                        <label class="label">API Source</label>
                        <select class="select output-api-source">
                            <option value="">Select API...</option>
                            <option value="digikey">Digikey</option>
                            <option value="mouser">Mouser</option>
                        </select>
                    </div>
                </div>
                <div class="col-span-4">
                    <div class="form__group">
                        <label class="label">Data Field</label>
                        <select class="select output-data-field" disabled>
                            <option value="">Select field...</option>
                        </select>
                    </div>
                </div>
                <div class="col-span-1 flex items-end">
                    <button class="button button--ghost button--sm text-error w-full remove-output-column" data-index="${index}">×</button>
                </div>
            </div>
        `;

        container.appendChild(columnDiv);

        // Bind events for this column
        const apiSelect = columnDiv.querySelector('.output-api-source');
        const fieldSelect = columnDiv.querySelector('.output-data-field');
        const removeBtn = columnDiv.querySelector('.remove-output-column');

        apiSelect.addEventListener('change', (e) => {
            this._updateFieldOptions(fieldSelect, e.target.value);
        });

        removeBtn.addEventListener('click', () => {
            this._removeOutputColumn(index);
        });

        this._outputColumnConfig.push({
            element: columnDiv,
            index: index
        });

        window.ExcelProcessorUtils.log.info('Output column added');
    },

    /**
     * Update field options based on API selection
     */
    _updateFieldOptions(fieldSelect, api) {
        fieldSelect.innerHTML = '<option value="">Select field...</option>';
        
        if (!api) {
            fieldSelect.disabled = true;
            return;
        }

        fieldSelect.disabled = false;

        const fields = api === 'digikey' ? 
            window.ExcelProcessorConfig.DIGIKEY_FIELDS : 
            window.ExcelProcessorConfig.MOUSER_FIELDS;

        Object.entries(fields).forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            fieldSelect.appendChild(option);
        });
    },

    /**
     * Remove output column
     */
    _removeOutputColumn(index) {
        const config = this._outputColumnConfig.find(c => c.index === index);
        if (config && config.element) {
            config.element.remove();
            this._outputColumnConfig = this._outputColumnConfig.filter(c => c.index !== index);
            window.ExcelProcessorUtils.log.info('Output column removed');
        }
    },

    /**
     * Clear mapping configuration
     */
    _clearMapping() {
        if (!confirm('Clear all mapping configuration?')) {
            return;
        }

        // Clear column selections
        document.getElementById(window.ExcelProcessorConfig.ELEMENTS.MPN_COLUMN).value = '';
        document.getElementById(window.ExcelProcessorConfig.ELEMENTS.MANUFACTURER_COLUMN).value = '';
        document.getElementById(window.ExcelProcessorConfig.ELEMENTS.QUANTITY_COLUMN).value = '';

        // Clear output columns
        this._outputColumnConfig.forEach(config => {
            if (config.element) {
                config.element.remove();
            }
        });
        this._outputColumnConfig = [];

        window.ExcelProcessorUtils.log.info('Mapping cleared');
    },

    /**
     * Process data with API calls
     */
    async _processData() {
        if (this._isProcessing) {
            alert('Processing already in progress');
            return;
        }

        // Validate credentials
        if (!window.ExcelProcessorCredentials.hasActiveApis()) {
            alert(window.ExcelProcessorConfig.MESSAGES.NO_CREDENTIALS);
            return;
        }

        // Validate mapping
        const validation = this._validateMapping();
        if (!validation.valid) {
            alert('Invalid mapping:\n' + validation.errors.join('\n'));
            return;
        }

        // Validate row range
        if (!this._updateRowRangeInfo()) {
            alert('Invalid row range configuration');
            return;
        }

        try {
            this._isProcessing = true;
            window.ExcelProcessorUtils.status.showProcessing(true);
            window.ExcelProcessorUtils.status.setSystemStatus('Processing');

            await this._executeProcessing(validation.config);

            window.ExcelProcessorUtils.status.showProcessing(false);
            window.ExcelProcessorUtils.status.setSystemStatus('Complete');
            window.ExcelProcessorUtils.log.info(window.ExcelProcessorConfig.MESSAGES.PROCESSING_COMPLETE);

        } catch (error) {
            window.ExcelProcessorUtils.log.error('Processing failed:', error.message);
            alert('Processing failed: ' + error.message);
            window.ExcelProcessorUtils.status.showProcessing(false);
            window.ExcelProcessorUtils.status.setSystemStatus('Error');
        } finally {
            this._isProcessing = false;
        }
    },

    /**
     * Validate mapping configuration
     */
    _validateMapping() {
        const errors = [];
        const mpnCol = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.MPN_COLUMN).value;
        const mfgCol = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.MANUFACTURER_COLUMN).value;
        const qtyCol = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.QUANTITY_COLUMN).value;

        if (!mpnCol) errors.push('MPN column is required');

        // Get output column configurations
        const outputColumns = [];
        const container = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.OUTPUT_COLUMNS);
        
        if (container) {
            const columnDivs = container.querySelectorAll('[data-index]');
            columnDivs.forEach(div => {
                const name = div.querySelector('.output-column-name')?.value.trim();
                const api = div.querySelector('.output-api-source')?.value;
                const field = div.querySelector('.output-data-field')?.value;

                if (!name || !api || !field) {
                    errors.push('All output columns must be fully configured');
                    return;
                }

                outputColumns.push({ name, api, field });
            });
        }

        if (outputColumns.length === 0) {
            errors.push('At least one output column is required');
        }

        return {
            valid: errors.length === 0,
            errors,
            config: {
                mpnColumn: parseInt(mpnCol),
                manufacturerColumn: mfgCol ? parseInt(mfgCol) : null,
                quantityColumn: qtyCol ? parseInt(qtyCol) : null,
                outputColumns
            }
        };
    },

    /**
     * Execute processing
     */
    async _executeProcessing(config) {
        // Get row range
        const headerRow = parseInt(document.getElementById(window.ExcelProcessorConfig.ELEMENTS.HEADER_ROW).value);
        const startRow = parseInt(document.getElementById(window.ExcelProcessorConfig.ELEMENTS.START_ROW).value);
        const endRowValue = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.END_ROW).value;
        const endRow = endRowValue ? parseInt(endRowValue) : this._sheetData.length;

        // Show progress section
        window.ExcelProcessorUtils.dom.show(window.ExcelProcessorConfig.ELEMENTS.PROGRESS_SECTION);

        // Initialize progress tracking
        const totalRows = endRow - startRow + 1;
        let processed = 0;
        let success = 0;
        let errors = 0;
        const startTime = Date.now();

        // Process each row
        for (let rowIndex = startRow - 1; rowIndex < endRow; rowIndex++) {
            const row = this._sheetData[rowIndex];
            if (!row) continue;

            const mpn = row[config.mpnColumn];
            const manufacturer = config.manufacturerColumn !== null ? row[config.manufacturerColumn] : '';

            if (!mpn) {
                errors++;
                processed++;
                this._updateProgress(processed, totalRows, success, errors, startTime);
                continue;
            }

            // Process each output column
            for (const outputCol of config.outputColumns) {
                try {
                    let apiData;
                    if (outputCol.api === 'digikey') {
                        apiData = await window.ExcelProcessorApiClient.fetchDigikeyData(mpn, manufacturer);
                    } else {
                        apiData = await window.ExcelProcessorApiClient.fetchMouserData(mpn, manufacturer);
                    }

                    // Store the result
                    let value = apiData[outputCol.field] || '';
                    
                    // Special handling for HTSUS stripped
                    if (outputCol.field === 'htsus_stripped') {
                        value = window.ExcelProcessorConfig.cleanHTSUS(apiData.htsus_number || '');
                    }

                    // Add column if it doesn't exist
                    const colIndex = this._headers.indexOf(outputCol.name);
                    if (colIndex === -1) {
                        this._headers.push(outputCol.name);
                        this._sheetData[headerRow - 1].push(outputCol.name);
                    }

                    // Set the value
                    const targetCol = this._headers.indexOf(outputCol.name);
                    if (!this._sheetData[rowIndex]) {
                        this._sheetData[rowIndex] = [];
                    }
                    this._sheetData[rowIndex][targetCol] = value;

                    success++;
                } catch (error) {
                    window.ExcelProcessorUtils.log.error(`API error for ${mpn}:`, error.message);
                    errors++;
                }
            }

            processed++;
            this._updateProgress(processed, totalRows, success, errors, startTime);

            // Rate limiting delay
            await window.ExcelProcessorUtils.api.sleep(window.ExcelProcessorConfig.PROCESSING.REQUEST_DELAY);
        }

        // Store processed data for export
        this._processedData = {
            sheetData: this._sheetData,
            sheetName: this._workbook.SheetNames[parseInt(document.getElementById(window.ExcelProcessorConfig.ELEMENTS.SHEET_SELECT).value)]
        };

        // Show export section
        window.ExcelProcessorUtils.dom.show(window.ExcelProcessorConfig.ELEMENTS.EXPORT_SECTION);
    },

    /**
     * Update progress display
     */
    _updateProgress(processed, total, success, errors, startTime) {
        const percent = Math.round((processed / total) * 100);
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = processed / elapsed;

        document.getElementById(window.ExcelProcessorConfig.ELEMENTS.PROGRESS_TEXT).textContent = 
            `Processing row ${processed} of ${total}...`;
        
        const progressBar = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.PROGRESS_BAR);
        if (progressBar) {
            progressBar.style.width = percent + '%';
        }

        document.getElementById(window.ExcelProcessorConfig.ELEMENTS.STAT_PROCESSED).textContent = processed;
        document.getElementById(window.ExcelProcessorConfig.ELEMENTS.STAT_SUCCESS).textContent = success;
        document.getElementById(window.ExcelProcessorConfig.ELEMENTS.STAT_ERROR).textContent = errors;
        document.getElementById(window.ExcelProcessorConfig.ELEMENTS.STAT_RATE).textContent = rate.toFixed(1) + '/s';
    },

    /**
     * Get processed data
     */
    getProcessedData() {
        return this._processedData;
    },

    /**
     * Reset processor
     */
    reset() {
        this._workbook = null;
        this._currentSheet = null;
        this._sheetData = null;
        this._headers = [];
        this._outputColumnConfig = [];
        this._processedData = null;
        this._isProcessing = false;

        // Reset UI
        document.getElementById(window.ExcelProcessorConfig.ELEMENTS.EXCEL_FILE).value = '';
        window.ExcelProcessorUtils.dom.hide(window.ExcelProcessorConfig.ELEMENTS.FILE_INFO);
        window.ExcelProcessorUtils.dom.hide(window.ExcelProcessorConfig.ELEMENTS.SHEET_SELECTION);
        window.ExcelProcessorUtils.dom.hide(window.ExcelProcessorConfig.ELEMENTS.PREVIEW_SECTION);
        window.ExcelProcessorUtils.dom.hide(window.ExcelProcessorConfig.ELEMENTS.MAPPING_SECTION);
        window.ExcelProcessorUtils.dom.hide(window.ExcelProcessorConfig.ELEMENTS.PROGRESS_SECTION);
        window.ExcelProcessorUtils.dom.hide(window.ExcelProcessorConfig.ELEMENTS.EXPORT_SECTION);

        window.ExcelProcessorUtils.log.info('Processor reset');
    }
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.ExcelProcessorExcel.init();
    });
} else {
    window.ExcelProcessorExcel.init();
}
