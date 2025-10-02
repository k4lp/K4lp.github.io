/**
 * Column Mapping Module
 * Handles mapping of Excel columns to BOM fields
 */

class ColumnMapper {
    constructor() {
        this.rangeData = null;
        this.columnMapping = null;
        this.availableColumns = [];
        
        this.initializeEventListeners();
        this.loadFromStorage();
    }
    
    initializeEventListeners() {
        // Mapping select listeners
        const mappingSelects = ['map-serial', 'map-mpn', 'map-designators', 'map-manufacturer', 'map-quantity', 'map-target'];
        
        mappingSelects.forEach(id => {
            const element = QRUtils.$(id);
            if (element) {
                element.addEventListener('change', this.handleMappingChange.bind(this));
            }
        });
        
        // Button listeners
        const confirmBtn = QRUtils.$('confirm-mapping');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', this.confirmMapping.bind(this));
        }
        
        const autoMapBtn = QRUtils.$('auto-map');
        if (autoMapBtn) {
            autoMapBtn.addEventListener('click', this.autoMapColumns.bind(this));
        }
    }
    
    updateRangeData(rangeData) {
        this.rangeData = rangeData;
        this.extractAvailableColumns();
        this.populateColumnSelects();
        this.autoMapColumns(); // Try auto-mapping first
        
        QRUtils.log.info('Column mapper updated with range data');
    }
    
    extractAvailableColumns() {
        if (!this.rangeData || !this.rangeData.data || this.rangeData.data.length === 0) {
            this.availableColumns = [];
            return;
        }
        
        // Use first row as headers (most common case)
        const headerRow = this.rangeData.data[0];
        
        this.availableColumns = headerRow.map((header, index) => {
            const columnLetter = QRUtils.indexToColumn(this.rangeData.startColIndex + index);
            const headerText = String(header || '').trim();
            
            return {
                index: this.rangeData.startColIndex + index,
                column: columnLetter,
                header: headerText,
                displayName: headerText || `Column ${columnLetter}`,
                value: `${this.rangeData.startColIndex + index}` // Use index as value for mapping
            };
        });
        
        QRUtils.log.info('Available columns extracted:', this.availableColumns);
    }
    
    populateColumnSelects() {
        const mappingSelects = ['map-serial', 'map-mpn', 'map-designators', 'map-manufacturer', 'map-quantity', 'map-target'];
        
        mappingSelects.forEach(selectId => {
            const select = QRUtils.$(selectId);
            if (!select) return;
            
            // Clear existing options except the first one
            select.innerHTML = '<option value="">Select column...</option>';
            
            // Add column options
            this.availableColumns.forEach(col => {
                const option = document.createElement('option');
                option.value = col.value;
                option.textContent = `${col.column}: ${col.displayName}`;
                option.title = col.header; // Full header text on hover
                select.appendChild(option);
            });
        });
    }
    
    autoMapColumns() {
        if (!this.availableColumns || this.availableColumns.length === 0) return;
        
        // Define mapping patterns for auto-detection
        const mappingPatterns = {
            'map-serial': [
                /serial\s*(no|number|#)?/i,
                /s\/?n/i,
                /item\s*(no|number|#)?/i,
                /^(sn|s\.n\.)$/i
            ],
            'map-mpn': [
                /mpn/i,
                /(manufacturer\s*)?part\s*(no|number|#)?/i,
                /p\/?n/i,
                /part\s*code/i,
                /component/i
            ],
            'map-designators': [
                /designator/i,
                /reference/i,
                /ref/i,
                /position/i,
                /location/i
            ],
            'map-manufacturer': [
                /manufacturer/i,
                /mfr/i,
                /vendor/i,
                /supplier/i,
                /brand/i
            ],
            'map-quantity': [
                /qty/i,
                /quantity/i,
                /count/i,
                /amount/i,
                /total/i
            ],
            'map-target': [
                /barcode/i,
                /qr\s*code/i,
                /scan/i,
                /code/i,
                /id/i
            ]
        };
        
        let mappingCount = 0;
        
        // Try to auto-map each field
        Object.entries(mappingPatterns).forEach(([selectId, patterns]) => {
            const select = QRUtils.$(selectId);
            if (!select) return;
            
            // Find best matching column
            let bestMatch = null;
            let bestScore = 0;
            
            this.availableColumns.forEach(col => {
                const headerText = col.header.toLowerCase();
                
                patterns.forEach(pattern => {
                    if (pattern.test(headerText)) {
                        // Score based on how well it matches
                        let score = 1;
                        if (headerText === pattern.source) score = 10; // Exact match
                        else if (headerText.includes(pattern.source)) score = 5; // Contains
                        
                        if (score > bestScore) {
                            bestScore = score;
                            bestMatch = col;
                        }
                    }
                });
            });
            
            // Apply the best match
            if (bestMatch) {
                select.value = bestMatch.value;
                mappingCount++;
                QRUtils.log.info(`Auto-mapped ${selectId}: ${bestMatch.displayName}`);
            }
        });
        
        // If no specific target column was found, default to MPN or first available
        const targetSelect = QRUtils.$('map-target');
        if (targetSelect && !targetSelect.value && this.availableColumns.length > 0) {
            const mpnSelect = QRUtils.$('map-mpn');
            if (mpnSelect && mpnSelect.value) {
                targetSelect.value = mpnSelect.value;
                mappingCount++;
            } else {
                targetSelect.value = this.availableColumns[0].value;
                mappingCount++;
            }
        }
        
        if (mappingCount > 0) {
            QRUtils.showSuccess(`Auto-mapped ${mappingCount} columns`);
            this.handleMappingChange();
        } else {
            QRUtils.setStatus('No columns could be auto-mapped', 'warning');
        }
    }
    
    handleMappingChange() {
        const mapping = this.getCurrentMapping();
        const isValid = this.validateMapping(mapping);
        
        const confirmBtn = QRUtils.$('confirm-mapping');
        if (confirmBtn) {
            confirmBtn.disabled = !isValid;
        }
        
        // Update status
        if (isValid) {
            const mappedCount = Object.values(mapping).filter(v => v !== '').length;
            QRUtils.setStatus(`${mappedCount} columns mapped`, 'info');
        } else {
            QRUtils.setStatus('Target column is required', 'warning');
        }
    }
    
    getCurrentMapping() {
        return {
            serial: QRUtils.$('map-serial')?.value || '',
            mpn: QRUtils.$('map-mpn')?.value || '',
            designators: QRUtils.$('map-designators')?.value || '',
            manufacturer: QRUtils.$('map-manufacturer')?.value || '',
            quantity: QRUtils.$('map-quantity')?.value || '',
            target: QRUtils.$('map-target')?.value || ''
        };
    }
    
    validateMapping(mapping) {
        // Target column is required for scanning
        return mapping && mapping.target && mapping.target !== '';
    }
    
    confirmMapping() {
        const mapping = this.getCurrentMapping();
        
        if (!this.validateMapping(mapping)) {
            QRUtils.handleError(new Error('Target column is required for scanning'), 'Column Mapping');
            return;
        }
        
        // Convert string indices to numbers and add column info
        this.columnMapping = {};
        
        Object.entries(mapping).forEach(([field, indexStr]) => {
            if (indexStr !== '') {
                const index = parseInt(indexStr);
                const column = this.availableColumns.find(col => col.index === index);
                
                this.columnMapping[field] = {
                    index,
                    column: column ? column.column : QRUtils.indexToColumn(index),
                    header: column ? column.header : '',
                    displayName: column ? column.displayName : `Column ${QRUtils.indexToColumn(index)}`
                };
            }
        });
        
        // Validate that target column exists in range data
        if (!this.columnMapping.target) {
            QRUtils.handleError(new Error('Target column mapping failed'), 'Column Mapping');
            return;
        }
        
        // Save to storage
        this.saveToStorage();
        
        // Show next step
        QRUtils.show('step-5');
        QRUtils.show('scan-records-section');
        QRUtils.setStep(5);
        QRUtils.setStatus('Column mapping confirmed', 'success');
        
        // Initialize scanner with mapping data
        if (window.qrScanner) {
            window.qrScanner.updateColumnMapping(this.columnMapping, this.rangeData);
        }
        
        QRUtils.log.success('Column mapping confirmed:', this.columnMapping);
    }
    
    getColumnMapping() {
        return this.columnMapping;
    }
    
    // Get mapped data from range with proper column mapping
    getMappedData() {
        if (!this.rangeData || !this.columnMapping || !this.rangeData.data) {
            return [];
        }
        
        // Skip header row (index 0) and map data rows
        return this.rangeData.data.slice(1).map((row, rowIndex) => {
            const mappedRow = {
                _rowIndex: rowIndex + 1, // Original row index (excluding header)
                _actualRowNumber: this.rangeData.startRow + rowIndex + 1 // Actual Excel row number
            };
            
            // Map each configured field
            Object.entries(this.columnMapping).forEach(([field, config]) => {
                const colIndex = config.index - this.rangeData.startColIndex;
                mappedRow[field] = row[colIndex] !== undefined ? String(row[colIndex]).trim() : '';
            });
            
            return mappedRow;
        }).filter(row => {
            // Filter out completely empty rows
            const values = Object.values(row).filter(v => typeof v === 'string');
            return values.some(v => v !== '');
        });
    }
    
    // Find row by target column value
    findRowByTarget(targetValue) {
        const mappedData = this.getMappedData();
        if (!mappedData || !targetValue) return null;
        
        const cleanTarget = QRUtils.cleanText(targetValue);
        
        return mappedData.find(row => {
            const rowTarget = QRUtils.cleanText(row.target || '');
            return rowTarget === cleanTarget;
        });
    }
    
    // Get all target column values for validation
    getAllTargetValues() {
        const mappedData = this.getMappedData();
        if (!mappedData) return [];
        
        return mappedData
            .map(row => row.target)
            .filter(target => target && target.trim() !== '')
            .map(target => QRUtils.cleanText(target));
    }
    
    // Storage methods
    saveToStorage() {
        const data = {
            columnMapping: this.columnMapping,
            availableColumns: this.availableColumns,
            timestamp: Date.now()
        };
        
        QRUtils.storage.set('column_mapping', data);
    }
    
    loadFromStorage() {
        const data = QRUtils.storage.get('column_mapping');
        if (!data) return false;
        
        // Check if data is recent (within 24 hours)
        const isRecent = data.timestamp && (Date.now() - data.timestamp) < 24 * 60 * 60 * 1000;
        if (!isRecent) return false;
        
        try {
            this.columnMapping = data.columnMapping;
            this.availableColumns = data.availableColumns || [];
            
            // Restore UI selections if columns are available
            if (this.availableColumns.length > 0 && this.columnMapping) {
                this.populateColumnSelects();
                
                // Restore selections
                Object.entries(this.columnMapping).forEach(([field, config]) => {
                    const select = QRUtils.$(`map-${field}`);
                    if (select) {
                        select.value = config.index.toString();
                    }
                });
                
                this.handleMappingChange();
            }
            
            QRUtils.log.info('Restored column mapping from storage');
            return true;
        } catch (error) {
            QRUtils.log.warn('Failed to load column mapping from storage:', error);
            QRUtils.storage.remove('column_mapping');
        }
        
        return false;
    }
    
    reset() {
        this.columnMapping = null;
        this.rangeData = null;
        this.availableColumns = [];
        
        // Reset selects
        const mappingSelects = ['map-serial', 'map-mpn', 'map-designators', 'map-manufacturer', 'map-quantity', 'map-target'];
        mappingSelects.forEach(selectId => {
            const select = QRUtils.$(selectId);
            if (select) {
                select.innerHTML = '<option value="">Select column...</option>';
            }
        });
        
        const confirmBtn = QRUtils.$('confirm-mapping');
        if (confirmBtn) {
            confirmBtn.disabled = true;
        }
        
        QRUtils.log.info('Column mapper reset');
    }
}

// Initialize and make globally available
window.columnMapper = new ColumnMapper();