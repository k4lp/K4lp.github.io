/**
 * Enhanced Excel Processing Engine
 * Advanced Excel file handling, sheet navigation, column mapping, and data extraction
 * Part of K4LP Engineering Tools - Swiss Minimalist Design
 * @version 2.0.0
 */

class ExcelProcessor {
    constructor() {
        this.version = '2.0.0';
        
        // Core properties
        this.workbook = null;
        this.currentSheet = null;
        this.sheetData = null;
        this.originalData = null;
        
        // File information
        this.fileInfo = {
            name: null,
            size: 0,
            lastModified: null,
            type: null,
            encoding: null
        };
        
        // Processing configuration
        this.config = {
            maxFileSize: 100 * 1024 * 1024, // 100MB limit
            maxRows: 1000000, // 1M rows limit
            maxColumns: 1000, // 1K columns limit
            supportedFormats: ['.xlsx', '.xls', '.csv', '.tsv'],
            autoDetectHeaders: true,
            preserveFormatting: false,
            dateFormat: 'YYYY-MM-DD',
            numberPrecision: 2
        };
        
        // Mapping and selection
        this.columnMappings = new Map();
        this.rowMappings = new Map();
        this.selectedRanges = [];
        this.namedRanges = new Map();
        
        // Data analysis
        this.dataTypes = new Map();
        this.statistics = new Map();
        this.validationRules = new Map();
        
        // Processing state
        this.processingState = {
            isProcessing: false,
            progress: 0,
            stage: 'idle',
            errors: [],
            warnings: []
        };
        
        // Performance tracking
        this.performance = {
            loadTime: 0,
            processTime: 0,
            memoryUsage: 0,
            operationCount: 0
        };
        
        // Event handlers
        this.eventHandlers = new Map();
        
        // Initialize
        this.initialize();
    }

    /**
     * Initialize Excel processor
     */
    initialize() {
        try {
            this.checkLibraryAvailability();
            this.setupEventHandlers();
            this.loadConfiguration();
            
            console.log('✓ K4LP Excel Processor v2.0.0 initialized');
        } catch (error) {
            console.error('Excel Processor initialization failed:', error);
            this.addError('initialization', error.message);
        }
    }

    /**
     * Check if required libraries are available
     */
    checkLibraryAvailability() {
        if (typeof XLSX === 'undefined') {
            throw new Error('SheetJS (XLSX) library not loaded. Please include the library in js/libs/');
        }
        
        console.log('✓ SheetJS library detected');
    }

    /**
     * Setup event handlers for progress tracking
     */
    setupEventHandlers() {
        // Progress update handler
        this.on('progress', (progress) => {
            this.processingState.progress = progress;
            if (window.eventBus) {
                window.eventBus.emit('excel-progress', progress);
            }
        });
        
        // Error handler
        this.on('error', (error) => {
            this.addError('processing', error.message);
            if (window.eventBus) {
                window.eventBus.emit('excel-error', error);
            }
        });
    }

    /**
     * Load configuration from storage
     */
    loadConfiguration() {
        if (window.storage) {
            const storedConfig = window.storage.getItem('excel_config');
            if (storedConfig) {
                this.config = { ...this.config, ...storedConfig };
            }
        }
    }

    /**
     * Save configuration to storage
     */
    saveConfiguration() {
        if (window.storage) {
            window.storage.setItem('excel_config', this.config);
        }
    }

