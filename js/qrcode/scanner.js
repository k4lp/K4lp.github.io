/**
 * QR/Barcode Scanner Module
 * Handles camera access, scanning, and component matching
 */

class QRScanner {
    constructor() {
        this.html5QrCode = null;
        this.cameras = [];
        this.currentCamera = null;
        this.isScanning = false;
        this.columnMapping = null;
        this.rangeData = null;
        this.scanResults = [];
        this.scanCount = 0;
        this.matchCount = 0;
        
        this.initializeEventListeners();
        this.loadFromStorage();
        this.initializeCamera();
    }
    
    async initializeCamera() {
        try {
            // Check if camera is available
            const hasCamera = await QRUtils.hasCamera();
            if (!hasCamera) {
                QRUtils.setStatus('No camera detected', 'warning');
                return;
            }
            
            // Initialize Html5QrCode
            this.html5QrCode = new Html5Qrcode('video-preview');
            
            // Get available cameras
            await this.loadCameras();
            
            QRUtils.log.info('Scanner initialized successfully');
        } catch (error) {
            QRUtils.handleError(error, 'Scanner Initialization');
        }
    }
    
    initializeEventListeners() {
        // Camera control buttons
        const startBtn = QRUtils.$('start-camera');
        const stopBtn = QRUtils.$('stop-camera');
        const cameraSelect = QRUtils.$('camera-select');
        
        if (startBtn) {
            startBtn.addEventListener('click', this.startScanning.bind(this));
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', this.stopScanning.bind(this));
        }
        
        if (cameraSelect) {
            cameraSelect.addEventListener('change', this.handleCameraChange.bind(this));
        }
        
        // Export and clear buttons
        const exportBtn = QRUtils.$('export-excel');
        const clearBtn = QRUtils.$('clear-records');
        
        if (exportBtn) {
            exportBtn.addEventListener('click', this.exportToExcel.bind(this));
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', this.clearRecords.bind(this));
        }
    }
    
    async loadCameras() {
        try {
            const devices = await Html5Qrcode.getCameras();
            this.cameras = devices;
            
            const cameraSelect = QRUtils.$('camera-select');
            if (cameraSelect && devices.length > 0) {
                cameraSelect.innerHTML = '';
                
                devices.forEach((camera, index) => {
                    const option = document.createElement('option');
                    option.value = camera.id;
                    option.textContent = camera.label || `Camera ${index + 1}`;
                    cameraSelect.appendChild(option);
                });
                
                // Prefer back camera on mobile devices
                const backCamera = devices.find(camera => 
                    camera.label.toLowerCase().includes('back') ||
                    camera.label.toLowerCase().includes('rear') ||
                    camera.label.toLowerCase().includes('environment')
                );
                
                if (backCamera) {
                    cameraSelect.value = backCamera.id;
                    this.currentCamera = backCamera.id;
                } else {
                    this.currentCamera = devices[0].id;
                }
                
                QRUtils.log.info(`Found ${devices.length} camera(s)`);
            } else {
                cameraSelect.innerHTML = '<option value="">No cameras found</option>';
            }
        } catch (error) {
            QRUtils.handleError(error, 'Camera Loading');
        }
    }
    
    handleCameraChange(event) {
        this.currentCamera = event.target.value;
        
        // Restart scanning if currently active
        if (this.isScanning) {
            this.stopScanning().then(() => {
                setTimeout(() => this.startScanning(), 500);
            });
        }
    }
    
