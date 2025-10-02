/**
 * QR Code Component Scanner - Scanner Manager
 * Alica Technologies
 */

window.QRScannerManager = {
    // Internal state
    _html5QrCode: null,
    _isScanning: false,
    _cameras: [],
    _currentCameraId: null,
    _scanStartTime: null,
    _lastScanTime: 0,

    /**
     * Initialize scanner manager
     */
    init() {
        this._bindEvents();
        this._loadCameras();
        window.QRScannerUtils.log.debug('Scanner manager initialized');
    },

    /**
     * Bind event listeners
     */
    _bindEvents() {
        const startBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.START_CAMERA);
        const stopBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.STOP_CAMERA);
        const switchBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SWITCH_CAMERA);
        const cameraSelect = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.CAMERA_SELECT);

        if (startBtn) startBtn.addEventListener('click', this._handleStartCamera.bind(this));
        if (stopBtn) stopBtn.addEventListener('click', this._handleStopCamera.bind(this));
        if (switchBtn) switchBtn.addEventListener('click', this._handleSwitchCamera.bind(this));
        if (cameraSelect) cameraSelect.addEventListener('change', this._handleCameraSelect.bind(this));
    },

    /**
     * Load available cameras
     */
    async _loadCameras() {
        try {
            this._cameras = await Html5Qrcode.getCameras();
            this._populateCameraSelect();
            window.QRScannerUtils.log.debug(`Found ${this._cameras.length} cameras`);
        } catch (error) {
            window.QRScannerUtils.log.error('Error loading cameras:', error);
            this._handleCameraError(window.QRScannerConfig.MESSAGES.CAMERA_NOT_FOUND);
        }
    },

    /**
     * Populate camera selection dropdown
     */
    _populateCameraSelect() {
        const select = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.CAMERA_SELECT);
        if (!select) return;

        select.innerHTML = '';

        if (this._cameras.length === 0) {
            const option = document.createElement('option');
            option.textContent = 'No cameras found';
            option.disabled = true;
            select.appendChild(option);
            return;
        }

        this._cameras.forEach((camera, index) => {
            const option = document.createElement('option');
            option.value = camera.id;
            option.textContent = camera.label || `Camera ${index + 1}`;
            select.appendChild(option);
        });

        // Select first camera by default
        if (this._cameras.length > 0) {
            select.value = this._cameras[0].id;
            this._currentCameraId = this._cameras[0].id;
        }

        // Enable camera controls
        window.QRScannerUtils.dom.setEnabled(window.QRScannerConfig.ELEMENTS.CAMERA_SELECT, true);
        window.QRScannerUtils.dom.setEnabled(window.QRScannerConfig.ELEMENTS.START_CAMERA, true);
    },

    /**
     * Handle start camera button
     */
    async _handleStartCamera() {
        if (this._isScanning) {
            window.QRScannerUtils.log.warn('Scanner already running');
            return;
        }

        if (!this._currentCameraId) {
            alert(window.QRScannerConfig.MESSAGES.CAMERA_NOT_FOUND);
            return;
        }

        try {
            await this._startScanner();
        } catch (error) {
            window.QRScannerUtils.log.error('Failed to start scanner:', error);
            this._handleCameraError(error.message);
        }
    },

    /**
     * Handle stop camera button
     */
    async _handleStopCamera() {
        if (!this._isScanning) {
            window.QRScannerUtils.log.warn('Scanner not running');
            return;
        }

        try {
            await this._stopScanner();
        } catch (error) {
            window.QRScannerUtils.log.error('Failed to stop scanner:', error);
        }
    },

    /**
     * Handle switch camera button
     */
    async _handleSwitchCamera() {
        if (this._cameras.length <= 1) {
            window.QRScannerUtils.log.warn('No other cameras available');
            return;
        }

        const currentIndex = this._cameras.findIndex(c => c.id === this._currentCameraId);
        const nextIndex = (currentIndex + 1) % this._cameras.length;
        const nextCamera = this._cameras[nextIndex];

        if (this._isScanning) {
            await this._stopScanner();
        }

        this._currentCameraId = nextCamera.id;
        const select = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.CAMERA_SELECT);
        if (select) select.value = nextCamera.id;

        await this._startScanner();
    },

    /**
     * Handle camera selection change
     */
    async _handleCameraSelect(event) {
        const selectedCameraId = event.target.value;
        if (selectedCameraId === this._currentCameraId) return;

        if (this._isScanning) {
            await this._stopScanner();
        }

        this._currentCameraId = selectedCameraId;

        // Auto-start if scanner was previously running
        if (this._isScanning) {
            await this._startScanner();
        }
    },

    /**
     * Start the QR/barcode scanner
     */
    async _startScanner() {
        try {
            // Initialize Html5Qrcode if not exists
            if (!this._html5QrCode) {
                this._html5QrCode = new Html5Qrcode(window.QRScannerConfig.ELEMENTS.QR_READER);
            }

            // Configure scanner
            const config = {
                fps: window.QRScannerConfig.SCANNER.FPS,
                qrbox: {
                    width: window.QRScannerConfig.SCANNER.QRBOX_SIZE,
                    height: window.QRScannerConfig.SCANNER.QRBOX_SIZE
                },
                aspectRatio: 1.0,
                disableFlip: false,
                videoConstraints: {
                    facingMode: "environment" // Prefer back camera
                }
            };

            // Start scanning
            await this._html5QrCode.start(
                this._currentCameraId,
                config,
                this._onScanSuccess.bind(this),
                this._onScanError.bind(this)
            );

            this._isScanning = true;
            this._scanStartTime = Date.now();

            // Update UI
            this._updateScannerUI(true);

            window.QRScannerUtils.log.info('Scanner started successfully');

        } catch (error) {
            this._isScanning = false;
            window.QRScannerUtils.log.error('Scanner start error:', error);
            throw error;
        }
    },

    /**
     * Stop the QR/barcode scanner
     */
    async _stopScanner() {
        try {
            if (this._html5QrCode) {
                await this._html5QrCode.stop();
            }

            this._isScanning = false;
            this._scanStartTime = null;

            // Update UI
            this._updateScannerUI(false);

            window.QRScannerUtils.log.info('Scanner stopped');

        } catch (error) {
            window.QRScannerUtils.log.error('Scanner stop error:', error);
            throw error;
        }
    },

    /**
     * Handle successful scan
     * @param {string} decodedText - Scanned text
     * @param {Object} decodedResult - Scan result object
     */
    _onScanSuccess(decodedText, decodedResult) {
        // Implement scan delay to avoid rapid scanning
        const now = Date.now();
        if (now - this._lastScanTime < window.QRScannerConfig.SCANNER.SCAN_DELAY) {
            return;
        }
        this._lastScanTime = now;

        window.QRScannerUtils.log.debug('Scan successful:', decodedText);

        // Process the scanned value
        this._processScanResult(decodedText, decodedResult);

        // Provide feedback
        this._provideScanFeedback(true);
    },

    /**
     * Handle scan errors (usually no QR code found)
     * @param {string} errorMessage - Error message
     */
    _onScanError(errorMessage) {
        // These errors are normal when no code is visible
        // Only log significant errors
        if (!errorMessage.includes('No QR code found') && 
            !errorMessage.includes('QR code parse error')) {
            window.QRScannerUtils.log.warn('Scan error:', errorMessage);
        }
    },

    /**
     * Process scan result
     * @param {string} scannedValue - Scanned text value
     * @param {Object} scanResult - Complete scan result
     */
    _processScanResult(scannedValue, scanResult) {
        // Pass to data manager for processing
        const matchResult = window.QRScannerDataManager.processScannedValue(scannedValue, scanResult);

        // Update current match display
        this._updateCurrentMatchDisplay(matchResult);

        // Update stats
        this._updateScanStats();
    },

    /**
     * Update current match display
     * @param {Object} matchResult - Match result from data manager
     */
    _updateCurrentMatchDisplay(matchResult) {
        const container = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.CURRENT_MATCH);
        if (!container) return;

        container.innerHTML = '';

        if (matchResult.success) {
            container.className = 'scan-result success';
            container.innerHTML = `
                <h4 class="text-success">✓ Match Found</h4>
                <div class="kv-list">
                    <div class="kv-item">
                        <div class="kv-key">Scanned Value</div>
                        <div class="kv-value">${window.QRScannerUtils.string.escapeHtml(matchResult.scannedValue)}</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Serial No.</div>
                        <div class="kv-value">${window.QRScannerUtils.string.escapeHtml(matchResult.serialNo || 'N/A')}</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Matched Row</div>
                        <div class="kv-value">${matchResult.rowIndex + 1}</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Scan Time</div>
                        <div class="kv-value">${window.QRScannerUtils.date.format(matchResult.timestamp)}</div>
                    </div>
                </div>
            `;
        } else {
            container.className = 'scan-result error';
            container.innerHTML = `
                <h4 class="text-error">✗ No Match Found</h4>
                <div class="kv-list">
                    <div class="kv-item">
                        <div class="kv-key">Scanned Value</div>
                        <div class="kv-value">${window.QRScannerUtils.string.escapeHtml(matchResult.scannedValue)}</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Scan Time</div>
                        <div class="kv-value">${window.QRScannerUtils.date.format(matchResult.timestamp)}</div>
                    </div>
                </div>
                <p class="text-sm text-gray mt-2">This value was not found in the selected target column.</p>
            `;
        }
    },

    /**
     * Update scanner UI state
     * @param {boolean} isScanning - Whether scanner is active
     */
    _updateScannerUI(isScanning) {
        const startBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.START_CAMERA);
        const stopBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.STOP_CAMERA);
        const switchBtn = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SWITCH_CAMERA);
        const cameraSelect = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.CAMERA_SELECT);

        if (startBtn) window.QRScannerUtils.dom.setEnabled(startBtn, !isScanning);
        if (stopBtn) window.QRScannerUtils.dom.setEnabled(stopBtn, isScanning);
        if (switchBtn) window.QRScannerUtils.dom.setEnabled(switchBtn, isScanning);
        if (cameraSelect) window.QRScannerUtils.dom.setEnabled(cameraSelect, !isScanning);

        // Update status
        const statusEl = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SCANNER_STATUS);
        if (statusEl) {
            statusEl.className = isScanning ? 'status-success' : 'status-ready';
            statusEl.textContent = isScanning ? 'Scanning' : 'Ready';
        }
    },

    /**
     * Update scan statistics
     */
    _updateScanStats() {
        const stats = window.QRScannerDataManager.getStats();

        // Update counters
        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.TOTAL_SCANNED, stats.totalScanned);
        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.SUCCESS_MATCHES, stats.successfulMatches);
        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.SCAN_COUNT, stats.totalScanned);
        window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.MATCH_COUNT, stats.successfulMatches);

        // Calculate scan rate
        if (this._scanStartTime && stats.totalScanned > 0) {
            const elapsedMinutes = (Date.now() - this._scanStartTime) / 60000;
            const rate = elapsedMinutes > 0 ? (stats.totalScanned / elapsedMinutes).toFixed(1) : 0;
            window.QRScannerUtils.dom.setText(window.QRScannerConfig.ELEMENTS.SCAN_RATE, `${rate}/min`);
        }
    },

    /**
     * Provide scan feedback (audio/vibration)
     * @param {boolean} success - Whether scan was successful
     */
    _provideScanFeedback(success) {
        if (success) {
            window.QRScannerUtils.audio.success();
            window.QRScannerUtils.vibration.success();
        } else {
            window.QRScannerUtils.audio.error();
            window.QRScannerUtils.vibration.error();
        }
    },

    /**
     * Handle camera errors
     * @param {string} errorMessage - Error message
     */
    _handleCameraError(errorMessage) {
        // Show error to user
        alert(`Camera Error: ${errorMessage}`);

        // Update UI to error state
        const statusEl = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SCANNER_STATUS);
        if (statusEl) {
            statusEl.className = 'status-error';
            statusEl.textContent = 'Camera Error';
        }

        // Disable scanner controls
        this._updateScannerUI(false);
        window.QRScannerUtils.dom.setEnabled(window.QRScannerConfig.ELEMENTS.START_CAMERA, false);
    },

    /**
     * Get scanner state
     * @returns {Object} - Scanner state
     */
    getState() {
        return {
            isScanning: this._isScanning,
            camerasAvailable: this._cameras.length,
            currentCameraId: this._currentCameraId,
            scanStartTime: this._scanStartTime
        };
    }
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.QRScannerManager.init();
    });
} else {
    window.QRScannerManager.init();
}
