/**
 * QR Code Component Scanner - Scanner Manager
 * Alica Technologies - Fixed Version
 * 
 * FIXES:
 * - Improved current match display with better debugging
 * - Fixed scan delay configuration
 * - Enhanced error handling
 * - Better match result formatting
 */

window.QRScannerManager = {
    // Internal state
    _html5QrCode: null,
    _isScanning: false,
    _cameras: [],
    _currentCameraId: null,
    _scanStartTime: null,
    _lastScanTime: 0,
    _scanDelay: window.QRScannerConfig.SCANNER.SCAN_DELAY, // Make scan delay configurable

    /**
     * Initialize scanner manager
     */
    init() {
        this._bindEvents();
        this._loadCameras();
        this._createScanDelayControl();
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
     * Create scan delay control - NEW FEATURE
     */
    _createScanDelayControl() {
        const controlsCard = document.querySelector('.card .scan-controls');
        if (!controlsCard) return;

        // Create scan delay control group
        const delayGroup = document.createElement('div');
        delayGroup.className = 'form__group';
        delayGroup.innerHTML = `
            <label class="label">Scan Delay (ms)</label>
            <select id="scanDelaySelect" class="select">
                <option value="100">100ms - Very Fast</option>
                <option value="250">250ms - Fast</option>
                <option value="500" selected>500ms - Normal</option>
                <option value="750">750ms - Slow</option>
                <option value="1000">1000ms - Very Slow</option>
                <option value="2000">2000ms - Debug Mode</option>
            </select>
            <div class="form__help">Adjust time between consecutive scans</div>
        `;

        // Insert after camera selection
        const cameraGroup = controlsCard.querySelector('.form__group');
        if (cameraGroup && cameraGroup.nextSibling) {
            controlsCard.insertBefore(delayGroup, cameraGroup.nextSibling);
        } else {
            controlsCard.appendChild(delayGroup);
        }

        // Bind event listener
        const delaySelect = document.getElementById('scanDelaySelect');
        if (delaySelect) {
            delaySelect.addEventListener('change', (e) => {
                this._scanDelay = parseInt(e.target.value);
                window.QRScannerUtils.log.debug('Scan delay changed to:', this._scanDelay, 'ms');
            });
        }
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
     * Handle successful scan - FIXED: Use configurable scan delay
     * @param {string} decodedText - Scanned text
     * @param {Object} decodedResult - Scan result object
     */
    _onScanSuccess(decodedText, decodedResult) {
        // Implement scan delay to avoid rapid scanning - FIXED: Use configurable delay
        const now = Date.now();
        if (now - this._lastScanTime < this._scanDelay) {
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

        // Update current match display - FIXED: Better display
        this._updateCurrentMatchDisplay(matchResult);

        // Update stats
        this._updateScanStats();
    },

    /**
     * Update current match display - FIXED: Better formatting and debugging info
     * @param {Object} matchResult - Match result from data manager
     */
    _updateCurrentMatchDisplay(matchResult) {
        const container = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.CURRENT_MATCH);
        if (!container) return;

        container.innerHTML = '';

        if (matchResult.success) {
            container.className = 'scan-result success';
            
            // FIXED: Better display of match information
            container.innerHTML = `
                <h4 class="text-success mb-12">✓ MATCH FOUND</h4>
                <div class="kv-list">
                    <div class="kv-item">
                        <div class="kv-key">Scanned Value</div>
                        <div class="kv-value font-mono">${window.QRScannerUtils.string.escapeHtml(matchResult.scannedValue)}</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Serial No.</div>
                        <div class="kv-value ${!matchResult.serialNo ? 'text-warning' : ''}">
                            ${window.QRScannerUtils.string.escapeHtml(matchResult.serialNo || 'Not Available')}
                            ${!matchResult.serialNo ? '<span class="text-xs block">Serial column not mapped or empty</span>' : ''}
                        </div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">MPN</div>
                        <div class="kv-value font-mono">${window.QRScannerUtils.string.escapeHtml(matchResult.mpn || 'N/A')}</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Manufacturer</div>
                        <div class="kv-value">${window.QRScannerUtils.string.escapeHtml(matchResult.manufacturer || 'N/A')}</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Excel Row</div>
                        <div class="kv-value font-mono">${matchResult.rowIndex + 1}</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Match Time</div>
                        <div class="kv-value font-mono text-xs">${window.QRScannerUtils.date.format(matchResult.timestamp)}</div>
                    </div>
                    ${window.QRScannerConfig.DEBUG && matchResult.debugInfo ? this._createDebugInfo(matchResult.debugInfo) : ''}
                </div>
            `;
        } else {
            container.className = 'scan-result error';
            container.innerHTML = `
                <h4 class="text-error mb-12">✗ NO MATCH FOUND</h4>
                <div class="kv-list">
                    <div class="kv-item">
                        <div class="kv-key">Scanned Value</div>
                        <div class="kv-value font-mono">${window.QRScannerUtils.string.escapeHtml(matchResult.scannedValue)}</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Reason</div>
                        <div class="kv-value text-sm">${matchResult.reason || 'Unknown reason'}</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Scan Time</div>
                        <div class="kv-value font-mono text-xs">${window.QRScannerUtils.date.format(matchResult.timestamp)}</div>
                    </div>
                    ${window.QRScannerConfig.DEBUG && matchResult.debugInfo ? this._createDebugInfo(matchResult.debugInfo) : ''}
                </div>
                <div class="alert alert--warning mt-16">
                    <div class="alert__msg text-sm">
                        This value was not found in the selected target column. 
                        Check your column mapping or verify the scanned data.
                    </div>
                </div>
            `;
        }
    },

    /**
     * Create debug info HTML - NEW: For troubleshooting
     * @param {Object} debugInfo - Debug information
     * @returns {string} - Debug info HTML
     */
    _createDebugInfo(debugInfo) {
        return `
            <details class="mt-16">
                <summary class="text-xs text-gray-500 cursor-pointer">Debug Info</summary>
                <div class="mt-8 p-12 bg-gray-100 border text-xs font-mono">
                    <pre>${JSON.stringify(debugInfo, null, 2)}</pre>
                </div>
            </details>
        `;
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
        const delaySelect = document.getElementById('scanDelaySelect');

        if (startBtn) window.QRScannerUtils.dom.setEnabled(startBtn, !isScanning);
        if (stopBtn) window.QRScannerUtils.dom.setEnabled(stopBtn, isScanning);
        if (switchBtn) window.QRScannerUtils.dom.setEnabled(switchBtn, isScanning);
        if (cameraSelect) window.QRScannerUtils.dom.setEnabled(cameraSelect, !isScanning);
        if (delaySelect) window.QRScannerUtils.dom.setEnabled(delaySelect, !isScanning);

        // Update status
        const statusEl = window.QRScannerUtils.dom.get(window.QRScannerConfig.ELEMENTS.SCANNER_STATUS);
        if (statusEl) {
            statusEl.className = isScanning ? 'badge badge--success' : 'badge badge--success';
            statusEl.textContent = isScanning ? 'SCANNING' : 'READY';
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
            statusEl.className = 'badge badge--error';
            statusEl.textContent = 'CAMERA ERROR';
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
            scanStartTime: this._scanStartTime,
            scanDelay: this._scanDelay
        };
    },

    /**
     * Set scan delay programmatically
     * @param {number} delay - Delay in milliseconds
     */
    setScanDelay(delay) {
        this._scanDelay = delay;
        const delaySelect = document.getElementById('scanDelaySelect');
        if (delaySelect) {
            delaySelect.value = delay;
        }
        window.QRScannerUtils.log.debug('Scan delay set to:', delay, 'ms');
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