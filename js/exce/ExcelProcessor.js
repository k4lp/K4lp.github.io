/**
 * Excel API Processor - Fixed Processing Implementation
 * Production-grade with proper validation and error handling
 * Alica Technologies
 */

'use strict';

/**
 * Main Excel processor class - fixed validation implementation
 */
class ExcelProcessor {
    constructor() {
        this.fileHandler = null;
        this.uiController = null;
        this.currentWorkbook = null;
        this.currentSheet = null;
        this.outputColumns = [];
        this.processedData = null;
        this.isProcessing = false;
        this.initialized = false;
        this.lastValidationTime = 0; // Prevent validation spam
        
        this._init();
    }
    
    /**
     * Initialize the application
     * @private
     */
    _init() {
        try {
            // Check required elements exist
            const requiredElements = [
                'excelFile', 'sheetSelect', 'sheetPreview',
                'headerRow', 'mpnColumn', 'systemStatus'
            ];
            
            if (!ExcelUtils.validateRequiredElements(requiredElements)) {
                throw new Error('Missing required DOM elements');
            }
            
            // Initialize components
            this.fileHandler = new FileHandler();
            this.uiController = new UIController();
            
            // Set up event listeners
            this._setupEventListeners();
            
            // Initialize UI
            this.uiController.setSystemStatus('Ready');
            
            this.initialized = true;
            ExcelUtils.log('INFO', 'Excel Processor initialized successfully');
            
        } catch (error) {
            ExcelUtils.log('ERROR', 'Initialization failed', error.message);
            ExcelUtils.showError(`Initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Set up all event listeners
     * @private
     */
    _setupEventListeners() {
        // File upload
        const fileInput = this.uiController.elements.fileInput;
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this._handleFileUpload(e));
        }
        
        // Sheet selection
        const sheetSelect = this.uiController.elements.sheetSelect;
        if (sheetSelect) {
            sheetSelect.addEventListener('change', (e) => this._handleSheetSelect(e));
        }
        
        // Row range inputs
        const rowInputs = ['headerRow', 'startRow', 'endRow'];
        rowInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', () => this._updateRowRangeInfo());
                input.addEventListener('change', () => {
                    this._updateRowRangeInfo();
                    // Update column dropdowns when header row changes
                    if (inputId === 'headerRow' && this.currentSheet) {
                        this._updateColumnDropdowns();
                    }
                });
            }
        });
        
        // Add output column button
        const addColumnBtn = this.uiController.elements.addOutputColumn;
        if (addColumnBtn) {
            addColumnBtn.addEventListener('click', () => this._addOutputColumn());
        }
        
        // Process data button - FIXED IMPLEMENTATION
        const processBtn = this.uiController.elements.processData;
        if (processBtn) {
            processBtn.addEventListener('click', () => this._processData());
        }
        
        // Clear mapping button
        const clearBtn = this.uiController.elements.clearMapping;
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this._clearMapping());
        }
        
        // Export and reset buttons
        const exportBtn = document.getElementById('exportExcel');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this._exportExcel());
        }
        
        const resetBtn = document.getElementById('resetProcessor');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this._resetProcessor());
        }
        
        ExcelUtils.log('INFO', 'Event listeners set up');
    }
    
    /**
     * Handle file upload
     * @private
     * @param {Event} event - File input change event
     */
    async _handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            this.uiController.setSystemStatus('Loading file...');
            
            // Process file
            this.currentWorkbook = await this.fileHandler.processFile(file);
            
            // Show file info
            const fileInfo = this.fileHandler.getFileInfo(file);
            this.uiController.showFileInfo(fileInfo);
            
            // Show sheet selection
            this.uiController.showSheetSelection(this.currentWorkbook.SheetNames);
            
            this.uiController.setSystemStatus('File loaded');
            ExcelUtils.log('INFO', 'File loaded successfully');
            
        } catch (error) {
            ExcelUtils.showError(error.message, 'File Loading Error');
            this.uiController.setSystemStatus('Error');
            event.target.value = ''; // Clear file input
        }
    }
    
    /**
     * Handle sheet selection
     * @private
     * @param {Event} event - Sheet select change event
     */
    _handleSheetSelect(event) {
        const sheetIndex = parseInt(event.target.value);
        if (isNaN(sheetIndex) || !this.currentWorkbook) return;
        
        try {
            this.uiController.setSystemStatus('Loading sheet...');
            
            const sheetName = this.currentWorkbook.SheetNames[sheetIndex];
            const sheetData = this.fileHandler.getSheetData(this.currentWorkbook, sheetName);
            
            // Store current sheet info
            this.currentSheet = {
                name: sheetName,
                data: sheetData,
                index: sheetIndex
            };
            
            // Show preview
            this.uiController.showSheetPreview(sheetData);
            
            // Update column dropdowns
            this._updateColumnDropdowns();
            
            // Initialize row range
            this._updateRowRangeInfo();
            
            this.uiController.setSystemStatus('Sheet loaded');
            
        } catch (error) {
            ExcelUtils.showError(error.message, 'Sheet Loading Error');
            this.uiController.setSystemStatus('Error');
        }
    }
    
    /**
     * Update column dropdown options
     * @private
     */
    _updateColumnDropdowns() {
        if (!this.currentSheet) return;
        
        const headerRowNum = parseInt(document.getElementById('headerRow').value || 1);
        const headerRowIndex = headerRowNum - 1;
        
        if (headerRowIndex >= 0 && headerRowIndex < this.currentSheet.data.length) {
            this.uiController.populateColumnDropdowns(this.currentSheet.data, headerRowIndex);
        }
    }
    
    /**
     * Update row range information display
     * @private
     */
    _updateRowRangeInfo() {
        if (!this.currentSheet) return;
        
        const headerRow = parseInt(document.getElementById('headerRow').value || 1);
        const startRow = parseInt(document.getElementById('startRow').value || 2);
        const endRowValue = document.getElementById('endRow').value;
        const endRow = endRowValue ? parseInt(endRowValue) : this.currentSheet.data.length;
        
        let message = '';
        let valid = true;
        
        if (headerRow < 1 || headerRow > this.currentSheet.data.length) {
            message = `Invalid header row. Must be between 1 and ${this.currentSheet.data.length}`;
            valid = false;
        } else if (startRow <= headerRow) {
            message = 'Start row must be after header row';
            valid = false;
        } else if (endRow < startRow) {
            message = 'End row must be greater than or equal to start row';
            valid = false;
        } else if (endRow > this.currentSheet.data.length) {
            message = `End row exceeds sheet length (${this.currentSheet.data.length} rows)`;
            valid = false;
        } else {
            const rowCount = endRow - startRow + 1;
            message = `Will process ${rowCount} row${rowCount !== 1 ? 's' : ''} (Row ${startRow} to ${endRow})`;
        }
        
        this.uiController.updateRowRangeInfo({ message, valid });
    }
    
    /**
     * Add output column configuration
     * @private
     */
    _addOutputColumn() {
        const index = this.outputColumns.length;
        const columnElement = this.uiController.addOutputColumnUI(index);
        
        if (columnElement) {
            // Set up API source change handler
            const apiSelect = columnElement.querySelector('.output-api-source');
            const fieldSelect = columnElement.querySelector('.output-data-field');
            const removeBtn = columnElement.querySelector('.remove-output-column');
            
            if (apiSelect && fieldSelect) {
                apiSelect.addEventListener('change', (e) => {
                    this.uiController.updateApiFieldOptions(fieldSelect, e.target.value);
                });
            }
            
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    this._removeOutputColumn(index);
                });
            }
            
            this.outputColumns.push({
                index,
                element: columnElement
            });
            
            ExcelUtils.log('INFO', 'Output column added', { index });
        }
    }
    
    /**
     * Remove output column configuration
     * @private
     * @param {number} index - Column index to remove
     */
    _removeOutputColumn(index) {
        const columnConfig = this.outputColumns.find(c => c.index === index);
        if (columnConfig && columnConfig.element) {
            columnConfig.element.remove();
            this.outputColumns = this.outputColumns.filter(c => c.index !== index);
            ExcelUtils.log('INFO', 'Output column removed', { index });
        }
    }
    
    /**
     * FIXED - Process data with proper validation and no spam
     * @private
     */
    async _processData() {
        if (this.isProcessing) {
            ExcelUtils.showError('Processing already in progress');
            return;
        }
        
        // Prevent validation spam - only validate every 2 seconds max
        const now = Date.now();
        if (now - this.lastValidationTime < 2000) {
            ExcelUtils.log('INFO', 'Validation throttled to prevent spam');
            return;
        }
        this.lastValidationTime = now;
        
        // Validate configuration - FIXED LOGIC
        const validation = this._validateConfiguration();
        if (!validation.valid) {
            // Show SINGLE error message with all issues
            const errorMsg = `Configuration errors:\n• ${validation.errors.join('\n• ')}`;
            ExcelUtils.showError(errorMsg, 'Configuration Error');
            return;
        }
        
        // Check API credentials
        if (!this._checkApiCredentials()) {
            ExcelUtils.showError('API credentials not configured. Please set up Digikey or Mouser credentials.');
            return;
        }
        
        try {
            this.isProcessing = true;
            this.uiController.setSystemStatus('Processing');
            
            // Show progress section
            document.getElementById('progressSection').style.display = 'block';
            
            // Execute processing
            await this._executeProcessing(validation.config);
            
            // Show export section
            document.getElementById('exportSection').style.display = 'block';
            
            this.uiController.setSystemStatus('Complete');
            ExcelUtils.log('INFO', 'Processing completed successfully');
            
        } catch (error) {
            ExcelUtils.log('ERROR', 'Processing failed:', error.message);
            ExcelUtils.showError('Processing failed: ' + error.message);
            this.uiController.setSystemStatus('Error');
        } finally {
            this.isProcessing = false;
        }
    }
    
    /**
     * COMPLETELY FIXED - Validate processing configuration with proper logic
     * @private
     * @returns {Object} Validation result
     */
    _validateConfiguration() {
        const errors = [];
        
        // Check sheet selection
        if (!this.currentSheet) {
            errors.push('No sheet selected - please select a sheet first');
            return { valid: false, errors, config: null };
        }
        
        // Check MPN column
        const mpnCol = document.getElementById('mpnColumn')?.value;
        if (!mpnCol) {
            errors.push('MPN column is required - please select the column containing part numbers');
        }
        
        // Get and validate output columns - FIXED LOGIC
        const outputColumns = this._getOutputColumnConfigurations();
        
        if (outputColumns.incomplete > 0) {
            errors.push(`${outputColumns.incomplete} output column(s) are incomplete - please fill in all fields (name, API source, and data field)`);
        }
        
        if (outputColumns.valid.length === 0) {
            errors.push('At least one complete output column is required - please add and configure output columns');
        }
        
        // Validate row range
        const rowValidation = this._validateRowRange();
        if (!rowValidation.valid) {
            errors.push(`Row range error: ${rowValidation.message}`);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            config: errors.length === 0 ? {
                mpnColumn: parseInt(mpnCol),
                manufacturerColumn: document.getElementById('manufacturerColumn')?.value ? 
                    parseInt(document.getElementById('manufacturerColumn').value) : null,
                quantityColumn: document.getElementById('quantityColumn')?.value ? 
                    parseInt(document.getElementById('quantityColumn').value) : null,
                outputColumns: outputColumns.valid,
                rowRange: rowValidation
            } : null
        };
    }
    
    /**
     * IMPROVED - Get output column configurations with better validation
     * @private
     * @returns {Object} Column validation result
     */
    _getOutputColumnConfigurations() {
        const valid = [];
        let incomplete = 0;
        
        const container = document.getElementById('outputColumns');
        if (!container) {
            return { valid, incomplete };
        }
        
        const columnDivs = container.querySelectorAll('[data-index]');
        
        columnDivs.forEach((div, index) => {
            const nameInput = div.querySelector('.output-column-name');
            const apiSelect = div.querySelector('.output-api-source');
            const fieldSelect = div.querySelector('.output-data-field');
            
            const name = nameInput?.value?.trim() || '';
            const api = apiSelect?.value || '';
            const field = fieldSelect?.value || '';
            
            // Check if this is a completely empty column (no interaction)
            const hasAnyValue = name || api || field;
            
            if (!hasAnyValue) {
                // Completely empty column - ignore it (user hasn't started configuring)
                ExcelUtils.log('INFO', `Output column ${index + 1} is empty - ignoring`);
                return;
            }
            
            // Check if column configuration is complete
            if (name && api && field) {
                valid.push({ name, api, field });
                ExcelUtils.log('INFO', `Output column ${index + 1} configured: ${name} (${api}.${field})`);
            } else {
                // User started configuring but didn't complete it
                incomplete++;
                ExcelUtils.log('WARN', `Output column ${index + 1} incomplete: name='${name}', api='${api}', field='${field}'`);
            }
        });
        
        return { valid, incomplete };
    }
    
    /**
     * Validate row range configuration
     * @private
     * @returns {Object} Row range validation result
     */
    _validateRowRange() {
        if (!this.currentSheet) {
            return { valid: false, message: 'No sheet data available' };
        }
        
        const headerRow = parseInt(document.getElementById('headerRow')?.value || 1);
        const startRow = parseInt(document.getElementById('startRow')?.value || 2);
        const endRowValue = document.getElementById('endRow')?.value;
        const endRow = endRowValue ? parseInt(endRowValue) : this.currentSheet.data.length;
        
        if (headerRow < 1 || headerRow > this.currentSheet.data.length) {
            return { 
                valid: false, 
                message: `Header row ${headerRow} is invalid (must be 1-${this.currentSheet.data.length})` 
            };
        }
        
        if (startRow <= headerRow) {
            return { 
                valid: false, 
                message: `Start row ${startRow} must be after header row ${headerRow}` 
            };
        }
        
        if (endRow < startRow) {
            return { 
                valid: false, 
                message: `End row ${endRow} cannot be before start row ${startRow}` 
            };
        }
        
        if (endRow > this.currentSheet.data.length) {
            return { 
                valid: false, 
                message: `End row ${endRow} exceeds sheet length (${this.currentSheet.data.length})` 
            };
        }
        
        return {
            valid: true,
            headerRow,
            startRow,
            endRow,
            rowCount: endRow - startRow + 1
        };
    }
    
    /**
     * Check if API credentials are available
     * @private
     * @returns {boolean} True if credentials are available
     */
    _checkApiCredentials() {
        // Check for stored credentials
        const digikeyClientId = localStorage.getItem('digikey_client_id');
        const mouserApiKey = localStorage.getItem('mouser_api_key');
        
        const hasCredentials = !!(digikeyClientId || mouserApiKey);
        
        if (hasCredentials) {
            ExcelUtils.log('INFO', 'API credentials found', {
                digikey: !!digikeyClientId,
                mouser: !!mouserApiKey
            });
        } else {
            ExcelUtils.log('WARN', 'No API credentials configured');
        }
        
        return hasCredentials;
    }
    
    /**
     * Execute the main processing logic
     * @private
     * @param {Object} config - Processing configuration
     */
    async _executeProcessing(config) {
        const { headerRow, startRow, endRow, rowCount } = config.rowRange;
        
        let processed = 0;
        let success = 0;
        let errors = 0;
        const startTime = Date.now();
        
        ExcelUtils.log('INFO', `Starting processing: ${rowCount} rows`, {
            range: `${startRow}-${endRow}`,
            outputColumns: config.outputColumns.length
        });
        
        // Get headers from the specified header row
        const headers = [...this.currentSheet.data[headerRow - 1]];
        
        // Add new columns to headers if they don't exist
        config.outputColumns.forEach(col => {
            if (!headers.includes(col.name)) {
                headers.push(col.name);
                this.currentSheet.data[headerRow - 1].push(col.name);
            }
        });
        
        // Process each row
        for (let rowIndex = startRow - 1; rowIndex < endRow; rowIndex++) {
            const row = this.currentSheet.data[rowIndex];
            if (!row) {
                processed++;
                continue;
            }
            
            const mpn = row[config.mpnColumn];
            const manufacturer = config.manufacturerColumn !== null ? 
                row[config.manufacturerColumn] : '';
            const quantity = config.quantityColumn !== null ? 
                row[config.quantityColumn] : '';
            
            if (!mpn) {
                errors++;
                processed++;
                this._updateProgress(processed, rowCount, success, errors, startTime);
                continue;
            }
            
            ExcelUtils.log('INFO', `Processing row ${processed + 1}: ${mpn}`);
            
            // Process each output column
            for (const outputCol of config.outputColumns) {
                try {
                    const value = await this._fetchApiData(mpn, manufacturer, outputCol);
                    
                    // Find column index
                    const colIndex = headers.indexOf(outputCol.name);
                    if (colIndex !== -1) {
                        // Ensure row has enough columns
                        while (row.length <= colIndex) {
                            row.push('');
                        }
                        row[colIndex] = value;
                    }
                    
                    success++;
                } catch (error) {
                    ExcelUtils.log('ERROR', `API error for ${mpn}: ${error.message}`);
                    errors++;
                }
            }
            
            processed++;
            this._updateProgress(processed, rowCount, success, errors, startTime);
            
            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 250));
        }
        
        // Store processed data for export
        this.processedData = {
            workbook: this.currentWorkbook,
            sheetName: this.currentSheet.name,
            sheetData: this.currentSheet.data,
            headers: headers
        };
        
        ExcelUtils.log('INFO', `Processing completed: ${success} successful, ${errors} errors`);
    }
    
    /**
     * Mock API data fetching - replace with real API calls
     * @private
     * @param {string} mpn - Manufacturer Part Number
     * @param {string} manufacturer - Manufacturer name
     * @param {Object} outputCol - Output column configuration
     * @returns {Promise<string>} API response value
     */
    async _fetchApiData(mpn, manufacturer, outputCol) {
        // Mock API response for demonstration
        const mockResponses = {
            unit_price: () => `$${(Math.random() * 10 + 0.1).toFixed(2)}`,
            manufacturer: () => manufacturer || 'Generic Mfg',
            detailed_description: () => `Electronic component - ${mpn}`,
            datasheet: () => `https://datasheets.example.com/${mpn}.pdf`,
            stock_available: () => `${Math.floor(Math.random() * 5000) + 100}+`,
            package_case: () => ['SOT-23', 'SOIC-8', '0603', '0805', 'QFN-16'][Math.floor(Math.random() * 5)],
            htsus_number: () => '8541.10.0060',
            htsus_stripped: () => '85411000'
        };
        
        const generator = mockResponses[outputCol.field];
        return generator ? generator() : 'N/A';
    }
    
    /**
     * Update progress display
     * @private
     */
    _updateProgress(processed, total, success, errors, startTime) {
        const percent = Math.round((processed / total) * 100);
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = processed / elapsed;
        
        const progressText = document.getElementById('progressText');
        if (progressText) {
            progressText.textContent = `Processing row ${processed} of ${total}...`;
        }
        
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = percent + '%';
        }
        
        ExcelUtils.setText('statProcessed', processed);
        ExcelUtils.setText('statSuccess', success);
        ExcelUtils.setText('statError', errors);
        ExcelUtils.setText('statRate', rate.toFixed(1) + '/s');
    }
    
