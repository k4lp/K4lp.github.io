// UI Manager Module
class UIManager {
    constructor(controller) {
        this.controller = controller;
        this.dynamicColumnCount = 0;
        this.settingsExpanded = true;
        this.modalActive = false;
        
        this.init();
    }

    init() {
        this.setupDataTypeOptions();
        this.controller.log('UIManager initialized', 'info');
    }

    setupDataTypeOptions() {
        // Get available data types from ApiManager
        const apiManager = this.controller.getModule('ApiManager');
        if (apiManager) {
            this.availableDataTypes = apiManager.getAvailableDataTypes();
        } else {
            // Fallback if ApiManager not ready yet
            this.availableDataTypes = {
                digikey: [
                    'Unit Price',
                    'Manufacturer',
                    'Detailed Description',
                    'Datasheet',
                    'Stock Available',
                    'Package / Case',
                    'HTSUS Number',
                    'HTSUS Stripped'
                ],
                mouser: [
                    'Unit Price',
                    'Manufacturer',
                    'Detailed Description',
                    'Datasheet',
                    'Stock Available',
                    'HTSUS Number',
                    'HTSUS Stripped'
                ]
            };
        }
    }

    toggleSettings() {
        const panel = document.getElementById('settingsPanel');
        const button = document.getElementById('toggleSettings');
        
        if (this.settingsExpanded) {
            panel.style.display = 'none';
            button.textContent = 'Expand';
            this.settingsExpanded = false;
            this.controller.log('Settings panel collapsed', 'info');
        } else {
            panel.style.display = 'block';
            button.textContent = 'Minimize';
            this.settingsExpanded = true;
            this.controller.log('Settings panel expanded', 'info');
        }
    }

