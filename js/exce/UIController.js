/**
 * Excel API Processor - UI Controller
 * Direct DOM manipulation without abstractions
 * Alica Technologies
 */

'use strict';

/**
 * Clean UI controller for direct DOM manipulation
 */
class UIController {
    constructor() {
        this.elements = {};
        this._cacheElements();
        
        ExcelUtils.log('INFO', 'UIController initialized');
    }
    
    /**
     * Cache DOM elements for better performance
     * @private
     */
    _cacheElements() {
        this.elements = {
            // File upload elements
            fileInput: document.getElementById('excelFile'),
            fileInfo: document.getElementById('fileInfo'),
            fileName: document.getElementById('fileName'),
            fileSize: document.getElementById('fileSize'),
            sheetCount: document.getElementById('sheetCount'),
            
            // Sheet selection
            sheetSelection: document.getElementById('sheetSelection'),
            sheetSelect: document.getElementById('sheetSelect'),
            
            // Preview section
            previewSection: document.getElementById('previewSection'),
            sheetPreview: document.getElementById('sheetPreview'),
            
            // Mapping section
            mappingSection: document.getElementById('mappingSection'),
            headerRow: document.getElementById('headerRow'),
            startRow: document.getElementById('startRow'),
            endRow: document.getElementById('endRow'),
            rowRangeInfo: document.getElementById('rowRangeInfo'),
            rowRangeMessage: document.getElementById('rowRangeMessage'),
            
            // Column selectors
            mpnColumn: document.getElementById('mpnColumn'),
            manufacturerColumn: document.getElementById('manufacturerColumn'),
            quantityColumn: document.getElementById('quantityColumn'),
            
            // Output columns
            outputColumns: document.getElementById('outputColumns'),
            addOutputColumn: document.getElementById('addOutputColumn'),
            
            // Buttons
            processData: document.getElementById('processData'),
            clearMapping: document.getElementById('clearMapping'),
            
            // Progress and export
            progressSection: document.getElementById('progressSection'),
            exportSection: document.getElementById('exportSection'),
            
            // Status elements
            systemStatus: document.getElementById('systemStatus'),
            apiCount: document.getElementById('apiCount')
        };
        
        // Check for missing critical elements
        const critical = ['fileInput', 'sheetSelect', 'sheetPreview'];
        const missing = critical.filter(id => !this.elements[id]);
        if (missing.length > 0) {
            ExcelUtils.log('ERROR', 'Missing critical UI elements', missing);
        }
    }
    
    /**
     * Show file information
     * @param {Object} fileInfo - File information object
     */
    showFileInfo(fileInfo) {
        ExcelUtils.setText('fileName', fileInfo.name);
        ExcelUtils.setText('fileSize', fileInfo.formattedSize);
        ExcelUtils.toggleElement('fileInfo', true);
        
        ExcelUtils.log('INFO', 'File info displayed', fileInfo);
    }
    
    /**
     * Show sheet selection dropdown
     * @param {Array} sheetNames - Array of sheet names
     */
    showSheetSelection(sheetNames) {
        const options = sheetNames.map((name, index) => ({
            value: index.toString(),
            text: name
        }));
        
        ExcelUtils.populateSelect('sheetSelect', options, 'Choose a sheet...');
        ExcelUtils.setText('sheetCount', sheetNames.length);
        ExcelUtils.toggleElement('sheetSelection', true);
        
        // Auto-select first sheet if only one exists
        if (sheetNames.length === 1) {
            this.elements.sheetSelect.value = '0';
            this.elements.sheetSelect.dispatchEvent(new Event('change'));
        }
        
        ExcelUtils.log('INFO', 'Sheet selection displayed', { count: sheetNames.length });
    }
    
