/**
 * Column Mapping Module
 * Enhanced column mapping with intelligent auto-detection and validation
 * 
 * Features:
 * - Smart auto-mapping using pattern recognition
 * - Real-time validation with visual feedback  
 * - Duplicate column detection and prevention
 * - Target column selection for QR code matching
 * - Advanced text similarity algorithms
 * - Data processing with field mapping
 * - Row lookup functionality for scanner
 * - Storage persistence and auto-recovery
 */

class ColumnMapper {
    constructor() {
        this.rangeData = null;
        this.columnMapping = null;
        this.availableColumns = [];
        this.requiredFields = ['target']; // Target column is required
        this.optionalFields = ['serial', 'mpn', 'designators', 'manufacturer', 'quantity'];
        
        // Enhanced auto-mapping patterns
        this.autoMappingPatterns = {
            serial: [
                /^serial\s*(no|number|#)?$/i,
                /^s\/n$/i,
                /^sn$/i,
                /^item\s*(no|number|#)?$/i,
                /serial/i
            ],
            mpn: [
                /^mpn$/i,
                /^(manufacturer\s*)?part\s*(no|number|#)?$/i,
                /^p\/n$/i,
                /^part\s*code$/i,
                /component/i,
                /description/i,
                /item/i
            ],
            designators: [
                /designator/i,
                /reference/i,
                /^ref$/i,
                /position/i,
                /location/i,
                /legend/i
            ],
            manufacturer: [
                /^manufacturer$/i,
                /^mfr$/i,
                /^mfg$/i,
                /vendor/i,
                /supplier/i,
                /brand/i,
                /make/i
            ],
            quantity: [
                /^qty$/i,
                /^quantity$/i,
                /^count$/i,
                /^amount$/i,
                /^total$/i,
                /^pcs$/i,
                /pieces/i
            ],
            target: [
                /barcode/i,
                /qr\s*code/i,
                /scan/i,
                /code/i,
                /^id$/i,
                /target/i,
                /mpn/i, // Fallback to MPN
                /part/i // Fallback to part number
            ]
        };
        
        this.initializeEventListeners();
        this.loadFromStorage();
        
        QRUtils.log.info('Column Mapper initialized with enhanced features');
    }
    
    initializeEventListeners() {
        // Listen for range selection events
        document.addEventListener('range-selected', this.handleRangeSelected.bind(this));
        
        // Column selector change handlers
        const allFields = [...this.requiredFields, ...this.optionalFields];
        allFields.forEach(field => {
            const selector = QRUtils.$(`map-${field}`);
            if (selector) {
                selector.addEventListener('change', this.handleColumnChange.bind(this));
            }
        });
        
        // Button handlers
        const confirmBtn = QRUtils.$('confirm-mapping');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', this.confirmMapping.bind(this));
        }
        
        const autoMapBtn = QRUtils.$('auto-map');
        if (autoMapBtn) {
            autoMapBtn.addEventListener('click', this.performAutoMapping.bind(this));
        }
    }
    
    handleRangeSelected(event) {
        const { range, data } = event.detail;
        this.updateRangeData({ ...range, data });
    }
    
    updateRangeData(rangeData) {
        this.rangeData = rangeData;
        this.extractAvailableColumns();
        this.populateColumnSelects();
        this.performAutoMapping();
        
        QRUtils.log.info('Column mapper updated with range data');
    }
    
    extractAvailableColumns() {
        if (!this.rangeData || !this.rangeData.data || this.rangeData.data.length === 0) {
            this.availableColumns = [];
            return;
        }
        
        // Use first row as headers
        const headerRow = this.rangeData.data[0];
        const startColIndex = this.rangeData.startColIndex || 0;
        
        this.availableColumns = headerRow.map((header, index) => {
            const columnLetter = QRUtils.indexToColumn(startColIndex + index);
            const headerText = String(header || '').trim();
            
            return {
                index: startColIndex + index,
                arrayIndex: index, // Index in the row array
                column: columnLetter,
                header: headerText,
                displayName: headerText || `Column ${columnLetter}`,
                isEmpty: !headerText,
                value: (startColIndex + index).toString() // String value for selects
            };
        });
        
        QRUtils.log.info('Available columns extracted:', this.availableColumns);
    }
    
    populateColumnSelects() {
        const allFields = [...this.requiredFields, ...this.optionalFields];
        
        allFields.forEach(field => {
            const selector = QRUtils.$(`map-${field}`);
            if (!selector) return;
            
            // Clear existing options
            selector.innerHTML = '<option value="">Select column...</option>';
            
            // Add column options
            this.availableColumns.forEach(col => {
                const option = document.createElement('option');
                option.value = col.value;
                option.textContent = `${col.column}: ${col.displayName}`;
                option.title = col.header || col.displayName;
                
                // Style non-empty headers
                if (!col.isEmpty) {
                    option.style.fontWeight = '500';
                }
                
                selector.appendChild(option);
            });
        });
        
        QRUtils.log.info('Column selectors populated');
    }
    
    performAutoMapping() {
        if (!this.availableColumns || this.availableColumns.length === 0) {
            QRUtils.log.warn('No columns available for auto-mapping');
            return;
        }
        
        const mapping = {};
        const usedColumns = new Set();
        let mappingCount = 0;
        
        // Auto-map each field using pattern matching
        Object.entries(this.autoMappingPatterns).forEach(([field, patterns]) => {
            const bestMatch = this.findBestColumnMatch(patterns, usedColumns);
            if (bestMatch) {
                mapping[field] = bestMatch.value;
                usedColumns.add(bestMatch.value);
                mappingCount++;
                
                // Update selector
                const selector = QRUtils.$(`map-${field}`);
                if (selector) {
                    selector.value = bestMatch.value;
                }
                
                QRUtils.log.info(`Auto-mapped ${field} to ${bestMatch.displayName}`);
            }
        });
        
        // Ensure target column is mapped (required for scanning)
        if (!mapping.target && this.availableColumns.length > 0) {
            // Try to use MPN column as target if available
            const mpnColumn = this.availableColumns.find(col => 
                !col.isEmpty && 
                !usedColumns.has(col.value) && 
                /mpn|part/i.test(col.header)
            );
            
            if (mpnColumn) {
                mapping.target = mpnColumn.value;
                const targetSelector = QRUtils.$('map-target');
                if (targetSelector) targetSelector.value = mpnColumn.value;
                mappingCount++;
            } else {
                // Use first available non-empty column
                const firstColumn = this.availableColumns.find(col => 
                    !col.isEmpty && !usedColumns.has(col.value)
                );
                if (firstColumn) {
                    mapping.target = firstColumn.value;
                    const targetSelector = QRUtils.$('map-target');
                    if (targetSelector) targetSelector.value = firstColumn.value;
                    mappingCount++;
                }
            }
        }
        
        // Update validation
        this.handleColumnChange();
        
        if (mappingCount > 0) {
            QRUtils.showSuccess(`Auto-mapped ${mappingCount} columns`);
            QRUtils.log.success('Auto-mapping completed:', mapping);
        } else {
            QRUtils.log.warn('No columns could be auto-mapped');
            QRUtils.setStatus('Please map columns manually', 'info');
        }
    }
    
    findBestColumnMatch(patterns, excludeColumns = new Set()) {
        let bestMatch = null;
        let bestScore = 0;
        
        this.availableColumns.forEach(column => {
            if (excludeColumns.has(column.value) || column.isEmpty) return;
            
            const headerLower = column.header.toLowerCase().trim();
            
            patterns.forEach(pattern => {
                let score = 0;
                
                if (pattern.test(headerLower)) {
                    // Exact pattern match gets highest score
                    if (headerLower.match(pattern)?.[0] === headerLower) {
                        score = 100;
                    } else {
                        score = 75; // Partial match
                    }
                }
                
                // Bonus for shorter, more precise headers
                if (score > 0 && headerLower.length < 15) {
                    score += 10;
                }
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = column;
                }
            });
        });
        
        return bestMatch;
    }
    
    handleColumnChange() {
        this.updateColumnMapping();
        this.validateMapping();
    }
    
    updateColumnMapping() {
        const mapping = {};
        const allFields = [...this.requiredFields, ...this.optionalFields];
        
        allFields.forEach(field => {
            const selector = QRUtils.$(`map-${field}`);
            if (selector && selector.value) {
                const columnIndex = parseInt(selector.value);
                const columnInfo = this.availableColumns.find(col => 
                    parseInt(col.value) === columnIndex
                );
                
                if (columnInfo) {
                    mapping[field] = {
                        index: columnInfo.index,
                        arrayIndex: columnInfo.arrayIndex,
                        column: columnInfo.column,
                        header: columnInfo.header,
                        displayName: columnInfo.displayName
                    };
                }
            }
        });
        
        this.columnMapping = mapping;
        this.saveToStorage();
    }
    
    validateMapping() {
        let isValid = true;
        const issues = [];
        const usedColumns = new Set();
        const duplicates = [];
        
        // Check required fields
        this.requiredFields.forEach(field => {
            const selector = QRUtils.$(`map-${field}`);
            if (!selector || !selector.value) {
                isValid = false;
                issues.push(`${field} column is required`);
                
                if (selector) {
                    selector.classList.add('error');
                }
            } else {
                if (selector) {
                    selector.classList.remove('error');
                }
            }
        });
        
        // Check for duplicate mappings
        Object.entries(this.columnMapping || {}).forEach(([field, config]) => {
            const columnValue = config.index.toString();
            if (usedColumns.has(columnValue)) {
                duplicates.push(columnValue);
                isValid = false;
            }
            usedColumns.add(columnValue);
        });
        
        if (duplicates.length > 0) {
            issues.push('Multiple fields mapped to same column');
            
            // Highlight duplicate selectors
            Object.entries(this.columnMapping || {}).forEach(([field, config]) => {
                if (duplicates.includes(config.index.toString())) {
                    const selector = QRUtils.$(`map-${field}`);
                    if (selector) selector.classList.add('error');
                }
            });
        } else {
            // Remove error class from all selectors if no duplicates
            const allFields = [...this.requiredFields, ...this.optionalFields];
            allFields.forEach(field => {
                const selector = QRUtils.$(`map-${field}`);
                if (selector && this.columnMapping?.[field]) {
                    selector.classList.remove('error');
                }
            });
        }
        
        // Update confirm button
        const confirmBtn = QRUtils.$('confirm-mapping');
        if (confirmBtn) {
            confirmBtn.disabled = !isValid;
        }
        
        // Update status
        if (isValid && Object.keys(this.columnMapping || {}).length > 0) {
            const mappedCount = Object.keys(this.columnMapping).length;
            QRUtils.setStatus(`${mappedCount} columns mapped successfully`, 'success');
        } else if (issues.length > 0) {
            QRUtils.setStatus(`Issues: ${issues.join(', ')}`, 'warning');
        }
        
        return isValid;
    }
    
    confirmMapping() {
        if (!this.validateMapping()) {
            QRUtils.showWarning('Please fix mapping issues before confirming');
            return;
        }
        
        if (!this.columnMapping || Object.keys(this.columnMapping).length === 0) {
            QRUtils.showWarning('Please map at least the target column');
            return;
        }
        
        try {
            // Process data with mapping
            const processedData = this.processDataWithMapping();
            
            QRUtils.log.success('Column mapping confirmed:', this.columnMapping);
            QRUtils.setStatus('Column mapping confirmed successfully', 'success');
            
            // Save to storage
            this.saveToStorage();
            
            // Show next step and scanner interface
            QRUtils.show('step-5');
            QRUtils.show('scan-records-section');
            QRUtils.setStep(5);
            
            // Initialize scanner with mapping
            if (window.qrScanner) {
                window.qrScanner.updateColumnMapping(this.columnMapping, this.rangeData);
            }
            
            // Emit event for app coordination
            document.dispatchEvent(new CustomEvent('columns-mapped', {
                detail: {
                    columnMapping: this.columnMapping,
                    rangeData: this.rangeData,
                    processedData: processedData,
                    mapper: this
                }
            }));
            
        } catch (error) {
            QRUtils.handleError(error, 'Column Mapping Confirmation');
        }
    }
    
    processDataWithMapping() {
        if (!this.rangeData || !this.rangeData.data || !this.columnMapping) {
            return [];
        }
        
        const processedData = [];
        
        // Skip header row (index 0) for data processing
        for (let rowIndex = 1; rowIndex < this.rangeData.data.length; rowIndex++) {
            const rowData = this.rangeData.data[rowIndex];
            
            const processedRow = {
                _originalRowNumber: rowIndex + 1, // 1-based row number
                _actualRowNumber: (this.rangeData.startRow || 1) + rowIndex,
                _rowIndex: rowIndex
            };
            
            // Map each configured field
            Object.entries(this.columnMapping).forEach(([field, config]) => {
                const cellValue = rowData[config.arrayIndex];
                processedRow[field] = QRUtils.cleanText(cellValue || '');
            });
            
            // Skip completely empty rows
            const hasData = Object.entries(this.columnMapping).some(([field, config]) => {
                const cellValue = rowData[config.arrayIndex];
                return cellValue && String(cellValue).trim() !== '';
            });
            
            if (hasData) {
                processedData.push(processedRow);
            }
        }
        
        QRUtils.log.info(`Processed ${processedData.length} data rows with mapping`);
        return processedData;
    }
    
    // Find row by target column value (for QR scanning)
    findRowByTarget(targetValue) {
        if (!this.rangeData || !this.columnMapping || !this.columnMapping.target) {
            QRUtils.log.warn('Cannot find row: missing data or target mapping');
            return null;
        }
        
        const cleanTargetValue = QRUtils.cleanText(targetValue, { 
            toLowerCase: true,
            removeSpaces: false,
            normalizeSpaces: true
        });
        
        if (!cleanTargetValue) {
            QRUtils.log.warn('Empty target value provided');
            return null;
        }
        
        const targetConfig = this.columnMapping.target;
        
        // Search through data rows (skip header row)
        for (let rowIndex = 1; rowIndex < this.rangeData.data.length; rowIndex++) {
            const rowData = this.rangeData.data[rowIndex];
            const cellValue = rowData[targetConfig.arrayIndex];
            
            if (cellValue) {
                const cleanCellValue = QRUtils.cleanText(cellValue, {
                    toLowerCase: true,
                    removeSpaces: false,
                    normalizeSpaces: true
                });
                
                // Exact match
                if (cleanCellValue === cleanTargetValue) {
                    return this.createMatchResult(rowIndex, rowData, 'exact');
                }
                
                // Contains match (for partial matches)
                if (cleanCellValue.includes(cleanTargetValue) || 
                    cleanTargetValue.includes(cleanCellValue)) {
                    return this.createMatchResult(rowIndex, rowData, 'partial');
                }
            }
        }
        
        QRUtils.log.info(`No match found for target value: ${targetValue}`);
        return null;
    }
    
    createMatchResult(rowIndex, rowData, matchType) {
        const result = {
            _rowIndex: rowIndex,
            _originalRowNumber: rowIndex + 1,
            _actualRowNumber: (this.rangeData.startRow || 1) + rowIndex,
            _matchType: matchType
        };
        
        // Add mapped field values
        Object.entries(this.columnMapping).forEach(([field, config]) => {
            const cellValue = rowData[config.arrayIndex];
            result[field] = QRUtils.cleanText(cellValue || '');
        });
        
        return result;
    }
    
    // Get all mapped data (excluding header)
    getMappedData() {
        return this.processDataWithMapping();
    }
    
    // Get column headers with mapping info
    getColumnHeaders() {
        return this.availableColumns || [];
    }
    
    // Get currently mapped fields
    getMappedFields() {
        if (!this.columnMapping) return [];
        
        return Object.entries(this.columnMapping).map(([field, config]) => ({
            field: field,
            column: config.column,
            header: config.header,
            displayName: config.displayName,
            isRequired: this.requiredFields.includes(field)
        }));
    }
    
    // Get all target values for validation
    getAllTargetValues() {
        const mappedData = this.getMappedData();
        if (!mappedData) return [];
        
        return mappedData
            .filter(row => row.target && row.target.trim() !== '')
            .map(row => QRUtils.cleanText(row.target))
            .filter(value => value !== '');
    }
    
    saveToStorage() {
        if (!this.columnMapping) return;
        
        const data = {
            columnMapping: this.columnMapping,
            availableColumns: this.availableColumns,
            rangeData: this.rangeData ? {
                startRow: this.rangeData.startRow,
                endRow: this.rangeData.endRow,
                startCol: this.rangeData.startCol,
                endCol: this.rangeData.endCol
            } : null,
            timestamp: Date.now()
        };
        
        QRUtils.storage.set('column_mapping', data);
    }
    
    loadFromStorage() {
        const data = QRUtils.storage.get('column_mapping');
        if (!data || !data.columnMapping) return false;
        
        // Check if data is recent (within 2 hours)
        const isRecent = data.timestamp && (Date.now() - data.timestamp) < 2 * 60 * 60 * 1000;
        if (!isRecent) {
            QRUtils.storage.remove('column_mapping');
            return false;
        }
        
        try {
            this.columnMapping = data.columnMapping;
            this.availableColumns = data.availableColumns || [];
            
            // Restore UI after a delay to ensure elements exist
            setTimeout(() => {
                if (this.availableColumns.length > 0) {
                    this.populateColumnSelects();
                    
                    // Restore selector values
                    Object.entries(this.columnMapping).forEach(([field, config]) => {
                        const selector = QRUtils.$(`map-${field}`);
                        if (selector) {
                            selector.value = config.index.toString();
                        }
                    });
                    
                    this.validateMapping();
                }
            }, 500);
            
            QRUtils.log.info('Restored column mapping from storage');
            return true;
            
        } catch (error) {
            QRUtils.log.warn('Failed to load column mapping from storage:', error);
            QRUtils.storage.remove('column_mapping');
            return false;
        }
    }
    
    reset() {
        this.rangeData = null;
        this.columnMapping = null;
        this.availableColumns = [];
        
        // Reset UI
        const allFields = [...this.requiredFields, ...this.optionalFields];
        allFields.forEach(field => {
            const selector = QRUtils.$(`map-${field}`);
            if (selector) {
                selector.innerHTML = '<option value="">Select column...</option>';
                selector.classList.remove('error');
            }
        });
        
        // Disable confirm button
        const confirmBtn = QRUtils.$('confirm-mapping');
        if (confirmBtn) {
            confirmBtn.disabled = true;
        }
        
        QRUtils.log.info('Column mapper reset');
    }
    
    getStatus() {
        return {
            hasRangeData: !!this.rangeData,
            hasMapping: !!this.columnMapping,
            mappedFields: Object.keys(this.columnMapping || {}).length,
            requiredFieldsMapped: this.requiredFields.every(field => 
                this.columnMapping?.[field]
            ),
            availableColumns: this.availableColumns.length,
            isValid: this.validateMapping()
        };
    }
}

// Initialize and make globally available
window.columnMapper = new ColumnMapper();