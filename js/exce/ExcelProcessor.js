/**
 * Excel API Processor - Main Application
 * Clean orchestration without over-engineering
 * Alica Technologies
 */

'use strict';

/**
 * Main Excel processor class - simple and working
 */
class ExcelProcessor {
    constructor() {
        this.fileHandler = null;
        this.uiController = null;
        this.currentWorkbook = null;
        this.currentSheet = null;
        this.outputColumns = [];
        this.initialized = false;
        
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
        
        // Process data button
        const processBtn = this.uiController.elements.processData;
        if (processBtn) {
            processBtn.addEventListener('click', () => this._processData());
        }
        
        // Clear mapping button
        const clearBtn = this.uiController.elements.clearMapping;
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this._clearMapping());
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
            ExcelUtils.showSuccess('File loaded successfully');
            
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
     * Process data (placeholder for now)
     * @private
     */
    _processData() {
        ExcelUtils.showError('Processing functionality not yet implemented', 'Feature Not Available');
        ExcelUtils.log('INFO', 'Process data requested (not implemented yet)');
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
        
        ExcelUtils.log('INFO', 'Mapping configuration cleared');
        ExcelUtils.showSuccess('Mapping configuration cleared');
    }
    
    /**
     * Get current application state
     * @returns {Object} Application state
     */
    getState() {
        return {
            initialized: this.initialized,
            hasWorkbook: !!this.currentWorkbook,
            hasSheet: !!this.currentSheet,
            outputColumnCount: this.outputColumns.length,
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