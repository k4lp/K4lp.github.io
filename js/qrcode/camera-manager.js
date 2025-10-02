/**
 * Camera Manager Module
 * Professional-grade camera access and management for QR/barcode scanning
 * 
 * Handles:
 * - Cross-platform camera detection and access
 * - Mobile and desktop compatibility
 * - HTTPS/security requirements
 * - Permission management
 * - Device enumeration and selection
 * - Error handling and recovery
 */

class CameraManager {
    constructor() {
        this.cameras = [];
        this.currentCamera = null;
        this.isInitialized = false;
        this.hasPermission = false;
        this.mediaStream = null;
        this.constraints = {
            video: {
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 },
                facingMode: 'environment', // Prefer back camera
                focusMode: 'continuous',
                exposureMode: 'continuous'
            },
            audio: false
        };
        
        this.statusCallbacks = [];
        this.errorCallbacks = [];
        
        // Initialize immediately
        this.initialize();
    }
    
    /**
     * Initialize the camera manager
     */
    async initialize() {
        try {
            QRUtils.log.info('Initializing Camera Manager...');
            
            // Check for secure context
            if (!this.isSecureContext()) {
                throw new Error('Camera access requires HTTPS or localhost');
            }
            
            // Check browser support
            if (!this.isBrowserSupported()) {
                throw new Error('Browser does not support camera access');
            }
            
            // Update status
            this.updateStatus('Checking camera availability...', 'info');
            
            // Check for cameras
            const hasCameras = await this.checkCameraAvailability();
            if (!hasCameras) {
                throw new Error('No cameras detected on this device');
            }
            
            // Enumerate cameras
            await this.enumerateCameras();
            
            this.isInitialized = true;
            this.updateStatus(`Found ${this.cameras.length} camera(s)`, 'success');
            
            QRUtils.log.success(`Camera Manager initialized with ${this.cameras.length} cameras`);
            
        } catch (error) {
            this.handleError(error, 'Camera Manager Initialization');
            this.updateStatus(error.message, 'error');
        }
    }
    
    /**
     * Check if running in secure context
     */
    isSecureContext() {
        return window.isSecureContext || 
               location.protocol === 'https:' || 
               location.hostname === 'localhost' || 
               location.hostname === '127.0.0.1' ||
               location.protocol === 'file:';
    }
    
    /**
     * Check browser support for camera access
     */
    isBrowserSupported() {
        return !!(navigator.mediaDevices && 
                 navigator.mediaDevices.getUserMedia && 
                 navigator.mediaDevices.enumerateDevices);
    }
    
    /**
     * Check if cameras are available
     */
    async checkCameraAvailability() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(device => device.kind === 'videoinput');
        } catch (error) {
            QRUtils.log.error('Failed to check camera availability:', error);
            return false;
        }
    }
    
    /**
     * Enumerate available cameras
     */
    async enumerateCameras() {
        try {
            QRUtils.log.info('Enumerating cameras...');
            
            // First, try to get permission to access cameras
            // This allows us to get camera labels
            try {
                const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
                tempStream.getTracks().forEach(track => track.stop());
                this.hasPermission = true;
            } catch (permError) {
                QRUtils.log.warn('Camera permission not granted yet:', permError.message);
            }
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.cameras = devices
                .filter(device => device.kind === 'videoinput')
                .map((device, index) => ({
                    id: device.deviceId,
                    label: device.label || `Camera ${index + 1}`,
                    groupId: device.groupId,
                    kind: device.kind,
                    facing: this.determineFacing(device.label)
                }));
            
            // Prefer back camera if available
            this.selectPreferredCamera();
            
            // Update UI
            this.updateCameraSelect();
            
            QRUtils.log.success(`Enumerated ${this.cameras.length} cameras`);
            
        } catch (error) {
            this.handleError(error, 'Camera Enumeration');
            throw error;
        }
    }
    
    /**
     * Determine camera facing based on label
     */
    determineFacing(label) {
        const lowerLabel = label.toLowerCase();
        if (lowerLabel.includes('back') || 
            lowerLabel.includes('rear') || 
            lowerLabel.includes('environment')) {
            return 'environment';
        } else if (lowerLabel.includes('front') || 
                   lowerLabel.includes('user') || 
                   lowerLabel.includes('selfie')) {
            return 'user';
        }
        return 'unknown';
    }
    
    /**
     * Select preferred camera (back camera if available)
     */
    selectPreferredCamera() {
        if (this.cameras.length === 0) return;
        
        // Try to find back camera
        let preferredCamera = this.cameras.find(camera => camera.facing === 'environment');
        
        // If no back camera, use first available
        if (!preferredCamera) {
            preferredCamera = this.cameras[0];
        }
        
        this.currentCamera = preferredCamera;
        QRUtils.log.info('Selected camera:', preferredCamera.label);
    }
    
    /**
     * Update camera select dropdown
     */
    updateCameraSelect() {
        const cameraSelect = QRUtils.$('camera-select');
        if (!cameraSelect) return;
        
        cameraSelect.innerHTML = '';
        
        if (this.cameras.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No cameras found';
            cameraSelect.appendChild(option);
            cameraSelect.disabled = true;
            return;
        }
        
        this.cameras.forEach(camera => {
            const option = document.createElement('option');
            option.value = camera.id;
            option.textContent = camera.label;
            option.selected = camera.id === this.currentCamera?.id;
            cameraSelect.appendChild(option);
        });
        
        cameraSelect.disabled = false;
        
        // Add change event listener
        cameraSelect.removeEventListener('change', this.handleCameraChange);
        cameraSelect.addEventListener('change', this.handleCameraChange.bind(this));
    }
    
    /**
     * Handle camera selection change
     */
    handleCameraChange(event) {
        const selectedCameraId = event.target.value;
        const selectedCamera = this.cameras.find(camera => camera.id === selectedCameraId);
        
        if (selectedCamera && selectedCamera.id !== this.currentCamera?.id) {
            this.currentCamera = selectedCamera;
            QRUtils.log.info('Camera changed to:', selectedCamera.label);
            
            // Notify about camera change
            this.notifyStatusCallbacks('Camera changed', 'info');
        }
    }
    
    /**
     * Get camera stream
     */
    async getCameraStream(cameraId = null) {
        try {
            const targetCamera = cameraId ? 
                this.cameras.find(c => c.id === cameraId) : 
                this.currentCamera;
            
            if (!targetCamera) {
                throw new Error('No camera available');
            }
            
            QRUtils.log.info('Requesting camera stream from:', targetCamera.label);
            
            // Build constraints
            const constraints = {
                video: {
                    deviceId: { exact: targetCamera.id },
                    ...this.constraints.video
                },
                audio: false
            };
            
            // Request stream
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Stop any existing stream
            if (this.mediaStream) {
                this.stopStream();
            }
            
            this.mediaStream = stream;
            this.hasPermission = true;
            
            QRUtils.log.success('Camera stream obtained successfully');
            this.updateStatus('Camera stream active', 'success');
            
            return stream;
            
        } catch (error) {
            this.handleError(error, 'Camera Stream Access');
            throw error;
        }
    }
    
    /**
     * Stop current camera stream
     */
    stopStream() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => {
                track.stop();
                QRUtils.log.info('Stopped camera track:', track.label);
            });
            this.mediaStream = null;
            this.updateStatus('Camera stream stopped', 'info');
        }
    }
    
    /**
     * Switch to next available camera
     */
    async switchCamera() {
        if (this.cameras.length <= 1) {
            throw new Error('No additional cameras available');
        }
        
        const currentIndex = this.cameras.findIndex(camera => 
            camera.id === this.currentCamera?.id
        );
        
        const nextIndex = (currentIndex + 1) % this.cameras.length;
        const nextCamera = this.cameras[nextIndex];
        
        this.currentCamera = nextCamera;
        
        // Update select dropdown
        const cameraSelect = QRUtils.$('camera-select');
        if (cameraSelect) {
            cameraSelect.value = nextCamera.id;
        }
        
        QRUtils.log.info('Switched to camera:', nextCamera.label);
        this.updateStatus(`Switched to ${nextCamera.label}`, 'info');
        
        return nextCamera;
    }
    
    /**
     * Request camera permission
     */
    async requestPermission() {
        try {
            this.updateStatus('Requesting camera permission...', 'info');
            
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            
            this.hasPermission = true;
            this.updateStatus('Camera permission granted', 'success');
            
            // Re-enumerate cameras to get labels
            await this.enumerateCameras();
            
            return true;
            
        } catch (error) {
            this.hasPermission = false;
            
            if (error.name === 'NotAllowedError') {
                this.updateStatus('Camera permission denied', 'error');
            } else if (error.name === 'NotReadableError') {
                this.updateStatus('Camera is in use by another application', 'error');
            } else {
                this.updateStatus(`Permission error: ${error.message}`, 'error');
            }
            
            throw error;
        }
    }
    
    /**
     * Get camera capabilities
     */
    async getCameraCapabilities(cameraId = null) {
        try {
            const camera = cameraId ? 
                this.cameras.find(c => c.id === cameraId) : 
                this.currentCamera;
            
            if (!camera) {
                throw new Error('No camera selected');
            }
            
            // Get a temporary stream to check capabilities
            const tempStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: camera.id } }
            });
            
            const videoTrack = tempStream.getVideoTracks()[0];
            const capabilities = videoTrack.getCapabilities();
            const settings = videoTrack.getSettings();
            
            // Stop the temporary stream
            tempStream.getTracks().forEach(track => track.stop());
            
            return {
                capabilities,
                settings,
                camera
            };
            
        } catch (error) {
            QRUtils.log.error('Failed to get camera capabilities:', error);
            return null;
        }
    }
    
    /**
     * Check if device is mobile
     */
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    /**
     * Get optimal constraints for current device
     */
    getOptimalConstraints() {
        const isMobile = this.isMobileDevice();
        
        return {
            video: {
                width: isMobile ? 
                    { ideal: 1280, min: 640 } : 
                    { ideal: 1920, min: 1280 },
                height: isMobile ? 
                    { ideal: 720, min: 480 } : 
                    { ideal: 1080, min: 720 },
                facingMode: isMobile ? 'environment' : 'user',
                focusMode: 'continuous',
                exposureMode: 'continuous',
                frameRate: { ideal: 30, min: 15 }
            },
            audio: false
        };
    }
    
    /**
     * Register status callback
     */
    onStatusChange(callback) {
        if (typeof callback === 'function') {
            this.statusCallbacks.push(callback);
        }
    }
    
    /**
     * Register error callback
     */
    onError(callback) {
        if (typeof callback === 'function') {
            this.errorCallbacks.push(callback);
        }
    }
    
    /**
     * Update status and notify callbacks
     */
    updateStatus(message, type = 'info') {
        QRUtils.setStatus(message, type);
        this.notifyStatusCallbacks(message, type);
    }
    
    /**
     * Notify status callbacks
     */
    notifyStatusCallbacks(message, type) {
        this.statusCallbacks.forEach(callback => {
            try {
                callback(message, type);
            } catch (error) {
                QRUtils.log.error('Status callback error:', error);
            }
        });
    }
    
    /**
     * Handle errors and notify callbacks
     */
    handleError(error, context = 'Camera Manager') {
        QRUtils.handleError(error, context);
        
        this.errorCallbacks.forEach(callback => {
            try {
                callback(error, context);
            } catch (callbackError) {
                QRUtils.log.error('Error callback failed:', callbackError);
            }
        });
    }
    
    /**
     * Get current status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasPermission: this.hasPermission,
            camerasAvailable: this.cameras.length,
            currentCamera: this.currentCamera,
            isStreamActive: !!this.mediaStream,
            isSecureContext: this.isSecureContext(),
            isBrowserSupported: this.isBrowserSupported(),
            isMobile: this.isMobileDevice()
        };
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopStream();
        this.statusCallbacks = [];
        this.errorCallbacks = [];
        QRUtils.log.info('Camera Manager cleaned up');
    }
    
    /**
     * Reset to initial state
     */
    reset() {
        this.cleanup();
        this.cameras = [];
        this.currentCamera = null;
        this.isInitialized = false;
        this.hasPermission = false;
        this.initialize();
    }
}

// Export for global access
window.CameraManager = CameraManager;