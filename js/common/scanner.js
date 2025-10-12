/**
 * Enhanced QR/Barcode Scanner with Advanced Controls
 * Supports QR codes, barcodes, camera selection, overlay UI, and fine-grained controls
 * Part of K4LP Engineering Tools - Swiss Minimalist Design
 * @version 2.1.0 - Enhanced with advanced camera features
 */

class ScannerManager {
    constructor() {
        this.version = '2.1.0';
        
        // Scanner state
        this.isScanning = false;
        this.currentCamera = null;
        this.availableCameras = [];
        this.scannerInstance = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.overlayElement = null;
        
        // Configuration
        this.config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0, // Square by default
            supportedScanTypes: [
                Html5QrcodeScanType.SCAN_TYPE_CAMERA,
                Html5QrcodeScanType.SCAN_TYPE_FILE
            ],
            formatsToSupport: [
                Html5QrcodeFormat.QR_CODE,
                Html5QrcodeFormat.CODE_128,
                Html5QrcodeFormat.CODE_39,
                Html5QrcodeFormat.EAN_13,
                Html5QrcodeFormat.EAN_8,
                Html5QrcodeFormat.UPC_A,
                Html5QrcodeFormat.UPC_E,
                Html5QrcodeFormat.DATA_MATRIX,
                Html5QrcodeFormat.PDF_417,
                Html5QrcodeFormat.AZTEC
            ],
            // Camera constraints
            cameraConstraints: {
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 },
                facingMode: "environment" // Default to rear camera
            },
            // Advanced controls
            showZoom: true,
            showTorch: true,
            showCameraSwitch: true,
            showFormatSelector: true,
            enableBeep: true,
            enableVibration: true,
            autoStop: false, // Continue scanning after successful scan
            scanDelay: 100 // Minimum delay between scans (ms)
        };
        
        // Scanner results tracking
        this.scanHistory = [];
        this.lastScanTime = 0;
        this.consecutiveFailures = 0;
        this.maxConsecutiveFailures = 10;
        
        // Camera capabilities
        this.cameraCapabilities = {
            zoom: { min: 1, max: 4, current: 1, supported: false },
            torch: { supported: false, enabled: false },
            focusMode: { supported: false, current: 'continuous' },
            exposureCompensation: { min: -2, max: 2, current: 0, supported: false },
            whiteBalance: { supported: false, current: 'auto' }
        };
        
        // Event callbacks
        this.callbacks = {
            onScanSuccess: null,
            onScanFailure: null,
            onCameraStart: null,
            onCameraStop: null,
            onCameraError: null,
            onPermissionDenied: null,
            onNoCamera: null
        };
        
        // UI elements for overlay
        this.overlayElements = {
            statusText: null,
            instructionText: null,
            scanCount: null,
            cameraInfo: null,
            controls: {
                zoomSlider: null,
                torchButton: null,
                cameraSelect: null,
                formatSelect: null,
                settingsButton: null
            }
        };
        
        // Performance metrics
        this.metrics = {
            totalScans: 0,
            successfulScans: 0,
            avgScanTime: 0,
            sessionStartTime: 0,
            lastScanDuration: 0
        };
        
        this.initialize();
    }
    
    /**
     * Initialize the scanner manager
     */
    async initialize() {
        try {
            // Check for required libraries
            if (typeof Html5Qrcode === 'undefined') {
                throw new Error('Html5Qrcode library not loaded. Please include html5-qrcode.min.js');
            }
            
            // Get available cameras
            await this.detectCameras();
            
            console.log('✓ K4LP Scanner Manager v2.1.0 initialized');
            console.log(`Found ${this.availableCameras.length} camera(s)`);
            
        } catch (error) {
            console.error('Scanner initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Detect available cameras
     */
    async detectCameras() {
        try {
            const cameras = await Html5Qrcode.getCameras();
            this.availableCameras = cameras;
            
            if (cameras.length === 0) {
                throw new Error('No cameras detected');
            }
            
            // Select best camera (prefer rear camera)
            this.currentCamera = this.selectBestCamera(cameras);
            
            return cameras;
        } catch (error) {
            console.error('Camera detection failed:', error);
            this.availableCameras = [];
            throw error;
        }
    }
    
    /**
     * Select the best camera (prefer rear/environment facing)
     */
    selectBestCamera(cameras) {
        // Prefer environment (rear) camera
        const rearCamera = cameras.find(camera => 
            camera.label && (
                camera.label.toLowerCase().includes('back') ||
                camera.label.toLowerCase().includes('rear') ||
                camera.label.toLowerCase().includes('environment')
            )
        );
        
        return rearCamera || cameras[0];
    }
    
    /**
     * Start scanning with advanced options
     */
    async startScanning(containerId, options = {}) {
        if (this.isScanning) {
            await this.stopScanning();
        }
        
        // Merge options with config
        const config = { ...this.config, ...options };
        
        try {
            // Create scanner instance
            this.scannerInstance = new Html5Qrcode(containerId);
            
            // Prepare camera config
            const cameraConfig = {
                fps: config.fps,
                qrbox: config.qrbox,
                aspectRatio: config.aspectRatio,
                supportedScanTypes: config.supportedScanTypes,
                formatsToSupport: config.formatsToSupport,
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                },
                videoConstraints: {
                    ...config.cameraConstraints,
                    deviceId: this.currentCamera.id
                }
            };
            
            // Start camera
            await this.scannerInstance.start(
                this.currentCamera.id,
                cameraConfig,
                this.onScanSuccess.bind(this),
                this.onScanError.bind(this)
            );
            
            this.isScanning = true;
            this.metrics.sessionStartTime = Date.now();
            
            // Setup overlay UI
            await this.setupOverlayUI(containerId, config);
            
            // Initialize camera capabilities
            await this.initializeCameraCapabilities();
            
            console.log('✓ Scanner started successfully');
            
            if (this.callbacks.onCameraStart) {
                this.callbacks.onCameraStart({
                    camera: this.currentCamera,
                    config: cameraConfig
                });
            }
            
            return true;
            
        } catch (error) {
            console.error('Failed to start scanner:', error);
            this.isScanning = false;
            
            if (this.callbacks.onCameraError) {
                this.callbacks.onCameraError(error);
            }
            
            throw error;
        }
    }
    
    /**
     * Stop scanning
     */
    async stopScanning() {
        if (!this.isScanning || !this.scannerInstance) {
            return;
        }
        
        try {
            await this.scannerInstance.stop();
            this.scannerInstance.clear();
            
            this.isScanning = false;
            this.scannerInstance = null;
            
            // Clean up overlay
            this.cleanupOverlayUI();
            
            console.log('✓ Scanner stopped');
            
            if (this.callbacks.onCameraStop) {
                this.callbacks.onCameraStop();
            }
            
        } catch (error) {
            console.error('Error stopping scanner:', error);
            throw error;
        }
    }
    
    /**
     * Setup overlay UI with advanced controls
     */
    async setupOverlayUI(containerId, config) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Create overlay container
        this.overlayElement = document.createElement('div');
        this.overlayElement.id = 'scanner-overlay';
        this.overlayElement.className = 'scanner-overlay';
        
        // Status display
        const statusSection = document.createElement('div');
        statusSection.className = 'scanner-status';
        
        this.overlayElements.statusText = document.createElement('div');
        this.overlayElements.statusText.className = 'status-text';
        this.overlayElements.statusText.textContent = 'Ready to scan';
        
        this.overlayElements.instructionText = document.createElement('div');
        this.overlayElements.instructionText.className = 'instruction-text';
        this.overlayElements.instructionText.textContent = 'Point camera at QR code or barcode';
        
        this.overlayElements.scanCount = document.createElement('div');
        this.overlayElements.scanCount.className = 'scan-count';
        this.updateScanCount();
        
        statusSection.appendChild(this.overlayElements.statusText);
        statusSection.appendChild(this.overlayElements.instructionText);
        statusSection.appendChild(this.overlayElements.scanCount);
        
        // Controls section
        const controlsSection = document.createElement('div');
        controlsSection.className = 'scanner-controls';
        
        // Camera selector
        if (config.showCameraSwitch && this.availableCameras.length > 1) {
            const cameraGroup = document.createElement('div');
            cameraGroup.className = 'control-group camera-group';
            
            const cameraLabel = document.createElement('label');
            cameraLabel.textContent = 'Camera:';
            
            this.overlayElements.controls.cameraSelect = document.createElement('select');
            this.overlayElements.controls.cameraSelect.className = 'camera-select';
            
            this.availableCameras.forEach((camera, index) => {
                const option = document.createElement('option');
                option.value = camera.id;
                option.textContent = camera.label || `Camera ${index + 1}`;
                option.selected = camera.id === this.currentCamera.id;
                this.overlayElements.controls.cameraSelect.appendChild(option);
            });
            
            this.overlayElements.controls.cameraSelect.addEventListener('change', (e) => {
                this.switchCamera(e.target.value);
            });
            
            cameraGroup.appendChild(cameraLabel);
            cameraGroup.appendChild(this.overlayElements.controls.cameraSelect);
            controlsSection.appendChild(cameraGroup);
        }
        
        // Format selector
        if (config.showFormatSelector) {
            const formatGroup = document.createElement('div');
            formatGroup.className = 'control-group format-group';
            
            const formatLabel = document.createElement('label');
            formatLabel.textContent = 'Format:';
            
            this.overlayElements.controls.formatSelect = document.createElement('select');
            this.overlayElements.controls.formatSelect.className = 'format-select';
            
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'All Formats';
            allOption.selected = true;
            this.overlayElements.controls.formatSelect.appendChild(allOption);
            
            const formatNames = {
                [Html5QrcodeFormat.QR_CODE]: 'QR Code',
                [Html5QrcodeFormat.CODE_128]: 'Code 128',
                [Html5QrcodeFormat.CODE_39]: 'Code 39',
                [Html5QrcodeFormat.EAN_13]: 'EAN-13',
                [Html5QrcodeFormat.EAN_8]: 'EAN-8',
                [Html5QrcodeFormat.UPC_A]: 'UPC-A',
                [Html5QrcodeFormat.UPC_E]: 'UPC-E',
                [Html5QrcodeFormat.DATA_MATRIX]: 'Data Matrix',
                [Html5QrcodeFormat.PDF_417]: 'PDF 417',
                [Html5QrcodeFormat.AZTEC]: 'Aztec'
            };
            
            config.formatsToSupport.forEach(format => {
                const option = document.createElement('option');
                option.value = format;
                option.textContent = formatNames[format] || format;
                this.overlayElements.controls.formatSelect.appendChild(option);
            });
            
            formatGroup.appendChild(formatLabel);
            formatGroup.appendChild(this.overlayElements.controls.formatSelect);
            controlsSection.appendChild(formatGroup);
        }
        
        // Camera info
        this.overlayElements.cameraInfo = document.createElement('div');
        this.overlayElements.cameraInfo.className = 'camera-info';
        this.updateCameraInfo();
        
        // Assemble overlay
        this.overlayElement.appendChild(statusSection);
        this.overlayElement.appendChild(controlsSection);
        this.overlayElement.appendChild(this.overlayElements.cameraInfo);
        
        // Add to container
        container.appendChild(this.overlayElement);
        
        // Add event listeners for advanced controls (will be added when capabilities are detected)
        setTimeout(() => this.addAdvancedControls(controlsSection, config), 1000);
    }
    
    /**
     * Add advanced camera controls based on capabilities
     */
    async addAdvancedControls(controlsSection, config) {
        // Zoom control
        if (config.showZoom && this.cameraCapabilities.zoom.supported) {
            const zoomGroup = document.createElement('div');
            zoomGroup.className = 'control-group zoom-group';
            
            const zoomLabel = document.createElement('label');
            zoomLabel.textContent = `Zoom: ${this.cameraCapabilities.zoom.current.toFixed(1)}x`;
            
            this.overlayElements.controls.zoomSlider = document.createElement('input');
            this.overlayElements.controls.zoomSlider.type = 'range';
            this.overlayElements.controls.zoomSlider.className = 'zoom-slider';
            this.overlayElements.controls.zoomSlider.min = this.cameraCapabilities.zoom.min;
            this.overlayElements.controls.zoomSlider.max = this.cameraCapabilities.zoom.max;
            this.overlayElements.controls.zoomSlider.step = '0.1';
            this.overlayElements.controls.zoomSlider.value = this.cameraCapabilities.zoom.current;
            
            this.overlayElements.controls.zoomSlider.addEventListener('input', (e) => {
                const zoomValue = parseFloat(e.target.value);
                this.setZoom(zoomValue);
                zoomLabel.textContent = `Zoom: ${zoomValue.toFixed(1)}x`;
            });
            
            zoomGroup.appendChild(zoomLabel);
            zoomGroup.appendChild(this.overlayElements.controls.zoomSlider);
            controlsSection.appendChild(zoomGroup);
        }
        
        // Torch control
        if (config.showTorch && this.cameraCapabilities.torch.supported) {
            const torchGroup = document.createElement('div');
            torchGroup.className = 'control-group torch-group';
            
            this.overlayElements.controls.torchButton = document.createElement('button');
            this.overlayElements.controls.torchButton.className = 'torch-button';
            this.overlayElements.controls.torchButton.textContent = this.cameraCapabilities.torch.enabled ? '🔦 ON' : '🔦 OFF';
            
            this.overlayElements.controls.torchButton.addEventListener('click', () => {
                this.toggleTorch();
            });
            
            torchGroup.appendChild(this.overlayElements.controls.torchButton);
            controlsSection.appendChild(torchGroup);
        }
    }
    
    /**
     * Initialize camera capabilities detection
     */
    async initializeCameraCapabilities() {
        try {
            // Get video track from scanner
            const videoElement = document.querySelector('#' + this.scannerInstance.elementId + ' video');
            if (!videoElement || !videoElement.srcObject) return;
            
            const stream = videoElement.srcObject;
            const videoTrack = stream.getVideoTracks()[0];
            
            if (!videoTrack) return;
            
            const capabilities = videoTrack.getCapabilities();
            const settings = videoTrack.getSettings();
            
            // Check zoom support
            if (capabilities.zoom) {
                this.cameraCapabilities.zoom.supported = true;
                this.cameraCapabilities.zoom.min = capabilities.zoom.min || 1;
                this.cameraCapabilities.zoom.max = capabilities.zoom.max || 4;
                this.cameraCapabilities.zoom.current = settings.zoom || 1;
            }
            
            // Check torch support
            if (capabilities.torch) {
                this.cameraCapabilities.torch.supported = true;
                this.cameraCapabilities.torch.enabled = settings.torch || false;
            }
            
            // Check focus mode support
            if (capabilities.focusMode) {
                this.cameraCapabilities.focusMode.supported = true;
                this.cameraCapabilities.focusMode.current = settings.focusMode || 'continuous';
            }
            
            // Check exposure compensation support
            if (capabilities.exposureCompensation) {
                this.cameraCapabilities.exposureCompensation.supported = true;
                this.cameraCapabilities.exposureCompensation.min = capabilities.exposureCompensation.min || -2;
                this.cameraCapabilities.exposureCompensation.max = capabilities.exposureCompensation.max || 2;
                this.cameraCapabilities.exposureCompensation.current = settings.exposureCompensation || 0;
            }
            
            // Store video track for later use
            this.videoTrack = videoTrack;
            
            console.log('Camera capabilities detected:', this.cameraCapabilities);
            
        } catch (error) {
            console.warn('Failed to detect camera capabilities:', error);
        }
    }
    
    /**
     * Set camera zoom level
     */
    async setZoom(zoomLevel) {
        if (!this.cameraCapabilities.zoom.supported || !this.videoTrack) {
            console.warn('Zoom not supported');
            return false;
        }
        
        try {
            const constraints = {
                advanced: [{
                    zoom: Math.max(
                        this.cameraCapabilities.zoom.min,
                        Math.min(this.cameraCapabilities.zoom.max, zoomLevel)
                    )
                }]
            };
            
            await this.videoTrack.applyConstraints(constraints);
            this.cameraCapabilities.zoom.current = zoomLevel;
            
            return true;
        } catch (error) {
            console.error('Failed to set zoom:', error);
            return false;
        }
    }
    
    /**
     * Toggle torch (flashlight)
     */
    async toggleTorch() {
        if (!this.cameraCapabilities.torch.supported || !this.videoTrack) {
            console.warn('Torch not supported');
            return false;
        }
        
        try {
            const newState = !this.cameraCapabilities.torch.enabled;
            const constraints = {
                advanced: [{ torch: newState }]
            };
            
            await this.videoTrack.applyConstraints(constraints);
            this.cameraCapabilities.torch.enabled = newState;
            
            // Update button text
            if (this.overlayElements.controls.torchButton) {
                this.overlayElements.controls.torchButton.textContent = newState ? '🔦 ON' : '🔦 OFF';
            }
            
            return true;
        } catch (error) {
            console.error('Failed to toggle torch:', error);
            return false;
        }
    }
    
    /**
     * Switch to a different camera
     */
    async switchCamera(cameraId) {
        const camera = this.availableCameras.find(c => c.id === cameraId);
        if (!camera || camera.id === this.currentCamera.id) return;
        
        this.currentCamera = camera;
        
        // Restart scanner with new camera
        if (this.isScanning) {
            const containerId = this.scannerInstance.elementId;
            await this.stopScanning();
            await this.startScanning(containerId, this.config);
        }
        
        this.updateCameraInfo();
    }
    
    /**
     * Handle successful scan
     */
    onScanSuccess(decodedText, decodedResult) {
        const now = Date.now();
        
        // Prevent rapid consecutive scans
        if (now - this.lastScanTime < this.config.scanDelay) {
            return;
        }
        
        this.lastScanTime = now;
        this.consecutiveFailures = 0;
        
        // Update metrics
        this.metrics.totalScans++;
        this.metrics.successfulScans++;
        this.metrics.lastScanDuration = now - this.metrics.sessionStartTime;
        this.updateScanCount();
        
        // Store scan result
        const scanResult = {
            text: decodedText,
            format: decodedResult.result?.format,
            timestamp: now,
            camera: this.currentCamera.label || this.currentCamera.id
        };
        
        this.scanHistory.push(scanResult);
        
        // Keep only last 100 scans
        if (this.scanHistory.length > 100) {
            this.scanHistory = this.scanHistory.slice(-100);
        }
        
        // Update status
        if (this.overlayElements.statusText) {
            this.overlayElements.statusText.textContent = `Scanned: ${decodedText.substring(0, 50)}${decodedText.length > 50 ? '...' : ''}`;
            this.overlayElements.statusText.className = 'status-text success';
        }
        
        // Play beep if enabled
        if (this.config.enableBeep) {
            this.playBeep();
        }
        
        // Vibrate if enabled
        if (this.config.enableVibration && navigator.vibrate) {
            navigator.vibrate(200);
        }
        
        // Auto-stop if configured
        if (this.config.autoStop) {
            setTimeout(() => this.stopScanning(), 1000);
        }
        
        // Call user callback
        if (this.callbacks.onScanSuccess) {
            this.callbacks.onScanSuccess(decodedText, decodedResult, scanResult);
        }
        
        // Reset status after delay
        setTimeout(() => {
            if (this.overlayElements.statusText && this.isScanning) {
                this.overlayElements.statusText.textContent = 'Ready to scan';
                this.overlayElements.statusText.className = 'status-text';
            }
        }, 3000);
    }
    
    /**
     * Handle scan errors
     */
    onScanError(error) {
        this.consecutiveFailures++;
        
        // Only log persistent errors to avoid spam
        if (this.consecutiveFailures % 50 === 0) {
            console.warn('Persistent scan errors:', error);
        }
        
        if (this.callbacks.onScanFailure) {
            this.callbacks.onScanFailure(error);
        }
    }
    
    /**
     * Play beep sound
     */
    playBeep() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            // Silent fail for beep
        }
    }
    
    /**
     * Update scan count display
     */
    updateScanCount() {
        if (this.overlayElements.scanCount) {
            this.overlayElements.scanCount.textContent = `Scans: ${this.metrics.successfulScans}/${this.metrics.totalScans}`;
        }
    }
    
    /**
     * Update camera info display
     */
    updateCameraInfo() {
        if (this.overlayElements.cameraInfo) {
            const cameraName = this.currentCamera?.label || 'Unknown Camera';
            const capabilities = [];
            
            if (this.cameraCapabilities.zoom.supported) capabilities.push('Zoom');
            if (this.cameraCapabilities.torch.supported) capabilities.push('Flash');
            if (this.cameraCapabilities.focusMode.supported) capabilities.push('Focus');
            
            const capText = capabilities.length > 0 ? ` (${capabilities.join(', ')})` : '';
            this.overlayElements.cameraInfo.textContent = `${cameraName}${capText}`;
        }
    }
    
    /**
     * Clean up overlay UI
     */
    cleanupOverlayUI() {
        if (this.overlayElement && this.overlayElement.parentNode) {
            this.overlayElement.parentNode.removeChild(this.overlayElement);
            this.overlayElement = null;
        }
        
        // Clear references
        this.overlayElements = {
            statusText: null,
            instructionText: null,
            scanCount: null,
            cameraInfo: null,
            controls: {
                zoomSlider: null,
                torchButton: null,
                cameraSelect: null,
                formatSelect: null,
                settingsButton: null
            }
        };
    }
    
    /**
     * Scan from file input
     */
    async scanFile(file) {
        if (!this.scannerInstance) {
            throw new Error('Scanner not initialized');
        }
        
        try {
            const result = await this.scannerInstance.scanFile(file, true);
            
            // Update metrics
            this.metrics.totalScans++;
            this.metrics.successfulScans++;
            this.updateScanCount();
            
            // Store result
            const scanResult = {
                text: result.decodedText,
                format: result.result?.format,
                timestamp: Date.now(),
                source: 'file',
                filename: file.name
            };
            
            this.scanHistory.push(scanResult);
            
            if (this.callbacks.onScanSuccess) {
                this.callbacks.onScanSuccess(result.decodedText, result.result, scanResult);
            }
            
            return scanResult;
            
        } catch (error) {
            console.error('File scan failed:', error);
            this.metrics.totalScans++;
            
            if (this.callbacks.onScanFailure) {
                this.callbacks.onScanFailure(error);
            }
            
            throw error;
        }
    }
    
    /**
     * Set callback functions
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    
    /**
     * Get scan history
     */
    getScanHistory(limit = 10) {
        return this.scanHistory.slice(-limit);
    }
    
    /**
     * Clear scan history
     */
    clearScanHistory() {
        this.scanHistory = [];
        this.updateScanCount();
    }
    
    /**
     * Get current metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            successRate: this.metrics.totalScans > 0 ? 
                (this.metrics.successfulScans / this.metrics.totalScans * 100).toFixed(1) + '%' : '0%',
            sessionDuration: Date.now() - this.metrics.sessionStartTime,
            currentCamera: this.currentCamera?.label || 'Unknown',
            capabilities: this.cameraCapabilities
        };
    }
    
    /**
     * Export scan history as CSV
     */
    exportScanHistory() {
        if (this.scanHistory.length === 0) {
            return null;
        }
        
        const headers = ['Timestamp', 'Text', 'Format', 'Camera/Source', 'Filename'];
        const csvContent = [
            headers.join(','),
            ...this.scanHistory.map(scan => [
                new Date(scan.timestamp).toISOString(),
                `"${scan.text.replace(/"/g, '""')}"`,
                scan.format || 'Unknown',
                scan.camera || scan.source || 'Unknown',
                scan.filename || ''
            ].join(','))
        ].join('\n');
        
        return csvContent;
    }
    
    /**
     * Get current status
     */
    getStatus() {
        return {
            isScanning: this.isScanning,
            currentCamera: this.currentCamera,
            availableCameras: this.availableCameras.length,
            capabilities: this.cameraCapabilities,
            metrics: this.getMetrics()
        };
    }
}

// Create and expose global instance
const scannerManager = new ScannerManager();
window.scannerManager = scannerManager;

// Legacy compatibility
window.ScannerManager = ScannerManager;

// Module export for modern environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScannerManager;
}

console.log('✓ K4LP Scanner Manager v2.1.0 initialized');