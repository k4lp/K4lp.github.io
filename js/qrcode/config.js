/**
 * QR Code Component Scanner - Configuration
 * Alica Technologies
 */

window.QRScannerConfig = {
    // Application settings
    APP_NAME: 'QR Code Component Scanner',
    VERSION: '1.0.0',
    DEBUG: true,

    // Scanner settings
    SCANNER: {
        FPS: 15,                    // Frames per second for scanning
        QRBOX_SIZE: 250,           // Size of the scanning box
        CONTINUOUS_SCAN: true,      // Enable continuous scanning
        SCAN_DELAY: 500,           // Delay between scans in milliseconds
        AUDIO_FEEDBACK: true,       // Enable audio feedback
        VIBRATION_FEEDBACK: true    // Enable vibration feedback (mobile)
    },

    // Supported file formats
    SUPPORTED_FORMATS: {
        EXCEL: ['.xlsx', '.xls'],
        EXPORT: ['.xlsx', '.csv']
    },

    // Excel processing
    EXCEL: {
        MAX_PREVIEW_ROWS: 10,       // Maximum rows to show in preview
        MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB max file size
        AUTO_DETECT_HEADERS: true    // Auto-detect header row
    },

    // Barcode/QR Code formats to support
    SCAN_FORMATS: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.AZTEC,
        Html5QrcodeSupportedFormats.CODABAR,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
        Html5QrcodeSupportedFormats.MAXICODE,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.PDF_417,
        Html5QrcodeSupportedFormats.RSS_14,
        Html5QrcodeSupportedFormats.RSS_EXPANDED,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION
    ],

    // UI elements IDs for easy reference
    ELEMENTS: {
        // File handling
        EXCEL_FILE: 'excelFile',
        FILE_INFO: 'fileInfo',
        FILE_NAME: 'fileName',
        FILE_SIZE: 'fileSize',
        SHEET_COUNT: 'sheetCount',

        // Sheet selection
        SHEET_SELECT: 'sheetSelect',
        SHEET_PREVIEW: 'sheetPreview',
        PREVIEW_TABLE: 'previewTable',

        // Range selection
        START_CELL: 'startCell',
        END_CELL: 'endCell',
        RANGE_SELECTOR: 'rangeSelector',
        SELECTABLE_TABLE: 'selectableTable',
        CONFIRM_RANGE: 'confirmRange',
        CLEAR_RANGE: 'clearRange',

        // Column mapping
        SERIAL_COLUMN: 'serialColumn',
        MPN_COLUMN: 'mpnColumn',
        DESIGNATORS_COLUMN: 'designatorsColumn',
        MANUFACTURER_COLUMN: 'manufacturerColumn',
        QUANTITY_COLUMN: 'quantityColumn',
        TARGET_COLUMN: 'targetColumn',
        CONFIRM_MAPPING: 'confirmMapping',
        BACK_TO_RANGE: 'backToRange',

        // Scanner
        QR_READER: 'qr-reader',
        START_CAMERA: 'startCamera',
        STOP_CAMERA: 'stopCamera',
        SWITCH_CAMERA: 'switchCamera',
        CAMERA_SELECT: 'cameraSelect',
        CURRENT_MATCH: 'currentMatch',
        SCAN_OVERLAY: 'scanOverlay',

        // Results and stats
        TOTAL_SCANNED: 'totalScanned',
        SUCCESS_MATCHES: 'successMatches',
        SCAN_RATE: 'scanRate',
        SCAN_RESULTS: 'scanResults',
        EXPORT_RESULTS: 'exportResults',
        CLEAR_RESULTS: 'clearResults',
        RESET_SCANNER: 'resetScanner',

        // Status indicators
        SCANNER_STATUS: 'scannerStatus',
        SCAN_COUNT: 'scanCount',
        MATCH_COUNT: 'matchCount',

        // Steps
        STEP_2: 'step2',
        STEP_3: 'step3',
        STEP_4: 'step4',
        STEP_5: 'step5'
    },

    // CSS classes
    CLASSES: {
        HIDDEN: 'hidden',
        VISIBLE: 'visible',
        SELECTED: 'selected',
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        LOADING: 'loading',
        DISABLED: 'disabled',

        // Scanner specific
        SCAN_SUCCESS: 'scan-success',
        SCAN_ERROR: 'scan-error',
        SCAN_MATCH: 'scan-match',

        // Table selection
        CELL_SELECTED: 'cell-selected',
        ROW_SELECTED: 'row-selected',
        RANGE_START: 'range-start',
        RANGE_END: 'range-end'
    },

    // Messages and notifications
    MESSAGES: {
        FILE_LOADED: 'Excel file loaded successfully',
        FILE_ERROR: 'Error loading Excel file',
        SHEET_SELECTED: 'Sheet selected',
        RANGE_SELECTED: 'Data range selected',
        MAPPING_COMPLETE: 'Column mapping complete',
        SCANNER_STARTED: 'Scanner started successfully',
        SCANNER_STOPPED: 'Scanner stopped',
        SCAN_SUCCESS: 'Component scanned and matched',
        SCAN_NO_MATCH: 'Scanned value not found in BOM',
        EXPORT_SUCCESS: 'Results exported successfully',

        // Errors
        CAMERA_ACCESS_DENIED: 'Camera access denied. Please allow camera permissions.',
        CAMERA_NOT_FOUND: 'No cameras found on this device.',
        SCANNER_ERROR: 'Scanner error occurred',
        FILE_TOO_LARGE: 'File size too large. Maximum size is 50MB.',
        INVALID_FILE_TYPE: 'Invalid file type. Please select an Excel file.',
        NO_DATA_SELECTED: 'Please select a data range first.',
        INVALID_COLUMN_MAPPING: 'Please map all required columns.',

        // Warnings
        NO_TARGET_COLUMN: 'No target column selected for scanning.',
        EMPTY_RANGE: 'Selected range appears to be empty.',
        DUPLICATE_SCAN: 'This component has already been scanned.'
    },

    // Audio settings for feedback
    AUDIO: {
        SUCCESS_FREQUENCY: 800,     // Hz
        SUCCESS_DURATION: 200,      // ms
        ERROR_FREQUENCY: 400,       // Hz
        ERROR_DURATION: 300,        // ms
        VOLUME: 0.3                 // 0.0 to 1.0
    }
};

// Freeze the config to prevent modifications
Object.freeze(window.QRScannerConfig);
