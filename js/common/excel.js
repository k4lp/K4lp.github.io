/**
 * Common Excel processing utilities
 * Handles file reading, sheet navigation, cell mapping, and previews
 */

class ExcelManager {
    constructor() {
        this.currentWorkbook = null;
        this.currentSheet = null;
        this.selectedRange = null;
        this.columnMapping = {};
    }

    async loadFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    // Excel processing logic will use SheetJS library
                    const data = new Uint8Array(e.target.result);
                    this.currentWorkbook = XLSX.read(data, { type: 'array' });
                    resolve(this.currentWorkbook);
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    getSheetNames() {
        return this.currentWorkbook ? this.currentWorkbook.SheetNames : [];
    }

    selectSheet(sheetName) {
        if (this.currentWorkbook && this.currentWorkbook.Sheets[sheetName]) {
            this.currentSheet = this.currentWorkbook.Sheets[sheetName];
            return true;
        }
        return false;
    }

    getSheetData(sheetName = null) {
        const sheet = sheetName ? this.currentWorkbook.Sheets[sheetName] : this.currentSheet;
        if (!sheet) return null;
        
        return XLSX.utils.sheet_to_json(sheet, { header: 1 });
    }

    generatePreview(maxRows = 10, maxCols = 10) {
        const data = this.getSheetData();
        if (!data) return null;

        return data.slice(0, maxRows).map(row => row.slice(0, maxCols));
    }

    setColumnMapping(mapping) {
        this.columnMapping = mapping;
    }

    getColumnMapping() {
        return this.columnMapping;
    }

    setSelectedRange(startRow, startCol, endRow, endCol) {
        this.selectedRange = { startRow, startCol, endRow, endCol };
    }

    getSelectedRange() {
        return this.selectedRange;
    }

    exportToCSV(data) {
        const csv = data.map(row => row.map(cell => 
            typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
        ).join(',')).join('\n');
        
        return csv;
    }
}

const excelManager = new ExcelManager();
