/**
 * Excel API Processor - File Service
 * Professional File Handling Service
 * Alica Technologies
 */

(function(global) {
    'use strict';

    /**
     * Professional file handling service for Excel files
     */
    class FileService {
        constructor() {
            this.supportedFormats = ['xlsx', 'xls'];
            this.maxFileSize = 50 * 1024 * 1024; // 50MB default
            this.currentFile = null;
            this.workbook = null;
            this.initialized = false;
        }

        /**
         * Initialize file service
         * @param {Object} config - Service configuration
         */
        init(config = {}) {
            if (config.supportedFormats) {
                this.supportedFormats = config.supportedFormats;
            }
            if (config.maxFileSize) {
                this.maxFileSize = config.maxFileSize;
            }

            this.initialized = true;
            this._log('info', 'FileService initialized', { 
                supportedFormats: this.supportedFormats,
                maxFileSize: this._formatFileSize(this.maxFileSize)
            });
        }

        /**
         * Validate file before processing
         * @param {File} file - File object to validate
         * @returns {Object} Validation result
         */
        validateFile(file) {
            const result = {
                valid: true,
                errors: [],
                warnings: []
            };

            if (!file) {
                result.valid = false;
                result.errors.push('No file provided');
                return result;
            }

            // Check file size
            if (file.size > this.maxFileSize) {
                result.valid = false;
                result.errors.push(`File size (${this._formatFileSize(file.size)}) exceeds limit (${this._formatFileSize(this.maxFileSize)})`);
            }

            if (file.size === 0) {
                result.valid = false;
                result.errors.push('File is empty');
            }

            // Check file extension
            const extension = this._getFileExtension(file.name);
            if (!this.supportedFormats.includes(extension.toLowerCase())) {
                result.valid = false;
                result.errors.push(`Unsupported file format '${extension}'. Supported: ${this.supportedFormats.join(', ')}`);
            }

            // Warnings for large files
            if (file.size > 10 * 1024 * 1024) { // 10MB
                result.warnings.push('Large file detected - processing may take longer');
            }

            this._log('debug', 'File validation completed', {
                fileName: file.name,
                fileSize: this._formatFileSize(file.size),
                valid: result.valid,
                errors: result.errors,
                warnings: result.warnings
            });

            return result;
        }

        /**
         * Load Excel file and parse workbook
         * @param {File} file - Excel file to load
         * @returns {Promise<Object>} File info and workbook
         */
        async loadFile(file) {
            this._log('info', 'Loading file', { fileName: file.name });
            
            // Validate first
            const validation = this.validateFile(file);
            if (!validation.valid) {
                throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
            }

            try {
                const workbook = await this._readExcelFile(file);
                
                this.currentFile = file;
                this.workbook = workbook;

                const fileInfo = {
                    name: file.name,
                    size: file.size,
                    formattedSize: this._formatFileSize(file.size),
                    type: file.type,
                    lastModified: new Date(file.lastModified),
                    extension: this._getFileExtension(file.name),
                    sheetCount: workbook.SheetNames.length,
                    sheetNames: workbook.SheetNames
                };

                this._log('info', 'File loaded successfully', fileInfo);
                this._emitEvent('file.loaded', { file: fileInfo, workbook });

                return { fileInfo, workbook };
            } catch (error) {
                this._log('error', 'Failed to load file', error);
                this._emitEvent('file.error', { error: error.message });
                throw error;
            }
        }

        /**
         * Get sheet data from workbook
         * @param {string|number} sheetIdentifier - Sheet name or index
         * @param {Object} options - Parsing options
         * @returns {Object} Sheet data and metadata
         */
        getSheetData(sheetIdentifier, options = {}) {
            if (!this.workbook) {
                throw new Error('No workbook loaded');
            }

            const defaultOptions = {
                header: 1,
                defval: '',
                blankrows: true,
                maxRows: null,
                range: null
            };

            const opts = { ...defaultOptions, ...options };

            let sheetName;
            if (typeof sheetIdentifier === 'number') {
                sheetName = this.workbook.SheetNames[sheetIdentifier];
            } else {
                sheetName = sheetIdentifier;
            }

            if (!sheetName || !this.workbook.Sheets[sheetName]) {
                throw new Error(`Sheet '${sheetIdentifier}' not found`);
            }

            const worksheet = this.workbook.Sheets[sheetName];
            
            try {
                let sheetData = XLSX.utils.sheet_to_json(worksheet, opts);
                
                // Apply max rows limit if specified
                if (opts.maxRows && sheetData.length > opts.maxRows) {
                    sheetData = sheetData.slice(0, opts.maxRows);
                }

                const metadata = {
                    sheetName,
                    rowCount: sheetData.length,
                    columnCount: sheetData.length > 0 ? Math.max(...sheetData.map(row => row.length || 0)) : 0,
                    range: worksheet['!ref'] || 'A1:A1',
                    lastCell: worksheet['!ref'] ? worksheet['!ref'].split(':')[1] : 'A1'
                };

                this._log('debug', 'Sheet data retrieved', {
                    sheetName,
                    rowCount: metadata.rowCount,
                    columnCount: metadata.columnCount
                });

                return {
                    data: sheetData,
                    metadata
                };
            } catch (error) {
                this._log('error', 'Failed to parse sheet data', error);
                throw new Error(`Failed to parse sheet '${sheetName}': ${error.message}`);
            }
        }

        /**
         * Get file info for current loaded file
         * @returns {Object|null} Current file info
         */
        getCurrentFileInfo() {
            if (!this.currentFile) {
                return null;
            }

            return {
                name: this.currentFile.name,
                size: this.currentFile.size,
                formattedSize: this._formatFileSize(this.currentFile.size),
                type: this.currentFile.type,
                lastModified: new Date(this.currentFile.lastModified),
                extension: this._getFileExtension(this.currentFile.name),
                sheetCount: this.workbook ? this.workbook.SheetNames.length : 0,
                sheetNames: this.workbook ? this.workbook.SheetNames : []
            };
        }

        /**
         * Get available sheet names
         * @returns {Array} Sheet names
         */
        getSheetNames() {
            return this.workbook ? this.workbook.SheetNames : [];
        }

        /**
         * Check if service has a loaded file
         * @returns {boolean} True if file is loaded
         */
        hasLoadedFile() {
            return this.currentFile !== null && this.workbook !== null;
        }

        /**
         * Clear current file and workbook
         */
        clearFile() {
            if (this.currentFile) {
                this._log('info', 'Clearing loaded file', { fileName: this.currentFile.name });
            }

            this.currentFile = null;
            this.workbook = null;
            
            this._emitEvent('file.cleared');
        }

        /**
         * Get service statistics
         * @returns {Object} Service stats
         */
        getStats() {
            return {
                hasLoadedFile: this.hasLoadedFile(),
                currentFile: this.currentFile ? {
                    name: this.currentFile.name,
                    size: this._formatFileSize(this.currentFile.size)
                } : null,
                supportedFormats: this.supportedFormats,
                maxFileSize: this._formatFileSize(this.maxFileSize)
            };
        }

        /**
         * Read Excel file using FileReader and XLSX
         * @private
         * @param {File} file - File to read
         * @returns {Promise<Object>} Workbook object
         */
        _readExcelFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = (event) => {
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
                        reject(new Error(`Failed to parse Excel file: ${error.message}`));
                    }
                };

                reader.onerror = () => {
                    reject(new Error('Failed to read file'));
                };

                reader.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const progress = (event.loaded / event.total) * 100;
                        this._emitEvent('file.reading.progress', { progress });
                    }
                };

                reader.readAsArrayBuffer(file);
            });
        }

        /**
         * Get file extension from filename
         * @private
         * @param {string} filename - File name
         * @returns {string} File extension without dot
         */
        _getFileExtension(filename) {
            return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
        }

        /**
         * Format file size in human readable format
         * @private
         * @param {number} bytes - Size in bytes
         * @returns {string} Formatted size
         */
        _formatFileSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        /**
         * Log message using global logger
         * @private
         */
        _log(level, message, data = null) {
            if (global.ExcelProcessor && global.ExcelProcessor.Core && global.ExcelProcessor.Core.Logger) {
                global.ExcelProcessor.Core.Logger[level]('FileService', message, data);
            }
        }

        /**
         * Emit event using global event bus
         * @private
         */
        _emitEvent(event, data = null) {
            if (global.ExcelProcessor && global.ExcelProcessor.Core && global.ExcelProcessor.Core.EventBus) {
                global.ExcelProcessor.Core.EventBus.emit(event, data);
            }
        }
    }

    // Export to global namespace
    if (!global.ExcelProcessor) {
        global.ExcelProcessor = {};
    }
    if (!global.ExcelProcessor.Services) {
        global.ExcelProcessor.Services = {};
    }
    
    global.ExcelProcessor.Services.FileService = new FileService();
    global.ExcelProcessor.Services.FileServiceClass = FileService;

})(window);