    /**
     * Load Excel file with comprehensive validation and processing
     */
    async loadFile(file, options = {}) {
        const startTime = Date.now();
        this.processingState.isProcessing = true;
        this.processingState.stage = 'validation';
        this.emit('progress', 0);
        
        try {
            // Validate file
            this.validateFile(file);
            this.emit('progress', 10);
            
            // Store file information
            this.fileInfo = {
                name: file.name,
                size: file.size,
                lastModified: file.lastModified,
                type: file.type,
                encoding: this.detectEncoding(file)
            };
            
            this.processingState.stage = 'reading';
            this.emit('progress', 20);
            
            // Read file content
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            this.emit('progress', 40);
            
            this.processingState.stage = 'parsing';
            
            // Parse workbook with options
            const parseOptions = {
                type: 'array',
                cellDates: true,
                cellNF: false,
                cellText: false,
                raw: false,
                codepage: this.detectCodepage(file),
                ...options.parseOptions
            };
            
            this.workbook = XLSX.read(arrayBuffer, parseOptions);
            this.emit('progress', 60);
            
            this.processingState.stage = 'analyzing';
            
            // Analyze workbook structure
            await this.analyzeWorkbook();
            this.emit('progress', 80);
            
            // Load first sheet by default
            if (this.workbook.SheetNames.length > 0) {
                await this.selectSheet(this.workbook.SheetNames[0]);
            }
            
            this.performance.loadTime = Date.now() - startTime;
            this.processingState.isProcessing = false;
            this.processingState.stage = 'complete';
            this.emit('progress', 100);
            
            // Cache successful load
            this.cacheFileInfo();
            
            return {
                success: true,
                fileInfo: this.fileInfo,
                sheetNames: this.workbook.SheetNames,
                performance: this.performance
            };
            
        } catch (error) {
            this.processingState.isProcessing = false;
            this.processingState.stage = 'error';
            this.emit('error', error);
            
            return {
                success: false,
                error: error.message,
                fileInfo: this.fileInfo
            };
        }
    }

    /**
     * Validate file before processing
     */
    validateFile(file) {
        // Check file size
        if (file.size > this.config.maxFileSize) {
            throw new Error(`File too large: ${this.formatFileSize(file.size)} > ${this.formatFileSize(this.config.maxFileSize)}`);
        }
        
        // Check file extension
        const extension = this.getFileExtension(file.name);
        if (!this.config.supportedFormats.includes(extension)) {
            throw new Error(`Unsupported file format: ${extension}. Supported: ${this.config.supportedFormats.join(', ')}`);
        }
        
        // Check if file is empty
        if (file.size === 0) {
            throw new Error('File is empty');
        }
        
        console.log(`✓ File validation passed: ${file.name} (${this.formatFileSize(file.size)})`);
    }

