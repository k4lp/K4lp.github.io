/**
 * Enhanced Excel Processing with Visual Column Mapping and BOM Analysis
 * Provides advanced Excel file processing, visual previews, column mapping, and BOM-specific tools
 * Part of K4LP Engineering Tools - Swiss Minimalist Design
 * @version 2.2.0 - Enhanced with visual mapping and BOM processing
 */

class ExcelManager {
    constructor() {
        this.version = '2.2.0';
        
        // Current workbook state
        this.currentWorkbook = null;
        this.currentWorksheet = null;
        this.worksheetData = null;
        this.worksheetList = [];
        this.fileName = null;
        
        // Column mapping and analysis
        this.columnMappings = new Map();
        this.detectedColumns = {
            partNumber: [],
            manufacturer: [],
            description: [],
            quantity: [],
            reference: [],
            value: [],
            package: [],
            tolerance: [],
            voltage: [],
            current: [],
            power: [],
            temperature: [],
            mounting: [],
            datasheet: [],
            supplier: [],
            supplierPartNumber: [],
            unitPrice: [],
            totalPrice: [],
            availability: [],
            leadTime: [],
            rohs: [],
            lifecycle: []
        };
        
        // BOM processing configuration
        this.bomConfig = {
            headerRow: 1,
            dataStartRow: 2,
            ignoreEmptyRows: true,
            trimWhitespace: true,
            caseSensitive: false,
            groupSimilarParts: true,
            calculateTotals: true,
            validatePartNumbers: true
        };
        
        // Visual preview settings
        this.previewSettings = {
            maxRows: 100,
            maxColumns: 50,
            cellWidth: 120,
            cellHeight: 30,
            showGridlines: true,
            highlightHeaders: true,
            showColumnTypes: true
        };
        
        // Data analysis results
        this.analysis = {
            totalRows: 0,
            totalColumns: 0,
            emptyRows: [],
            emptyColumns: [],
            duplicateRows: [],
            dataTypes: {},
            statistics: {},
            bomSummary: null
        };
        
        // Processing history
        this.processingHistory = [];
        
        this.initialize();
    }
    
    /**
     * Initialize Excel manager
     */
    initialize() {
        // Check for XLSX library
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX library not loaded. Please include xlsx.full.min.js');
        }
        
