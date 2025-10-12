// Excel Processor Module
class ExcelProcessor {
    constructor(controller) {
        this.controller = controller;
        this.cancelFlag = false;
        this.currentSheet = null;
        this.processedRows = 0;
    }

    async loadFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array', cellStyles: true, cellNF: true });
                    resolve(workbook);
                } catch (error) {
                    reject(new Error(`Failed to parse Excel file: ${error.message}`));
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    getSheetData(workbook, sheetName) {
        try {
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) {
                throw new Error(`Sheet '${sheetName}' not found`);
            }

            // Get sheet range
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            
            // Extract headers (first row)
            const headers = [];
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
                const cell = worksheet[cellAddress];
                headers.push(cell ? String(cell.v || '').trim() : `Column ${col + 1}`);
            }

            // Extract sample data (first 5 rows after header)
            const sampleData = [];
            const maxRows = Math.min(range.e.r, range.s.r + 5);
            
            for (let row = range.s.r + 1; row <= maxRows; row++) {
                const rowData = [];
                for (let col = range.s.c; col <= range.e.c; col++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                    const cell = worksheet[cellAddress];
                    rowData.push(cell ? String(cell.v || '') : '');
                }
                sampleData.push(rowData);
            }

            this.currentSheet = {
                name: sheetName,
                worksheet: worksheet,
                range: range,
                headers: headers,
                sampleData: sampleData,
                totalRows: range.e.r - range.s.r // Excluding header
            };

            return this.currentSheet;
        } catch (error) {
            throw new Error(`Failed to process sheet data: ${error.message}`);
        }
    }

    async processWithAPIs(workbook, config, apiManager, progressCallback) {
        this.cancelFlag = false;
        this.processedRows = 0;
        
        try {
            this.controller.log('Starting Excel processing with API enrichment', 'info');
            
            const worksheet = workbook.Sheets[config.sheetName];
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            
            // Find column indices
            const columnIndices = this.findColumnIndices(worksheet, range, config);
            
            // Process each row
            const totalRows = range.e.r - range.s.r; // Excluding header
            const results = [];
            
            for (let row = range.s.r + 1; row <= range.e.r; row++) {
                if (this.cancelFlag) {
                    throw new Error('Processing cancelled by user');
                }
                
                // Extract row data
                const rowData = this.extractRowData(worksheet, row, columnIndices, range);
                
                // Skip empty rows
                if (!rowData.mpn || !rowData.mpn.trim()) {
                    continue;
                }
                
                // Process with APIs
                const enrichedData = await this.processRowWithAPIs(rowData, config, apiManager);
                
                // Add enriched data to worksheet
                this.addEnrichedDataToRow(worksheet, row, enrichedData, config);
                
                this.processedRows++;
                
                // Update progress
                const progress = {
                    processed: this.processedRows,
                    total: totalRows,
                    percentage: Math.round((this.processedRows / totalRows) * 100),
                    current: rowData.mpn,
                    success: enrichedData.success ? this.processedRows : results.filter(r => r.success).length,
                    errors: enrichedData.success ? 0 : results.filter(r => !r.success).length + 1
                };
                
                progressCallback(progress);
                results.push(enrichedData);
                
                // Small delay to prevent overwhelming APIs
                await this.delay(100);
            }
            
            this.controller.log(`Processing completed: ${results.length} rows processed`, 'success');
            
            return {
                workbook: workbook,
                results: results,
                processedRows: this.processedRows
            };
        } catch (error) {
            this.controller.log(`Processing failed: ${error.message}`, 'error');
            throw error;
        }
    }

    findColumnIndices(worksheet, range, config) {
        const indices = {
            mpn: -1,
            manufacturer: -1,
            quantity: -1,
            dynamic: new Map()
        };
        
        // Find header row columns
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
            const cell = worksheet[cellAddress];
            const headerName = cell ? String(cell.v || '').trim() : '';
            
            if (headerName === config.mpnColumn) {
                indices.mpn = col;
            } else if (headerName === config.manufacturerColumn) {
                indices.manufacturer = col;
            } else if (headerName === config.quantityColumn) {
                indices.quantity = col;
            }
        }
        
        // Add dynamic columns to header if they don't exist
        if (config.dynamicColumns && config.dynamicColumns.length > 0) {
            let nextCol = range.e.c + 1;
            
            config.dynamicColumns.forEach(dynCol => {
                const headerAddress = XLSX.utils.encode_cell({ r: range.s.r, c: nextCol });
                worksheet[headerAddress] = { t: 's', v: dynCol.columnName };
                indices.dynamic.set(dynCol.columnName, nextCol);
                nextCol++;
            });
            
            // Update sheet range
            worksheet['!ref'] = XLSX.utils.encode_range({
                s: { r: range.s.r, c: range.s.c },
                e: { r: range.e.r, c: nextCol - 1 }
            });
        }
        
        return indices;
    }

    extractRowData(worksheet, row, columnIndices, range) {
        const getData = (colIndex) => {
            if (colIndex < 0) return '';
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex });
            const cell = worksheet[cellAddress];
            return cell ? String(cell.v || '').trim() : '';
        };
        
        return {
            mpn: getData(columnIndices.mpn),
            manufacturer: getData(columnIndices.manufacturer),
            quantity: getData(columnIndices.quantity)
        };
    }

    async processRowWithAPIs(rowData, config, apiManager) {
        try {
            const results = {};
            
            // Process each dynamic column
            if (config.dynamicColumns && config.dynamicColumns.length > 0) {
                for (const dynCol of config.dynamicColumns) {
                    try {
                        const result = await apiManager.fetchData(
                            dynCol.supplier,
                            dynCol.dataType,
                            rowData.mpn,
                            rowData.manufacturer
                        );
                        
                        results[dynCol.columnName] = result;
                    } catch (error) {
                        this.controller.log(`API call failed for ${dynCol.columnName}: ${error.message}`, 'warning');
                        results[dynCol.columnName] = 'Error: ' + error.message;
                    }
                }
            }
            
            return {
                success: true,
                mpn: rowData.mpn,
                data: results
            };
        } catch (error) {
            return {
                success: false,
                mpn: rowData.mpn,
                error: error.message,
                data: {}
            };
        }
    }

    addEnrichedDataToRow(worksheet, row, enrichedData, config) {
        // Find column indices for dynamic columns
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        
        // Add data to dynamic columns
        if (enrichedData.data && Object.keys(enrichedData.data).length > 0) {
            for (let col = range.s.c; col <= range.e.c; col++) {
                const headerAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
                const headerCell = worksheet[headerAddress];
                const headerName = headerCell ? String(headerCell.v || '').trim() : '';
                
                if (enrichedData.data.hasOwnProperty(headerName)) {
                    const dataAddress = XLSX.utils.encode_cell({ r: row, c: col });
                    worksheet[dataAddress] = {
                        t: 's',
                        v: String(enrichedData.data[headerName] || '')
                    };
                }
            }
        }
    }

    downloadEnhancedFile(processedData, originalFileName) {
        try {
            const workbook = processedData.workbook;
            
            // Generate new filename
            const timestamp = new Date().toISOString().split('T')[0];
            const baseName = originalFileName.replace(/\.[^/.]+$/, '');
            const newFileName = `${baseName}_enhanced_${timestamp}.xlsx`;
            
            // Write workbook
            const excelBuffer = XLSX.write(workbook, {
                bookType: 'xlsx',
                type: 'array',
                cellStyles: true
            });
            
            // Download file
            const blob = new Blob([excelBuffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = newFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.controller.log(`File downloaded: ${newFileName}`, 'success');
        } catch (error) {
            throw new Error(`Failed to download file: ${error.message}`);
        }
    }

    generatePreviewData(processedData, maxRows = 10) {
        try {
            const workbook = processedData.workbook;
            const sheetNames = workbook.SheetNames;
            
            if (sheetNames.length === 0) {
                return { headers: [], rows: [] };
            }
            
            // Use first sheet for preview
            const worksheet = workbook.Sheets[sheetNames[0]];
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            
            // Extract headers
            const headers = [];
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
                const cell = worksheet[cellAddress];
                headers.push(cell ? String(cell.v || '') : `Column ${col + 1}`);
            }
            
            // Extract sample rows
            const rows = [];
            const maxPreviewRows = Math.min(range.e.r, range.s.r + maxRows);
            
            for (let row = range.s.r + 1; row <= maxPreviewRows; row++) {
                const rowData = [];
                for (let col = range.s.c; col <= range.e.c; col++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                    const cell = worksheet[cellAddress];
                    rowData.push(cell ? String(cell.v || '') : '');
                }
                rows.push(rowData);
            }
            
            return { headers, rows };
        } catch (error) {
            throw new Error(`Failed to generate preview: ${error.message}`);
        }
    }

    cancelProcessing() {
        this.cancelFlag = true;
        this.controller.log('Processing cancellation requested', 'warning');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Utility function to clean HTSUS codes
    cleanHTSUS(code) {
        if (!code) return '';
        const digits = String(code).replace(/\D/g, '');
        return digits.slice(0, 8);
    }

    // Helper to format currency values
    formatCurrency(value, currency = 'USD') {
        if (!value || isNaN(value)) return '';
        
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        }).format(parseFloat(value));
    }

    // Helper to format stock quantities
    formatStock(value) {
        if (!value || isNaN(value)) return '0';
        
        return new Intl.NumberFormat('en-US').format(parseInt(value));
    }

    // Validation helpers
    validateColumnMapping(config) {
        const errors = [];
        
        if (!config.mpnColumn) {
            errors.push('MPN column is required');
        }
        
        if (!config.manufacturerColumn) {
            errors.push('Manufacturer column is required');
        }
        
        if (!config.quantityColumn) {
            errors.push('Quantity column is required');
        }
        
        if (config.dynamicColumns && config.dynamicColumns.length === 0) {
            errors.push('At least one data column must be selected');
        }
        
        return errors;
    }

    // Get processing statistics
    getProcessingStats() {
        return {
            processedRows: this.processedRows,
            currentSheet: this.currentSheet ? this.currentSheet.name : null,
            totalRows: this.currentSheet ? this.currentSheet.totalRows : 0
        };
    }
}

// Export to global scope
if (typeof window !== 'undefined') {
    window.ExcelProcessor = ExcelProcessor;
}