    async startScanning() {
        if (!this.html5QrCode || !this.currentCamera) {
            QRUtils.handleError(new Error('Camera not available'), 'Start Scanning');
            return;
        }
        
        if (this.isScanning) {
            QRUtils.setStatus('Scanner already running', 'warning');
            return;
        }
        
        try {
            QRUtils.setStatus('Starting camera...', 'loading');
            
            // Configure scanner
            const config = {
                fps: 10, // Frames per second
                qrbox: { width: 300, height: 300 }, // Scanning area
                aspectRatio: 1.0,
                disableFlip: false,
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                }
            };
            
            // Start scanning
            await this.html5QrCode.start(
                this.currentCamera,
                config,
                this.onScanSuccess.bind(this),
                this.onScanFailure.bind(this)
            );
            
            this.isScanning = true;
            
            // Update UI
            const startBtn = QRUtils.$('start-camera');
            const stopBtn = QRUtils.$('stop-camera');
            
            if (startBtn) startBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = false;
            
            QRUtils.setStatus('Scanner active', 'success');
            QRUtils.log.success('Camera started successfully');
            
        } catch (error) {
            QRUtils.handleError(error, 'Start Scanning');
            this.isScanning = false;
        }
    }
    
    async stopScanning() {
        if (!this.html5QrCode || !this.isScanning) return;
        
        try {
            await this.html5QrCode.stop();
            this.isScanning = false;
            
            // Update UI
            const startBtn = QRUtils.$('start-camera');
            const stopBtn = QRUtils.$('stop-camera');
            
            if (startBtn) startBtn.disabled = false;
            if (stopBtn) stopBtn.disabled = true;
            
            QRUtils.setStatus('Scanner stopped', 'info');
            QRUtils.log.info('Camera stopped');
            
        } catch (error) {
            QRUtils.handleError(error, 'Stop Scanning');
        }
    }
    
    onScanSuccess(decodedText, decodedResult) {
        // Prevent duplicate rapid scans
        const now = Date.now();
        if (this.lastScanTime && (now - this.lastScanTime) < 1000) {
            return;
        }
        this.lastScanTime = now;
        
        QRUtils.log.info('Scan detected:', decodedText);
        
        // Process the scanned value
        this.processScanResult(decodedText, decodedResult);
    }
    
    onScanFailure(error) {
        // Ignore scan failures (normal when no code is in view)
        // Only log significant errors
        if (!error.includes('No QR code found')) {
            QRUtils.log.warn('Scan failure:', error);
        }
    }
    
    processScanResult(scannedValue, decodedResult) {
        if (!this.columnMapping || !window.columnMapper) {
            QRUtils.handleError(new Error('Column mapping not configured'), 'Scan Processing');
            return;
        }
        
        this.scanCount++;
        
        // Find matching row in BOM data
        const matchedRow = window.columnMapper.findRowByTarget(scannedValue);
        
        const scanRecord = {
            id: QRUtils.generateId(),
            timestamp: new Date(),
            scannedValue: QRUtils.cleanText(scannedValue),
            scanIndex: this.scanCount,
            matched: !!matchedRow,
            matchedRow: matchedRow || null,
            decodedResult: {
                format: decodedResult?.decodedText ? 'QR' : 'Unknown',
                rawValue: decodedResult?.decodedText || scannedValue
            }
        };
        
        // Add to results
        this.scanResults.push(scanRecord);
        
        if (matchedRow) {
            this.matchCount++;
            
            // Display current match info
            this.displayCurrentMatch(matchedRow, scanRecord);
            
            QRUtils.setStatus(`Match found! (${this.matchCount}/${this.scanCount})`, 'success');
            QRUtils.log.success('Match found:', matchedRow);
        } else {
            this.displayNoMatch(scannedValue);
            QRUtils.setStatus(`No match found (${this.matchCount}/${this.scanCount})`, 'warning');
            QRUtils.log.warn('No match for:', scannedValue);
        }
        
        // Update UI stats
        this.updateScanStats();
        
        // Update records table
        this.updateRecordsTable();
        
        // Save to storage
        this.saveToStorage();
        
        // Visual feedback (brief camera pause)
        this.showScanFeedback(scanRecord.matched);
    }
    
    displayCurrentMatch(matchedRow, scanRecord) {
        const matchElement = QRUtils.$('current-match');
        const serialElement = QRUtils.$('serial-display');
        const serialValue = QRUtils.$('serial-value');
        
        if (matchElement) {
            matchElement.innerHTML = `
                <div class="scan-match success">
                    <h4>Match Found</h4>
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
                    </div>
                </div>
            `;
        }
        
        // Show serial number if available
        if (serialElement && serialValue && matchedRow.serial) {
            serialValue.textContent = matchedRow.serial;
            QRUtils.show(serialElement);
        }
    }
    
    displayNoMatch(scannedValue) {
        const matchElement = QRUtils.$('current-match');
        const serialElement = QRUtils.$('serial-display');
        
        if (matchElement) {
            matchElement.innerHTML = `
                <div class="scan-match error">
                    <h4>No Match Found</h4>
                    <div class="kv-list">
                        <div class="kv-item">
                            <div class="kv-key">Scanned</div>
                            <div class="kv-value mono">${QRUtils.escapeHtml(scannedValue)}</div>
                        </div>
                        <div class="kv-item">
                            <div class="kv-key">Status</div>
                            <div class="kv-value text-error">Not found in BOM data</div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (serialElement) {
            QRUtils.hide(serialElement);
        }
    }
    
    showScanFeedback(matched) {
        // Add visual feedback to scanner area
        const videoElement = QRUtils.$('video-preview');
        if (videoElement) {
            const className = matched ? 'scan-success' : 'scan-error';
            videoElement.classList.add(className);
            setTimeout(() => videoElement.classList.remove(className), 500);
        }
    }
    
    updateScanStats() {
        const scanCountElement = QRUtils.$('scan-count');
        const matchCountElement = QRUtils.$('match-count');
        
        if (scanCountElement) scanCountElement.textContent = this.scanCount;
        if (matchCountElement) matchCountElement.textContent = this.matchCount;
    }
    
    updateRecordsTable() {
        const tableContainer = QRUtils.$('records-table');
        if (!tableContainer) return;
        
        if (this.scanResults.length === 0) {
            tableContainer.innerHTML = '<div class="empty">No scan records yet</div>';
            return;
        }
        
        // Create table with recent scans first
        const recentResults = [...this.scanResults].reverse().slice(0, 100); // Limit to last 100 scans
        
        let tableHTML = `
            <table class="table-compact table-striped">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Time</th>
                        <th>Scanned Value</th>
                        <th>Status</th>
                        <th>Serial No.</th>
                        <th>MPN</th>
                        <th>Manufacturer</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        recentResults.forEach(record => {
            const timeStr = record.timestamp.toLocaleTimeString();
            const statusClass = record.matched ? 'text-success' : 'text-error';
            const statusText = record.matched ? '✓ Match' : '✗ No Match';
            
            const serial = record.matchedRow?.serial || '-';
            const mpn = record.matchedRow?.mpn || '-';
            const manufacturer = record.matchedRow?.manufacturer || '-';
            
            tableHTML += `
                <tr class="${record.matched ? '' : 'row-warning'}">
                    <td class="mono">${record.scanIndex}</td>
                    <td class="mono text-xs">${timeStr}</td>
                    <td class="mono">${QRUtils.escapeHtml(QRUtils.truncate(record.scannedValue, 20))}</td>
                    <td class="${statusClass}">${statusText}</td>
                    <td class="mono">${QRUtils.escapeHtml(QRUtils.truncate(serial, 15))}</td>
                    <td class="mono">${QRUtils.escapeHtml(QRUtils.truncate(mpn, 15))}</td>
                    <td>${QRUtils.escapeHtml(QRUtils.truncate(manufacturer, 15))}</td>
                </tr>
            `;
        });
        
        tableHTML += '</tbody></table>';
        tableContainer.innerHTML = tableHTML;
    }
    
    updateColumnMapping(columnMapping, rangeData) {
        this.columnMapping = columnMapping;
        this.rangeData = rangeData;
        
        QRUtils.log.info('Scanner updated with column mapping');
    }
    
    async exportToExcel() {
        if (this.scanResults.length === 0) {
            QRUtils.setStatus('No scan records to export', 'warning');
            return;
        }
        
        try {
            // Prepare export data
            const exportData = this.scanResults.map(record => ({
                'Scan Index': record.scanIndex,
                'Timestamp': QRUtils.formatTimestamp(record.timestamp),
                'Scanned Value': record.scannedValue,
                'Status': record.matched ? 'Match' : 'No Match',
                'Serial No.': record.matchedRow?.serial || '',
                'MPN': record.matchedRow?.mpn || '',
                'Designators': record.matchedRow?.designators || '',
                'Manufacturer': record.matchedRow?.manufacturer || '',
                'Quantity': record.matchedRow?.quantity || '',
                'Row Number': record.matchedRow?._actualRowNumber || ''
            }));
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);
            
            // Auto-size columns
            const colWidths = [];
            Object.keys(exportData[0]).forEach(key => {
                const maxLength = Math.max(
                    key.length,
                    ...exportData.map(row => String(row[key] || '').length)
                );
                colWidths.push({ wch: Math.min(maxLength + 2, 30) });
            });
            ws['!cols'] = colWidths;
            
            XLSX.utils.book_append_sheet(wb, ws, 'Scan Results');
            
            // Generate filename and save
            const filename = QRUtils.generateFilename('qr_scan_results');
            XLSX.writeFile(wb, filename);
            
            QRUtils.showSuccess(`Exported ${this.scanResults.length} records to ${filename}`);
            
        } catch (error) {
            QRUtils.handleError(error, 'Excel Export');
        }
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
            }
            
            QRUtils.hide('serial-display');
            
            // Save to storage
            this.saveToStorage();
            
            QRUtils.showSuccess('All scan records cleared');
        }
    }
    
    // Storage methods
    saveToStorage() {
        const data = {
            scanResults: this.scanResults.slice(-50), // Keep last 50 results only
            scanCount: this.scanCount,
            matchCount: this.matchCount,
            timestamp: Date.now()
        };
        
        QRUtils.storage.set('scan_results', data);
    }
    
    loadFromStorage() {
        const data = QRUtils.storage.get('scan_results');
        if (!data) return false;
        
        // Check if data is recent (within 24 hours)
        const isRecent = data.timestamp && (Date.now() - data.timestamp) < 24 * 60 * 60 * 1000;
        if (!isRecent) return false;
        
        try {
            this.scanResults = data.scanResults || [];
            this.scanCount = data.scanCount || 0;
            this.matchCount = data.matchCount || 0;
            
            // Convert timestamp strings back to Date objects
            this.scanResults.forEach(record => {
                if (typeof record.timestamp === 'string') {
                    record.timestamp = new Date(record.timestamp);
                }
            });
            
            // Update UI
            this.updateScanStats();
            this.updateRecordsTable();
            
            QRUtils.log.info('Restored scan results from storage');
            return true;
        } catch (error) {
            QRUtils.log.warn('Failed to load scan results from storage:', error);
            QRUtils.storage.remove('scan_results');
        }
        
        return false;
    }
    
    reset() {
        // Stop scanning if active
        if (this.isScanning) {
            this.stopScanning();
        }
        
        // Clear data
        this.scanResults = [];
        this.scanCount = 0;
        this.matchCount = 0;
        this.columnMapping = null;
        this.rangeData = null;
        
        // Reset UI
        this.updateScanStats();
        this.updateRecordsTable();
        
        const matchElement = QRUtils.$('current-match');
        if (matchElement) {
            matchElement.innerHTML = '<div class="empty">No matches yet</div>';
        }
        
        QRUtils.hide('serial-display');
        
        QRUtils.log.info('Scanner reset');
    }
}

// Initialize and make globally available
window.qrScanner = new QRScanner();