    /**
     * Read file as array buffer with progress tracking
     */
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                resolve(new Uint8Array(event.target.result));
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = 20 + (event.loaded / event.total) * 20; // 20-40% of total progress
                    this.emit('progress', progress);
                }
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Analyze workbook structure and metadata
     */
    async analyzeWorkbook() {
        if (!this.workbook) {
            throw new Error('No workbook loaded');
        }
        
        const analysis = {
            sheetCount: this.workbook.SheetNames.length,
            sheets: [],
            totalRows: 0,
            totalCells: 0,
            hasFormulas: false,
            hasCharts: false,
            hasImages: false
        };
        
        // Analyze each sheet
        for (const sheetName of this.workbook.SheetNames) {
            const sheet = this.workbook.Sheets[sheetName];
            const sheetAnalysis = this.analyzeSheet(sheet, sheetName);
            
            analysis.sheets.push(sheetAnalysis);
            analysis.totalRows += sheetAnalysis.rowCount;
            analysis.totalCells += sheetAnalysis.cellCount;
            
            if (sheetAnalysis.hasFormulas) analysis.hasFormulas = true;
        }
        
        // Store analysis results
        this.workbookAnalysis = analysis;
        
        console.log('Workbook analysis complete:', analysis);
    }

    /**
     * Analyze individual sheet
     */
    analyzeSheet(sheet, sheetName) {
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
        const rowCount = range.e.r + 1;
        const colCount = range.e.c + 1;
        
        let cellCount = 0;
        let hasFormulas = false;
        let hasNumbers = false;
        let hasText = false;
        let hasDates = false;
        
        // Analyze cell types
        for (let row = range.s.r; row <= range.e.r; row++) {
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = sheet[cellAddress];
                
                if (cell) {
                    cellCount++;
                    
                    if (cell.f) hasFormulas = true;
                    
                    switch (cell.t) {
                        case 'n': hasNumbers = true; break;
                        case 's': hasText = true; break;
                        case 'd': hasDates = true; break;
                    }
                }
            }
        }
        
        return {
            name: sheetName,
            rowCount,
            colCount,
            cellCount,
            hasFormulas,
            hasNumbers,
            hasText,
            hasDates,
            range: sheet['!ref']
        };
    }

    /**
     * Select and load specific sheet with data processing
     */
    async selectSheet(sheetName, options = {}) {
        const startTime = Date.now();
        
        try {
            if (!this.workbook || !this.workbook.Sheets[sheetName]) {
                throw new Error(`Sheet "${sheetName}" not found`);
            }
            
            this.currentSheet = sheetName;
            const worksheet = this.workbook.Sheets[sheetName];
            
            // Convert sheet to JSON with various options
            const conversionOptions = {
                header: 1,
                raw: false,
                dateNF: this.config.dateFormat,
                defval: null,
                ...options.conversionOptions
            };
            
            this.sheetData = XLSX.utils.sheet_to_json(worksheet, conversionOptions);
            this.originalData = JSON.parse(JSON.stringify(this.sheetData)); // Deep copy
            
            // Analyze data structure
            await this.analyzeSheetData();
            
            // Auto-detect headers if enabled
            if (this.config.autoDetectHeaders) {
                this.detectHeaders();
            }
            
            // Generate column information
            this.generateColumnInfo();
            
            // Load cached mappings if available
            this.loadCachedMappings();
            
            this.performance.processTime = Date.now() - startTime;
            
            return {
                success: true,
                sheetName: sheetName,
                rowCount: this.sheetData.length,
                columnCount: this.getColumnCount(),
                hasHeaders: this.hasHeaders,
                dataStartRow: this.dataStartRow
            };
            
        } catch (error) {
            this.addError('sheet-selection', error.message);
            throw error;
        }
    }

    /**
     * Analyze sheet data for patterns and structure
     */
    async analyzeSheetData() {
        if (!this.sheetData || this.sheetData.length === 0) {
            this.dataAnalysis = { isEmpty: true };
            return;
        }
        
        const analysis = {
            rowCount: this.sheetData.length,
            columnCount: this.getColumnCount(),
            emptyRows: 0,
            emptyColumns: 0,
            dataTypes: new Map(),
            patterns: new Map(),
            statistics: new Map()
        };
        
        // Analyze each column
        const maxCols = Math.max(...this.sheetData.map(row => row.length));
        
        for (let colIndex = 0; colIndex < maxCols; colIndex++) {
            const columnData = this.sheetData
                .map(row => row[colIndex])
                .filter(cell => cell !== null && cell !== undefined && cell !== '');
            
            if (columnData.length === 0) {
                analysis.emptyColumns++;
                continue;
            }
            
            // Detect data type
            const dataType = this.detectColumnDataType(columnData);
            analysis.dataTypes.set(colIndex, dataType);
            
            // Generate statistics
            const stats = this.generateColumnStatistics(columnData, dataType);
            analysis.statistics.set(colIndex, stats);
            
            // Detect patterns
            const patterns = this.detectColumnPatterns(columnData, dataType);
            analysis.patterns.set(colIndex, patterns);
        }
        
        // Count empty rows
        analysis.emptyRows = this.sheetData.filter(row => 
            row.every(cell => cell === null || cell === undefined || cell === '')
        ).length;
        
        this.dataAnalysis = analysis;
        console.log('Sheet data analysis complete:', analysis);
    }

    /**
     * Detect data type for a column
     */
    detectColumnDataType(columnData) {
        if (columnData.length === 0) return 'empty';
        
        const sample = columnData.slice(0, Math.min(100, columnData.length));
        let numberCount = 0;
        let dateCount = 0;
        let booleanCount = 0;
        let textCount = 0;
        
        sample.forEach(value => {
            if (typeof value === 'number' || (!isNaN(parseFloat(value)) && isFinite(value))) {
                numberCount++;
            } else if (this.isDate(value)) {
                dateCount++;
            } else if (this.isBoolean(value)) {
                booleanCount++;
            } else {
                textCount++;
            }
        });
        
        const total = sample.length;
        const threshold = 0.8; // 80% threshold for type determination
        
        if (numberCount / total >= threshold) return 'number';
        if (dateCount / total >= threshold) return 'date';
        if (booleanCount / total >= threshold) return 'boolean';
        
        return 'text';
    }

    /**
     * Generate column statistics
     */
    generateColumnStatistics(columnData, dataType) {
        const stats = {
            count: columnData.length,
            uniqueCount: new Set(columnData).size,
            nullCount: 0,
            min: null,
            max: null,
            avg: null,
            median: null
        };
        
        if (dataType === 'number') {
            const numbers = columnData
                .map(val => parseFloat(val))
                .filter(num => !isNaN(num));
            
            if (numbers.length > 0) {
                stats.min = Math.min(...numbers);
                stats.max = Math.max(...numbers);
                stats.avg = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
                
                const sorted = numbers.sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                stats.median = sorted.length % 2 === 0 
                    ? (sorted[mid - 1] + sorted[mid]) / 2 
                    : sorted[mid];
            }
        } else if (dataType === 'text') {
            const lengths = columnData.map(val => String(val).length);
            stats.minLength = Math.min(...lengths);
            stats.maxLength = Math.max(...lengths);
            stats.avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
        }
        
        return stats;
    }

    /**
     * Detect patterns in column data
     */
    detectColumnPatterns(columnData, dataType) {
        const patterns = {
            hasConsistentFormat: false,
            commonPatterns: [],
            regexPattern: null
        };
        
        if (dataType === 'text') {
            // Detect common patterns like part numbers, email addresses, etc.
            const formatCounts = new Map();
            
            columnData.forEach(value => {
                const format = this.analyzeTextFormat(String(value));
                formatCounts.set(format, (formatCounts.get(format) || 0) + 1);
            });
            
            // Find most common pattern
            const sortedPatterns = Array.from(formatCounts.entries())
                .sort((a, b) => b[1] - a[1]);
            
            if (sortedPatterns.length > 0) {
                patterns.commonPatterns = sortedPatterns.slice(0, 3);
                patterns.hasConsistentFormat = sortedPatterns[0][1] / columnData.length > 0.8;
            }
        }
        
        return patterns;
    }

    /**
     * Analyze text format for pattern detection
     */
    analyzeTextFormat(text) {
        return text
            .replace(/[0-9]/g, '9')
            .replace(/[A-Z]/g, 'A')
            .replace(/[a-z]/g, 'a')
            .replace(/[^9Aa]/g, 'X');
    }

    /**
     * Detect if first row contains headers
     */
    detectHeaders() {
        if (!this.sheetData || this.sheetData.length < 2) {
            this.hasHeaders = false;
            this.dataStartRow = 1;
            return;
        }
        
        const firstRow = this.sheetData[0];
        const secondRow = this.sheetData[1];
        
        if (!firstRow || !secondRow) {
            this.hasHeaders = false;
            this.dataStartRow = 1;
            return;
        }
        
        let headerScore = 0;
        const minLength = Math.min(firstRow.length, secondRow.length);
        
        for (let i = 0; i < minLength; i++) {
            const first = firstRow[i];
            const second = secondRow[i];
            
            // Check if first row is text and second row is different type
            if (typeof first === 'string' && first.length > 0) {
                headerScore += 2;
                
                if (typeof second !== 'string' || this.isNumber(second) || this.isDate(second)) {
                    headerScore += 3;
                }
            }
            
            // Check if first row has no spaces or special formatting
            if (typeof first === 'string' && !/\s{2,}/.test(first)) {
                headerScore += 1;
            }
        }
        
        this.hasHeaders = headerScore > minLength * 2;
        this.dataStartRow = this.hasHeaders ? 2 : 1;
        
        console.log(`Header detection: ${this.hasHeaders ? 'Headers detected' : 'No headers'} (score: ${headerScore})`);
    }

    /**
     * Generate column information for mapping UI
     */
    generateColumnInfo() {
        if (!this.sheetData || this.sheetData.length === 0) {
            this.columnInfo = [];
            return;
        }
        
        const maxCols = this.getColumnCount();
        const headerRow = this.hasHeaders ? this.sheetData[0] : null;
        const sampleRow = this.sheetData[this.dataStartRow - 1] || this.sheetData[0];
        
        this.columnInfo = [];
        
        for (let i = 0; i < maxCols; i++) {
            const columnLetter = this.numberToColumnLetter(i + 1);
            const dataType = this.dataAnalysis?.dataTypes?.get(i) || 'unknown';
            const statistics = this.dataAnalysis?.statistics?.get(i) || {};
            
            this.columnInfo.push({
                index: i,
                letter: columnLetter,
                header: headerRow?.[i] || `Column ${columnLetter}`,
                sample: sampleRow?.[i] || '',
                dataType: dataType,
                statistics: statistics,
                mapped: this.columnMappings.has(i),
                mappedTo: this.getMappingForColumn(i),
                isEmpty: statistics.count === 0
            });
        }
    }

    /**
     * Map column to field name with validation
     */
    mapColumn(columnIndex, fieldName, options = {}) {
        try {
            if (columnIndex < 0 || columnIndex >= this.getColumnCount()) {
                throw new Error(`Invalid column index: ${columnIndex}`);
            }
            
            if (!fieldName || typeof fieldName !== 'string') {
                throw new Error('Field name must be a non-empty string');
            }
            
            // Check if field name is already mapped
            const existingMapping = this.findMappingByFieldName(fieldName);
            if (existingMapping && existingMapping.columnIndex !== columnIndex) {
                if (!options.overwrite) {
                    throw new Error(`Field "${fieldName}" is already mapped to column ${existingMapping.columnIndex}`);
                }
                this.columnMappings.delete(existingMapping.columnIndex);
            }
            
            const mapping = {
                columnIndex: columnIndex,
                fieldName: fieldName,
                columnLetter: this.numberToColumnLetter(columnIndex + 1),
                columnHeader: this.columnInfo[columnIndex]?.header || '',
                dataType: options.dataType || this.columnInfo[columnIndex]?.dataType || 'text',
                required: options.required || false,
                validationRules: options.validationRules || [],
                transformRules: options.transformRules || [],
                mappedAt: Date.now()
            };
            
            this.columnMappings.set(columnIndex, mapping);
            
            // Update column info
            if (this.columnInfo[columnIndex]) {
                this.columnInfo[columnIndex].mapped = true;
                this.columnInfo[columnIndex].mappedTo = fieldName;
            }
            
            // Save mappings
            this.saveMappings();
            
            console.log(`Column ${columnIndex} mapped to "${fieldName}"`);
            return mapping;
            
        } catch (error) {
            this.addError('column-mapping', error.message);
            throw error;
        }
    }

    /**
     * Remove column mapping
     */
    unmapColumn(columnIndex) {
        try {
            if (!this.columnMappings.has(columnIndex)) {
                throw new Error(`Column ${columnIndex} is not mapped`);
            }
            
            const mapping = this.columnMappings.get(columnIndex);
            this.columnMappings.delete(columnIndex);
            
            // Update column info
            if (this.columnInfo[columnIndex]) {
                this.columnInfo[columnIndex].mapped = false;
                this.columnInfo[columnIndex].mappedTo = null;
            }
            
            this.saveMappings();
            
            console.log(`Column ${columnIndex} unmapped from "${mapping.fieldName}"`);
            return true;
            
        } catch (error) {
            this.addError('column-unmapping', error.message);
            throw error;
        }
    }

    /**
     * Get mapped data with transformations and validation
     */
    getMappedData(options = {}) {
        try {
            const {
                startRow = this.dataStartRow - 1,
                endRow = this.sheetData.length,
                validateData = true,
                applyTransforms = true,
                includeMetadata = false
            } = options;
            
            if (this.columnMappings.size === 0) {
                throw new Error('No column mappings defined');
            }
            
            const mappedData = [];
            const errors = [];
            
            for (let rowIndex = startRow; rowIndex < Math.min(endRow, this.sheetData.length); rowIndex++) {
                const sourceRow = this.sheetData[rowIndex];
                if (!sourceRow) continue;
                
                const mappedRow = {
                    _metadata: {
                        sourceRowIndex: rowIndex + 1,
                        timestamp: Date.now()
                    }
                };
                
                let hasData = false;
                const rowErrors = [];
                
                // Process each mapping
                this.columnMappings.forEach((mapping, columnIndex) => {
                    let value = sourceRow[columnIndex];
                    
                    // Apply transformations
                    if (applyTransforms && mapping.transformRules.length > 0) {
                        value = this.applyTransformations(value, mapping.transformRules);
                    }
                    
                    // Validate data
                    if (validateData && mapping.validationRules.length > 0) {
                        const validationResult = this.validateValue(value, mapping.validationRules);
                        if (!validationResult.isValid) {
                            rowErrors.push({
                                field: mapping.fieldName,
                                column: columnIndex,
                                value: value,
                                errors: validationResult.errors
                            });
                        }
                    }
                    
                    // Process value by data type
                    const processedValue = this.processValueByType(value, mapping.dataType);
                    
                    mappedRow[mapping.fieldName] = processedValue;
                    
                    if (processedValue !== null && processedValue !== undefined && processedValue !== '') {
                        hasData = true;
                    }
                });
                
                // Only include rows with actual data
                if (hasData) {
                    if (rowErrors.length > 0) {
                        mappedRow._metadata.errors = rowErrors;
                        errors.push(...rowErrors);
                    }
                    
                    if (!includeMetadata) {
                        delete mappedRow._metadata;
                    }
                    
                    mappedData.push(mappedRow);
                }
            }
            
            const result = {
                data: mappedData,
                summary: {
                    totalRows: mappedData.length,
                    mappedFields: this.columnMappings.size,
                    errorCount: errors.length,
                    processingTime: Date.now()
                }
            };
            
            if (errors.length > 0) {
                result.errors = errors;
            }
            
            return result;
            
        } catch (error) {
            this.addError('data-mapping', error.message);
            throw error;
        }
    }

    /**
     * Apply transformation rules to a value
     */
    applyTransformations(value, transformRules) {
        let result = value;
        
        transformRules.forEach(rule => {
            switch (rule.type) {
                case 'trim':
                    result = String(result).trim();
                    break;
                case 'uppercase':
                    result = String(result).toUpperCase();
                    break;
                case 'lowercase':
                    result = String(result).toLowerCase();
                    break;
                case 'replace':
                    result = String(result).replace(new RegExp(rule.pattern, 'g'), rule.replacement);
                    break;
                case 'prefix':
                    result = rule.prefix + String(result);
                    break;
                case 'suffix':
                    result = String(result) + rule.suffix;
                    break;
                case 'round':
                    if (typeof result === 'number') {
                        result = Math.round(result * Math.pow(10, rule.decimals)) / Math.pow(10, rule.decimals);
                    }
                    break;
            }
        });
        
        return result;
    }

    /**
     * Validate value against validation rules
     */
    validateValue(value, validationRules) {
        const result = {
            isValid: true,
            errors: []
        };
        
        validationRules.forEach(rule => {
            switch (rule.type) {
                case 'required':
                    if (value === null || value === undefined || value === '') {
                        result.errors.push('Value is required');
                        result.isValid = false;
                    }
                    break;
                case 'minLength':
                    if (String(value).length < rule.value) {
                        result.errors.push(`Minimum length is ${rule.value}`);
                        result.isValid = false;
                    }
                    break;
                case 'maxLength':
                    if (String(value).length > rule.value) {
                        result.errors.push(`Maximum length is ${rule.value}`);
                        result.isValid = false;
                    }
                    break;
                case 'pattern':
                    if (!new RegExp(rule.pattern).test(String(value))) {
                        result.errors.push(`Value does not match required pattern`);
                        result.isValid = false;
                    }
                    break;
                case 'range':
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                        if (numValue < rule.min || numValue > rule.max) {
                            result.errors.push(`Value must be between ${rule.min} and ${rule.max}`);
                            result.isValid = false;
                        }
                    }
                    break;
            }
        });
        
        return result;
    }

    /**
     * Process value based on data type
     */
    processValueByType(value, dataType) {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        
        try {
            switch (dataType) {
                case 'number':
                    const num = parseFloat(value);
                    return isNaN(num) ? null : num;
                    
                case 'integer':
                    const int = parseInt(value);
                    return isNaN(int) ? null : int;
                    
                case 'date':
                    const date = new Date(value);
                    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
                    
                case 'datetime':
                    const datetime = new Date(value);
                    return isNaN(datetime.getTime()) ? null : datetime.toISOString();
                    
                case 'boolean':
                    const str = String(value).toLowerCase();
                    return ['true', 'yes', '1', 'on', 'checked'].includes(str) ? true :
                           ['false', 'no', '0', 'off', 'unchecked'].includes(str) ? false : null;
                    
                case 'text':
                default:
                    return String(value).trim();
            }
        } catch (error) {
            console.warn(`Error processing value "${value}" as ${dataType}:`, error);
            return String(value);
        }
    }

    /**
     * Export processed data to various formats
     */
    exportData(format = 'csv', options = {}) {
        try {
            const mappedData = this.getMappedData(options);
            
            switch (format.toLowerCase()) {
                case 'csv':
                    return this.exportToCSV(mappedData.data, options);
                case 'json':
                    return this.exportToJSON(mappedData.data, options);
                case 'xlsx':
                    return this.exportToExcel(mappedData.data, options);
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }
        } catch (error) {
            this.addError('export', error.message);
            throw error;
        }
    }

    /**
     * Export to CSV format
     */
    exportToCSV(data, options = {}) {
        if (!data || data.length === 0) {
            throw new Error('No data to export');
        }
        
        const {
            includeHeaders = true,
            delimiter = ',',
            quote = '"',
            escape = '""'
        } = options;
        
        const headers = Object.keys(data[0]).filter(key => !key.startsWith('_'));
        const csvRows = [];
        
        // Add headers
        if (includeHeaders) {
            csvRows.push(headers.map(header => this.escapeCSVValue(header, delimiter, quote, escape)).join(delimiter));
        }
        
        // Add data rows
        data.forEach(row => {
            const csvRow = headers.map(header => {
                const value = row[header];
                return this.escapeCSVValue(value, delimiter, quote, escape);
            }).join(delimiter);
            csvRows.push(csvRow);
        });
        
        return csvRows.join('\n');
    }

    /**
     * Export to JSON format
     */
    exportToJSON(data, options = {}) {
        const {
            pretty = true,
            includeMetadata = false
        } = options;
        
        const exportData = {
            data: data,
            metadata: {
                exportedAt: new Date().toISOString(),
                rowCount: data.length,
                source: this.fileInfo.name,
                sheet: this.currentSheet
            }
        };
        
        if (!includeMetadata) {
            return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
        }
        
        return pretty ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
    }

    /**
     * Export to Excel format
     */
    exportToExcel(data, options = {}) {
        if (!data || data.length === 0) {
            throw new Error('No data to export');
        }
        
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);
        
        XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || 'Exported Data');
        
        return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    }

    /**
     * Escape CSV value
     */
    escapeCSVValue(value, delimiter, quote, escape) {
        if (value === null || value === undefined) {
            return '';
        }
        
        const stringValue = String(value);
        
        if (stringValue.includes(delimiter) || stringValue.includes(quote) || stringValue.includes('\n')) {
            return quote + stringValue.replace(new RegExp(quote, 'g'), escape) + quote;
        }
        
        return stringValue;
    }

    /**
     * Utility methods
     */
    getColumnCount() {
        if (!this.sheetData || this.sheetData.length === 0) return 0;
        return Math.max(...this.sheetData.map(row => row.length));
    }

    getFileExtension(filename) {
        return filename.toLowerCase().substring(filename.lastIndexOf('.'));
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    numberToColumnLetter(num) {
        let result = '';
        while (num > 0) {
            num--;
            result = String.fromCharCode(65 + (num % 26)) + result;
            num = Math.floor(num / 26);
        }
        return result;
    }

    isDate(value) {
        if (value instanceof Date) return true;
        if (typeof value === 'string') {
            const date = new Date(value);
            return !isNaN(date.getTime());
        }
        return false;
    }

    isNumber(value) {
        return typeof value === 'number' || (!isNaN(parseFloat(value)) && isFinite(value));
    }

    isBoolean(value) {
        if (typeof value === 'boolean') return true;
        if (typeof value === 'string') {
            const lower = value.toLowerCase();
            return ['true', 'false', 'yes', 'no', '1', '0', 'on', 'off'].includes(lower);
        }
        return false;
    }

    detectEncoding(file) {
        // Basic encoding detection - could be enhanced
        return 'UTF-8';
    }

    detectCodepage(file) {
        // Basic codepage detection - could be enhanced
        return undefined;
    }

    findMappingByFieldName(fieldName) {
        for (const [columnIndex, mapping] of this.columnMappings) {
            if (mapping.fieldName === fieldName) {
                return { columnIndex, ...mapping };
            }
        }
        return null;
    }

    getMappingForColumn(columnIndex) {
        const mapping = this.columnMappings.get(columnIndex);
        return mapping ? mapping.fieldName : null;
    }

    saveMappings() {
        if (window.storage && this.fileInfo.name) {
            const mappingData = {
                columnMappings: Array.from(this.columnMappings.entries()),
                fileInfo: this.fileInfo,
                currentSheet: this.currentSheet,
                savedAt: Date.now()
            };
            
            window.storage.saveExcelMapping(this.fileInfo.name, mappingData);
        }
    }

    loadCachedMappings() {
        if (window.storage && this.fileInfo.name) {
            const cachedMapping = window.storage.getExcelMapping(this.fileInfo.name);
            if (cachedMapping && cachedMapping.currentSheet === this.currentSheet) {
                this.columnMappings = new Map(cachedMapping.columnMappings);
                console.log('Loaded cached column mappings');
            }
        }
    }

    cacheFileInfo() {
        if (window.storage) {
            const cacheKey = `excel_file_${this.fileInfo.name}`;
            window.storage.saveToCache(cacheKey, {
                fileInfo: this.fileInfo,
                workbookAnalysis: this.workbookAnalysis,
                sheetNames: this.workbook.SheetNames
            }, 24 * 60 * 60 * 1000); // 24 hours
        }
    }

    // Event system
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Event handler error for "${event}":`, error);
                }
            });
        }
    }

    // Error management
    addError(category, message) {
        this.processingState.errors.push({
            category,
            message,
            timestamp: Date.now()
        });
    }

    addWarning(category, message) {
        this.processingState.warnings.push({
            category,
            message,
            timestamp: Date.now()
        });
    }

    getErrors() {
        return this.processingState.errors;
    }

    getWarnings() {
        return this.processingState.warnings;
    }

    clearErrors() {
        this.processingState.errors = [];
        this.processingState.warnings = [];
    }

    // Status and debugging
    getStatus() {
        return {
            version: this.version,
            hasFile: !!this.workbook,
            fileName: this.fileInfo.name,
            currentSheet: this.currentSheet,
            rowCount: this.sheetData?.length || 0,
            columnCount: this.getColumnCount(),
            mappedColumns: this.columnMappings.size,
            hasHeaders: this.hasHeaders,
            dataStartRow: this.dataStartRow,
            processingState: this.processingState,
            performance: this.performance
        };
    }

    /**
     * Clear all data and reset processor
     */
    clear() {
        this.workbook = null;
        this.currentSheet = null;
        this.sheetData = null;
        this.originalData = null;
        this.columnMappings.clear();
        this.rowMappings.clear();
        this.selectedRanges = [];
        this.namedRanges.clear();
        this.dataTypes.clear();
        this.statistics.clear();
        this.validationRules.clear();
        
        this.fileInfo = {
            name: null,
            size: 0,
            lastModified: null,
            type: null,
            encoding: null
        };
        
        this.processingState = {
            isProcessing: false,
            progress: 0,
            stage: 'idle',
            errors: [],
            warnings: []
        };
        
        this.performance = {
            loadTime: 0,
            processTime: 0,
            memoryUsage: 0,
            operationCount: 0
        };
        
        console.log('Excel processor cleared');
    }

    // Legacy compatibility methods
    loadFile(file) {
        return this.loadFile(file);
    }

    getSheetNames() {
        return this.workbook ? this.workbook.SheetNames : [];
    }

    selectSheet(sheetName) {
        return this.selectSheet(sheetName);
    }

    getSheetData(sheetName = null) {
        if (sheetName && sheetName !== this.currentSheet) {
            const sheet = this.workbook.Sheets[sheetName];
            return sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1 }) : null;
        }
        return this.sheetData;
    }

    generatePreview(maxRows = 10, maxCols = 10) {
        if (!this.sheetData) return null;
        return this.sheetData.slice(0, maxRows).map(row => row.slice(0, maxCols));
    }

    setColumnMapping(mapping) {
        Object.entries(mapping).forEach(([columnIndex, fieldName]) => {
            this.mapColumn(parseInt(columnIndex), fieldName);
        });
    }

    getColumnMapping() {
        const mapping = {};
        this.columnMappings.forEach((mapData, columnIndex) => {
            mapping[columnIndex] = mapData.fieldName;
        });
        return mapping;
    }

    setSelectedRange(startRow, startCol, endRow, endCol) {
        this.selectedRanges = [{ startRow, startCol, endRow, endCol }];
    }

    getSelectedRange() {
        return this.selectedRanges[0] || null;
    }

    exportToCSV(data) {
        return this.exportToCSV(data || this.getMappedData().data);
    }
}

// Create and expose global instance
const excelProcessor = new ExcelProcessor();
window.excelProcessor = excelProcessor;

// Legacy compatibility
const excelManager = excelProcessor;
window.excelManager = excelManager;
window.ExcelManager = ExcelProcessor;
window.ExcelProcessor = ExcelProcessor;

// Module export for modern environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExcelProcessor;
}

console.log('✓ K4LP Excel Processor v2.0.0 initialized');
