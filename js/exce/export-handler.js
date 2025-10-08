/**
 * Excel API Processor - Export Handler
 * Alica Technologies
 */

window.ExcelProcessorExport = {
    /**
     * Initialize export handler
     */
    init() {
        this._bindEvents();
        window.ExcelProcessorUtils.log.info('Export handler initialized');
    },

    /**
     * Bind event listeners
     */
    _bindEvents() {
        const exportBtn = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.EXPORT_EXCEL);
        if (exportBtn) {
            exportBtn.addEventListener('click', this._exportEnhancedExcel.bind(this));
        }

        const resetBtn = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.RESET_PROCESSOR);
        if (resetBtn) {
            resetBtn.addEventListener('click', this._resetProcessor.bind(this));
        }
    },

    /**
     * Export enhanced Excel file with original formatting preserved
     */
    async _exportEnhancedExcel() {
        try {
            window.ExcelProcessorUtils.status.setSystemStatus('Preparing export...');
            window.ExcelProcessorUtils.status.showProcessing(true);

            // Get original workbook and processed data
            const originalWorkbook = window.ExcelProcessorExcel.getOriginalWorkbook();
            const processedData = window.ExcelProcessorExcel.getProcessedData();
            const outputColumns = window.ExcelProcessorExcel.getOutputColumns();

            if (!originalWorkbook || !processedData || !outputColumns) {
                throw new Error('Missing required data for export');
            }

            // Create enhanced workbook
            const enhancedWorkbook = await this._createEnhancedWorkbook(
                originalWorkbook,
                processedData,
                outputColumns
            );

            // Generate filename
            const timestamp = window.ExcelProcessorUtils.datetime.getTimestamp();
            const filename = `Enhanced_Excel_${timestamp}.xlsx`;

            // Export file
            XLSX.writeFile(enhancedWorkbook, filename);

            window.ExcelProcessorUtils.status.setSystemStatus('Export complete');
            window.ExcelProcessorUtils.log.info('Enhanced Excel exported:', filename);

        } catch (error) {
            window.ExcelProcessorUtils.log.error('Export error:', error.message);
            alert('Export failed: ' + error.message);
            window.ExcelProcessorUtils.status.setSystemStatus('Export error');
        } finally {
            window.ExcelProcessorUtils.status.showProcessing(false);
        }
    },

    /**
     * Create enhanced workbook with API data appended
     */
    async _createEnhancedWorkbook(originalWorkbook, processedData, outputColumns) {
        // Clone the original workbook to preserve formatting
        const enhancedWorkbook = this._cloneWorkbook(originalWorkbook);
        
        // Get current sheet name from Excel processor
        const currentSheet = this._getCurrentSheetName();
        if (!currentSheet) {
            throw new Error('No current sheet selected');
        }

        // Get the sheet to modify
        const sheet = enhancedWorkbook.Sheets[currentSheet];
        if (!sheet) {
            throw new Error(`Sheet '${currentSheet}' not found in workbook`);
        }

        // Add new columns with API data
        await this._addApiColumnsToSheet(sheet, processedData, outputColumns);

        return enhancedWorkbook;
    },

    /**
     * Clone workbook to preserve original formatting
     */
    _cloneWorkbook(workbook) {
        // Create a deep copy of the workbook
        const cloned = {
            SheetNames: [...workbook.SheetNames],
            Sheets: {},
            Props: workbook.Props ? { ...workbook.Props } : undefined,
            SSF: workbook.SSF ? { ...workbook.SSF } : undefined,
            Workbook: workbook.Workbook ? { ...workbook.Workbook } : undefined
        };

        // Clone each sheet
        for (const sheetName of workbook.SheetNames) {
            cloned.Sheets[sheetName] = this._cloneSheet(workbook.Sheets[sheetName]);
        }

        return cloned;
    },

    /**
     * Clone individual sheet
     */
    _cloneSheet(sheet) {
        const cloned = {};
        
        // Copy all properties including cells, formatting, and metadata
        for (const key in sheet) {
            if (sheet.hasOwnProperty(key)) {
                if (typeof sheet[key] === 'object' && sheet[key] !== null) {
                    // Deep clone objects (cells, formatting, etc.)
                    cloned[key] = JSON.parse(JSON.stringify(sheet[key]));
                } else {
                    // Copy primitive values
                    cloned[key] = sheet[key];
                }
            }
        }
        
        return cloned;
    },

    /**
     * Get current sheet name from Excel processor
     */
    _getCurrentSheetName() {
        const sheetSelect = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.SHEET_SELECT);
        return sheetSelect ? sheetSelect.value : null;
    },

    /**
     * Add API columns to sheet
     */
    async _addApiColumnsToSheet(sheet, processedData, outputColumns) {
        // Get sheet range
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        
        // Find the next available column (after existing data)
        let nextCol = range.e.c + 1;
        
        // Add header row for new columns
        outputColumns.forEach((column, index) => {
            const colIndex = nextCol + index;
            const headerCell = XLSX.utils.encode_cell({ r: 0, c: colIndex });
            
            // Add header cell
            sheet[headerCell] = {
                v: column.title,
                t: 's',
                s: this._getHeaderCellStyle()
            };
        });

        // Add data rows
        processedData.forEach((rowData) => {
            const rowIndex = rowData.rowIndex; // This is the original row index
            
            outputColumns.forEach((column, colIndex) => {
                const cellIndex = nextCol + colIndex;
                const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: cellIndex });
                
                // Get API data value for this column
                const value = rowData.apiData[column.id] || '';
                
                // Add data cell
                sheet[cellAddress] = {
                    v: value,
                    t: this._inferCellType(value),
                    s: this._getDataCellStyle()
                };
            });
        });

        // Update sheet range to include new columns
        const newRange = {
            s: range.s,
            e: {
                r: range.e.r,
                c: nextCol + outputColumns.length - 1
            }
        };
        
        sheet['!ref'] = XLSX.utils.encode_range(newRange);
        
        // Update column widths if needed
        this._updateColumnWidths(sheet, nextCol, outputColumns.length);
    },

    /**
     * Get header cell style
     */
    _getHeaderCellStyle() {
        return {
            font: { bold: true },
            fill: { fgColor: { rgb: 'E3F2FD' } },
            border: {
                top: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' }
            },
            alignment: { horizontal: 'center', vertical: 'center' }
        };
    },

    /**
     * Get data cell style
     */
    _getDataCellStyle() {
        return {
            border: {
                top: { style: 'thin', color: { rgb: 'E0E0E0' } },
                bottom: { style: 'thin', color: { rgb: 'E0E0E0' } },
                left: { style: 'thin', color: { rgb: 'E0E0E0' } },
                right: { style: 'thin', color: { rgb: 'E0E0E0' } }
            },
            alignment: { vertical: 'top', wrapText: true }
        };
    },

    /**
     * Infer cell data type
     */
    _inferCellType(value) {
        if (value === null || value === undefined || value === '') {
            return 's'; // string
        }
        
        const str = String(value);
        
        // Check if it's a number
        if (!isNaN(parseFloat(str)) && isFinite(str)) {
            return 'n'; // number
        }
        
        // Check if it's a boolean
        if (str.toLowerCase() === 'true' || str.toLowerCase() === 'false') {
            return 'b'; // boolean
        }
        
        // Check if it's a URL
        if (str.startsWith('http://') || str.startsWith('https://')) {
            return 's'; // string (but could be formatted as hyperlink)
        }
        
        // Default to string
        return 's';
    },

    /**
     * Update column widths for new columns
     */
    _updateColumnWidths(sheet, startCol, numCols) {
        if (!sheet['!cols']) {
            sheet['!cols'] = [];
        }
        
        // Extend the cols array if needed
        while (sheet['!cols'].length < startCol + numCols) {
            sheet['!cols'].push({ width: 15 }); // Default width
        }
        
        // Set widths for new columns based on content type
        for (let i = 0; i < numCols; i++) {
            const colIndex = startCol + i;
            
            // Set appropriate width based on column content
            // This is a basic implementation - could be enhanced to analyze content
            sheet['!cols'][colIndex] = { width: 20 };
        }
    },

    /**
     * Export results as CSV (alternative export option)
     */
    async exportAsCSV() {
        try {
            const processedData = window.ExcelProcessorExcel.getProcessedData();
            const outputColumns = window.ExcelProcessorExcel.getOutputColumns();
            const sheetData = window.ExcelProcessorExcel.getSheetDataWithHeaders();

            if (!processedData || !outputColumns || !sheetData) {
                throw new Error('Missing required data for CSV export');
            }

            // Create CSV content
            const csvContent = this._createCSVContent(sheetData, processedData, outputColumns);
            
            // Create and download file
            const timestamp = window.ExcelProcessorUtils.datetime.getTimestamp();
            const filename = `Enhanced_Data_${timestamp}.csv`;
            
            this._downloadCSV(csvContent, filename);
            
            window.ExcelProcessorUtils.log.info('CSV exported:', filename);

        } catch (error) {
            window.ExcelProcessorUtils.log.error('CSV export error:', error.message);
            alert('CSV export failed: ' + error.message);
        }
    },

    /**
     * Create CSV content
     */
    _createCSVContent(originalData, processedData, outputColumns) {
        const escape = str => `"${String(str).replace(/"/g, '""')}"`;
        
        // Create header row
        const originalHeaders = originalData[0] || [];
        const newHeaders = outputColumns.map(col => col.title);
        const allHeaders = [...originalHeaders, ...newHeaders];
        
        let csvContent = allHeaders.map(escape).join(',') + '\n';
        
        // Create data rows
        const originalRows = originalData.slice(1); // Skip header
        
        originalRows.forEach((originalRow, index) => {
            const rowIndex = index + 1; // +1 because we skipped header
            
            // Find processed data for this row
            const processedRow = processedData.find(p => p.rowIndex === rowIndex);
            
            // Combine original and new data
            const newData = outputColumns.map(col => {
                return processedRow ? (processedRow.apiData[col.id] || '') : '';
            });
            
            const allData = [...originalRow, ...newData];
            csvContent += allData.map(escape).join(',') + '\n';
        });
        
        return csvContent;
    },

    /**
     * Download CSV file
     */
    _downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    },

    /**
     * Reset the entire processor
     */
    _resetProcessor() {
        if (confirm('Reset the entire processor? This will clear all data and start over.')) {
            // Reset all modules
            window.ExcelProcessorExcel.reset();
            
            // Hide sections
            window.ExcelProcessorUtils.dom.hide(window.ExcelProcessorConfig.ELEMENTS.PROGRESS_SECTION);
            window.ExcelProcessorUtils.dom.hide(window.ExcelProcessorConfig.ELEMENTS.EXPORT_SECTION);
            
            // Reset status
            window.ExcelProcessorUtils.status.setSystemStatus('Ready');
            window.ExcelProcessorUtils.status.showProcessing(false);
            
            window.ExcelProcessorUtils.log.info('Processor reset completed');
        }
    },

    /**
     * Get export statistics
     */
    getExportStats() {
        const processedData = window.ExcelProcessorExcel.getProcessedData();
        const outputColumns = window.ExcelProcessorExcel.getOutputColumns();
        
        if (!processedData || !outputColumns) {
            return null;
        }
        
        return {
            totalRows: processedData.length,
            successfulRows: processedData.filter(r => !r.error).length,
            errorRows: processedData.filter(r => r.error).length,
            outputColumns: outputColumns.length,
            apis: [...new Set(outputColumns.map(c => c.api))]
        };
    },

    /**
     * Validate export readiness
     */
    isExportReady() {
        const processedData = window.ExcelProcessorExcel.getProcessedData();
        const outputColumns = window.ExcelProcessorExcel.getOutputColumns();
        const originalWorkbook = window.ExcelProcessorExcel.getOriginalWorkbook();
        
        return !!(processedData && outputColumns && originalWorkbook && 
                 processedData.length > 0 && outputColumns.length > 0);
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