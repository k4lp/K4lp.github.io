/**
 * Excel API Processor - Configuration
 * Alica Technologies
 */

window.ExcelProcessorConfig = {
    // API Configuration
    DIGIKEY: {
        PRODUCTION: {
            BASE_URL: 'https://api.digikey.com',
            TOKEN_URL: 'https://api.digikey.com/v1/oauth2/token'
        },
        SANDBOX: {
            BASE_URL: 'https://sandbox-api.digikey.com',
            TOKEN_URL: 'https://sandbox-api.digikey.com/v1/oauth2/token'
        },
        TOKEN_BUFFER: 300000, // 5 minutes before expiry
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000
    },

    MOUSER: {
        BASE_URL: 'https://api.mouser.com/api/v1',
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000
    },

    // Storage Keys
    STORAGE: {
        DIGIKEY_CREDS: 'exce_digikey_creds',
        MOUSER_CREDS: 'exce_mouser_creds'
    },

    // UI Element IDs
    ELEMENTS: {
        // Settings Panel
        TOGGLE_SETTINGS: 'toggleSettings',
        SETTINGS_PANEL: 'settingsPanel',
        
        // Digikey Credentials
        DIGIKEY_CLIENT_ID: 'digikeyClientId',
        DIGIKEY_CLIENT_SECRET: 'digikeyClientSecret',
        DIGIKEY_ENVIRONMENT: 'digikeyEnvironment',
        DIGIKEY_LOCALE: 'digikeyLocale',
        DIGIKEY_STATUS: 'digikeyStatus',
        SAVE_DIGIKEY: 'saveDigikeyCredentials',
        CLEAR_DIGIKEY: 'clearDigikeyCredentials',
        
        // Mouser Credentials
        MOUSER_API_KEY: 'mouserApiKey',
        MOUSER_STATUS: 'mouserStatus',
        SAVE_MOUSER: 'saveMouserCredentials',
        CLEAR_MOUSER: 'clearMouserCredentials',
        
        // File Upload
        EXCEL_FILE: 'excelFile',
        FILE_INFO: 'fileInfo',
        FILE_NAME: 'fileName',
        FILE_SIZE: 'fileSize',
        SHEET_COUNT: 'sheetCount',
        SHEET_SELECTION: 'sheetSelection',
        SHEET_SELECT: 'sheetSelect',
        
        // Preview
        PREVIEW_SECTION: 'previewSection',
        SHEET_PREVIEW: 'sheetPreview',
        
        // Row Selection
        HEADER_ROW: 'headerRow',
        START_ROW: 'startRow',
        END_ROW: 'endRow',
        ROW_RANGE_INFO: 'rowRangeInfo',
        ROW_RANGE_MESSAGE: 'rowRangeMessage',
        
        // Column Mapping
        MAPPING_SECTION: 'mappingSection',
        MPN_COLUMN: 'mpnColumn',
        MANUFACTURER_COLUMN: 'manufacturerColumn',
        QUANTITY_COLUMN: 'quantityColumn',
        OUTPUT_COLUMNS: 'outputColumns',
        ADD_OUTPUT_COLUMN: 'addOutputColumn',
        PROCESS_DATA: 'processData',
        CLEAR_MAPPING: 'clearMapping',
        
        // Progress
        PROGRESS_SECTION: 'progressSection',
        PROGRESS_TEXT: 'progressText',
        PROGRESS_BAR: 'progressBar',
        STAT_PROCESSED: 'statProcessed',
        STAT_SUCCESS: 'statSuccess',
        STAT_ERROR: 'statError',
        STAT_RATE: 'statRate',
        
        // Export
        EXPORT_SECTION: 'exportSection',
        EXPORT_EXCEL: 'exportExcel',
        RESET_PROCESSOR: 'resetProcessor',
        
        // Status
        API_COUNT: 'apiCount',
        SYSTEM_STATUS: 'systemStatus',
        PROCESSING_STATUS: 'processingStatus',
        ACTIVITY_LOG: 'activityLog'
    },

    // API Data Field Options
    DIGIKEY_FIELDS: {
        'unit_price': 'Unit Price',
        'manufacturer': 'Manufacturer',
        'detailed_description': 'Detailed Description',
        'datasheet': 'Datasheet',
        'stock_available': 'Stock Available',
        'package_case': 'Package / Case',
        'htsus_number': 'HTSUS Number',
        'htsus_stripped': 'HTSUS Stripped'
    },

    MOUSER_FIELDS: {
        'unit_price': 'Unit Price',
        'manufacturer': 'Manufacturer',
        'detailed_description': 'Detailed Description',
        'datasheet': 'Datasheet',
        'stock_available': 'Stock Available',
        'htsus_number': 'HTSUS Number',
        'htsus_stripped': 'HTSUS Stripped'
    },

    // File Processing
    EXCEL: {
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        SUPPORTED_FORMATS: ['.xlsx', '.xls'],
        MAX_PREVIEW_ROWS: 20,
        CHUNK_SIZE: 100 // Process in chunks for progress
    },

    // Messages
    MESSAGES: {
        INVALID_FILE_TYPE: 'Please select a valid Excel file (.xlsx or .xls)',
        FILE_TOO_LARGE: 'File size exceeds 10MB limit',
        NO_CREDENTIALS: 'Please configure API credentials first',
        MAPPING_INCOMPLETE: 'Please complete column mapping before processing',
        PROCESSING_COMPLETE: 'Data processing completed successfully',
        EXPORT_READY: 'Enhanced Excel file ready for download'
    },

    // Processing Options
    PROCESSING: {
        CONCURRENT_REQUESTS: 3,
        REQUEST_DELAY: 200, // ms between requests
        TIMEOUT: 30000 // 30 seconds
    },

    // Default Values
    DEFAULTS: {
        DIGIKEY_ENVIRONMENT: 'production',
        DIGIKEY_LOCALE: 'US/USD',
        HEADER_ROW: 1,
        START_ROW: 2
    }
};

// Utility function to get clean HTSUS code
window.ExcelProcessorConfig.cleanHTSUS = function(code) {
    if (!code) return '';
    const digits = String(code).replace(/\D/g, '');
    return digits.slice(0, 8);
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.ExcelProcessorConfig;
}
