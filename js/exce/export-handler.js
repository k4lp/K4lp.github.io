/**
 * Excel API Processor - Export Handler (FIXED)
 * Alica Technologies
 */

window.ExcelProcessorExport = {
    // Internal state
    _isInitialized: false,
    _originalWorkbook: null,
    _originalWorksheet: null,

    /**
     * Initialize export handler
     */
    init() {
        if (this._isInitialized) {
            return;
        }

        this._bindEvents();
        this._isInitialized = true;
        window.ExcelProcessorUtils.log.info('Export handler initialized');
    },

    /**
     * Store original workbook for format preservation
     */
    setOriginalWorkbook(workbook, worksheet) {
        this._originalWorkbook = workbook;
        this._originalWorksheet = worksheet;
        window.ExcelProcessorUtils.log.info('Original workbook stored for format preservation');
    },

    /**
     * Bind event listeners
     */
    _bindEvents() {
        // Export Excel button
        const exportBtn = document.getElementById('exportExcel');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this._exportExcel());
        }

        // Reset processor button
        const resetBtn = document.getElementById('resetProcessor');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this._resetProcessor());
        }
    },

    /**
     * Export enhanced Excel file - FIXED: Preserves original formatting
     */
    _exportExcel() {
        try {
            const processedData = window.ExcelProcessorExcel.getProcessedData();
            
            if (!processedData || !processedData.sheetData) {
                alert('No processed data available for export');
                return;
            }

            window.ExcelProcessorUtils.log.info('Exporting enhanced Excel file with preserved formatting...');

            let wb, ws;

            if (this._originalWorkbook && this._originalWorksheet) {
                // FIXED: Use original workbook to preserve formatting
                wb = this._originalWorkbook;
                ws = this._originalWorksheet;
                
                // Update the worksheet with processed data while preserving formatting
                this._updateWorksheetData(ws, processedData.sheetData, processedData.headerRow || 1);
                
                window.ExcelProcessorUtils.log.info('Updated original worksheet with processed data');
            } else {
                // Fallback: Create new workbook if original not available
                wb = XLSX.utils.book_new();
                ws = XLSX.utils.aoa_to_sheet(processedData.sheetData);
                XLSX.utils.book_append_sheet(wb, ws, processedData.sheetName || 'Sheet1');
                
                window.ExcelProcessorUtils.log.warn('Creating new workbook - original formatting not preserved');
            }

            // Generate filename with timestamp
            const timestamp = window.ExcelProcessorUtils.datetime.getTimestamp();
            const originalName = processedData.originalFileName || 'excel_file';
            const baseName = originalName.replace(/\.[^/.]+$/, ''); // Remove extension
            const filename = `${baseName}_enhanced_${timestamp}.xlsx`;

            // Write the workbook with maximum compatibility
            const writeOpts = {
                bookType: 'xlsx',
                type: 'binary',
                cellStyles: true,
                cellNF:true,
                cellHTML: false
            };

            // Write and trigger download
            XLSX.writeFile(wb, filename, writeOpts);

            window.ExcelProcessorUtils.log.info(`File exported with preserved formatting: ${filename}`);

        } catch (error) {
            window.ExcelProcessorUtils.log.error('Export failed:', error.message);
            alert('Export failed: ' + error.message);
        }
    },

    /**
     * Update worksheet data while preserving formatting - FIXED: Core functionality
     */
    _updateWorksheetData(worksheet, newData, headerRow = 1) {
        try {
            // Find the range of the worksheet
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
            
            // Update data while preserving cell formatting
            newData.forEach((row, rowIndex) => {
                if (!Array.isArray(row)) return;
                
                row.forEach((cellValue, colIndex) => {
                    const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
                    
                    if (worksheet[cellRef]) {
                        // Cell exists - preserve formatting and update value
                        const originalCell = worksheet[cellRef];
                        const cellType = this._determineCellType(cellValue);
                        
                        // Preserve original cell properties
                        const newCell = {
                            ...originalCell, // Keep original formatting
                            v: cellValue,    // Update value
                            t: cellType      // Update type if needed
                        };
                        
                        // Handle different value types
                        if (cellType === 'n' && !isNaN(cellValue)) {
                            newCell.v = parseFloat(cellValue);
                        } else if (cellType === 'd' && cellValue instanceof Date) {
                            newCell.v = cellValue;
                        } else {
                            newCell.v = String(cellValue || '');
                            newCell.t = 's';
                        }
                        
                        worksheet[cellRef] = newCell;
                    } else {
                        // New cell - create with basic formatting
                        const cellType = this._determineCellType(cellValue);
                        worksheet[cellRef] = {
                            v: cellValue,
                            t: cellType
                        };
                        
                        // Extend range if necessary
                        if (rowIndex > range.e.r) range.e.r = rowIndex;
                        if (colIndex > range.e.c) range.e.c = colIndex;
                    }
                });
            });
            
            // Update worksheet range
            worksheet['!ref'] = XLSX.utils.encode_range(range);
            
            window.ExcelProcessorUtils.log.info(`Updated ${newData.length} rows while preserving formatting`);
            
        } catch (error) {
            window.ExcelProcessorUtils.log.error('Error updating worksheet data:', error.message);
            throw error;
        }
    },

    /**
     * Determine appropriate cell type for value
     */
    _determineCellType(value) {
        if (value === null || value === undefined || value === '') {
            return 's'; // String (empty)
        }
        
        if (typeof value === 'number') {
            return 'n'; // Number
        }
        
        if (value instanceof Date) {
            return 'd'; // Date
        }
        
        if (typeof value === 'boolean') {
            return 'b'; // Boolean
        }
        
        // Check if string represents a number
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && isFinite(numValue) && String(numValue) === String(value)) {
            return 'n'; // Number as string
        }
        
        return 's'; // String
    },

    /**
     * Reset processor to start over
     */
    _resetProcessor() {
        if (!confirm('Start over? This will clear all current data and settings.')) {
            return;
        }

        // Clear stored workbook references
        this._originalWorkbook = null;
        this._originalWorksheet = null;

        // Reset the Excel processor
        if (window.ExcelProcessorExcel && typeof window.ExcelProcessorExcel.reset === 'function') {
            window.ExcelProcessorExcel.reset();
        }

        // Reset system status
        window.ExcelProcessorUtils.status.setSystemStatus('Ready');
        window.ExcelProcessorUtils.status.showProcessing(false);

        window.ExcelProcessorUtils.log.info('System reset - Ready for new file');
    },

    /**
     * Check if export is ready
     */
    isExportReady() {
        const processedData = window.ExcelProcessorExcel?.getProcessedData();
        return !!(processedData && processedData.sheetData);
    },

    /**
     * Get export statistics
     */
    getExportStats() {
        const processedData = window.ExcelProcessorExcel?.getProcessedData();
        
        if (!processedData) {
            return {
                ready: false,
                rows: 0,
                columns: 0,
                hasFormatting: false
            };
        }

        return {
            ready: true,
            rows: processedData.sheetData ? processedData.sheetData.length : 0,
            columns: processedData.sheetData && processedData.sheetData[0] ? 
                     processedData.sheetData[0].length : 0,
            hasFormatting: !!(this._originalWorkbook && this._originalWorksheet),
            originalFileName: processedData.originalFileName
        };
    }
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.ExcelProcessorExport.init();
    });
} else {
    window.ExcelProcessorExport.init();
}