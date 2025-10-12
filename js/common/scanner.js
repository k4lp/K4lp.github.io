/**
 * Common QR/Barcode scanner utilities
 * Handles camera access, scanning, and overlay management
 */

class ScannerManager {
    constructor() {
        this.stream = null;
        this.video = null;
        this.canvas = null;
        this.context = null;
        this.isScanning = false;
        this.overlayElements = [];
        this.scannerConfig = {
            width: 640,
            height: 480,
            facingMode: 'environment'
        };
    }

    async initializeCamera(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.context = this.canvas.getContext('2d');

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: this.scannerConfig.width,
                    height: this.scannerConfig.height,
                    facingMode: this.scannerConfig.facingMode
                }
            });
            
            this.video.srcObject = this.stream;
            return true;
        } catch (error) {
            console.error('Camera initialization failed:', error);
            return false;
        }
    }

    startScanning() {
        if (!this.video || !this.canvas) return false;
        
        this.isScanning = true;
        this.scanFrame();
        return true;
    }

    stopScanning() {
        this.isScanning = false;
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    scanFrame() {
        if (!this.isScanning) return;

        if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            
            // QR/Barcode detection logic will use jsQR library
            const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (code) {
                this.onScanResult(code.data, code.location);
            }
        }

        requestAnimationFrame(() => this.scanFrame());
    }

    onScanResult(data, location) {
        // Override this method in specific implementations
        console.log('Scanned:', data);
    }

    addOverlayElement(element, position) {
        this.overlayElements.push({ element, position });
    }

    updateScannerConfig(config) {
        this.scannerConfig = { ...this.scannerConfig, ...config };
    }

    getScannerConfig() {
        return this.scannerConfig;
    }
}

const scannerManager = new ScannerManager();
