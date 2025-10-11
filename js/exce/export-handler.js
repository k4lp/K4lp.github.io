/**
 * Excel API Processor - Export Handler
 * Alica Technologies
 */

window.ExcelProcessorExport = {
    // Internal state
    _isInitialized: false,

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
     * Bind event listeners
     */
    _bindEvents() {
        // Export Excel button
        const exportBtn = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.EXPORT_EXCEL);
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this._exportExcel());
        }

        // Reset processor button
        const resetBtn = document.getElementById(window.ExcelProcessorConfig.ELEMENTS.RESET_PROCESSOR);
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this._resetProcessor());
        }
    },

    /**
     * Export enhanced Excel file
     */
    _exportExcel() {
        try {
            const processedData = window.ExcelProcessorExcel.getProcessedData();
            
            if (!processedData || !processedData.sheetData) {
                alert('No processed data available for export');
                return;
            }

            window.ExcelProcessorUtils.log.info('Exporting enhanced Excel file...');

            // Create a new workbook
            const wb = XLSX.utils.book_new();

            // Convert the processed data array back to a worksheet
            const ws = XLSX.utils.aoa_to_sheet(processedData.sheetData);

            // Add the worksheet to the workbook
            XLSX.utils.book_append_sheet(wb, ws, processedData.sheetName || 'Sheet1');

            // Generate filename with timestamp
            const timestamp = window.ExcelProcessorUtils.datetime.getTimestamp();
            const filename = `enhanced_excel_${timestamp}.xlsx`;

            // Write the workbook and trigger download
            XLSX.writeFile(wb, filename);

            window.ExcelProcessorUtils.log.info(`File exported: ${filename}`);

        } catch (error) {
            window.ExcelProcessorUtils.log.error('Export failed:', error.message);
            alert('Export failed: ' + error.message);
        }
    },

    /**
     * Reset processor to start over
     */
    _resetProcessor() {
        if (!confirm('Start over? This will clear all current data and settings.')) {
            return;
        }

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
