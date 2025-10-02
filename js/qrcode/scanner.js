/**
 * Enhanced QR/Barcode Scanner Module
 * Professional-grade scanning with robust error handling and mobile optimization
 * 
 * Features:
 * - Multi-format QR/barcode detection
 * - Mobile and desktop compatibility
 * - Fallback scanning methods
 * - Real-time feedback and analytics
 * - Comprehensive error recovery
 * - Performance optimization
 */

class QRScanner {
    constructor() {
        this.html5QrCode = null;
        this.cameraManager = null;
        this.isScanning = false;
        this.columnMapping = null;
        this.rangeData = null;
        this.scanResults = [];
        this.scanCount = 0;
        this.matchCount = 0;
        this.lastScanTime = 0;
        this.scanMode = 'continuous';
        this.debounceTime = 1500; // Prevent duplicate scans
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Enhanced configuration for better scanning accuracy
        this.scannerConfig = {
            fps: 30,
            qrbox: function(viewfinderWidth, viewfinderHeight) {
                const minEdgePercentage = 0.7;
                const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
                const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
                return {
                    width: qrboxSize,
                    height: qrboxSize
                };
            },
            aspectRatio: 1.0,
            disableFlip: false,
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            },
            rememberLastUsedCamera: true,
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: false,
            defaultZoomValueIfSupported: 2
        };
        
        this.initializeEventListeners();
        this.loadFromStorage();
        
