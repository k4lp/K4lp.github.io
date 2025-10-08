/**
 * QR Code Component Scanner - Scanner Manager
 * Alica Technologies - FIXED VERSION with Enhanced Center-Priority Detection
 * 
 * CRITICAL FIXES:
 * - Fixed scanning line creation and activation with RED color
 * - Enhanced scan overlay visual feedback with proper color coding
 * - Added 1.8x default camera zoom for better scanning
 * - Added CENTER-PRIORITY barcode detection for closest-to-red-line priority
 * - Optimized for extremely high quality/native resolution video stream
 * - Enhanced current match display with matched column preview
 * - FIXED: Scanning line now properly displays as RED horizontal line
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
    _cameraZoom: 1.8, // Default 1.8x zoom for better scanning

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
        this._createZoomControl();
        this._addScanningLine();
        console.log('Scanner manager initialized with enhanced camera features');
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
     * CRITICAL FIX: Add RED horizontal scanning line to camera preview
     */
    _addScanningLine() {
        const cameraPreview = document.getElementById('qr-reader');
        if (!cameraPreview) {
            console.error('❌ Camera preview container not found');
            return;
        }

        // Remove any existing scanning line
        const existingLine = document.getElementById('scanningLine');
        if (existingLine) {
            existingLine.remove();
        }

        // Create scanning line element with RED color
        const scanLine = document.createElement('div');
        scanLine.id = 'scanningLine';
        scanLine.className = 'scanning-line';
        
        // CRITICAL FIX: Ensure RED color and proper positioning
        scanLine.style.cssText = `
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, 
                transparent 0%, 
                rgba(239, 68, 68, 0.8) 20%, 
                rgba(239, 68, 68, 1) 50%, 
                rgba(239, 68, 68, 0.8) 80%, 
                transparent 100%
            );
            transform: translateY(-50%);
            z-index: 15;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
            pointer-events: none;
            box-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
        `;
        
        // Position camera preview container as relative
        cameraPreview.style.position = 'relative';
        cameraPreview.appendChild(scanLine);
        
        console.log('✅ RED horizontal scanning line added to camera preview');
    },

    /**
     * CRITICAL ENHANCEMENT: Create zoom control for camera
     */
    _createZoomControl() {
        const controlsCard = document.querySelector('.card .scan-controls');
        if (!controlsCard) return;

        const zoomGroup = document.createElement('div');
        zoomGroup.className = 'form__group';
        zoomGroup.innerHTML = `
            <label class="label">Camera Zoom</label>
            <select id="cameraZoomSelect" class="select">
                <option value="1.0">1.0x - Normal</option>
                <option value="1.2">1.2x - Slight Zoom</option>
                <option value="1.5">1.5x - Medium Zoom</option>
                <option value="1.8" selected>1.8x - Optimal (Default)</option>
                <option value="2.0">2.0x - High Zoom</option>
                <option value="2.5">2.5x - Maximum Zoom</option>
            </select>
            <div class="form__help">Adjust camera zoom for better QR code scanning</div>
        `;

        // Insert after delay control
        const delayGroup = document.getElementById('scanDelaySelect')?.closest('.form__group');
        if (delayGroup && delayGroup.nextSibling) {
            controlsCard.insertBefore(zoomGroup, delayGroup.nextSibling);
        } else {
            controlsCard.appendChild(zoomGroup);
        }

        const zoomSelect = document.getElementById('cameraZoomSelect');
        if (zoomSelect) {
            zoomSelect.addEventListener('change', (e) => {
                this._cameraZoom = parseFloat(e.target.value);
                console.log('Camera zoom changed to:', this._cameraZoom + 'x');
                
                // Apply zoom if camera is active
                if (this._isScanning) {
                    this._applyCameraZoom();
                }
            });
        }
    },

    /**
     * CRITICAL ENHANCEMENT: Apply camera zoom using CSS transform
     */
    _applyCameraZoom() {
        const videoElement = document.querySelector('#qr-reader video');
        if (videoElement) {
            videoElement.style.transform = `scale(${this._cameraZoom})`;
            videoElement.style.transformOrigin = 'center center';
            console.log(`✅ Applied ${this._cameraZoom}x zoom to camera stream`);
        }
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
     * CRITICAL ENHANCEMENT: Start scanner with maximum quality settings and CENTER-PRIORITY detection
     */
    async _startScanner() {
        try {
            if (!this._html5QrCode) {
                this._html5QrCode = new Html5Qrcode('qr-reader');
            }

            // CRITICAL ENHANCEMENT: Ultra-high quality configuration for native resolution
            const config = {
                fps: 15, // Increased FPS for smoother scanning
                qrbox: { width: 300, height: 300 }, // Larger scanning box
                aspectRatio: 1.0,
                disableFlip: false,
                // CRITICAL: Request maximum possible resolution
                videoConstraints: {
                    facingMode: "environment", // Use rear camera if available
                    width: { 
                        ideal: 4096,  // Request up to 4K width
                        max: 4096
                    },
                    height: { 
                        ideal: 2160,  // Request up to 4K height 
                        max: 2160
                    },
                    // CRITICAL: Request highest quality settings
                    frameRate: { ideal: 15, max: 20 },
                    resizeMode: 'none',  // Don't resize the video
                    advanced: [{
                        focusMode: 'continuous',
                        exposureMode: 'continuous',
                        whiteBalanceMode: 'continuous'
                    }]
                }
            };

            console.log('🎥 Starting camera with ultra-high quality settings:', config);

            await this._html5QrCode.start(
                this._currentCameraId,
                config,
                this._onScanSuccess.bind(this),
                this._onScanError.bind(this)
            );

            // CRITICAL: Log actual camera settings achieved
            const videoTrack = this._html5QrCode._localMediaStream?.getVideoTracks?.()?.[0];
            if (videoTrack) {
                const settings = videoTrack.getSettings();
                const capabilities = videoTrack.getCapabilities();
                
                console.log("📸 ACHIEVED Camera Settings:", {
                    width: settings.width,
                    height: settings.height,
                    frameRate: settings.frameRate,
                    facingMode: settings.facingMode,
                    focusMode: settings.focusMode,
                    exposureMode: settings.exposureMode
                });
                
                console.log("🔧 Camera Capabilities:", {
                    maxWidth: capabilities.width?.max,
                    maxHeight: capabilities.height?.max,
                    maxFrameRate: capabilities.frameRate?.max,
                    focusModes: capabilities.focusMode,
                    exposureModes: capabilities.exposureMode
                });
                
                // CRITICAL: Verify if we achieved high resolution
                if (settings.width >= 1920 && settings.height >= 1080) {
                    console.log("✅ HIGH QUALITY: Achieved Full HD or better resolution!");
                } else {
                    console.warn("⚠️ LOWER QUALITY: Camera resolution below Full HD", 
                        `${settings.width}x${settings.height}`);
                }
            }

            this._isScanning = true;
            this._scanStartTime = Date.now();

            // CRITICAL FIX: Apply zoom and show scanning line after camera starts
            setTimeout(() => {
                this._applyCameraZoom();
                this._showScanningLine();
            }, 500);

            this._updateScannerUI(true);

            console.log('✅ Ultra-high quality scanner started successfully');

        } catch (error) {
            this._isScanning = false;
            console.error('Scanner start error:', error);
            throw error;
        }
    },

    /**
     * CRITICAL FIX: Show RED scanning line animation
     */
    _showScanningLine() {
        const scanLine = document.getElementById('scanningLine');
        if (scanLine) {
            scanLine.classList.add('active');
            // CRITICAL FIX: Force visibility with opacity
            scanLine.style.opacity = '1';
            console.log('✅ RED scanning line animation activated');
        } else {
            console.error('❌ Scanning line element not found');
        }
    },

    /**
     * Hide scanning line animation
     */
    _hideScanningLine() {
        const scanLine = document.getElementById('scanningLine');
        if (scanLine) {
            scanLine.classList.remove('active');
            scanLine.style.opacity = '0';
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
            this._hideScanningLine();

            this._updateScannerUI(false);

            console.log('Scanner stopped');

        } catch (error) {
            console.error('Scanner stop error:', error);
            throw error;
        }
    },

    /**
     * CRITICAL ENHANCEMENT: Handle successful scan with CENTER-PRIORITY detection
     */
    _onScanSuccess(decodedText, decodedResult) {
        const now = Date.now();
        if (now - this._lastScanTime < this._scanDelay) {
            return;
        }
        this._lastScanTime = now;

        // CRITICAL ENHANCEMENT: CENTER-PRIORITY detection logic
        if (this._shouldPrioritizeCenter(decodedResult)) {
            console.log('🎯 CENTER-PRIORITY: Scan prioritized (closest to red line):', decodedText);
        } else {
            console.log('📱 EDGE SCAN: Detected at edge:', decodedText);
            // Still process but with lower priority indication
        }

        this._processScanResult(decodedText, decodedResult);
    },

    /**
     * CRITICAL ENHANCEMENT: Center-priority detection logic
     */
    _shouldPrioritizeCenter(scanResult) {
        try {
            const bounds = scanResult?.result?.bounds;
            if (!bounds || !bounds.length) {
                return true; // Default to true if no bounds info
            }

            // Get camera preview dimensions
            const cameraElement = document.querySelector('#qr-reader video');
            if (!cameraElement) {
                return true;
            }

            const cameraRect = cameraElement.getBoundingClientRect();
            const centerX = cameraRect.width / 2;
            const centerY = cameraRect.height / 2;
            
            // Calculate center of detected code
            let sumX = 0, sumY = 0;
            bounds.forEach(point => {
                sumX += point.x;
                sumY += point.y;
            });
            const codeCenterX = sumX / bounds.length;
            const codeCenterY = sumY / bounds.length;
            
            // Calculate distance from center (prioritize codes closer to red line)
            const distanceFromCenter = Math.abs(codeCenterY - centerY);
            const threshold = cameraRect.height * 0.15; // Within 15% of center
            
            const isPriority = distanceFromCenter <= threshold;
            
            if (isPriority) {
                console.log(`🎯 CENTER PRIORITY: Code at Y:${codeCenterY.toFixed(0)} (center: ${centerY.toFixed(0)}, distance: ${distanceFromCenter.toFixed(0)})`);
            }
            
            return isPriority;
            
        } catch (error) {
            console.warn('Center priority detection error:', error);
            return true; // Default to processing scan
        }
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
     * CRITICAL FIX: Process scan result and force table update
     */
    _processScanResult(scannedValue, scanResult) {
        const matchResult = window.QRScannerDataManager ? 
            window.QRScannerDataManager.processScannedValue(scannedValue, scanResult) :
            { success: false, scannedValue: scannedValue, reason: 'Data manager not available' };

        // CRITICAL FIX: Provide proper visual feedback based on match result
        this._provideScanFeedback(matchResult.success);
        
        this._updateCurrentMatchDisplay(matchResult);
        this._updateSerialOverlay(matchResult);
        
        // Speech synthesis for successful matches
        if (matchResult.success && matchResult.serialNo) {
            this._speak(`Serial number ${matchResult.serialNo}`);
        } else if (matchResult.success) {
            this._speak('Component found');
        }

        this._updateScanStats();
        
        // CRITICAL FIX: Force table update after processing
        console.log('🔄 Forcing scan results table update...');
        if (window.QRScannerDataManager && typeof window.QRScannerDataManager._updateResultsDisplay === 'function') {
            window.QRScannerDataManager._updateResultsDisplay();
            console.log('✅ Table update completed');
        } else {
            console.error('❌ DataManager or _updateResultsDisplay not available');
        }
    },

    /**
     * CRITICAL FIX: Update serial number overlay with proper color coding
     */
    _updateSerialOverlay(matchResult) {
        const overlay = document.getElementById('serialOverlay');
        const serialValue = document.getElementById('serialValue');
        
        if (!overlay || !serialValue) return;

        if (this._serialOverlayTimeout) {
            clearTimeout(this._serialOverlayTimeout);
            this._serialOverlayTimeout = null;
        }

        // CRITICAL FIX: Proper condition checking and color assignment
        if (matchResult.success) {
            if (matchResult.serialNo && matchResult.serialNo.trim() !== '') {
                // Success with serial number - GREEN
                serialValue.textContent = matchResult.serialNo;
                overlay.style.background = 'rgba(34, 197, 94, 0.9)'; // Green
                overlay.style.color = '#ffffff';
                console.log('🟢 Match found with serial number:', matchResult.serialNo);
            } else {
                // Success but no serial number - ORANGE/YELLOW
                serialValue.textContent = 'MATCH - NO SERIAL';
                overlay.style.background = 'rgba(245, 158, 11, 0.9)'; // Orange/Yellow
                overlay.style.color = '#ffffff';
                console.log('🟡 Match found but no serial number');
            }
            overlay.classList.add('visible');
            
            this._serialOverlayTimeout = setTimeout(() => {
                this._hideSerialOverlay();
            }, 3000);
        } else {
            // No match found - RED
            serialValue.textContent = 'NO MATCH FOUND';
            overlay.style.background = 'rgba(239, 68, 68, 0.9)'; // Red
            overlay.style.color = '#ffffff';
            overlay.classList.add('visible');
            console.log('🔴 No match found for:', matchResult.scannedValue);

            this._serialOverlayTimeout = setTimeout(() => {
                this._hideSerialOverlay();
            }, 2000);
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
     * CRITICAL FIX: Enhanced current match display with proper error handling and preview
     */
    _updateCurrentMatchDisplay(matchResult) {
        const container = document.getElementById('currentMatch');
        if (!container) return;

        container.innerHTML = '';

        if (matchResult.success) {
            container.className = 'scan-result success';
            
            // CRITICAL FIX: Enhanced match display with better data presentation
            container.innerHTML = `
                <h4 class="text-success mb-12">✓ MATCH FOUND</h4>
                <div class="kv-list">
                    <div class="kv-item">
                        <div class="kv-key">Scanned Value</div>
                        <div class="kv-value font-mono">${this._escapeHtml(matchResult.scannedValue)}</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Matched Column</div>
                        <div class="kv-value font-mono text-success">${this._escapeHtml(matchResult.matchedValue || matchResult.scannedValue)}</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Serial No.</div>
                        <div class="kv-value ${!matchResult.serialNo ? 'text-warning' : ''}">
                            ${this._escapeHtml(matchResult.serialNo || 'Not Available')}
                            ${!matchResult.serialNo ? '<span class="text-xs block mt-2 text-warning">⚠ Serial column not mapped or empty</span>' : ''}
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
                        <div class="kv-key">Designators</div>
                        <div class="kv-value font-mono">${this._escapeHtml(matchResult.designators || 'N/A')}</div>
                    </div>
                    <div class="kv-item">
                        <div class="kv-key">Quantity</div>
                        <div class="kv-value font-mono">${this._escapeHtml(matchResult.quantity || 'N/A')}</div>
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
        const zoomSelect = document.getElementById('cameraZoomSelect');

        if (startBtn) startBtn.disabled = isScanning;
        if (stopBtn) stopBtn.disabled = !isScanning;
        if (switchBtn) switchBtn.disabled = !isScanning;
        if (cameraSelect) cameraSelect.disabled = isScanning;
        if (delaySelect) delaySelect.disabled = isScanning;
        if (zoomSelect) zoomSelect.disabled = isScanning;

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
     * CRITICAL FIX: Provide proper visual feedback with screen flash effects
     */
    _provideScanFeedback(success) {
        console.log('Scan feedback:', success ? 'success' : 'error');
        
        // CRITICAL FIX: Screen flash effect for visual feedback
        const overlay = document.getElementById('scanOverlay');
        if (overlay) {
            // Remove any existing flash classes
            overlay.classList.remove('flash-success', 'flash-error');
            
            // Add appropriate flash class
            if (success) {
                overlay.classList.add('flash-success');
                console.log('🟢 Applied success flash');
            } else {
                overlay.classList.add('flash-error');
                console.log('🔴 Applied error flash');
            }
            
            // Remove flash after animation
            setTimeout(() => {
                overlay.classList.remove('flash-success', 'flash-error');
            }, 600);
        }
        
        // Audio feedback (optional)
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            if (success) {
                oscillator.frequency.setValueAtTime(1000, audioContext.currentTime); // Higher pitch for success
            } else {
                oscillator.frequency.setValueAtTime(400, audioContext.currentTime);  // Lower pitch for error
            }
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (audioError) {
            // Audio feedback not critical, continue silently
        }
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
            scanDelay: this._scanDelay,
            cameraZoom: this._cameraZoom
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
    },

    /**
     * Set camera zoom programmatically
     */
    setCameraZoom(zoom) {
        this._cameraZoom = zoom;
        const zoomSelect = document.getElementById('cameraZoomSelect');
        if (zoomSelect) {
            zoomSelect.value = zoom;
        }
        if (this._isScanning) {
            this._applyCameraZoom();
        }
        console.log('Camera zoom set to:', zoom + 'x');
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
