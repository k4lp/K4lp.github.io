/**
 * Utility Functions for QR Code Component Scanner
 * Swiss Design - Minimalist & Robust
 */

const QRUtils = {
    // DOM utilities
    $: (id) => document.getElementById(id),
    $$: (selector) => document.querySelectorAll(selector),
    
    // Element visibility
    show: (element) => {
        if (typeof element === 'string') element = QRUtils.$(element);
        if (element) element.classList.remove('hidden');
    },
    
    hide: (element) => {
        if (typeof element === 'string') element = QRUtils.$(element);
        if (element) element.classList.add('hidden');
    },
    
    toggle: (element) => {
        if (typeof element === 'string') element = QRUtils.$(element);
        if (element) element.classList.toggle('hidden');
    },
    
    // Local Storage utilities
    storage: {
        set: (key, value) => {
            try {
                localStorage.setItem(`qr_scanner_${key}`, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Storage error:', e);
                return false;
            }
        },
        
        get: (key, defaultValue = null) => {
            try {
                const item = localStorage.getItem(`qr_scanner_${key}`);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.error('Storage error:', e);
                return defaultValue;
            }
        },
        
        remove: (key) => {
            try {
                localStorage.removeItem(`qr_scanner_${key}`);
                return true;
            } catch (e) {
                console.error('Storage error:', e);
                return false;
            }
        },
        
        clear: () => {
            try {
                Object.keys(localStorage)
                    .filter(key => key.startsWith('qr_scanner_'))
                    .forEach(key => localStorage.removeItem(key));
                return true;
            } catch (e) {
                console.error('Storage error:', e);
                return false;
            }
        }
    },
    
    // Excel column utilities
    columnToIndex: (column) => {
        column = column.toUpperCase();
        let result = 0;
        for (let i = 0; i < column.length; i++) {
            result = result * 26 + (column.charCodeAt(i) - 64);
        }
        return result - 1;
    },
    
    indexToColumn: (index) => {
        let result = '';
        while (index >= 0) {
            result = String.fromCharCode((index % 26) + 65) + result;
            index = Math.floor(index / 26) - 1;
        }
        return result;
    },
    
    // Array utilities
    chunk: (array, size) => {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    },
    
    // String utilities
    escapeHtml: (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    truncate: (str, length = 50) => {
        return str && str.length > length ? str.substring(0, length) + '...' : str;
    },
    
    // Date utilities
    formatTimestamp: (date = new Date()) => {
        return date.toLocaleString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    },
    
    // File utilities
    generateFilename: (prefix = 'qr_scan', extension = 'xlsx') => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        return `${prefix}_${timestamp}.${extension}`;
    },
    
    // Validation utilities
    isValidRange: (startRow, endRow, startCol, endCol) => {
        return (
            startRow >= 1 && 
            endRow >= startRow && 
            startCol && 
            endCol && 
            QRUtils.columnToIndex(startCol) >= 0 &&
            QRUtils.columnToIndex(endCol) >= QRUtils.columnToIndex(startCol)
        );
    },
    
    // Event utilities
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Logger utility
    log: {
        info: (message, data = null) => {
            console.log(`[QR Scanner] ${message}`, data || '');
        },
        
        warn: (message, data = null) => {
            console.warn(`[QR Scanner] ${message}`, data || '');
        },
        
        error: (message, error = null) => {
            console.error(`[QR Scanner] ${message}`, error || '');
        },
        
        success: (message, data = null) => {
            console.log(`[QR Scanner] ✓ ${message}`, data || '');
        }
    },
    
    // Status indicator utility
    setStatus: (message, type = 'info') => {
        const indicator = QRUtils.$('status-indicator');
        if (indicator) {
            indicator.textContent = message;
            indicator.className = `status-${type}`;
        }
    },
    
    // Step navigation
    setStep: (stepNumber, totalSteps = 5) => {
        const indicator = QRUtils.$('step-indicator');
        if (indicator) {
            indicator.textContent = `Step ${stepNumber}/${totalSteps}`;
        }
    },
    
    // Error handling
    handleError: (error, context = 'Unknown') => {
        QRUtils.log.error(`Error in ${context}:`, error);
        QRUtils.setStatus(`Error: ${error.message}`, 'error');
        
        // Show user-friendly error message
        const errorElement = document.createElement('div');
        errorElement.className = 'alert alert-error';
        errorElement.innerHTML = `
            <div class="alert-title">Error</div>
            ${QRUtils.escapeHtml(error.message || 'An unexpected error occurred')}
        `;
        
        // Insert error at top of current step
        const currentStep = document.querySelector('.section:not(.hidden)');
        if (currentStep) {
            currentStep.insertBefore(errorElement, currentStep.firstElementChild);
            setTimeout(() => errorElement.remove(), 5000);
        }
    },
    
    // Success notification
    showSuccess: (message) => {
        QRUtils.log.success(message);
        QRUtils.setStatus(message, 'success');
        
        const successElement = document.createElement('div');
        successElement.className = 'alert alert-success';
        successElement.innerHTML = `
            <div class="alert-title">Success</div>
            ${QRUtils.escapeHtml(message)}
        `;
        
        const currentStep = document.querySelector('.section:not(.hidden)');
        if (currentStep) {
            currentStep.insertBefore(successElement, currentStep.firstElementChild);
            setTimeout(() => successElement.remove(), 3000);
        }
    },
    
    // Device detection
    isMobile: () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    // Camera utilities
    hasCamera: async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(device => device.kind === 'videoinput');
        } catch (e) {
            return false;
        }
    },
    
    // Performance utilities
    measure: (name, func) => {
        const start = performance.now();
        const result = func();
        const end = performance.now();
        QRUtils.log.info(`Performance [${name}]: ${(end - start).toFixed(2)}ms`);
        return result;
    },
    
    // Array validation
    isValidArray: (arr) => {
        return Array.isArray(arr) && arr.length > 0;
    },
    
    // Object validation
    isValidObject: (obj) => {
        return obj && typeof obj === 'object' && !Array.isArray(obj);
    },
    
    // Clean text for matching
    cleanText: (text) => {
        return String(text || '').trim().replace(/\s+/g, ' ');
    },
    
    // Generate unique ID
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

// Make QRUtils globally available
window.QRUtils = QRUtils;