        // Initialize with delay to ensure DOM is ready
        setTimeout(() => this.initializeScanner(), 1000);
    }
    
    async initializeScanner() {
        try {
            QRUtils.log.info('Initializing QR Scanner...');
            
            // Initialize camera manager first
            this.cameraManager = new CameraManager();
            
            // Wait for camera manager to initialize
            await this.waitForCameraManager();
            
            // Initialize HTML5 QR Code scanner
            await this.initializeHtml5QrCode();
            
            // Set up status callbacks
            this.setupStatusCallbacks();
            
            QRUtils.log.success('QR Scanner initialized successfully');
            
        } catch (error) {
            this.handleScannerError(error, 'Scanner Initialization');
        }
    }
    
    async waitForCameraManager(timeout = 10000) {
        const startTime = Date.now();
        while (!this.cameraManager?.isInitialized && (Date.now() - startTime) < timeout) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!this.cameraManager?.isInitialized) {
            throw new Error('Camera manager failed to initialize within timeout');
        }
    }
    
    async initializeHtml5QrCode() {
        try {
            const readerElement = QRUtils.$('qr-reader');
            if (!readerElement) {
                throw new Error('QR reader element not found');
            }
            
            // Clear any existing content
            readerElement.innerHTML = '';
            
            this.html5QrCode = new Html5Qrcode('qr-reader');
            QRUtils.log.info('Html5Qrcode instance created');
            
        } catch (error) {
            QRUtils.log.error('Failed to initialize Html5Qrcode:', error);
            throw error;
        }
    }
    
    setupStatusCallbacks() {
        if (this.cameraManager) {
            this.cameraManager.onStatusChange((message, type) => {
                this.updateCameraStatus(message, type);
            });
            
            this.cameraManager.onError((error, context) => {
                this.handleScannerError(error, `Camera Manager - ${context}`);
            });
        }
    }
    
    initializeEventListeners() {
        // Camera control buttons
        this.bindEvent('start-camera', 'click', this.startScanning.bind(this));
        this.bindEvent('stop-camera', 'click', this.stopScanning.bind(this));
        this.bindEvent('switch-camera', 'click', this.switchCamera.bind(this));
        
        // Scan mode selection
        this.bindEvent('scan-mode', 'change', this.handleScanModeChange.bind(this));
        
        // Export and management buttons
        this.bindEvent('export-excel', 'click', this.exportToExcel.bind(this));
        this.bindEvent('export-csv', 'click', this.exportToCSV.bind(this));
        this.bindEvent('clear-records', 'click', this.clearRecords.bind(this));
        this.bindEvent('import-records', 'click', this.importRecords.bind(this));
        
        // Quick actions
        this.bindEvent('manual-entry', 'click', this.showManualEntry.bind(this));
        this.bindEvent('skip-item', 'click', this.skipCurrentItem.bind(this));
        this.bindEvent('rescan-last', 'click', this.rescanLastItem.bind(this));
        
        // Search and filter
        this.bindEvent('search-records', 'input', 
            QRUtils.debounce(this.searchRecords.bind(this), 300));
        this.bindEvent('filter-status', 'change', this.filterRecords.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
    }
    
    bindEvent(elementId, event, handler) {
        const element = QRUtils.$(elementId);
        if (element) {
            element.addEventListener(event, handler);
        }
    }
    
    async startScanning() {
        if (this.isScanning) {
            QRUtils.setStatus('Scanner already active', 'warning');
            return;
        }
        
        try {
            QRUtils.setStatus('Starting camera...', 'loading');
            
            // Ensure we have camera access
            if (!this.cameraManager?.isInitialized) {
                throw new Error('Camera manager not initialized');
            }
            
            if (!this.cameraManager.hasPermission) {
                await this.cameraManager.requestPermission();
            }
            
            // Get camera stream
            const currentCamera = this.cameraManager.currentCamera;
            if (!currentCamera) {
                throw new Error('No camera available');
            }
            
            QRUtils.log.info('Starting scanning with camera:', currentCamera.label);
            
            // Configure scanner based on device type
            const config = this.getOptimizedConfig();
            
            // Start Html5QrCode scanner
            await this.html5QrCode.start(
                currentCamera.id,
                config,
                this.onScanSuccess.bind(this),
                this.onScanFailure.bind(this)
            );
            
            this.isScanning = true;
            this.retryCount = 0;
            
            // Update UI
            this.updateScannerUI(true);
            this.showScanRecordsSection();
            
            QRUtils.setStatus('Scanner active - Point camera at QR/barcode', 'success');
            QRUtils.log.success('Scanning started successfully');
            
        } catch (error) {
            this.handleScannerError(error, 'Start Scanning');
            this.updateScannerUI(false);
        }
    }
    
    async stopScanning() {
        if (!this.isScanning || !this.html5QrCode) {
            return;
        }
        
        try {
            await this.html5QrCode.stop();
            this.isScanning = false;
            
            // Update UI
            this.updateScannerUI(false);
            
            QRUtils.setStatus('Scanner stopped', 'info');
            QRUtils.log.info('Scanning stopped');
            
        } catch (error) {
            QRUtils.log.error('Error stopping scanner:', error);
            this.isScanning = false;
            this.updateScannerUI(false);
        }
    }
    
    async switchCamera() {
        if (!this.cameraManager || this.cameraManager.cameras.length <= 1) {
            QRUtils.setStatus('No additional cameras available', 'warning');
            return;
        }
        
        try {
            const wasScanning = this.isScanning;
            
            // Stop current scanning
            if (wasScanning) {
                await this.stopScanning();
            }
            
            // Switch camera
            await this.cameraManager.switchCamera();
            
            // Restart scanning if it was active
            if (wasScanning) {
                setTimeout(() => this.startScanning(), 1000);
            }
            
        } catch (error) {
            this.handleScannerError(error, 'Camera Switch');
        }
    }
    
    getOptimizedConfig() {
        const isMobile = this.cameraManager?.isMobileDevice() || false;
        
        return {
            ...this.scannerConfig,
            fps: isMobile ? 20 : 30, // Lower FPS on mobile for better performance
            qrbox: isMobile ? 
                { width: 200, height: 200 } : 
                this.scannerConfig.qrbox
        };
    }
    
    onScanSuccess(decodedText, decodedResult) {
        // Prevent rapid duplicate scans
        const now = Date.now();
        if (this.lastScanTime && (now - this.lastScanTime) < this.debounceTime) {
            return;
        }
        this.lastScanTime = now;
        
        QRUtils.log.info('Scan detected:', decodedText);
        
        // Process the scanned value
        this.processScanResult(decodedText, decodedResult);
        
        // Stop scanning if in single mode
        if (this.scanMode === 'single') {
            setTimeout(() => this.stopScanning(), 1000);
        }
    }
    
    onScanFailure(error) {
        // Filter out common non-critical errors
        const ignoredErrors = [
            'No QR code found',
            'QR code parse error',
            'IndexSizeError',
            'source width is 0',
            'NotFoundException'
        ];
        
        const shouldIgnore = ignoredErrors.some(ignored => 
            error.toString().includes(ignored)
        );
        
        if (!shouldIgnore) {
            QRUtils.log.warn('Scan failure:', error);
            
            // Handle critical errors with retry logic
            if (this.shouldRetryOnError(error)) {
                this.handleScanRetry(error);
            }
        }
    }
    
    shouldRetryOnError(error) {
        const criticalErrors = [
            'NotReadableError',
            'OverconstrainedError',
            'NotFoundError'
        ];
        
        return criticalErrors.some(critical => 
            error.toString().includes(critical)
        ) && this.retryCount < this.maxRetries;
    }
    
    async handleScanRetry(error) {
        this.retryCount++;
        QRUtils.log.warn(`Retrying scan (${this.retryCount}/${this.maxRetries}) due to:`, error);
        
        await this.stopScanning();
        
        setTimeout(async () => {
            try {
                await this.startScanning();
            } catch (retryError) {
                if (this.retryCount >= this.maxRetries) {
                    this.handleScannerError(retryError, 'Scan Retry Failed');
                }
            }
        }, 2000);
    }
    
    processScanResult(scannedValue, decodedResult) {
        if (!this.columnMapping || !window.columnMapper) {
            QRUtils.handleError(
                new Error('Column mapping not configured'), 
                'Scan Processing'
            );
            return;
        }
        
        this.scanCount++;
        
        // Clean and validate scanned value
        const cleanValue = QRUtils.cleanText(scannedValue);
        if (!cleanValue) {
            QRUtils.log.warn('Empty scan value detected');
            return;
        }
        
        // Find matching row in BOM data
        const matchedRow = window.columnMapper.findRowByTarget(cleanValue);
        
        const scanRecord = {
            id: QRUtils.generateId(),
            timestamp: new Date(),
            scannedValue: cleanValue,
            originalValue: scannedValue,
            scanIndex: this.scanCount,
            matched: !!matchedRow,
            matchedRow: matchedRow || null,
            decodedResult: {
                format: this.detectFormat(decodedResult),
                rawValue: decodedResult?.decodedText || scannedValue,
                resultPoints: decodedResult?.result?.resultPoints || []
            },
            scanMode: this.scanMode,
            camera: this.cameraManager?.currentCamera?.label || 'Unknown',
            processingTime: Date.now() - this.lastScanTime
        };
        
        // Add to results
        this.scanResults.push(scanRecord);
        
        if (matchedRow) {
            this.matchCount++;
            this.displayCurrentMatch(matchedRow, scanRecord);
            QRUtils.setStatus(`✓ Match found! (${this.matchCount}/${this.scanCount})`, 'success');
            this.provideFeedback('success');
        } else {
            this.displayNoMatch(cleanValue, scanRecord);
            QRUtils.setStatus(`✗ No match found (${this.matchCount}/${this.scanCount})`, 'warning');
            this.provideFeedback('error');
        }
        
        // Update UI components
        this.updateScanStats();
        this.updateRecordsTable();
        this.enableQuickActions();
        
        // Save to storage
        this.saveToStorage();
        
        // Show visual feedback
        this.showScanFeedback(scanRecord.matched);
    }
    
    detectFormat(decodedResult) {
        if (!decodedResult || !decodedResult.result) {
            return 'UNKNOWN';
        }
        
        const result = decodedResult.result;
        
        // Check if it's a QR code or other format
        if (result.format) {
            return result.format.toString();
        }
        
        // Fallback detection based on result structure
        if (result.text && result.text.includes('http')) {
            return 'QR_CODE';
        }
        
        return 'BARCODE';
    }
    
    displayCurrentMatch(matchedRow, scanRecord) {
        const matchElement = QRUtils.$('current-match');
        const serialElement = QRUtils.$('serial-display');
        const serialValue = QRUtils.$('serial-value');
        
        if (matchElement) {
            matchElement.innerHTML = `
                <div class="scan-match success">
                    <h4>✓ Match Found</h4>
                    <div class="kv-list">
                        <div class="kv-item">
                            <div class="kv-key">Scanned</div>
                            <div class="kv-value mono">${QRUtils.escapeHtml(scanRecord.scannedValue)}</div>
                        </div>
                        <div class="kv-item">
                            <div class="kv-key">MPN</div>
                            <div class="kv-value mono">${QRUtils.escapeHtml(matchedRow.mpn || '-')}</div>
                        </div>
                        <div class="kv-item">
                            <div class="kv-key">Manufacturer</div>
                            <div class="kv-value">${QRUtils.escapeHtml(matchedRow.manufacturer || '-')}</div>
                        </div>
                        <div class="kv-item">
                            <div class="kv-key">Quantity</div>
                            <div class="kv-value">${QRUtils.escapeHtml(matchedRow.quantity || '-')}</div>
                        </div>
                        <div class="kv-item">
                            <div class="kv-key">Format</div>
                            <div class="kv-value text-sm">${scanRecord.decodedResult.format}</div>
                        </div>
                    </div>
                </div>
            `;
            matchElement.className = 'scan-result success';
        }
        
        // Show serial number if available
        if (serialElement && serialValue && matchedRow.serial) {
            serialValue.textContent = matchedRow.serial;
            QRUtils.show(serialElement);
        }
    }
    
    displayNoMatch(scannedValue, scanRecord) {
        const matchElement = QRUtils.$('current-match');
        const serialElement = QRUtils.$('serial-display');
        
        if (matchElement) {
            matchElement.innerHTML = `
                <div class="scan-match error">
                    <h4>✗ No Match Found</h4>
                    <div class="kv-list">
                        <div class="kv-item">
                            <div class="kv-key">Scanned</div>
                            <div class="kv-value mono">${QRUtils.escapeHtml(scannedValue)}</div>
                        </div>
                        <div class="kv-item">
                            <div class="kv-key">Status</div>
                            <div class="kv-value text-error">Not found in BOM data</div>
                        </div>
                        <div class="kv-item">
                            <div class="kv-key">Format</div>
                            <div class="kv-value text-sm">${scanRecord.decodedResult.format}</div>
                        </div>
                        <div class="kv-item">
                            <div class="kv-key">Suggestion</div>
                            <div class="kv-value text-sm">Check MPN format or try manual entry</div>
                        </div>
                    </div>
                </div>
            `;
            matchElement.className = 'scan-result error';
        }
        
        if (serialElement) {
            QRUtils.hide(serialElement);
        }
    }
    
    provideFeedback(type) {
        // Haptic feedback on mobile devices
        if (navigator.vibrate) {
            if (type === 'success') {
                navigator.vibrate([100, 50, 100]); // Success pattern
            } else {
                navigator.vibrate(200); // Error pattern
            }
        }
        
        // Audio feedback (optional and subtle)
        this.playAudioFeedback(type);
    }
    
    playAudioFeedback(type) {
        if (window.AudioContext || window.webkitAudioContext) {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(
                    type === 'success' ? 800 : 400, 
                    audioContext.currentTime
                );
                gainNode.gain.setValueAtTime(0.05, audioContext.currentTime); // Very quiet
                
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.1);
            } catch (error) {
                // Audio feedback not available, ignore
            }
        }
    }
    
    showScanFeedback(matched) {
        const readerElement = QRUtils.$('qr-reader');
        if (readerElement) {
            // Add temporary visual feedback
            const feedbackClass = matched ? 'scan-success' : 'scan-error';
            readerElement.classList.add(feedbackClass);
            
            setTimeout(() => {
                readerElement.classList.remove(feedbackClass);
            }, 1000);
        }
    }
    
    updateScanStats() {
        const scanCountElement = QRUtils.$('scan-count');
        const matchCountElement = QRUtils.$('match-count');
        const accuracyElement = QRUtils.$('accuracy-rate');
        
        if (scanCountElement) scanCountElement.textContent = this.scanCount;
        if (matchCountElement) matchCountElement.textContent = this.matchCount;
        
        if (accuracyElement) {
            const accuracy = this.scanCount > 0 ? 
                Math.round((this.matchCount / this.scanCount) * 100) : 0;
            accuracyElement.textContent = `${accuracy}%`;
        }
    }
    
    updateScannerUI(isScanning) {
        const startBtn = QRUtils.$('start-camera');
        const stopBtn = QRUtils.$('stop-camera');
        const switchBtn = QRUtils.$('switch-camera');
        const cameraSelect = QRUtils.$('camera-select');
        
        if (startBtn) startBtn.disabled = isScanning;
        if (stopBtn) stopBtn.disabled = !isScanning;
        if (switchBtn) switchBtn.disabled = !isScanning;
        if (cameraSelect) cameraSelect.disabled = isScanning;
    }
    
    enableQuickActions() {
        const skipBtn = QRUtils.$('skip-item');
        const rescanBtn = QRUtils.$('rescan-last');
        
        if (skipBtn) skipBtn.disabled = false;
        if (rescanBtn) rescanBtn.disabled = this.scanResults.length === 0;
    }
    
    showScanRecordsSection() {
        const recordsSection = QRUtils.$('scan-records-section');
        if (recordsSection) {
            QRUtils.show(recordsSection);
        }
    }
    
    updateCameraStatus(message, type) {
        const statusElement = QRUtils.$('camera-status-text');
        const statusContainer = QRUtils.$('camera-status');
        
        if (statusElement) {
            statusElement.textContent = message;
        }
        
        if (statusContainer) {
            statusContainer.className = `alert alert-${type}`;
        }
    }
    
    handleScanModeChange(event) {
        this.scanMode = event.target.value;
        QRUtils.log.info('Scan mode changed to:', this.scanMode);
        
        // Update debounce time based on mode
        this.debounceTime = this.scanMode === 'single' ? 500 : 1500;
    }
    
    // Export and management methods
    async exportToExcel() {
        if (this.scanResults.length === 0) {
            QRUtils.setStatus('No scan records to export', 'warning');
            return;
        }
        
        try {
            const exportData = this.prepareExportData();
            
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);
            
            // Auto-size columns
            const colWidths = this.calculateColumnWidths(exportData);
            ws['!cols'] = colWidths;
            
            XLSX.utils.book_append_sheet(wb, ws, 'Scan Results');
            
            const filename = QRUtils.generateFilename('qr_scan_results');
            XLSX.writeFile(wb, filename);
            
            QRUtils.showSuccess(`Exported ${this.scanResults.length} records to ${filename}`);
            
        } catch (error) {
            QRUtils.handleError(error, 'Excel Export');
        }
    }
    
    async exportToCSV() {
        if (this.scanResults.length === 0) {
            QRUtils.setStatus('No scan records to export', 'warning');
            return;
        }
        
        try {
            const exportData = this.prepareExportData();
            const csv = this.convertToCSV(exportData);
            
            const filename = QRUtils.generateFilename('qr_scan_results', 'csv');
            this.downloadCSV(csv, filename);
            
            QRUtils.showSuccess(`Exported ${this.scanResults.length} records to ${filename}`);
            
        } catch (error) {
            QRUtils.handleError(error, 'CSV Export');
        }
    }
    
    prepareExportData() {
        return this.scanResults.map(record => ({
            'Scan Index': record.scanIndex,
            'Timestamp': QRUtils.formatTimestamp(record.timestamp),
            'Scanned Value': record.scannedValue,
            'Original Value': record.originalValue,
            'Status': record.matched ? 'Match' : 'No Match',
            'Format': record.decodedResult.format,
            'Serial No.': record.matchedRow?.serial || '',
            'MPN': record.matchedRow?.mpn || '',
            'Designators': record.matchedRow?.designators || '',
            'Manufacturer': record.matchedRow?.manufacturer || '',
            'Quantity': record.matchedRow?.quantity || '',
            'Row Number': record.matchedRow?._actualRowNumber || '',
            'Camera': record.camera,
            'Scan Mode': record.scanMode,
            'Processing Time (ms)': record.processingTime
        }));
    }
    
    calculateColumnWidths(data) {
        if (data.length === 0) return [];
        
        return Object.keys(data[0]).map(key => {
            const maxLength = Math.max(
                key.length,
                ...data.map(row => String(row[key] || '').length)
            );
            return { wch: Math.min(maxLength + 2, 30) };
        });
    }
    
    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header] || '';
                    return `"${String(value).replace(/"/g, '""')}"`;
                }).join(',')
            )
        ].join('\n');
        
        return csvContent;
    }
    
    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (navigator.msSaveBlob) {
            navigator.msSaveBlob(blob, filename);
        } else {
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
    
    // Additional methods for comprehensive functionality
    updateRecordsTable() {
        const tableContainer = QRUtils.$('records-table');
        if (!tableContainer) return;
        
        if (this.scanResults.length === 0) {
            tableContainer.innerHTML = '<div class="empty">No scan records yet</div>';
            return;
        }
        
        const filteredResults = this.getFilteredResults();
        const recentResults = [...filteredResults].reverse().slice(0, 100);
        
        let tableHTML = this.generateTableHTML(recentResults);
        tableContainer.innerHTML = tableHTML;
    }
    
    getFilteredResults() {
        let results = this.scanResults;
        
        // Apply search filter
        const searchTerm = QRUtils.$('search-records')?.value?.toLowerCase();
        if (searchTerm) {
            results = results.filter(record => 
                record.scannedValue.toLowerCase().includes(searchTerm) ||
                record.matchedRow?.mpn?.toLowerCase().includes(searchTerm) ||
                record.matchedRow?.manufacturer?.toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply status filter
        const statusFilter = QRUtils.$('filter-status')?.value;
        if (statusFilter && statusFilter !== 'all') {
            results = results.filter(record => {
                if (statusFilter === 'matched') return record.matched;
                if (statusFilter === 'unmatched') return !record.matched;
                return true;
            });
        }
        
        return results;
    }
    
    generateTableHTML(results) {
        let tableHTML = `
            <table class="table-compact table-striped">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Time</th>
                        <th>Scanned Value</th>
                        <th>Status</th>
                        <th>Format</th>
                        <th>MPN</th>
                        <th>Manufacturer</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        results.forEach(record => {
            const timeStr = record.timestamp.toLocaleTimeString();
            const statusClass = record.matched ? 'text-success' : 'text-error';
            const statusText = record.matched ? '✓ Match' : '✗ No Match';
            const rowClass = record.matched ? '' : 'row-warning';
            
            const mpn = record.matchedRow?.mpn || '-';
            const manufacturer = record.matchedRow?.manufacturer || '-';
            
            tableHTML += `
                <tr class="${rowClass}" data-record-id="${record.id}">
                    <td class="mono">${record.scanIndex}</td>
                    <td class="mono text-xs">${timeStr}</td>
                    <td class="mono" title="${QRUtils.escapeHtml(record.scannedValue)}">
                        ${QRUtils.escapeHtml(QRUtils.truncate(record.scannedValue, 15))}
                    </td>
                    <td class="${statusClass}">${statusText}</td>
                    <td class="text-xs">${record.decodedResult.format}</td>
                    <td class="mono" title="${QRUtils.escapeHtml(mpn)}">
                        ${QRUtils.escapeHtml(QRUtils.truncate(mpn, 12))}
                    </td>
                    <td title="${QRUtils.escapeHtml(manufacturer)}">
                        ${QRUtils.escapeHtml(QRUtils.truncate(manufacturer, 12))}
                    </td>
                    <td>
                        <button class="btn btn-sm btn-secondary" 
                                onclick="qrScanner.viewRecord('${record.id}')" 
                                title="View Details">👁</button>
                        <button class="btn btn-sm btn-danger" 
                                onclick="qrScanner.deleteRecord('${record.id}')" 
                                title="Delete">🗑</button>
                    </td>
                </tr>
            `;
        });
        
        tableHTML += '</tbody></table>';
        return tableHTML;
    }
    
    // Quick action methods
    showManualEntry() {
        const value = prompt('Enter value manually:');
        if (value && value.trim()) {
            this.processScanResult(value.trim(), { 
                result: { format: 'MANUAL' }
            });
        }
    }
    
    skipCurrentItem() {
        // Add a skip entry
        const skipRecord = {
            id: QRUtils.generateId(),
            timestamp: new Date(),
            scannedValue: '[SKIPPED]',
            originalValue: '[SKIPPED]',
            scanIndex: ++this.scanCount,
            matched: false,
            matchedRow: null,
            decodedResult: { format: 'SKIP' },
            scanMode: this.scanMode,
            camera: this.cameraManager?.currentCamera?.label || 'Unknown',
            processingTime: 0
        };
        
        this.scanResults.push(skipRecord);
        this.updateScanStats();
        this.updateRecordsTable();
        this.saveToStorage();
        
        QRUtils.setStatus('Item skipped', 'info');
    }
    
    rescanLastItem() {
        if (this.scanResults.length === 0) return;
        
        const lastRecord = this.scanResults[this.scanResults.length - 1];
        if (lastRecord.scannedValue !== '[SKIPPED]') {
            this.processScanResult(lastRecord.originalValue, lastRecord.decodedResult);
        }
    }
    
    // Search and filter methods
    searchRecords() {
        this.updateRecordsTable();
    }
    
    filterRecords() {
        this.updateRecordsTable();
    }
    
    // Record management methods
    viewRecord(recordId) {
        const record = this.scanResults.find(r => r.id === recordId);
        if (record) {
            const details = JSON.stringify(record, null, 2);
            alert(`Record Details:\n\n${details}`);
        }
    }
    
    deleteRecord(recordId) {
        if (confirm('Delete this scan record?')) {
            this.scanResults = this.scanResults.filter(r => r.id !== recordId);
            this.recalculateStats();
            this.updateScanStats();
            this.updateRecordsTable();
            this.saveToStorage();
            QRUtils.setStatus('Record deleted', 'info');
        }
    }
    
    recalculateStats() {
        this.scanCount = this.scanResults.length;
        this.matchCount = this.scanResults.filter(r => r.matched).length;
    }
    
    clearRecords() {
        if (this.scanResults.length === 0) {
            QRUtils.setStatus('No records to clear', 'info');
            return;
        }
        
        if (confirm(`Clear all ${this.scanResults.length} scan records?`)) {
            this.scanResults = [];
            this.scanCount = 0;
            this.matchCount = 0;
            
            this.updateScanStats();
            this.updateRecordsTable();
            
            // Clear current match display
            const matchElement = QRUtils.$('current-match');
            if (matchElement) {
                matchElement.innerHTML = '<div class="empty">No matches yet</div>';
                matchElement.className = 'scan-result empty';
            }
            
            QRUtils.hide('serial-display');
            
            // Disable quick actions
            const skipBtn = QRUtils.$('skip-item');
            const rescanBtn = QRUtils.$('rescan-last');
            if (skipBtn) skipBtn.disabled = true;
            if (rescanBtn) rescanBtn.disabled = true;
            
            this.saveToStorage();
            QRUtils.showSuccess('All scan records cleared');
        }
    }
    
    // Keyboard shortcuts
    handleKeyboardShortcuts(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 's':
                    event.preventDefault();
                    if (this.isScanning) {
                        this.stopScanning();
                    } else {
                        this.startScanning();
                    }
                    break;
                case 'e':
                    event.preventDefault();
                    this.exportToExcel();
                    break;
                case 'm':
                    event.preventDefault();
                    this.showManualEntry();
                    break;
            }
        } else {
            switch (event.key) {
                case 'Escape':
                    if (this.isScanning) {
                        this.stopScanning();
                    }
                    break;
                case ' ':
                    if (event.target.tagName !== 'INPUT') {
                        event.preventDefault();
                        this.skipCurrentItem();
                    }
                    break;
            }
        }
    }
    
    // Column mapping integration
    updateColumnMapping(columnMapping, rangeData) {
        this.columnMapping = columnMapping;
        this.rangeData = rangeData;
        QRUtils.log.info('Scanner updated with column mapping');
    }
    
    // Storage methods
    saveToStorage() {
        const data = {
            scanResults: this.scanResults.slice(-100), // Keep last 100 results
            scanCount: this.scanCount,
            matchCount: this.matchCount,
            scanMode: this.scanMode,
            timestamp: Date.now()
        };
        
        QRUtils.storage.set('scan_results', data);
    }
    
    loadFromStorage() {
        const data = QRUtils.storage.get('scan_results');
        if (!data) return false;
        
        // Check if data is recent (within 24 hours)
        const isRecent = data.timestamp && (Date.now() - data.timestamp) < 24 * 60 * 60 * 1000;
        if (!isRecent) {
            QRUtils.storage.remove('scan_results');
            return false;
        }
        
        try {
            this.scanResults = data.scanResults || [];
            this.scanCount = data.scanCount || 0;
            this.matchCount = data.matchCount || 0;
            this.scanMode = data.scanMode || 'continuous';
            
            // Convert timestamp strings back to Date objects
            this.scanResults.forEach(record => {
                if (typeof record.timestamp === 'string') {
                    record.timestamp = new Date(record.timestamp);
                }
            });
            
            // Update UI
            setTimeout(() => {
                this.updateScanStats();
                this.updateRecordsTable();
                this.showScanRecordsSection();
            }, 500);
            
            QRUtils.log.info('Restored scan results from storage');
            return true;
            
        } catch (error) {
            QRUtils.log.warn('Failed to load scan results from storage:', error);
            QRUtils.storage.remove('scan_results');
            return false;
        }
    }
    
    // Error handling
    handleScannerError(error, context = 'Scanner') {
        QRUtils.handleError(error, context);
        
        // Update camera status if it's a camera-related error
        if (context.includes('Camera') || context.includes('Scan')) {
            this.updateCameraStatus(`Error: ${error.message}`, 'error');
        }
        
        // Stop scanning on critical errors
        if (this.isScanning) {
            this.stopScanning();
        }
    }
    
    // Cleanup and reset
    reset() {
        this.stopScanning();
        
        if (this.cameraManager) {
            this.cameraManager.cleanup();
        }
        
        this.scanResults = [];
        this.scanCount = 0;
        this.matchCount = 0;
        this.columnMapping = null;
        this.rangeData = null;
        this.lastScanTime = 0;
        this.retryCount = 0;
        
        // Reset UI
        this.updateScanStats();
        this.updateRecordsTable();
        this.updateScannerUI(false);
        
        const matchElement = QRUtils.$('current-match');
        if (matchElement) {
            matchElement.innerHTML = '<div class="empty">No matches yet</div>';
            matchElement.className = 'scan-result empty';
        }
        
        QRUtils.hide('serial-display');
        
        QRUtils.log.info('Scanner reset complete');
    }
    
    // Get scanner status
    getStatus() {
        return {
            isScanning: this.isScanning,
            scanCount: this.scanCount,
            matchCount: this.matchCount,
            scanMode: this.scanMode,
            hasColumnMapping: !!this.columnMapping,
            cameraStatus: this.cameraManager?.getStatus() || null,
            lastScanTime: this.lastScanTime,
            accuracy: this.scanCount > 0 ? (this.matchCount / this.scanCount) * 100 : 0
        };
    }
}

// Initialize and make globally available
window.qrScanner = new QRScanner();