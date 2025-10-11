/**
 * Excel API Processor - File Handler
 * Single responsibility: File upload and Excel parsing
 * Alica Technologies
 */

'use strict';

/**
 * Clean file handler class for Excel processing
 */
class FileHandler {
    constructor() {
        // Supported file extensions (without dots to match getFileExtension)
        this.supportedTypes = ['.xlsx', '.xls'];
        this.maxSize = 50 * 1024 * 1024; // 50MB
        
        ExcelUtils.log('INFO', 'FileHandler initialized', {
            supportedTypes: this.supportedTypes,
            maxSize: ExcelUtils.formatFileSize(this.maxSize)
        });
    }
    
    /**
     * Process uploaded file: validate and parse Excel
     * @param {File} file - File object from input
     * @returns {Promise<Object>} Workbook object
     */
    async processFile(file) {
        ExcelUtils.log('INFO', 'Processing file', {
            name: file.name,
            size: ExcelUtils.formatFileSize(file.size),
            type: file.type
        });
        
        // Validate file
        const validation = this._validateFile(file);
        if (!validation.valid) {
            throw new Error(validation.error);
        }
        
        try {
            // Parse Excel file
            const workbook = await this._parseExcelFile(file);
            
            ExcelUtils.log('INFO', 'File processed successfully', {
                sheets: workbook.SheetNames.length,
                sheetNames: workbook.SheetNames
            });
            
            return workbook;
        } catch (error) {
            ExcelUtils.log('ERROR', 'Failed to parse Excel file', error.message);
            throw new Error(`Failed to parse Excel file: ${error.message}`);
        }
    }
    
    /**
     * Get sheet data from workbook
     * @param {Object} workbook - XLSX workbook object
     * @param {string} sheetName - Name of sheet to extract
     * @param {Object} options - Parsing options
     * @returns {Array} Sheet data as array of arrays
     */
    getSheetData(workbook, sheetName, options = {}) {
        if (!workbook || !workbook.Sheets || !workbook.Sheets[sheetName]) {
            throw new Error(`Sheet '${sheetName}' not found`);
        }
        
        const defaultOptions = {
            header: 1, // Return arrays instead of objects
            defval: '', // Default value for empty cells
            blankrows: true // Include blank rows
        };
        
        const parseOptions = { ...defaultOptions, ...options };
        
        try {
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, parseOptions);
            
            ExcelUtils.log('INFO', 'Sheet data extracted', {
                sheetName,
                rowCount: data.length,
                columnCount: data.length > 0 ? Math.max(...data.map(row => row.length || 0)) : 0
            });
            
            return data;
        } catch (error) {
            ExcelUtils.log('ERROR', 'Failed to extract sheet data', error.message);
            throw new Error(`Failed to extract sheet data: ${error.message}`);
        }
    }
    
    /**
     * Get file information object
     * @param {File} file - File object
     * @returns {Object} File information
     */
    getFileInfo(file) {
        return {
            name: file.name,
            size: file.size,
            formattedSize: ExcelUtils.formatFileSize(file.size),
            type: file.type,
            extension: ExcelUtils.getFileExtension(file.name),
            lastModified: new Date(file.lastModified)
        };
    }
    
    /**
     * Validate file format and size
     * @private
     * @param {File} file - File to validate
     * @returns {Object} Validation result
     */
    _validateFile(file) {
        const result = { valid: true, error: null };
        
        if (!file) {
            result.valid = false;
            result.error = 'No file selected';
            return result;
        }
        
        // Check file size
        if (file.size === 0) {
            result.valid = false;
            result.error = 'File is empty';
            return result;
        }
        
        if (file.size > this.maxSize) {
            result.valid = false;
            result.error = `File size (${ExcelUtils.formatFileSize(file.size)}) exceeds maximum allowed size (${ExcelUtils.formatFileSize(this.maxSize)})`;
            return result;
        }
        
        // Check file extension
        const extension = ExcelUtils.getFileExtension(file.name);
        if (!this.supportedTypes.includes(extension)) {
            result.valid = false;
            result.error = `Unsupported file format '${extension}'. Supported formats: ${this.supportedTypes.join(', ')}`;
            return result;
        }
        
        ExcelUtils.log('INFO', 'File validation passed', {
            name: file.name,
            extension,
            size: ExcelUtils.formatFileSize(file.size)
        });
        
        return result;
    }
    
    /**
     * Parse Excel file using XLSX library
     * @private
     * @param {File} file - File to parse
     * @returns {Promise<Object>} XLSX workbook object
     */
    _parseExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(event) {
                try {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, {
                        type: 'array',
                        cellDates: true,
                        cellNF: false,
                        cellText: false
                    });
                    resolve(workbook);
                } catch (error) {
                    reject(new Error(`Failed to parse Excel data: ${error.message}`));
                }
            };
            
            reader.onerror = function() {
                reject(new Error('Failed to read file'));
            };
            
            reader.onprogress = function(event) {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    ExcelUtils.log('INFO', `Reading file: ${progress}%`);
                }
            };
            
            reader.readAsArrayBuffer(file);
        });
    }
}

// Export to global namespace
window.FileHandler = FileHandler;