        console.log('✓ K4LP Excel Manager v2.2.0 initialized');
    }
    
    /**
     * Load Excel file with comprehensive processing
     */
    async loadExcelFile(file, options = {}) {
        const config = { ...this.bomConfig, ...options };
        
        try {
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            
            // Parse workbook
            this.currentWorkbook = XLSX.read(arrayBuffer, {
                type: 'array',
                cellFormula: true,
                cellStyles: true,
                cellNF: true,
                cellHTML: false
            });
            
            this.fileName = file.name;
            this.worksheetList = this.currentWorkbook.SheetNames;
            
            // Load first worksheet by default
            if (this.worksheetList.length > 0) {
                await this.selectWorksheet(this.worksheetList[0], config);
            }
            
            // Add to processing history
            this.addToHistory('file_loaded', {
                filename: file.name,
                size: file.size,
                worksheets: this.worksheetList.length,
                timestamp: Date.now()
            });
            
            console.log(`✓ Excel file loaded: ${file.name} (${this.worksheetList.length} sheets)`);
            return this.getWorkbookSummary();
            
        } catch (error) {
            console.error('Failed to load Excel file:', error);
            throw error;
        }
    }
    
    /**
     * Read file as array buffer
     */
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(new Uint8Array(e.target.result));
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }
    
    /**
     * Select and analyze worksheet
     */
    async selectWorksheet(sheetName, options = {}) {
        if (!this.currentWorkbook || !this.currentWorkbook.Sheets[sheetName]) {
            throw new Error(`Worksheet '${sheetName}' not found`);
        }
        
        const config = { ...this.bomConfig, ...options };
        
        this.currentWorksheet = this.currentWorkbook.Sheets[sheetName];
        
        // Convert to JSON with header handling
        this.worksheetData = XLSX.utils.sheet_to_json(this.currentWorksheet, {
            header: 1, // Use array of arrays format
            range: undefined, // Process entire sheet
            blankrows: !config.ignoreEmptyRows,
            defval: '' // Default value for empty cells
        });
        
        // Perform comprehensive analysis
        await this.analyzeWorksheet(config);
        
        // Detect column types and mappings
        await this.detectColumnTypes();
        
        console.log(`✓ Worksheet '${sheetName}' analyzed: ${this.analysis.totalRows} rows, ${this.analysis.totalColumns} columns`);
        
        return this.getWorksheetSummary();
    }
    
    /**
     * Comprehensive worksheet analysis
     */
    async analyzeWorksheet(config) {
        if (!this.worksheetData || this.worksheetData.length === 0) {
            this.analysis = { totalRows: 0, totalColumns: 0 };
            return;
        }
        
        const data = this.worksheetData;
        const maxColumns = Math.max(...data.map(row => row.length));
        
        this.analysis = {
            totalRows: data.length,
            totalColumns: maxColumns,
            emptyRows: [],
            emptyColumns: [],
            duplicateRows: [],
            dataTypes: {},
            statistics: {},
            bomSummary: null
        };
        
        // Find empty rows
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
                this.analysis.emptyRows.push(i + 1); // 1-based indexing
            }
        }
        
        // Find empty columns
        for (let col = 0; col < maxColumns; col++) {
            const isEmpty = data.every(row => !row[col] || String(row[col]).trim() === '');
            if (isEmpty) {
                this.analysis.emptyColumns.push(col + 1); // 1-based indexing
            }
        }
        
        // Detect data types for each column
        for (let col = 0; col < maxColumns; col++) {
            const columnData = data
                .slice(config.dataStartRow - 1) // Skip header rows
                .map(row => row[col])
                .filter(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
            
            this.analysis.dataTypes[col] = this.detectDataType(columnData);
        }
        
        // Find duplicate rows (excluding header)
        const dataRows = data.slice(config.dataStartRow - 1);
        const seenRows = new Set();
        
        for (let i = 0; i < dataRows.length; i++) {
            const rowStr = JSON.stringify(dataRows[i]);
            if (seenRows.has(rowStr)) {
                this.analysis.duplicateRows.push(i + config.dataStartRow); // Adjust for header offset
            } else {
                seenRows.add(rowStr);
            }
        }
        
        // Generate statistics
        this.generateStatistics(config);
        
        // BOM-specific analysis
        if (this.isBomLikeData()) {
            this.analysis.bomSummary = this.generateBomSummary(config);
        }
    }
    
    /**
     * Detect data type of column
     */
    detectDataType(columnData) {
        if (columnData.length === 0) return 'empty';
        
        const samples = columnData.slice(0, 50); // Sample first 50 values
        let numbers = 0;
        let integers = 0;
        let currencies = 0;
        let percentages = 0;
        let dates = 0;
        let emails = 0;
        let urls = 0;
        let partNumbers = 0;
        
        for (const value of samples) {
            const str = String(value).trim();
            
            // Check for numbers
            if (!isNaN(Number(str)) && str !== '') {
                numbers++;
                if (Number.isInteger(Number(str))) integers++;
            }
            
            // Check for currency
            if (/^[\$£€¥][\d,]+\.?\d*$/.test(str) || /^[\d,]+\.?\d*[\$£€¥]$/.test(str)) {
                currencies++;
            }
            
            // Check for percentage
            if (/^\d+\.?\d*%$/.test(str)) {
                percentages++;
            }
            
            // Check for dates
            if (!isNaN(Date.parse(str)) && str.length > 6) {
                dates++;
            }
            
            // Check for emails
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
                emails++;
            }
            
            // Check for URLs
            if (/^https?:\/\/.+/.test(str)) {
                urls++;
            }
            
            // Check for part numbers (common patterns)
            if (/^[A-Z0-9][A-Z0-9\-_]{2,}$/i.test(str) || /^\w+\-\d+/.test(str)) {
                partNumbers++;
            }
        }
        
        const total = samples.length;
        const threshold = 0.6; // 60% threshold for type detection
        
        if (currencies / total >= threshold) return 'currency';
        if (percentages / total >= threshold) return 'percentage';
        if (dates / total >= threshold) return 'date';
        if (emails / total >= threshold) return 'email';
        if (urls / total >= threshold) return 'url';
        if (partNumbers / total >= threshold) return 'partnumber';
        if (integers / total >= threshold) return 'integer';
        if (numbers / total >= threshold) return 'number';
        
        return 'text';
    }
    
    /**
     * Detect column types and suggest mappings
     */
    async detectColumnTypes() {
        if (!this.worksheetData || this.worksheetData.length === 0) return;
        
        const headerRow = this.worksheetData[this.bomConfig.headerRow - 1] || [];
        this.columnMappings.clear();
        
        // Reset detected columns
        Object.keys(this.detectedColumns).forEach(key => {
            this.detectedColumns[key] = [];
        });
        
        // Common column name patterns
        const patterns = {
            partNumber: /^(part|part\s*number|mpn|mfg\s*part|manufacturer\s*part|p\/n|pn)$/i,
            manufacturer: /^(manufacturer|mfg|mfr|brand|make)$/i,
            description: /^(description|desc|title|name|part\s*name)$/i,
            quantity: /^(quantity|qty|count|amount|pieces|pcs|q)$/i,
            reference: /^(reference|ref|designator|component|comp|r)$/i,
            value: /^(value|val|rating|v)$/i,
            package: /^(package|pkg|footprint|case|enclosure)$/i,
            tolerance: /^(tolerance|tol|precision|accuracy)$/i,
            voltage: /^(voltage|volt|v|vdc|vac|max\s*voltage)$/i,
            current: /^(current|amp|a|max\s*current|i)$/i,
            power: /^(power|watt|w|p|max\s*power)$/i,
            temperature: /^(temperature|temp|t|operating\s*temp)$/i,
            mounting: /^(mounting|mount|smd|smt|through\s*hole|th)$/i,
            datasheet: /^(datasheet|data\s*sheet|pdf|spec|specification)$/i,
            supplier: /^(supplier|vendor|distributor|source)$/i,
            supplierPartNumber: /^(supplier\s*part|vendor\s*part|distributor\s*part|spn)$/i,
            unitPrice: /^(unit\s*price|price|cost|unit\s*cost|up)$/i,
            totalPrice: /^(total\s*price|total\s*cost|extended\s*price|total)$/i,
            availability: /^(availability|stock|in\s*stock|avail)$/i,
            leadTime: /^(lead\s*time|delivery|shipping|lt)$/i,
            rohs: /^(rohs|rohs\s*compliant|environmental)$/i,
            lifecycle: /^(lifecycle|life\s*cycle|status|part\s*status)$/i
        };
        
        // Match headers to patterns
        headerRow.forEach((header, index) => {
            if (!header || typeof header !== 'string') return;
            
            const cleanHeader = header.trim();
            
            Object.entries(patterns).forEach(([type, pattern]) => {
                if (pattern.test(cleanHeader)) {
                    this.detectedColumns[type].push({
                        index: index,
                        header: cleanHeader,
                        confidence: 0.9,
                        dataType: this.analysis.dataTypes[index] || 'text'
                    });
                    
                    this.columnMappings.set(index, {
                        type: type,
                        header: cleanHeader,
                        confidence: 0.9,
                        autoDetected: true
                    });
                }
            });
        });
        
        // Secondary detection based on data patterns
        this.detectColumnsByDataPattern();
        
        console.log(`✓ Column detection complete. Found mappings for ${this.columnMappings.size} columns`);
    }
    
    /**
     * Detect columns by analyzing data patterns
     */
    detectColumnsByDataPattern() {
        if (!this.worksheetData || this.worksheetData.length < 2) return;
        
        const dataRows = this.worksheetData.slice(this.bomConfig.dataStartRow - 1);
        
        for (let col = 0; col < this.analysis.totalColumns; col++) {
            // Skip if already mapped
            if (this.columnMappings.has(col)) continue;
            
            const columnData = dataRows
                .map(row => row[col])
                .filter(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')
                .slice(0, 20); // Sample first 20 values
            
            if (columnData.length === 0) continue;
            
            const type = this.classifyColumnByContent(columnData);
            
            if (type && !this.detectedColumns[type].find(col => col.index === col)) {
                const headerRow = this.worksheetData[this.bomConfig.headerRow - 1] || [];
                const header = headerRow[col] || `Column ${col + 1}`;
                
                this.detectedColumns[type].push({
                    index: col,
                    header: String(header),
                    confidence: 0.7,
                    dataType: this.analysis.dataTypes[col] || 'text'
                });
                
                this.columnMappings.set(col, {
                    type: type,
                    header: String(header),
                    confidence: 0.7,
                    autoDetected: true
                });
            }
        }
    }
    
    /**
     * Classify column by content analysis
     */
    classifyColumnByContent(columnData) {
        const samples = columnData.slice(0, 10);
        
        // Part number patterns
        const partNumberPatterns = samples.filter(val => {
            const str = String(val).trim();
            return /^[A-Z0-9][A-Z0-9\-_\.]{2,}$/i.test(str) && str.length >= 3;
        }).length;
        
        if (partNumberPatterns / samples.length > 0.6) return 'partNumber';
        
        // Quantity patterns (positive integers)
        const quantityPatterns = samples.filter(val => {
            const num = Number(val);
            return Number.isInteger(num) && num > 0 && num < 100000;
        }).length;
        
        if (quantityPatterns / samples.length > 0.8) return 'quantity';
        
        // Reference designator patterns (R1, C2, U3, etc.)
        const referencePatterns = samples.filter(val => {
            const str = String(val).trim();
            return /^[RCLQUDJTPFYXBKAN]\d+$/i.test(str) || /^[A-Z]+\d+$/i.test(str);
        }).length;
        
        if (referencePatterns / samples.length > 0.6) return 'reference';
        
        // Value patterns (with units)
        const valuePatterns = samples.filter(val => {
            const str = String(val).trim();
            return /^\d+\.?\d*[a-zμΩΩµ]*$/i.test(str) || /^\d+[kmgtpnuf]?[a-zμΩΩµ]+$/i.test(str);
        }).length;
        
        if (valuePatterns / samples.length > 0.6) return 'value';
        
        return null;
    }
    
    /**
     * Check if data looks like a BOM
     */
    isBomLikeData() {
        const hasPartNumbers = this.detectedColumns.partNumber.length > 0;
        const hasQuantity = this.detectedColumns.quantity.length > 0;
        const hasDescription = this.detectedColumns.description.length > 0;
        const hasManufacturer = this.detectedColumns.manufacturer.length > 0;
        
        // Need at least part numbers and quantity to be considered a BOM
        return hasPartNumbers && (hasQuantity || hasDescription || hasManufacturer);
    }
    
    /**
     * Generate BOM summary
     */
    generateBomSummary(config) {
        if (!this.worksheetData) return null;
        
        const dataRows = this.worksheetData.slice(config.dataStartRow - 1);
        const summary = {
            totalLines: dataRows.filter(row => row && row.some(cell => cell)).length,
            uniqueParts: new Set(),
            totalQuantity: 0,
            manufacturers: new Set(),
            categories: new Set(),
            estimatedCost: 0,
            issues: []
        };
        
        // Get column indices
        const partNumberCol = this.detectedColumns.partNumber[0]?.index;
        const quantityCol = this.detectedColumns.quantity[0]?.index;
        const manufacturerCol = this.detectedColumns.manufacturer[0]?.index;
        const priceCol = this.detectedColumns.unitPrice[0]?.index;
        
        dataRows.forEach((row, rowIndex) => {
            if (!row || !row.some(cell => cell)) return;
            
            // Count part numbers
            if (partNumberCol !== undefined && row[partNumberCol]) {
                summary.uniqueParts.add(String(row[partNumberCol]).trim());
            }
            
            // Sum quantities
            if (quantityCol !== undefined && row[quantityCol]) {
                const qty = Number(row[quantityCol]);
                if (!isNaN(qty) && qty > 0) {
                    summary.totalQuantity += qty;
                }
            }
            
            // Collect manufacturers
            if (manufacturerCol !== undefined && row[manufacturerCol]) {
                summary.manufacturers.add(String(row[manufacturerCol]).trim());
            }
            
            // Estimate cost
            if (priceCol !== undefined && quantityCol !== undefined && 
                row[priceCol] && row[quantityCol]) {
                const price = this.parsePrice(row[priceCol]);
                const qty = Number(row[quantityCol]);
                if (!isNaN(price) && !isNaN(qty) && price > 0 && qty > 0) {
                    summary.estimatedCost += price * qty;
                }
            }
            
            // Check for issues
            if (partNumberCol !== undefined && !row[partNumberCol]) {
                summary.issues.push(`Row ${rowIndex + config.dataStartRow}: Missing part number`);
            }
            
            if (quantityCol !== undefined && (!row[quantityCol] || Number(row[quantityCol]) <= 0)) {
                summary.issues.push(`Row ${rowIndex + config.dataStartRow}: Invalid quantity`);
            }
        });
        
        summary.uniqueParts = summary.uniqueParts.size;
        summary.manufacturers = summary.manufacturers.size;
        
        return summary;
    }
    
    /**
     * Parse price from various formats
     */
    parsePrice(priceValue) {
        if (typeof priceValue === 'number') return priceValue;
        
        const str = String(priceValue).trim();
        // Remove currency symbols and commas
        const cleaned = str.replace(/[\$£€¥,]/g, '');
        return parseFloat(cleaned);
    }
    
    /**
     * Generate statistics for the worksheet
     */
    generateStatistics(config) {
        if (!this.worksheetData || this.worksheetData.length === 0) return;
        
        const dataRows = this.worksheetData.slice(config.dataStartRow - 1);
        
        this.analysis.statistics = {
            headerRows: config.dataStartRow - 1,
            dataRows: dataRows.length,
            filledCells: 0,
            emptyCells: 0,
            maxRowLength: Math.max(...this.worksheetData.map(row => row.length)),
            avgRowLength: 0
        };
        
        let totalCells = 0;
        let filledCells = 0;
        let rowLengthSum = 0;
        
        this.worksheetData.forEach(row => {
            rowLengthSum += row.length;
            totalCells += row.length;
            
            row.forEach(cell => {
                if (cell !== undefined && cell !== null && String(cell).trim() !== '') {
                    filledCells++;
                }
            });
        });
        
        this.analysis.statistics.filledCells = filledCells;
        this.analysis.statistics.emptyCells = totalCells - filledCells;
        this.analysis.statistics.avgRowLength = rowLengthSum / this.worksheetData.length;
        this.analysis.statistics.fillRate = (filledCells / totalCells * 100).toFixed(1) + '%';
    }
    
    /**
     * Create visual preview table
     */
    createVisualPreview(containerId, options = {}) {
        const config = { ...this.previewSettings, ...options };
        const container = document.getElementById(containerId);
        
        if (!container || !this.worksheetData) {
            throw new Error('Container not found or no data loaded');
        }
        
        // Clear existing content
        container.innerHTML = '';
        
        // Create preview container
        const previewContainer = document.createElement('div');
        previewContainer.className = 'excel-preview-container';
        
        // Create table
        const table = document.createElement('table');
        table.className = 'excel-preview-table';
        
        // Add headers if enabled
        if (config.highlightHeaders && this.bomConfig.headerRow <= this.worksheetData.length) {
            const headerRow = document.createElement('tr');
            headerRow.className = 'excel-header-row';
            
            const headers = this.worksheetData[this.bomConfig.headerRow - 1] || [];
            const maxCols = Math.min(config.maxColumns, this.analysis.totalColumns);
            
            for (let col = 0; col < maxCols; col++) {
                const th = document.createElement('th');
                th.className = 'excel-header-cell';
                th.style.width = config.cellWidth + 'px';
                th.style.minWidth = config.cellWidth + 'px';
                
                const header = headers[col] || `Col ${col + 1}`;
                th.textContent = String(header);
                
                // Add column mapping indicator
                const mapping = this.columnMappings.get(col);
                if (mapping) {
                    const indicator = document.createElement('span');
                    indicator.className = 'column-type-indicator';
                    indicator.textContent = ` (${mapping.type})`;
                    indicator.title = `Detected as ${mapping.type} with ${(mapping.confidence * 100).toFixed(0)}% confidence`;
                    th.appendChild(indicator);
                }
                
                headerRow.appendChild(th);
            }
            
            table.appendChild(headerRow);
        }
        
        // Add data rows
        const startRow = this.bomConfig.dataStartRow - 1;
        const maxRows = Math.min(config.maxRows, this.worksheetData.length - startRow);
        const maxCols = Math.min(config.maxColumns, this.analysis.totalColumns);
        
        for (let row = 0; row < maxRows; row++) {
            const dataRowIndex = startRow + row;
            if (dataRowIndex >= this.worksheetData.length) break;
            
            const tr = document.createElement('tr');
            tr.className = 'excel-data-row';
            
            // Add row number indicator
            const rowNumberCell = document.createElement('td');
            rowNumberCell.className = 'excel-row-number';
            rowNumberCell.textContent = (dataRowIndex + 1).toString();
            tr.appendChild(rowNumberCell);
            
            const rowData = this.worksheetData[dataRowIndex] || [];
            
            for (let col = 0; col < maxCols; col++) {
                const td = document.createElement('td');
                td.className = 'excel-data-cell';
                td.style.width = config.cellWidth + 'px';
                td.style.minWidth = config.cellWidth + 'px';
                td.style.height = config.cellHeight + 'px';
                
                const cellValue = rowData[col];
                const displayValue = cellValue !== undefined && cellValue !== null ? String(cellValue) : '';
                
                // Truncate long values
                const maxLength = Math.floor(config.cellWidth / 8); // Rough character estimate
                td.textContent = displayValue.length > maxLength ? 
                    displayValue.substring(0, maxLength - 3) + '...' : displayValue;
                td.title = displayValue; // Full value in tooltip
                
                // Add data type styling
                const dataType = this.analysis.dataTypes[col] || 'text';
                td.classList.add(`data-type-${dataType}`);
                
                // Highlight mapped columns
                if (this.columnMappings.has(col)) {
                    td.classList.add('mapped-column');
                }
                
                tr.appendChild(td);
            }
            
            table.appendChild(tr);
        }
        
        previewContainer.appendChild(table);
        
        // Add summary info
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'excel-preview-summary';
        
        const summaryText = `Showing ${Math.min(maxRows, this.analysis.totalRows - startRow)} of ${this.analysis.totalRows - startRow} rows, ${maxCols} of ${this.analysis.totalColumns} columns`;
        summaryDiv.textContent = summaryText;
        
        previewContainer.appendChild(summaryDiv);
        container.appendChild(previewContainer);
        
        return previewContainer;
    }
    
    /**
     * Create column mapping interface
     */
    createColumnMappingInterface(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container || !this.worksheetData) {
            throw new Error('Container not found or no data loaded');
        }
        
        container.innerHTML = '';
        
        const mappingContainer = document.createElement('div');
        mappingContainer.className = 'column-mapping-container';
        
        // Title
        const title = document.createElement('h3');
        title.textContent = 'Column Mapping';
        mappingContainer.appendChild(title);
        
        // Headers
        const headerRow = this.worksheetData[this.bomConfig.headerRow - 1] || [];
        
        headerRow.forEach((header, index) => {
            const mappingRow = document.createElement('div');
            mappingRow.className = 'mapping-row';
            
            // Column info
            const columnInfo = document.createElement('div');
            columnInfo.className = 'column-info';
            columnInfo.innerHTML = `
                <strong>${header || `Column ${index + 1}`}</strong><br>
                <small>Type: ${this.analysis.dataTypes[index] || 'text'}</small>
            `;
            
            // Mapping selector
            const selector = document.createElement('select');
            selector.className = 'mapping-selector';
            selector.dataset.columnIndex = index;
            
            // Add options
            const noneOption = document.createElement('option');
            noneOption.value = '';
            noneOption.textContent = 'Not mapped';
            selector.appendChild(noneOption);
            
            Object.keys(this.detectedColumns).forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1');
                
                // Select if auto-detected
                const mapping = this.columnMappings.get(index);
                if (mapping && mapping.type === type) {
                    option.selected = true;
                }
                
                selector.appendChild(option);
            });
            
            // Add change handler
            selector.addEventListener('change', (e) => {
                const colIndex = parseInt(e.target.dataset.columnIndex);
                const mappingType = e.target.value;
                
                if (mappingType) {
                    this.setColumnMapping(colIndex, mappingType, false); // Manual mapping
                } else {
                    this.removeColumnMapping(colIndex);
                }
            });
            
            mappingRow.appendChild(columnInfo);
            mappingRow.appendChild(selector);
            mappingContainer.appendChild(mappingRow);
        });
        
        container.appendChild(mappingContainer);
        return mappingContainer;
    }
    
    /**
     * Set column mapping
     */
    setColumnMapping(columnIndex, type, autoDetected = false) {
        const headerRow = this.worksheetData[this.bomConfig.headerRow - 1] || [];
        const header = headerRow[columnIndex] || `Column ${columnIndex + 1}`;
        
        this.columnMappings.set(columnIndex, {
            type: type,
            header: String(header),
            confidence: autoDetected ? 0.9 : 1.0,
            autoDetected: autoDetected
        });
        
        // Update detected columns array
        this.detectedColumns[type] = this.detectedColumns[type] || [];
        
        // Remove from other types first
        Object.keys(this.detectedColumns).forEach(detectedType => {
            this.detectedColumns[detectedType] = this.detectedColumns[detectedType].filter(col => col.index !== columnIndex);
        });
        
        // Add to correct type
        this.detectedColumns[type].push({
            index: columnIndex,
            header: String(header),
            confidence: autoDetected ? 0.9 : 1.0,
            dataType: this.analysis.dataTypes[columnIndex] || 'text'
        });
    }
    
    /**
     * Remove column mapping
     */
    removeColumnMapping(columnIndex) {
        this.columnMappings.delete(columnIndex);
        
        // Remove from all detected columns arrays
        Object.keys(this.detectedColumns).forEach(type => {
            this.detectedColumns[type] = this.detectedColumns[type].filter(col => col.index !== columnIndex);
        });
    }
    
    /**
     * Process BOM data with current mappings
     */
    processBomData(options = {}) {
        if (!this.worksheetData) {
            throw new Error('No data loaded');
        }
        
        const config = { ...this.bomConfig, ...options };
        const dataRows = this.worksheetData.slice(config.dataStartRow - 1);
        
        const bomData = [];
        
        dataRows.forEach((row, index) => {
            if (!row || !row.some(cell => cell)) return;
            
            const bomItem = {
                rowIndex: index + config.dataStartRow,
                data: {}
            };
            
            // Map each column based on current mappings
            this.columnMappings.forEach((mapping, columnIndex) => {
                const value = row[columnIndex];
                if (value !== undefined && value !== null) {
                    bomItem.data[mapping.type] = this.formatCellValue(value, mapping.type);
                }
            });
            
            // Only include rows with essential data
            if (bomItem.data.partNumber || bomItem.data.description) {
                bomData.push(bomItem);
            }
        });
        
        // Add to processing history
        this.addToHistory('bom_processed', {
            items: bomData.length,
            mappings: Object.fromEntries(this.columnMappings),
            timestamp: Date.now()
        });
        
        return bomData;
    }
    
    /**
     * Format cell value based on mapping type
     */
    formatCellValue(value, type) {
        const str = String(value).trim();
        
        switch (type) {
            case 'quantity':
                return parseInt(str) || 0;
            
            case 'unitPrice':
            case 'totalPrice':
                return this.parsePrice(value);
            
            case 'voltage':
            case 'current':
            case 'power':
                // Extract numeric value and unit
                const numericMatch = str.match(/([\d\.]+)\s*([a-zμΩΩµ]*)/i);
                if (numericMatch) {
                    return {
                        value: parseFloat(numericMatch[1]),
                        unit: numericMatch[2] || ''
                    };
                }
                return { value: parseFloat(str) || 0, unit: '' };
            
            case 'rohs':
                return /^(yes|y|true|1|compliant|rohs)$/i.test(str);
            
            default:
                return str;
        }
    }
    
    /**
     * Export processed data to various formats
     */
    exportData(format = 'json', options = {}) {
        const bomData = this.processBomData(options);
        
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(bomData, null, 2);
            
            case 'csv':
                return this.exportToCsv(bomData);
            
            case 'excel':
                return this.exportToExcel(bomData);
            
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }
    
    /**
     * Export to CSV format
     */
    exportToCsv(bomData) {
        if (bomData.length === 0) return '';
        
        // Get all unique fields
        const fields = new Set();
        bomData.forEach(item => {
            Object.keys(item.data).forEach(key => fields.add(key));
        });
        
        const fieldArray = Array.from(fields).sort();
        
        // Create CSV content
        const csvRows = [
            fieldArray.join(','), // Header
            ...bomData.map(item => 
                fieldArray.map(field => {
                    const value = item.data[field] || '';
                    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                    return `"${stringValue.replace(/"/g, '""')}"`; // Escape quotes
                }).join(',')
            )
        ];
        
        return csvRows.join('\n');
    }
    
    /**
     * Add to processing history
     */
    addToHistory(action, details) {
        this.processingHistory.push({
            action,
            details,
            timestamp: Date.now()
        });
        
        // Keep only last 100 entries
        if (this.processingHistory.length > 100) {
            this.processingHistory = this.processingHistory.slice(-100);
        }
    }
    
    /**
     * Get workbook summary
     */
    getWorkbookSummary() {
        return {
            fileName: this.fileName,
            worksheets: this.worksheetList,
            currentWorksheet: this.currentWorksheet ? Object.keys(this.currentWorkbook.Sheets).find(name => 
                this.currentWorkbook.Sheets[name] === this.currentWorksheet
            ) : null,
            analysis: this.analysis,
            detectedColumns: this.detectedColumns,
            columnMappings: Object.fromEntries(this.columnMappings),
            isBom: this.isBomLikeData()
        };
    }
    
    /**
     * Get worksheet summary
     */
    getWorksheetSummary() {
        return {
            analysis: this.analysis,
            detectedColumns: this.detectedColumns,
            columnMappings: Object.fromEntries(this.columnMappings),
            isBom: this.isBomLikeData(),
            bomSummary: this.analysis.bomSummary
        };
    }
    
    /**
     * Get processing history
     */
    getProcessingHistory(limit = 10) {
        return this.processingHistory.slice(-limit);
    }
    
    /**
     * Clear all data
     */
    clearData() {
        this.currentWorkbook = null;
        this.currentWorksheet = null;
        this.worksheetData = null;
        this.worksheetList = [];
        this.fileName = null;
        this.columnMappings.clear();
        
        Object.keys(this.detectedColumns).forEach(key => {
            this.detectedColumns[key] = [];
        });
        
        this.analysis = {
            totalRows: 0,
            totalColumns: 0,
            emptyRows: [],
            emptyColumns: [],
            duplicateRows: [],
            dataTypes: {},
            statistics: {},
            bomSummary: null
        };
    }
}

// Create and expose global instance
const excelManager = new ExcelManager();
window.excelManager = excelManager;

// Legacy compatibility
window.ExcelManager = ExcelManager;

// Module export for modern environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExcelManager;
}

console.log('✓ K4LP Excel Manager v2.2.0 initialized');