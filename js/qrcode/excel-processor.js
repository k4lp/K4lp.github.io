/**
 * Excel File Processing Module
 * Handles Excel file reading, sheet selection, and data extraction
 */

class ExcelProcessor {
    constructor() {
        this.workbook = null;
        this.selectedSheet = null;
        this.sheetData = null;
        this.fileInfo = null;
        
        this.initializeEventListeners();
        this.loadFromStorage();
    }
    
    initializeEventListeners() {
        const fileInput = QRUtils.$('excel-file');
        const sheetSelect = QRUtils.$('sheet-select');
        
        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileChange.bind(this));
        }
        
        if (sheetSelect) {
            sheetSelect.addEventListener('change', this.handleSheetChange.bind(this));
        }
    }
    
    async handleFileChange(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            QRUtils.setStatus('Processing Excel file...', 'loading');
            QRUtils.log.info('Processing file:', file.name);
            
            // Validate file type
            if (!this.isValidExcelFile(file)) {
                throw new Error('Please select a valid Excel file (.xlsx or .xls)');
            }
            
            // Read file
            const data = await this.readFile(file);
            this.workbook = XLSX.read(data, { type: 'array' });
            
            // Store file info
            this.fileInfo = {
                name: file.name,
                size: file.size,
                lastModified: file.lastModified,
                type: file.type
            };
            
            // Display file info
            this.displayFileInfo();
            
            // Populate sheet dropdown
            this.populateSheetOptions();
            
            // Save to storage
            this.saveToStorage();
            
            // Show next step
            QRUtils.show('step-2');
            QRUtils.setStep(2);
            QRUtils.setStatus('File loaded successfully', 'success');
            
            QRUtils.log.success('Excel file processed successfully');
            
        } catch (error) {
            QRUtils.handleError(error, 'File Processing');
        }
    }
    
    async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                resolve(new Uint8Array(e.target.result));
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }
    
    isValidExcelFile(file) {
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        
        const validExtensions = ['.xlsx', '.xls'];
        const hasValidType = validTypes.includes(file.type);
        const hasValidExtension = validExtensions.some(ext => 
            file.name.toLowerCase().endsWith(ext)
        );
        
        return hasValidType || hasValidExtension;
    }
    
    displayFileInfo() {
        if (!this.fileInfo) return;
        
        const infoElement = QRUtils.$('file-info');
        if (!infoElement) return;
        
        const sizeInKB = (this.fileInfo.size / 1024).toFixed(1);
        const modifiedDate = new Date(this.fileInfo.lastModified).toLocaleDateString();
        
        infoElement.innerHTML = `
            <div class="panel">
                <h3>File Information</h3>
                <div class="kv-list">
                    <div class="kv-item">
                        <div class="kv-key">Name</div>
                        <div class="kv-value mono">${QRUtils.escapeHtml(this.fileInfo.name)}</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Size</div>
                        <div class="kv-value">${sizeInKB} KB</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Modified</div>
                        <div class="kv-value">${modifiedDate}</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Sheets</div>
                        <div class="kv-value">${this.workbook ? this.workbook.SheetNames.length : 0}</div>
                    </div>
                </div>
            </div>
        `;
        
        QRUtils.show(infoElement);
    }
    
    populateSheetOptions() {
        if (!this.workbook) return;
        
        const sheetSelect = QRUtils.$('sheet-select');
        if (!sheetSelect) return;
        
        // Clear existing options
        sheetSelect.innerHTML = '<option value="">Select a sheet...</option>';
        
        // Add sheet options
        this.workbook.SheetNames.forEach((sheetName, index) => {
            const option = document.createElement('option');
            option.value = sheetName;
            option.textContent = `${sheetName} (Sheet ${index + 1})`;
            sheetSelect.appendChild(option);
        });
        
        // Auto-select first sheet if only one exists
        if (this.workbook.SheetNames.length === 1) {
            sheetSelect.value = this.workbook.SheetNames[0];
            setTimeout(() => this.handleSheetChange({ target: sheetSelect }), 100);
        }
    }
    
    handleSheetChange(event) {
        const sheetName = event.target.value;
        if (!sheetName || !this.workbook) return;
        
        try {
            QRUtils.setStatus('Loading sheet data...', 'loading');
            
            // Get worksheet
            this.selectedSheet = this.workbook.Sheets[sheetName];
            if (!this.selectedSheet) {
                throw new Error('Sheet not found');
            }
            
            // Convert to JSON with headers
            this.sheetData = XLSX.utils.sheet_to_json(this.selectedSheet, {
                header: 1, // Use array format
                defval: '', // Default value for empty cells
                raw: false // Get formatted values
            });
            
            // Filter out completely empty rows
            this.sheetData = this.sheetData.filter(row => 
                row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
            );
            
            QRUtils.log.info(`Sheet "${sheetName}" loaded:`, {
                rows: this.sheetData.length,
                columns: this.sheetData[0] ? this.sheetData[0].length : 0
            });
            
            // Save selection
            this.saveToStorage();
            
            // Show next step
            QRUtils.show('step-3');
            QRUtils.setStep(3);
            QRUtils.setStatus('Sheet loaded successfully', 'success');
            
            // Trigger range selector update
            if (window.rangeSelector) {
                window.rangeSelector.updateSheetData(this.sheetData);
            }
            
        } catch (error) {
            QRUtils.handleError(error, 'Sheet Loading');
        }
    }
    
    getSheetData() {
        return this.sheetData;
    }
    
    getSelectedSheet() {
        return this.selectedSheet;
    }
    
    getWorkbook() {
        return this.workbook;
    }
    
    getFileInfo() {
        return this.fileInfo;
    }
    
    // Get data within a specific range
    getDataRange(startRow, endRow, startCol, endCol) {
        if (!this.sheetData) return [];
        
        const startColIndex = QRUtils.columnToIndex(startCol);
        const endColIndex = QRUtils.columnToIndex(endCol);
        
        const rangeData = [];
        
        for (let row = startRow - 1; row < Math.min(endRow, this.sheetData.length); row++) {
            if (row < 0 || row >= this.sheetData.length) continue;
            
            const rowData = [];
            for (let col = startColIndex; col <= endColIndex; col++) {
                const cellValue = this.sheetData[row] && this.sheetData[row][col] !== undefined 
                    ? this.sheetData[row][col] 
                    : '';
                rowData.push(cellValue);
            }
            rangeData.push(rowData);
        }
        
        return rangeData;
    }
    
    // Get column headers from a specific row
    getColumnHeaders(headerRow = 1, startCol = 'A', endCol = 'Z') {
        if (!this.sheetData || headerRow > this.sheetData.length) return [];
        
        const startColIndex = QRUtils.columnToIndex(startCol);
        const endColIndex = QRUtils.columnToIndex(endCol);
        const row = this.sheetData[headerRow - 1];
        
        const headers = [];
        for (let col = startColIndex; col <= endColIndex && col < (row ? row.length : 0); col++) {
            const header = row[col] || '';
            headers.push({
                index: col,
                column: QRUtils.indexToColumn(col),
                value: String(header).trim()
            });
        }
        
        return headers.filter(h => h.value !== '');
    }
    
    // Storage methods
    saveToStorage() {
        const data = {
            fileInfo: this.fileInfo,
            selectedSheetName: this.selectedSheet ? this.getSelectedSheetName() : null,
            timestamp: Date.now()
        };
        
        QRUtils.storage.set('excel_data', data);
        
        // Save workbook data (if not too large)
        if (this.workbook && JSON.stringify(this.workbook).length < 5000000) { // ~5MB limit
            QRUtils.storage.set('workbook_data', {
                sheetNames: this.workbook.SheetNames,
                sheets: this.workbook.Sheets,
                timestamp: Date.now()
            });
        }
    }
    
    loadFromStorage() {
        const data = QRUtils.storage.get('excel_data');
        if (!data || !data.fileInfo) return false;
        
        // Check if data is recent (within 24 hours)
        const isRecent = data.timestamp && (Date.now() - data.timestamp) < 24 * 60 * 60 * 1000;
        if (!isRecent) return false;
        
        try {
            this.fileInfo = data.fileInfo;
            
            // Try to load workbook
            const workbookData = QRUtils.storage.get('workbook_data');
            if (workbookData && workbookData.sheetNames) {
                this.workbook = {
                    SheetNames: workbookData.sheetNames,
                    Sheets: workbookData.sheets
                };
                
                // Update UI
                this.displayFileInfo();
                this.populateSheetOptions();
                
                // Auto-select previous sheet if available
                if (data.selectedSheetName && this.workbook.Sheets[data.selectedSheetName]) {
                    const sheetSelect = QRUtils.$('sheet-select');
                    if (sheetSelect) {
                        sheetSelect.value = data.selectedSheetName;
                        setTimeout(() => this.handleSheetChange({ target: sheetSelect }), 100);
                    }
                }
                
                QRUtils.show('step-2');
                QRUtils.setStep(2);
                QRUtils.log.info('Restored Excel data from storage');
                return true;
            }
        } catch (error) {
            QRUtils.log.warn('Failed to load from storage:', error);
            QRUtils.storage.remove('excel_data');
            QRUtils.storage.remove('workbook_data');
        }
        
        return false;
    }
    
    getSelectedSheetName() {
        if (!this.workbook || !this.selectedSheet) return null;
        
        // Find sheet name by reference
        for (const [name, sheet] of Object.entries(this.workbook.Sheets)) {
            if (sheet === this.selectedSheet) return name;
        }
        
        return null;
    }
    
    // Reset all data
    reset() {
        this.workbook = null;
        this.selectedSheet = null;
        this.sheetData = null;
        this.fileInfo = null;
        
        // Clear UI
        const fileInput = QRUtils.$('excel-file');
        if (fileInput) fileInput.value = '';
        
        const sheetSelect = QRUtils.$('sheet-select');
        if (sheetSelect) sheetSelect.innerHTML = '<option value="">Select a sheet...</option>';
        
        const fileInfo = QRUtils.$('file-info');
        if (fileInfo) QRUtils.hide(fileInfo);
        
        // Hide steps
        ['step-2', 'step-3', 'step-4', 'step-5'].forEach(step => QRUtils.hide(step));
        
        QRUtils.setStep(1);
        QRUtils.setStatus('Ready', 'info');
        
        QRUtils.log.info('Excel processor reset');
    }
}

// Initialize and make globally available
window.excelProcessor = new ExcelProcessor();