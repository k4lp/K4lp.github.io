/**
 * QR Code Component Scanner - Scanner Manager
 * Alica Technologies - Enhanced Version
 * 
 * FIXES:
 * - Improved current match display with better debugging
 * - Fixed scan delay configuration
 * - Enhanced error handling
 * - Better match result formatting
 * - ADDED: Serial number overlay in camera viewpoint
 * - ADDED: Speech synthesis for successful matches
 */

window.QRScannerManager = {
    // Internal state
    _html5QrCode: null,
    _isScanning: false,
    _cameras: [],
    _currentCameraId: null,
    _scanStartTime: null,
    _lastScanTime: 0,
    _scanDelay: window.QRScannerConfig?.SCANNER?.SCAN_DELAY || 500,
    _serialOverlayTimeout: null,

    /**
     * Speech synthesis function
     */
    _speak: function(text) {
        if (!text) return;
        try {
            const msg = new SpeechSynthesisUtterance(text);
            msg.rate = 1.2;
            msg.volume = 0.8;
            speechSynthesis.speak(msg);
        } catch (error) {
            console.warn('Speech synthesis failed:', error);
        }
    },

    /**
     * Initialize scanner manager
     */
    init() {
        this._bindEvents();
        this._loadCameras();
        this._createScanDelayControl();
        console.log('Scanner manager initialized');
    },

    /**
     * Bind event listeners
     */
    _bindEvents() {
        const startBtn = document.getElementById('startCamera');
        const stopBtn = document.getElementById('stopCamera');
        const switchBtn = document.getElementById('switchCamera');
        const cameraSelect = document.getElementById('cameraSelect');

        if (startBtn) startBtn.addEventListener('click', this._handleStartCamera.bind(this));
        if (stopBtn) stopBtn.addEventListener('click', this._handleStopCamera.bind(this));
        if (switchBtn) switchBtn.addEventListener('click', this._handleSwitchCamera.bind(this));
        if (cameraSelect) cameraSelect.addEventListener('change', this._handleCameraSelect.bind(this));
    },

    /**
     * Create scan delay control
     */
    _createScanDelayControl() {
        const controlsCard = document.querySelector('.card .scan-controls');
        if (!controlsCard) return;

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

        const cameraGroup = controlsCard.querySelector('.form__group');
        if (cameraGroup && cameraGroup.nextSibling) {
            controlsCard.insertBefore(delayGroup, cameraGroup.nextSibling);
        } else {
            controlsCard.appendChild(delayGroup);
        }

        const delaySelect = document.getElementById('scanDelaySelect');
        if (delaySelect) {
            delaySelect.addEventListener('change', (e) => {
                this._scanDelay = parseInt(e.target.value);
                console.log('Scan delay changed to:', this._scanDelay, 'ms');
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
            console.log(`Found ${this._cameras.length} cameras`);
        } catch (error) {
            console.error('Error loading cameras:', error);
            this._handleCameraError('Camera not found');
        }
    },

    /**
     * Populate camera selection dropdown
     */
    _populateCameraSelect() {
        const select = document.getElementById('cameraSelect');
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

        if (this._cameras.length > 0) {
            select.value = this._cameras[0].id;
            this._currentCameraId = this._cameras[0].id;
        }

        const startBtn = document.getElementById('startCamera');
        if (startBtn) startBtn.disabled = false;
        if (select) select.disabled = false;
    },

    /**
     * Handle start camera button
     */
    async _handleStartCamera() {
        if (this._isScanning) {
            console.warn('Scanner already running');
            return;
        }

        if (!this._currentCameraId) {
            alert('Camera not found');
            return;
        }

        try {
            await this._startScanner();
        } catch (error) {
            console.error('Failed to start scanner:', error);
            this._handleCameraError(error.message);
        }
    },

    /**
     * Handle stop camera button
     */
    async _handleStopCamera() {
        if (!this._isScanning) {
            console.warn('Scanner not running');
            return;
        }

        try {
            await this._stopScanner();
        } catch (error) {
            console.error('Failed to stop scanner:', error);
        }
    },

    /**
     * Handle switch camera button
     */
    async _handleSwitchCamera() {
        if (this._cameras.length <= 1) {
            console.warn('No other cameras available');
            return;
        }

        const currentIndex = this._cameras.findIndex(c => c.id === this._currentCameraId);
        const nextIndex = (currentIndex + 1) % this._cameras.length;
        const nextCamera = this._cameras[nextIndex];

        if (this._isScanning) {
            await this._stopScanner();
        }

        this._currentCameraId = nextCamera.id;
        const select = document.getElementById('cameraSelect');
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

        if (this._isScanning) {
            await this._startScanner();
        }
    },

    /**
     * Start the QR/barcode scanner
     */
    async _startScanner() {
        try {
            if (!this._html5QrCode) {
                this._html5QrCode = new Html5Qrcode('qr-reader');
            }

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                disableFlip: false,
                videoConstraints: {
                    facingMode: "environment",
                    width: { ideal: 3840, max: 3840 },  // request up to 4K
                    height: { ideal: 2160, max: 2160 }  // request up to 4K
                }
            };


            await this._html5QrCode.start(
                this._currentCameraId,
                config,
                this._onScanSuccess.bind(this),
                this._onScanError.bind(this)
            );

            this._isScanning = true;
            this._scanStartTime = Date.now();

            this._updateScannerUI(true);

            console.log('Scanner started successfully');

        } catch (error) {
            this._isScanning = false;
            console.error('Scanner start error:', error);
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

            this._hideSerialOverlay();

            this._updateScannerUI(false);

            console.log('Scanner stopped');

        } catch (error) {
            console.error('Scanner stop error:', error);
            throw error;
        }
    },

    /**
     * Handle successful scan
     */
    _onScanSuccess(decodedText, decodedResult) {
        const now = Date.now();
        if (now - this._lastScanTime < this._scanDelay) {
            return;
        }
        this._lastScanTime = now;

        console.log('Scan successful:', decodedText);

        this._processScanResult(decodedText, decodedResult);

        this._provideScanFeedback(true);
    },

    /**
     * Handle scan errors
     */
    _onScanError(errorMessage) {
        if (!errorMessage.includes('No QR code found') && 
            !errorMessage.includes('QR code parse error')) {
            console.warn('Scan error:', errorMessage);
        }
    },

    /**
     * Process scan result
     */
    _processScanResult(scannedValue, scanResult) {
        const matchResult = window.QRScannerDataManager ? 
            window.QRScannerDataManager.processScannedValue(scannedValue, scanResult) :
            { success: false, scannedValue: scannedValue, reason: 'Data manager not available' };

        this._updateCurrentMatchDisplay(matchResult);
        this._updateSerialOverlay(matchResult);
        
        // CRITICAL FIX: Add speech synthesis for successful matches
        if (matchResult.success && matchResult.serialNo) {
            this._speak(`Serial number ${matchResult.serialNo}`);
        } else if (matchResult.success) {
            this._speak('Component found');
        }

        this._updateScanStats();
    },

    /**
     * Update serial number overlay in camera viewpoint
     */
    _updateSerialOverlay(matchResult) {
        const overlay = document.getElementById('serialOverlay');
        const serialValue = document.getElementById('serialValue');
        
        if (!overlay || !serialValue) return;

        if (this._serialOverlayTimeout) {
            clearTimeout(this._serialOverlayTimeout);
            this._serialOverlayTimeout = null;
        }

        if (matchResult.success && matchResult.serialNo) {
            serialValue.textContent = matchResult.serialNo;
            overlay.style.background = 'rgba(34, 197, 94, 0.9)';
            overlay.classList.add('visible');

            this._serialOverlayTimeout = setTimeout(() => {
                this._hideSerialOverlay();
            }, 3000);
        } else if (matchResult.success) {
            serialValue.textContent = 'NO SERIAL NUMBER';
            overlay.style.background = 'rgba(245, 158, 11, 0.9)';
            overlay.classList.add('visible');

            this._serialOverlayTimeout = setTimeout(() => {
                this._hideSerialOverlay();
            }, 2000);
        } else {
            serialValue.textContent = 'NO MATCH FOUND';
            overlay.style.background = 'rgba(239, 68, 68, 0.9)';
            overlay.classList.add('visible');

            this._serialOverlayTimeout = setTimeout(() => {
                this._hideSerialOverlay();
            }, 1500);
        }
    },

    /**
     * Hide serial number overlay
     */
    _hideSerialOverlay() {
        const overlay = document.getElementById('serialOverlay');
        if (overlay) {
            overlay.classList.remove('visible');
        }

        if (this._serialOverlayTimeout) {
            clearTimeout(this._serialOverlayTimeout);
            this._serialOverlayTimeout = null;
        }
    },

    /**
     * Update current match display
     */
    _updateCurrentMatchDisplay(matchResult) {
        const container = document.getElementById('currentMatch');
        if (!container) return;

        container.innerHTML = '';

        if (matchResult.success) {
            container.className = 'scan-result success';
            
            container.innerHTML = `
                <h4 class="text-success mb-12">✓ MATCH FOUND</h4>
                <div class="kv-list">
                    <div class="kv-item">
                        <div class="kv-key">Scanned Value</div>
                        <div class="kv-value font-mono">${this._escapeHtml(matchResult.scannedValue)}</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Serial No.</div>
                        <div class="kv-value ${!matchResult.serialNo ? 'text-warning' : ''}">
                            ${this._escapeHtml(matchResult.serialNo || 'Not Available')}
                            ${!matchResult.serialNo ? '<span class="text-xs block">Serial column not mapped or empty</span>' : ''}
                        </div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">MPN</div>
                        <div class="kv-value font-mono">${this._escapeHtml(matchResult.mpn || 'N/A')}</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Manufacturer</div>
                        <div class="kv-value">${this._escapeHtml(matchResult.manufacturer || 'N/A')}</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Excel Row</div>
                        <div class="kv-value font-mono">${(matchResult.rowIndex || 0) + 1}</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Match Time</div>
                        <div class="kv-value font-mono text-xs">${new Date().toLocaleTimeString()}</div>
                    </div>
                </div>
            `;
        } else {
            container.className = 'scan-result error';
            container.innerHTML = `
                <h4 class="text-error mb-12">✗ NO MATCH FOUND</h4>
                <div class="kv-list">
                    <div class="kv-item">
                        <div class="kv-key">Scanned Value</div>
                        <div class="kv-value font-mono">${this._escapeHtml(matchResult.scannedValue)}</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Reason</div>
                        <div class="kv-value text-sm">${matchResult.reason || 'Unknown reason'}</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Scan Time</div>
                        <div class="kv-value font-mono text-xs">${new Date().toLocaleTimeString()}</div>
                    </div>
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
     * Escape HTML characters
     */
    _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    },

    /**
     * Update scanner UI state
     */
    _updateScannerUI(isScanning) {
        const startBtn = document.getElementById('startCamera');
        const stopBtn = document.getElementById('stopCamera');
        const switchBtn = document.getElementById('switchCamera');
        const cameraSelect = document.getElementById('cameraSelect');
        const delaySelect = document.getElementById('scanDelaySelect');

        if (startBtn) startBtn.disabled = isScanning;
        if (stopBtn) stopBtn.disabled = !isScanning;
        if (switchBtn) switchBtn.disabled = !isScanning;
        if (cameraSelect) cameraSelect.disabled = isScanning;
        if (delaySelect) delaySelect.disabled = isScanning;

        const statusEl = document.getElementById('scannerStatus');
        if (statusEl) {
            statusEl.className = isScanning ? 'badge badge--success' : 'badge badge--success';
            statusEl.textContent = isScanning ? 'SCANNING' : 'READY';
        }
    },

    /**
     * Update scan statistics
     */
    _updateScanStats() {
        const stats = window.QRScannerDataManager?.getStats() || {
            totalScanned: 0,
            successfulMatches: 0
        };

        const totalEl = document.getElementById('totalScanned');
        const successEl = document.getElementById('successMatches');
        const scanCountEl = document.getElementById('scanCount');
        const matchCountEl = document.getElementById('matchCount');

        if (totalEl) totalEl.textContent = stats.totalScanned;
        if (successEl) successEl.textContent = stats.successfulMatches;
        if (scanCountEl) scanCountEl.textContent = stats.totalScanned;
        if (matchCountEl) matchCountEl.textContent = stats.successfulMatches;

        if (this._scanStartTime && stats.totalScanned > 0) {
            const elapsedMinutes = (Date.now() - this._scanStartTime) / 60000;
            const rate = elapsedMinutes > 0 ? (stats.totalScanned / elapsedMinutes).toFixed(1) : 0;
            const rateEl = document.getElementById('scanRate');
            if (rateEl) rateEl.textContent = `${rate}/min`;
        }
    },

    /**
     * Provide scan feedback
     */
    _provideScanFeedback(success) {
        // Basic feedback - could be enhanced with audio/vibration
        console.log('Scan feedback:', success ? 'success' : 'error');
    },

    /**
     * Handle camera errors
     */
    _handleCameraError(errorMessage) {
        alert(`Camera Error: ${errorMessage}`);

        const statusEl = document.getElementById('scannerStatus');
        if (statusEl) {
            statusEl.className = 'badge badge--error';
            statusEl.textContent = 'CAMERA ERROR';
        }

        this._updateScannerUI(false);
        const startBtn = document.getElementById('startCamera');
        if (startBtn) startBtn.disabled = true;
    },

    /**
     * Get scanner state
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
     */
    setScanDelay(delay) {
        this._scanDelay = delay;
        const delaySelect = document.getElementById('scanDelaySelect');
        if (delaySelect) {
            delaySelect.value = delay;
        }
        console.log('Scan delay set to:', delay, 'ms');
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
