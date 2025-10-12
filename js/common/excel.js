/**
 * Clean Excel Manager - Core Excel file processing for engineering tools
 * Single-responsibility module for Excel file loading and basic processing
 * Part of K4LP Engineering Tools - Swiss Minimalist Design
 */

class ExcelManager {
    constructor() {
        this.currentWorkbook = null;
        this.worksheetData = null;
        this.sheetNames = [];
        this.fileName = null;
    }

    /**
     * Load Excel file and parse workbook
     * @param {File} file - Excel file to load
     * @returns {Promise<Object>} Workbook information
     */
    async loadExcelFile(file) {
        try {
            // Check if XLSX library is available
            if (typeof XLSX === 'undefined') {
                throw new Error('XLSX library not loaded. Please include xlsx library.');
            }

            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            
            this.currentWorkbook = XLSX.read(arrayBuffer, {
                type: 'array',
                cellFormula: false,
                cellStyles: false
            });
            
            this.fileName = file.name;
            this.sheetNames = this.currentWorkbook.SheetNames;
            
            // Load first sheet by default
            if (this.sheetNames.length > 0) {
                this.selectSheet(this.sheetNames[0]);
            }
            
            return {
                fileName: this.fileName,
                sheetNames: this.sheetNames,
                selectedSheet: this.sheetNames[0] || null
            };
            
        } catch (error) {
            console.error('Failed to load Excel file:', error);
            throw error;
        }
    }

    /**
     * Read file as array buffer
     * @param {File} file - File to read
     * @returns {Promise<ArrayBuffer>} File contents
     */
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(new Uint8Array(e.target.result));
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Select and load a worksheet
     * @param {string} sheetName - Name of sheet to select
     * @returns {Object} Sheet data information
     */
    selectSheet(sheetName) {
        if (!this.currentWorkbook || !this.currentWorkbook.Sheets[sheetName]) {
            throw new Error(`Sheet '${sheetName}' not found`);
        }

        const worksheet = this.currentWorkbook.Sheets[sheetName];
        
        // Convert to array of arrays format
        this.worksheetData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            range: undefined,
            blankrows: false,
            defval: ''
        });

        const rowCount = this.worksheetData.length;
        const colCount = rowCount > 0 ? Math.max(...this.worksheetData.map(row => row.length)) : 0;

        return {
            sheetName,
            rows: rowCount,
            columns: colCount,
            data: this.worksheetData
        };
    }

    /**
     * Get sheet names from workbook
     * @returns {string[]} Array of sheet names
     */
    getSheetNames() {
        return this.sheetNames;
    }

    /**
     * Get current sheet data
     * @returns {Array[]} Current worksheet data as array of arrays
     */
    getSheetData() {
        return this.worksheetData;
    }

    /**
     * Create preview table for sheet data
     * @param {string} containerId - ID of container element
     * @param {Object} options - Preview options
     * @returns {HTMLElement} Created preview table
     */
    previewSheet(containerId, options = {}) {
        const {
            maxRows = 50,
            maxCols = 20,
            showHeaders = true
        } = options;

        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container '${containerId}' not found`);
        }

        if (!this.worksheetData) {
            container.innerHTML = '<p>No data to preview</p>';
            return null;
        }

        // Clear container
        container.innerHTML = '';

        // Create table
        const table = document.createElement('table');
        table.className = 'excel-preview-table';

        // Add rows up to maxRows limit
        const rowsToShow = Math.min(maxRows, this.worksheetData.length);
        const colsToShow = Math.min(maxCols, 
            this.worksheetData.length > 0 ? Math.max(...this.worksheetData.map(row => row.length)) : 0
        );

        for (let rowIndex = 0; rowIndex < rowsToShow; rowIndex++) {
            const tr = document.createElement('tr');
            const rowData = this.worksheetData[rowIndex] || [];
            
            // Add row number
            const rowNumCell = document.createElement('td');
            rowNumCell.className = 'row-number';
            rowNumCell.textContent = (rowIndex + 1).toString();
            tr.appendChild(rowNumCell);

            // Add data cells
            for (let colIndex = 0; colIndex < colsToShow; colIndex++) {
                const cell = document.createElement(showHeaders && rowIndex === 0 ? 'th' : 'td');
                cell.className = showHeaders && rowIndex === 0 ? 'excel-header' : 'excel-cell';
                
                const cellValue = rowData[colIndex] || '';
                cell.textContent = String(cellValue);
                cell.title = String(cellValue); // Tooltip for full content
                
                tr.appendChild(cell);
            }
            
            table.appendChild(tr);
        }

        // Add summary info
        const summary = document.createElement('div');
        summary.className = 'excel-preview-summary';
        summary.textContent = `Showing ${rowsToShow} of ${this.worksheetData.length} rows, ${colsToShow} columns`;
        
        container.appendChild(table);
        container.appendChild(summary);
        
        return table;
    }

    /**
     * Export current sheet data to JSON
     * @returns {string} JSON string of sheet data
     */
    exportToJSON() {
        if (!this.worksheetData) {
            return JSON.stringify([]);
        }
        
        return JSON.stringify(this.worksheetData, null, 2);
    }

    /**
     * Export current sheet data to CSV
     * @returns {string} CSV string of sheet data
     */
    exportToCSV() {
        if (!this.worksheetData || this.worksheetData.length === 0) {
            return '';
        }

        return this.worksheetData
            .map(row => 
                row.map(cell => {
                    const cellStr = String(cell || '');
                    // Escape quotes and wrap in quotes if contains comma, quote, or newline
                    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                        return `"${cellStr.replace(/"/g, '"")}"`;
                    }
                    return cellStr;
                }).join(',')
            )
            .join('\n');
    }

    /**
     * Get basic statistics about current sheet
     * @returns {Object} Sheet statistics
     */
    getSheetStats() {
        if (!this.worksheetData) {
            return { rows: 0, columns: 0, filledCells: 0, emptyCells: 0 };
        }

        const rows = this.worksheetData.length;
        const columns = rows > 0 ? Math.max(...this.worksheetData.map(row => row.length)) : 0;
        let filledCells = 0;
        let emptyCells = 0;

        this.worksheetData.forEach(row => {
            for (let i = 0; i < columns; i++) {
                const cell = row[i];
                if (cell !== undefined && cell !== null && String(cell).trim() !== '') {
                    filledCells++;
                } else {
                    emptyCells++;
                }
            }
        });

        return {
            rows,
            columns,
            filledCells,
            emptyCells,
            fillRate: filledCells / (filledCells + emptyCells) * 100
        };
    }

    /**
     * Clear all loaded data
     */
    clearData() {
        this.currentWorkbook = null;
        this.worksheetData = null;
        this.sheetNames = [];
        this.fileName = null;
    }
}

// Create and export singleton instance
const excelManager = new ExcelManager();
window.excelManager = excelManager;