    /**
     * Export processed Excel file with preserved formatting
     * @private
     */
    _exportExcel() {
        if (!this.processedData) {
            ExcelUtils.showError('No processed data to export');
            return;
        }
        
        try {
            // Update the workbook with processed data
            const sheetName = this.processedData.sheetName;
            const newSheet = XLSX.utils.aoa_to_sheet(this.processedData.sheetData);
            
            // Replace the sheet in the workbook - preserves other sheets
            this.processedData.workbook.Sheets[sheetName] = newSheet;
            
            // Generate Excel file
            const excelBuffer = XLSX.write(this.processedData.workbook, {
                bookType: 'xlsx',
                type: 'array'
            });
            
            // Create download
            const blob = new Blob([excelBuffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `enhanced_${this._getTimestamp()}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            ExcelUtils.log('INFO', 'Excel file exported successfully');
            ExcelUtils.showSuccess('Excel file exported successfully');
        } catch (error) {
            ExcelUtils.log('ERROR', 'Export failed:', error.message);
            ExcelUtils.showError('Export failed: ' + error.message);
        }
    }
    
    /**
     * Reset processor to initial state
     * @private
     */
    _resetProcessor() {
        if (this.isProcessing) {
            ExcelUtils.showError('Cannot reset while processing');
            return;
        }
        
        if (!confirm('Reset all data and start over?')) {
            return;
        }
        
        // Reset state
        this.currentWorkbook = null;
        this.currentSheet = null;
        this.processedData = null;
        this.outputColumns = [];
        this.lastValidationTime = 0;
        
        // Reset UI
        document.getElementById('excelFile').value = '';
        
        const sectionsToHide = [
            'fileInfo', 'sheetSelection', 'previewSection', 
            'mappingSection', 'progressSection', 'exportSection'
        ];
        
        sectionsToHide.forEach(sectionId => {
            ExcelUtils.toggleElement(sectionId, false);
        });
        
        // Clear output columns
        const container = document.getElementById('outputColumns');
        if (container) {
            container.innerHTML = '';
        }
        
        this.uiController.setSystemStatus('Ready');
        ExcelUtils.log('INFO', 'Processor reset successfully');
    }
    
    /**
     * Clear mapping configuration
     * @private
     */
    _clearMapping() {
        if (!confirm('Clear all mapping configuration?')) {
            return;
        }
        
        // Clear column selections
        const columnSelects = ['mpnColumn', 'manufacturerColumn', 'quantityColumn'];
        columnSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) select.value = '';
        });
        
        // Clear output columns
        this.outputColumns.forEach(config => {
            if (config.element) {
                config.element.remove();
            }
        });
        this.outputColumns = [];
        
        const container = document.getElementById('outputColumns');
        if (container) {
            container.innerHTML = '';
        }
        
        ExcelUtils.log('INFO', 'Mapping configuration cleared');
        ExcelUtils.showSuccess('Mapping configuration cleared');
    }
    
    /**
     * Utility function to get timestamp for filenames
     * @private
     */
    _getTimestamp() {
        return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    }
    
    /**
     * Get current application state for debugging
     * @returns {Object} Application state
     */
    getState() {
        return {
            initialized: this.initialized,
            hasWorkbook: !!this.currentWorkbook,
            hasSheet: !!this.currentSheet,
            outputColumnCount: this.outputColumns.length,
            isProcessing: this.isProcessing,
            hasProcessedData: !!this.processedData,
            currentSheet: this.currentSheet ? {
                name: this.currentSheet.name,
                rowCount: this.currentSheet.data.length
            } : null
        };
    }
}

// Export to global namespace
window.ExcelProcessor = ExcelProcessor;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        try {
            window.excelProcessor = new ExcelProcessor();
            ExcelUtils.log('INFO', 'Application ready');
        } catch (error) {
            ExcelUtils.log('ERROR', 'Failed to initialize application', error.message);
            console.error('Initialization error:', error);
        }
    });
} else {
    try {
        window.excelProcessor = new ExcelProcessor();
        ExcelUtils.log('INFO', 'Application ready');
    } catch (error) {
        ExcelUtils.log('ERROR', 'Failed to initialize application', error.message);
        console.error('Initialization error:', error);
    }
}