    /**
     * Show sheet preview table
     * @param {Array} data - Sheet data (array of arrays)
     * @param {number} maxRows - Maximum rows to display
     */
    showSheetPreview(data, maxRows = 20) {
        const previewDiv = this.elements.sheetPreview;
        if (!previewDiv) return;
        
        const rowsToShow = Math.min(data.length, maxRows);
        const maxCols = Math.max(...data.slice(0, rowsToShow).map(row => row.length || 0));
        
        let html = '<table class="table">';
        
        // Table header with column letters
        html += '<thead><tr><th>#</th>';
        for (let i = 0; i < maxCols; i++) {
            html += `<th>${ExcelUtils.numToCol(i + 1)}</th>`;
        }
        html += '</tr></thead>';
        
        // Table body
        html += '<tbody>';
        for (let i = 0; i < rowsToShow; i++) {
            const row = data[i] || [];
            html += `<tr><td class="text-xs text-muted">${i + 1}</td>`;
            
            for (let j = 0; j < maxCols; j++) {
                const cellValue = row[j] !== undefined ? String(row[j]) : '';
                const truncated = cellValue.length > 30 ? cellValue.substring(0, 27) + '...' : cellValue;
                const escaped = truncated.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                html += `<td>${escaped}</td>`;
            }
            html += '</tr>';
        }
        html += '</tbody></table>';
        
        if (data.length > maxRows) {
            html += `<div class="mt-8 text-xs text-muted">Showing ${rowsToShow} of ${data.length} rows</div>`;
        }
        
        previewDiv.innerHTML = html;
        ExcelUtils.toggleElement('previewSection', true);
        ExcelUtils.toggleElement('mappingSection', true);
        
        ExcelUtils.log('INFO', 'Sheet preview displayed', {
            rows: rowsToShow,
            totalRows: data.length,
            columns: maxCols
        });
    }
    
    /**
     * Populate column mapping dropdowns
     * @param {Array} headers - Array of header values
     * @param {number} headerRowIndex - Index of header row
     */
    populateColumnDropdowns(headers, headerRowIndex = 0) {
        const actualHeaders = headers[headerRowIndex] || [];
        const options = actualHeaders.map((header, index) => ({
            value: index.toString(),
            text: `${ExcelUtils.numToCol(index + 1)} - ${header || '(empty)'}`
        }));
        
        // Populate all column dropdowns
        ExcelUtils.populateSelect('mpnColumn', options, 'Select column...');
        ExcelUtils.populateSelect('manufacturerColumn', options, 'Select column...');
        ExcelUtils.populateSelect('quantityColumn', options, 'Select column...');
        
        ExcelUtils.log('INFO', 'Column dropdowns populated', {
            headerCount: actualHeaders.length,
            headerRow: headerRowIndex + 1
        });
    }
    
    /**
     * Update row range information display
     * @param {Object} rangeInfo - Row range information
     */
    updateRowRangeInfo(rangeInfo) {
        if (!this.elements.rowRangeInfo || !this.elements.rowRangeMessage) return;
        
        this.elements.rowRangeMessage.textContent = rangeInfo.message;
        this.elements.rowRangeInfo.className = rangeInfo.valid ? 
            'alert alert--info mt-16' : 'alert alert--error mt-16';
        
        ExcelUtils.toggleElement(this.elements.rowRangeInfo, true);
        
        ExcelUtils.log('INFO', 'Row range info updated', rangeInfo);
    }
    
    /**
     * Add output column configuration UI
     * @param {number} index - Column index
     * @returns {HTMLElement} Created column element
     */
    addOutputColumnUI(index) {
        const container = this.elements.outputColumns;
        if (!container) return null;
        
        const columnDiv = document.createElement('div');
        columnDiv.className = 'card p-16 mb-16';
        columnDiv.dataset.index = index;
        
        columnDiv.innerHTML = `
            <div class="grid-12 gap-16 mb-16">
                <div class="col-span-4">
                    <div class="form__group">
                        <label class="label">Column Name</label>
                        <input type="text" class="input output-column-name" placeholder="e.g., Unit Price">
                    </div>
                </div>
                <div class="col-span-3">
                    <div class="form__group">
                        <label class="label">API Source</label>
                        <select class="select output-api-source">
                            <option value="">Select API...</option>
                            <option value="digikey">Digikey</option>
                            <option value="mouser">Mouser</option>
                        </select>
                    </div>
                </div>
                <div class="col-span-4">
                    <div class="form__group">
                        <label class="label">Data Field</label>
                        <select class="select output-data-field" disabled>
                            <option value="">Select field...</option>
                        </select>
                    </div>
                </div>
                <div class="col-span-1 flex items-end">
                    <button class="button button--ghost button--sm text-error w-full remove-output-column" data-index="${index}">×</button>
                </div>
            </div>
        `;
        
        container.appendChild(columnDiv);
        
        ExcelUtils.log('INFO', 'Output column UI added', { index });
        return columnDiv;
    }
    