    populateSheetSelection(sheetNames) {
        const select = document.getElementById('sheetSelect');
        const section = document.getElementById('sheetSelection');
        
        // Clear existing options
        select.innerHTML = '<option value="">Choose a sheet...</option>';
        
        // Add sheet options
        sheetNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        });
        
        // Show sheet selection
        section.classList.remove('hidden');
        this.controller.log(`Sheet selector populated with ${sheetNames.length} sheets`, 'info');
    }

    showDataPreview(sheetData) {
        const container = document.getElementById('previewContainer');
        const section = document.getElementById('dataPreview');
        
        if (!sheetData || !sheetData.headers || sheetData.headers.length === 0) {
            container.innerHTML = '<div class="empty">No data to preview</div>';
            return;
        }
        
        // Create preview table
        const table = document.createElement('table');
        table.className = 'results-table';
        
        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        sheetData.headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create body with sample data
        const tbody = document.createElement('tbody');
        
        sheetData.sampleData.forEach(row => {
            const tr = document.createElement('tr');
            row.forEach(cell => {
                const td = document.createElement('td');
                td.textContent = cell || '';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        
        // Replace container content
        container.innerHTML = '';
        container.appendChild(table);
        
        // Show preview section
        section.classList.remove('hidden');
        
        this.controller.log('Data preview generated successfully', 'info');
    }

    populateColumnSelectors(headers) {
        const selectors = ['mpnColumn', 'manufacturerColumn', 'quantityColumn'];
        
        selectors.forEach(id => {
            const select = document.getElementById(id);
            select.innerHTML = '<option value="">Select column...</option>';
            
            headers.forEach(header => {
                const option = document.createElement('option');
                option.value = header;
                option.textContent = header;
                select.appendChild(option);
            });
        });
        
        // Show column mapping section
        document.getElementById('columnMapping').classList.remove('hidden');
        
        this.controller.log('Column selectors populated', 'info');
    }

    addDynamicColumn() {
        this.dynamicColumnCount++;
        const container = document.getElementById('dynamicColumns');
        
        const columnDiv = document.createElement('div');
        columnDiv.className = 'grid-12 gap-16';
        columnDiv.id = `dynamicColumn_${this.dynamicColumnCount}`;
        
        columnDiv.innerHTML = `
            <div class="col-span-3">
                <div class="form__group">
                    <label class="label">Column Name</label>
                    <input type="text" id="columnName_${this.dynamicColumnCount}" 
                           placeholder="e.g., Unit Price" class="input">
                </div>
            </div>
            <div class="col-span-3">
                <div class="form__group">
                    <label class="label">Supplier</label>
                    <select id="supplier_${this.dynamicColumnCount}" class="select">
                        <option value="">Select supplier...</option>
                        <option value="digikey">Digikey</option>
                        <option value="mouser">Mouser</option>
                    </select>
                </div>
            </div>
            <div class="col-span-4">
                <div class="form__group">
                    <label class="label">Data Type</label>
                    <select id="dataType_${this.dynamicColumnCount}" class="select">
                        <option value="">Select data type...</option>
                    </select>
                </div>
            </div>
            <div class="col-span-2">
                <div class="form__group">
                    <label class="label">&nbsp;</label>
                    <button type="button" class="button button--ghost text-error" 
                            onclick="quoteController.getModule('UIManager').removeDynamicColumn(${this.dynamicColumnCount})">
                        Remove
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(columnDiv);
        
        // Setup supplier change handler
        const supplierSelect = document.getElementById(`supplier_${this.dynamicColumnCount}`);
        supplierSelect.addEventListener('change', (e) => {
            this.updateDataTypeOptions(this.dynamicColumnCount, e.target.value);
        });
        
        this.controller.log(`Dynamic column ${this.dynamicColumnCount} added`, 'info');
    }

    removeDynamicColumn(columnId) {
        const columnDiv = document.getElementById(`dynamicColumn_${columnId}`);
        if (columnDiv) {
            columnDiv.remove();
            this.controller.log(`Dynamic column ${columnId} removed`, 'info');
        }
    }

    updateDataTypeOptions(columnId, supplier) {
        const dataTypeSelect = document.getElementById(`dataType_${columnId}`);
        
        if (!supplier || !this.availableDataTypes[supplier]) {
            dataTypeSelect.innerHTML = '<option value="">Select data type...</option>';
            return;
        }
        
        dataTypeSelect.innerHTML = '<option value="">Select data type...</option>';
        
        this.availableDataTypes[supplier].forEach(dataType => {
            const option = document.createElement('option');
            option.value = dataType;
            option.textContent = dataType;
            dataTypeSelect.appendChild(option);
        });
    }

    getDynamicColumnsConfig() {
        const columns = [];
        const container = document.getElementById('dynamicColumns');
        const columnDivs = container.querySelectorAll('[id^="dynamicColumn_"]');
        
        columnDivs.forEach(div => {
            const id = div.id.split('_')[1];
            const columnName = document.getElementById(`columnName_${id}`)?.value.trim();
            const supplier = document.getElementById(`supplier_${id}`)?.value;
            const dataType = document.getElementById(`dataType_${id}`)?.value;
            
            if (columnName && supplier && dataType) {
                columns.push({
                    columnName: columnName,
                    supplier: supplier,
                    dataType: dataType
                });
            }
        });
        
        return columns;
    }

    showProcessingProgress() {
        document.getElementById('processingSection').classList.remove('hidden');
        
        // Hide other sections during processing
        document.getElementById('settingsSection').style.opacity = '0.5';
        document.getElementById('exportSection').classList.add('hidden');
        
        this.resetProgress();
    }

    hideProcessingProgress() {
        document.getElementById('processingSection').classList.add('hidden');
        document.getElementById('settingsSection').style.opacity = '1';
    }

    resetProgress() {
        document.getElementById('progressText').textContent = 'Initializing...';
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('statProcessed').textContent = '0';
        document.getElementById('statSuccess').textContent = '0';
        document.getElementById('statWarning').textContent = '0';
        document.getElementById('statError').textContent = '0';
    }

    updateProgress(progress) {
        document.getElementById('progressText').textContent = 
            `Processing: ${progress.current} (${progress.processed}/${progress.total})`;
        document.getElementById('progressBar').style.width = `${progress.percentage}%`;
        document.getElementById('statProcessed').textContent = progress.processed;
        document.getElementById('statSuccess').textContent = progress.success || 0;
        document.getElementById('statWarning').textContent = progress.warning || 0;
        document.getElementById('statError').textContent = progress.errors || 0;
    }

    showExportSection() {
        document.getElementById('exportSection').classList.remove('hidden');
        document.getElementById('processingSection').classList.add('hidden');
        document.getElementById('settingsSection').style.opacity = '1';
    }

    showResultsPreview(processedData) {
        try {
            const modal = document.getElementById('previewModal');
            const content = document.getElementById('previewContent');
            
            const previewData = this.controller.getModule('ExcelProcessor')
                .generatePreviewData(processedData, 20);
            
            if (!previewData.headers || previewData.headers.length === 0) {
                content.innerHTML = '<div class="empty">No data to preview</div>';
            } else {
                const table = document.createElement('table');
                table.className = 'results-table';
                
                // Create header
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');
                
                previewData.headers.forEach(header => {
                    const th = document.createElement('th');
                    th.textContent = header;
                    headerRow.appendChild(th);
                });
                
                thead.appendChild(headerRow);
                table.appendChild(thead);
                
                // Create body
                const tbody = document.createElement('tbody');
                
                previewData.rows.forEach(row => {
                    const tr = document.createElement('tr');
                    row.forEach(cell => {
                        const td = document.createElement('td');
                        td.textContent = cell || '';
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                });
                
                table.appendChild(tbody);
                
                content.innerHTML = '';
                content.appendChild(table);
            }
            
            modal.classList.add('is-open');
            this.modalActive = true;
            
            this.controller.log('Results preview displayed', 'info');
        } catch (error) {
            this.controller.log(`Failed to show results preview: ${error.message}`, 'error');
        }
    }

    closeModal() {
        const modal = document.getElementById('previewModal');
        modal.classList.remove('is-open');
        this.modalActive = false;
    }

    resetUI() {
        // Reset file input
        document.getElementById('excelFile').value = '';
        
        // Hide sections
        document.getElementById('sheetSelection').classList.add('hidden');
        document.getElementById('dataPreview').classList.add('hidden');
        document.getElementById('columnMapping').classList.add('hidden');
        document.getElementById('processingSection').classList.add('hidden');
        document.getElementById('exportSection').classList.add('hidden');
        
        // Reset selectors
        document.getElementById('sheetSelect').innerHTML = '<option value="">Choose a sheet...</option>';
        document.getElementById('mpnColumn').innerHTML = '<option value="">Select column...</option>';
        document.getElementById('manufacturerColumn').innerHTML = '<option value="">Select column...</option>';
        document.getElementById('quantityColumn').innerHTML = '<option value="">Select column...</option>';
        
        // Clear dynamic columns
        document.getElementById('dynamicColumns').innerHTML = '';
        this.dynamicColumnCount = 0;
        
        // Reset preview container
        document.getElementById('previewContainer').innerHTML = '<div class="empty">No data to preview</div>';
        
        // Reset opacity
        document.getElementById('settingsSection').style.opacity = '1';
        
        // Disable start button
        document.getElementById('startProcessing').disabled = true;
        
        this.controller.log('UI reset to initial state', 'info');
    }

    // Utility methods for UI state management
    showElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('hidden');
        }
    }

    hideElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('hidden');
        }
    }

    enableButton(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = false;
        }
    }

    disableButton(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = true;
        }
    }

    setButtonText(buttonId, text) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.textContent = text;
        }
    }

    showNotification(message, type = 'info') {
        // Create a temporary notification element
        const notification = document.createElement('div');
        notification.className = `alert alert--${type} fixed top-4 right-4 z-50`;
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1000; max-width: 300px;';
        notification.innerHTML = `<div class="alert__msg">${message}</div>`;
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // Validation helpers
    validateForm() {
        const errors = [];
        
        const mpnColumn = document.getElementById('mpnColumn').value;
        const manufacturerColumn = document.getElementById('manufacturerColumn').value;
        const quantityColumn = document.getElementById('quantityColumn').value;
        
        if (!mpnColumn) errors.push('MPN column is required');
        if (!manufacturerColumn) errors.push('Manufacturer column is required');
        if (!quantityColumn) errors.push('Quantity column is required');
        
        const dynamicColumns = this.getDynamicColumnsConfig();
        if (dynamicColumns.length === 0) {
            errors.push('At least one data column must be configured');
        }
        
        return errors;
    }

    highlightErrors(errors) {
        // Clear previous errors
        document.querySelectorAll('.is-error').forEach(el => {
            el.classList.remove('is-error');
        });
        
        // Highlight error fields
        if (errors.includes('MPN column is required')) {
            document.getElementById('mpnColumn').parentNode.classList.add('is-error');
        }
        if (errors.includes('Manufacturer column is required')) {
            document.getElementById('manufacturerColumn').parentNode.classList.add('is-error');
        }
        if (errors.includes('Quantity column is required')) {
            document.getElementById('quantityColumn').parentNode.classList.add('is-error');
        }
        
        // Show errors as notification
        if (errors.length > 0) {
            this.showNotification(`Validation errors: ${errors.join(', ')}`, 'error');
        }
    }
}

// Export to global scope
if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
}