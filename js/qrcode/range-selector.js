/**
 * Range Selection Module
 * Handles visual data range selection from Excel sheets
 */

class RangeSelector {
    constructor() {
        this.sheetData = null;
        this.selectedRange = null;
        this.previewTable = null;
        
        this.initializeEventListeners();
        this.loadFromStorage();
    }
    
    initializeEventListeners() {
        // Range input listeners
        ['start-row', 'end-row', 'start-col', 'end-col'].forEach(id => {
            const element = QRUtils.$(id);
            if (element) {
                element.addEventListener('input', QRUtils.debounce(this.handleRangeChange.bind(this), 300));
                element.addEventListener('blur', this.validateAndUpdatePreview.bind(this));
            }
        });
        
        // Button listeners
        const confirmBtn = QRUtils.$('confirm-range');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', this.confirmRange.bind(this));
        }
        
        const selectAllBtn = QRUtils.$('select-all-data');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', this.selectAllData.bind(this));
        }
    }
    
    updateSheetData(sheetData) {
        this.sheetData = sheetData;
        this.autoDetectRange();
        this.updatePreview();
        QRUtils.log.info('Range selector updated with new sheet data');
    }
    
    autoDetectRange() {
        if (!this.sheetData || this.sheetData.length === 0) return;
        
        // Find the actual data boundaries
        let maxCol = 0;
        let dataEndRow = this.sheetData.length;
        
        // Find maximum column with data
        this.sheetData.forEach(row => {
            if (row) {
                for (let i = row.length - 1; i >= 0; i--) {
                    if (row[i] !== null && row[i] !== undefined && String(row[i]).trim() !== '') {
                        maxCol = Math.max(maxCol, i);
                        break;
                    }
                }
            }
        });
        
        // Find last row with data
        for (let i = this.sheetData.length - 1; i >= 0; i--) {
            const row = this.sheetData[i];
            if (row && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')) {
                dataEndRow = i + 1;
                break;
            }
        }
        
        // Set default range
        const startRow = QRUtils.$('start-row');
        const endRow = QRUtils.$('end-row');
        const startCol = QRUtils.$('start-col');
        const endCol = QRUtils.$('end-col');
        
        if (startRow) startRow.value = 1;
        if (endRow) endRow.value = Math.min(dataEndRow, 100); // Limit preview to 100 rows
        if (startCol) startCol.value = 'A';
        if (endCol) endCol.value = QRUtils.indexToColumn(Math.min(maxCol, 25)); // Limit to 26 columns (A-Z)
        
        QRUtils.log.info('Auto-detected range:', {
            rows: `1-${dataEndRow}`,
            columns: `A-${QRUtils.indexToColumn(maxCol)}`
        });
    }
    
    handleRangeChange() {
        this.validateRange();
        this.updatePreview();
    }
    
    validateAndUpdatePreview() {
        if (this.validateRange()) {
            this.updatePreview();
        }
    }
    
    validateRange() {
        const startRow = parseInt(QRUtils.$('start-row').value);
        const endRow = parseInt(QRUtils.$('end-row').value);
        const startCol = QRUtils.$('start-col').value.trim().toUpperCase();
        const endCol = QRUtils.$('end-col').value.trim().toUpperCase();
        
        const isValid = QRUtils.isValidRange(startRow, endRow, startCol, endCol);
        const confirmBtn = QRUtils.$('confirm-range');
        
        if (confirmBtn) {
            confirmBtn.disabled = !isValid;
        }
        
        // Show validation feedback
        ['start-row', 'end-row', 'start-col', 'end-col'].forEach(id => {
            const element = QRUtils.$(id);
            if (element) {
                element.classList.toggle('error', !isValid);
            }
        });
        
        if (isValid && this.sheetData) {
            // Additional validation against sheet boundaries
            const maxRow = this.sheetData.length;
            const maxColIndex = Math.max(...this.sheetData.map(row => row ? row.length - 1 : 0));
            const endColIndex = QRUtils.columnToIndex(endCol);
            
            if (endRow > maxRow || endColIndex > maxColIndex) {
                QRUtils.setStatus(`Warning: Range exceeds sheet boundaries (${maxRow} rows, ${QRUtils.indexToColumn(maxColIndex)} columns)`, 'warning');
            }
        }
        
        return isValid;
    }
    
    updatePreview() {
        if (!this.sheetData || !this.validateRange()) {
            this.clearPreview();
            return;
        }
        
        const startRow = parseInt(QRUtils.$('start-row').value);
        const endRow = parseInt(QRUtils.$('end-row').value);
        const startCol = QRUtils.$('start-col').value.trim().toUpperCase();
        const endCol = QRUtils.$('end-col').value.trim().toUpperCase();
        
        const rangeData = window.excelProcessor.getDataRange(startRow, endRow, startCol, endCol);
        
        if (rangeData.length === 0) {
            this.clearPreview();
            return;
        }
        
        this.renderPreviewTable(rangeData, startRow, startCol);
        QRUtils.setStatus(`Preview: ${rangeData.length} rows, ${rangeData[0].length} columns`, 'info');
    }
    
    renderPreviewTable(data, startRow, startCol) {
        const previewContainer = QRUtils.$('data-preview');
        if (!previewContainer) return;
        
        const startColIndex = QRUtils.columnToIndex(startCol);
        
        // Create table HTML
        let tableHTML = '<table class="table-compact table-striped">';
        
        // Header row with column letters
        tableHTML += '<thead><tr><th>#</th>';
        for (let i = 0; i < data[0].length; i++) {
            const colLetter = QRUtils.indexToColumn(startColIndex + i);
            tableHTML += `<th class="text-center">${colLetter}</th>`;
        }
        tableHTML += '</tr></thead>';
        
        // Data rows (limit preview to 50 rows for performance)
        const previewRows = Math.min(data.length, 50);
        tableHTML += '<tbody>';
        
        for (let rowIndex = 0; rowIndex < previewRows; rowIndex++) {
            const row = data[rowIndex];
            const actualRowNumber = startRow + rowIndex;
            
            tableHTML += `<tr ${rowIndex === 0 ? 'class="row-highlight"' : ''}>`;
            tableHTML += `<td class="font-mono text-xs">${actualRowNumber}</td>`;
            
            for (let colIndex = 0; colIndex < row.length; colIndex++) {
                const cellValue = row[colIndex];
                const displayValue = String(cellValue || '').trim();
                const truncatedValue = QRUtils.truncate(displayValue, 30);
                
                // Highlight first row (likely headers)
                const cellClass = rowIndex === 0 ? 'font-semibold' : '';
                
                tableHTML += `<td class="${cellClass}" title="${QRUtils.escapeHtml(displayValue)}">`;
                tableHTML += QRUtils.escapeHtml(truncatedValue);
                tableHTML += '</td>';
            }
            tableHTML += '</tr>';
        }
        
        if (data.length > previewRows) {
            tableHTML += `<tr><td colspan="${data[0].length + 1}" class="text-center text-gray">... and ${data.length - previewRows} more rows</td></tr>`;
        }
        
        tableHTML += '</tbody></table>';
        
        previewContainer.innerHTML = tableHTML;
        
        // Add click handlers for row selection
        this.addPreviewInteraction();
    }
    
    addPreviewInteraction() {
        const table = QRUtils.$('data-preview').querySelector('table');
        if (!table) return;
        
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach((row, index) => {
            row.addEventListener('click', () => {
                // Remove previous highlights
                rows.forEach(r => r.classList.remove('row-selected'));
                // Highlight selected row
                row.classList.add('row-selected');
                
                QRUtils.log.info(`Selected row ${index + 1} in preview`);
            });
        });
    }
    
    clearPreview() {
        const previewContainer = QRUtils.$('data-preview');
        if (previewContainer) {
            previewContainer.innerHTML = '<div class="empty">No valid range selected</div>';
        }
    }
    
    selectAllData() {
        if (!this.sheetData || this.sheetData.length === 0) return;
        
        // Find maximum data boundaries
        let maxCol = 0;
        let maxRow = 0;
        
        this.sheetData.forEach((row, rowIndex) => {
            if (row) {
                // Check if row has any data
                const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
                if (hasData) {
                    maxRow = rowIndex + 1;
                    
                    // Find last column with data in this row
                    for (let i = row.length - 1; i >= 0; i--) {
                        if (row[i] !== null && row[i] !== undefined && String(row[i]).trim() !== '') {
                            maxCol = Math.max(maxCol, i);
                            break;
                        }
                    }
                }
            }
        });
        
        // Update range inputs
        QRUtils.$('start-row').value = 1;
        QRUtils.$('end-row').value = maxRow;
        QRUtils.$('start-col').value = 'A';
        QRUtils.$('end-col').value = QRUtils.indexToColumn(maxCol);
        
        this.handleRangeChange();
        QRUtils.showSuccess(`Selected entire data range: ${maxRow} rows, ${maxCol + 1} columns`);
    }
    
    confirmRange() {
        if (!this.validateRange()) return;
        
        const startRow = parseInt(QRUtils.$('start-row').value);
        const endRow = parseInt(QRUtils.$('end-row').value);
        const startCol = QRUtils.$('start-col').value.trim().toUpperCase();
        const endCol = QRUtils.$('end-col').value.trim().toUpperCase();
        
        this.selectedRange = {
            startRow,
            endRow,
            startCol,
            endCol,
            startColIndex: QRUtils.columnToIndex(startCol),
            endColIndex: QRUtils.columnToIndex(endCol)
        };
        
        // Get the actual data for this range
        const rangeData = window.excelProcessor.getDataRange(startRow, endRow, startCol, endCol);
        this.selectedRange.data = rangeData;
        
        // Save to storage
        this.saveToStorage();
        
        // Show next step
        QRUtils.show('step-4');
        QRUtils.setStep(4);
        QRUtils.setStatus('Range confirmed successfully', 'success');
        
        // Trigger column mapper update
        if (window.columnMapper) {
            window.columnMapper.updateRangeData(this.selectedRange);
        }
        
        QRUtils.log.success('Range selection confirmed:', this.selectedRange);
    }
    
    getSelectedRange() {
        return this.selectedRange;
    }
    
    getRangeData() {
        return this.selectedRange ? this.selectedRange.data : null;
    }
    
    // Get column headers from the selected range
    getColumnHeaders(headerRowOffset = 0) {
        if (!this.selectedRange || !this.selectedRange.data || this.selectedRange.data.length === 0) {
            return [];
        }
        
        const headerRow = this.selectedRange.data[headerRowOffset];
        if (!headerRow) return [];
        
        return headerRow.map((header, index) => ({
            index: this.selectedRange.startColIndex + index,
            column: QRUtils.indexToColumn(this.selectedRange.startColIndex + index),
            value: String(header || '').trim(),
            displayName: String(header || '').trim() || `Column ${QRUtils.indexToColumn(this.selectedRange.startColIndex + index)}`
        }));
    }
    
    // Storage methods
    saveToStorage() {
        if (this.selectedRange) {
            QRUtils.storage.set('selected_range', {
                ...this.selectedRange,
                timestamp: Date.now()
            });
        }
    }
    
    loadFromStorage() {
        const data = QRUtils.storage.get('selected_range');
        if (!data) return false;
        
        // Check if data is recent (within 24 hours)
        const isRecent = data.timestamp && (Date.now() - data.timestamp) < 24 * 60 * 60 * 1000;
        if (!isRecent) return false;
        
        try {
            this.selectedRange = data;
            
            // Update UI inputs
            if (QRUtils.$('start-row')) QRUtils.$('start-row').value = data.startRow;
            if (QRUtils.$('end-row')) QRUtils.$('end-row').value = data.endRow;
            if (QRUtils.$('start-col')) QRUtils.$('start-col').value = data.startCol;
            if (QRUtils.$('end-col')) QRUtils.$('end-col').value = data.endCol;
            
            QRUtils.log.info('Restored range selection from storage');
            return true;
        } catch (error) {
            QRUtils.log.warn('Failed to load range from storage:', error);
            QRUtils.storage.remove('selected_range');
        }
        
        return false;
    }
    
    reset() {
        this.selectedRange = null;
        this.sheetData = null;
        
        // Reset inputs
        if (QRUtils.$('start-row')) QRUtils.$('start-row').value = 1;
        if (QRUtils.$('end-row')) QRUtils.$('end-row').value = 100;
        if (QRUtils.$('start-col')) QRUtils.$('start-col').value = 'A';
        if (QRUtils.$('end-col')) QRUtils.$('end-col').value = 'H';
        
        this.clearPreview();
        
        const confirmBtn = QRUtils.$('confirm-range');
        if (confirmBtn) confirmBtn.disabled = true;
        
        QRUtils.log.info('Range selector reset');
    }
}

// Initialize and make globally available
window.rangeSelector = new RangeSelector();