    /**
     * Update API field options based on selected API
     * @param {HTMLElement} fieldSelect - Field select element
     * @param {string} apiType - API type ('digikey' or 'mouser')
     */
    updateApiFieldOptions(fieldSelect, apiType) {
        fieldSelect.innerHTML = '<option value="">Select field...</option>';
        
        if (!apiType) {
            fieldSelect.disabled = true;
            return;
        }
        
        fieldSelect.disabled = false;
        
        const fields = {
            digikey: {
                'unit_price': 'Unit Price',
                'manufacturer': 'Manufacturer',
                'detailed_description': 'Detailed Description',
                'datasheet': 'Datasheet',
                'stock_available': 'Stock Available',
                'package_case': 'Package / Case',
                'htsus_number': 'HTSUS Number',
                'htsus_stripped': 'HTSUS Stripped'
            },
            mouser: {
                'unit_price': 'Unit Price',
                'manufacturer': 'Manufacturer',
                'detailed_description': 'Detailed Description',
                'datasheet': 'Datasheet',
                'stock_available': 'Stock Available',
                'htsus_number': 'HTSUS Number',
                'htsus_stripped': 'HTSUS Stripped'
            }
        };
        
        const apiFields = fields[apiType] || {};
        Object.entries(apiFields).forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            fieldSelect.appendChild(option);
        });
    }
    
    /**
     * Set system status
     * @param {string} status - Status text
     */
    setSystemStatus(status) {
        ExcelUtils.setText('systemStatus', status);
        ExcelUtils.log('INFO', 'System status updated', status);
    }
    
    /**
     * Show/hide progress section
     * @param {boolean} show - True to show, false to hide
     */
    toggleProgressSection(show) {
        ExcelUtils.toggleElement('progressSection', show);
    }
    
    /**
     * Show/hide export section
     * @param {boolean} show - True to show, false to hide
     */
    toggleExportSection(show) {
        ExcelUtils.toggleElement('exportSection', show);
    }
    
    /**
     * Clear all dynamic UI elements
     */
    clearDynamicUI() {
        // Clear file info
        ExcelUtils.toggleElement('fileInfo', false);
        ExcelUtils.toggleElement('sheetSelection', false);
        ExcelUtils.toggleElement('previewSection', false);
        ExcelUtils.toggleElement('mappingSection', false);
        ExcelUtils.toggleElement('progressSection', false);
        ExcelUtils.toggleElement('exportSection', false);
        
        // Clear selects
        if (this.elements.sheetSelect) this.elements.sheetSelect.innerHTML = '<option value="">Choose a sheet...</option>';
        if (this.elements.mpnColumn) this.elements.mpnColumn.innerHTML = '<option value="">Select column...</option>';
        if (this.elements.manufacturerColumn) this.elements.manufacturerColumn.innerHTML = '<option value="">Select column...</option>';
        if (this.elements.quantityColumn) this.elements.quantityColumn.innerHTML = '<option value="">Select column...</option>';
        
        // Clear preview
        if (this.elements.sheetPreview) this.elements.sheetPreview.innerHTML = '';
        
        // Clear output columns
        if (this.elements.outputColumns) this.elements.outputColumns.innerHTML = '';
        
        ExcelUtils.log('INFO', 'Dynamic UI cleared');
    }
}

// Export to global namespace
window.UIController = UIController;