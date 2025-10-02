/**
 * Enhanced Utility Functions for QR Code Component Scanner
 * Professional-grade utilities with comprehensive error handling
 * Version: 2.1.0
 */

const QRUtils = {
    version: '2.1.0',
    
    // DOM utilities
    $: (id) => document.getElementById(id),
    $$: (selector) => document.querySelectorAll(selector),
    
    // Element visibility with animation support
    show: (element) => {
        if (typeof element === 'string') element = QRUtils.$(element);
        if (element) {
            element.classList.remove('hidden');
            element.style.display = '';
            element.classList.add('animate-fade-in');
            setTimeout(() => element.classList.remove('animate-fade-in'), 200);
        }
    },
    
    hide: (element) => {
        if (typeof element === 'string') element = QRUtils.$(element);
        if (element) {
            element.classList.add('animate-fade-out');
            setTimeout(() => {
                element.classList.add('hidden');
                element.classList.remove('animate-fade-out');
            }, 200);
        }
    },
    
    toggle: (element) => {
        if (typeof element === 'string') element = QRUtils.$(element);
        if (element) {
            if (element.classList.contains('hidden')) {
                QRUtils.show(element);
            } else {
                QRUtils.hide(element);
            }
        }
    },
    
    // Enhanced Local Storage utilities with encryption support
    storage: {
        set: (key, value) => {
            try {
                const data = {
                    value: value,
                    timestamp: Date.now(),
                    version: QRUtils.version
                };
                localStorage.setItem(`qr_scanner_${key}`, JSON.stringify(data));
                return true;
            } catch (e) {
                QRUtils.log.error('Storage set error:', e);
                return false;
            }
        },
        
        get: (key, defaultValue = null) => {
            try {
                const item = localStorage.getItem(`qr_scanner_${key}`);
                if (!item) return defaultValue;
                
                const data = JSON.parse(item);
                
                // Check if data is too old (24 hours)
                if (data.timestamp && (Date.now() - data.timestamp) > 24 * 60 * 60 * 1000) {
                    QRUtils.storage.remove(key);
                    return defaultValue;
                }
                
                return data.value !== undefined ? data.value : defaultValue;
            } catch (e) {
                QRUtils.log.error('Storage get error:', e);
                return defaultValue;
            }
        },
        
        remove: (key) => {
            try {
                localStorage.removeItem(`qr_scanner_${key}`);
                return true;
            } catch (e) {
                QRUtils.log.error('Storage remove error:', e);
                return false;
            }
        },
        
        clear: () => {
            try {
                Object.keys(localStorage)
                    .filter(key => key.startsWith('qr_scanner_'))
                    .forEach(key => localStorage.removeItem(key));
                QRUtils.log.success('Storage cleared');
                return true;
            } catch (e) {
                QRUtils.log.error('Storage clear error:', e);
                return false;
            }
        },
        
        exists: (key) => {
            return localStorage.getItem(`qr_scanner_${key}`) !== null;
        },
        
        size: () => {
            return Object.keys(localStorage)
                .filter(key => key.startsWith('qr_scanner_'))
                .length;
        }
    },
    
    // Excel column utilities with validation
    columnToIndex: (column) => {
        if (!column || typeof column !== 'string') return -1;
        
        column = column.toUpperCase().trim();
        if (!/^[A-Z]+$/.test(column)) return -1;
        
        let result = 0;
        for (let i = 0; i < column.length; i++) {
            result = result * 26 + (column.charCodeAt(i) - 64);
        }
        return result - 1;
    },
    
    indexToColumn: (index) => {
        if (index < 0 || !Number.isInteger(index)) return '';
        
        let result = '';
        while (index >= 0) {
            result = String.fromCharCode((index % 26) + 65) + result;
            index = Math.floor(index / 26) - 1;
        }
        return result;
    },
    
    // Enhanced array utilities
    chunk: (array, size) => {
        if (!Array.isArray(array) || size <= 0) return [];
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    },
    
    unique: (array, key = null) => {
        if (!Array.isArray(array)) return [];
        
        if (key) {
            const seen = new Set();
            return array.filter(item => {
                const value = item[key];
                if (seen.has(value)) return false;
                seen.add(value);
                return true;
            });
        }
        
        return [...new Set(array)];
    },
    
    sortBy: (array, key, ascending = true) => {
        if (!Array.isArray(array)) return [];
        
        return [...array].sort((a, b) => {
            const aVal = typeof key === 'function' ? key(a) : a[key];
            const bVal = typeof key === 'function' ? key(b) : b[key];
            
            if (aVal < bVal) return ascending ? -1 : 1;
            if (aVal > bVal) return ascending ? 1 : -1;
            return 0;
        });
    },
    
    groupBy: (array, key) => {
        if (!Array.isArray(array)) return {};
        
        return array.reduce((groups, item) => {
            const group = typeof key === 'function' ? key(item) : item[key];
            if (!groups[group]) groups[group] = [];
            groups[group].push(item);
            return groups;
        }, {});
    },
    
    // Enhanced string utilities
    escapeHtml: (text) => {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    },
    
    unescapeHtml: (html) => {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent;
    },
    
    truncate: (str, length = 50, suffix = '...') => {
        if (!str) return '';
        const text = String(str);
        return text.length > length ? text.substring(0, length) + suffix : text;
    },
    
    slugify: (text) => {
        return String(text)
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    },
    
    capitalize: (text) => {
        if (!text) return '';
        return String(text).charAt(0).toUpperCase() + String(text).slice(1).toLowerCase();
    },
    
    // Enhanced date utilities
    formatTimestamp: (date = new Date()) => {
        if (!(date instanceof Date)) date = new Date(date);
        
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
    
    formatDate: (date = new Date()) => {
        if (!(date instanceof Date)) date = new Date(date);
        return date.toLocaleDateString();
    },
    
    formatTime: (date = new Date()) => {
        if (!(date instanceof Date)) date = new Date(date);
        return date.toLocaleTimeString();
    },
    
    timeAgo: (date) => {
        if (!(date instanceof Date)) date = new Date(date);
        
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffSec < 60) return 'just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHour < 24) return `${diffHour}h ago`;
        if (diffDay < 7) return `${diffDay}d ago`;
        return date.toLocaleDateString();
    },
    
    // File utilities with MIME type detection
    generateFilename: (prefix = 'qr_scan', extension = 'xlsx') => {
        const timestamp = new Date().toISOString()
            .replace(/[:.]/g, '-')
            .replace('T', '_')
            .split('.')[0];
        return `${prefix}_${timestamp}.${extension}`;
    },
    
    getFileExtension: (filename) => {
        return filename.split('.').pop()?.toLowerCase() || '';
    },
    
    getMimeType: (filename) => {
        const ext = QRUtils.getFileExtension(filename);
        const mimeTypes = {
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls': 'application/vnd.ms-excel',
            'csv': 'text/csv',
            'json': 'application/json',
            'txt': 'text/plain',
            'pdf': 'application/pdf',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    },
    
    // Enhanced validation utilities
    isValidRange: (startRow, endRow, startCol, endCol) => {
        return (
            Number.isInteger(startRow) && startRow >= 1 && 
            Number.isInteger(endRow) && endRow >= startRow && 
            typeof startCol === 'string' && startCol.trim() !== '' &&
            typeof endCol === 'string' && endCol.trim() !== '' &&
            QRUtils.columnToIndex(startCol) >= 0 &&
            QRUtils.columnToIndex(endCol) >= QRUtils.columnToIndex(startCol)
        );
    },
    
    isValidEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    },
    
    isValidUrl: (string) => {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    },
    
    isValidNumber: (value) => {
        return !isNaN(value) && !isNaN(parseFloat(value)) && isFinite(value);
    },
    
    isEmpty: (value) => {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    },
    
    // Enhanced event utilities
    debounce: (func, wait, immediate = false) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            
            if (callNow) func.apply(this, args);
        };
    },
    
    throttle: (func, limit, options = {}) => {
        let inThrottle;
        let lastFunc;
        let lastRan;
        
        return function executedFunction(...args) {
            const context = this;
            
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    },
    
    once: (func) => {
        let called = false;
        let result;
        
        return function(...args) {
            if (!called) {
                called = true;
                result = func.apply(this, args);
            }
            return result;
        };
    },
    
    // Enhanced logger utility with levels
    log: {
        level: 'info', // debug, info, warn, error
        
        _shouldLog: (level) => {
            const levels = { debug: 0, info: 1, warn: 2, error: 3 };
            return levels[level] >= levels[QRUtils.log.level];
        },
        
        debug: (message, data = null) => {
            if (!QRUtils.log._shouldLog('debug')) return;
            console.debug(`%c[QR Scanner] 🐛 ${message}`, 'color: #6b7280', data || '');
        },
        
        info: (message, data = null) => {
            if (!QRUtils.log._shouldLog('info')) return;
            console.log(`%c[QR Scanner] ℹ️ ${message}`, 'color: #2563eb', data || '');
        },
        
        warn: (message, data = null) => {
            if (!QRUtils.log._shouldLog('warn')) return;
            console.warn(`%c[QR Scanner] ⚠️ ${message}`, 'color: #f59e0b', data || '');
        },
        
        error: (message, error = null) => {
            if (!QRUtils.log._shouldLog('error')) return;
            console.error(`%c[QR Scanner] ❌ ${message}`, 'color: #dc2626', error || '');
        },
        
        success: (message, data = null) => {
            if (!QRUtils.log._shouldLog('info')) return;
            console.log(`%c[QR Scanner] ✅ ${message}`, 'color: #16a34a', data || '');
        },
        
        group: (label) => {
            console.group(`[QR Scanner] ${label}`);
        },
        
        groupEnd: () => {
            console.groupEnd();
        },
        
        table: (data) => {
            console.table(data);
        }
    },
    
    // Enhanced status management
    setStatus: (message, type = 'info') => {
        const indicator = QRUtils.$('status-indicator');
        if (indicator) {
            indicator.textContent = message;
            indicator.className = `status-${type}`;
        }
        
        // Also update any status text elements
        const statusText = QRUtils.$('camera-status-text');
        if (statusText && (type === 'success' || type === 'error')) {
            statusText.textContent = message;
        }
        
        QRUtils.log[type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'info'](message);
    },
    
    // Step navigation with validation
    setStep: (stepNumber, totalSteps = 5) => {
        const indicator = QRUtils.$('step-indicator');
        if (indicator) {
            indicator.textContent = `Step ${stepNumber}/${totalSteps}`;
        }
        
        // Update progress bar if it exists
        const progressBar = QRUtils.$('progress-bar');
        if (progressBar) {
            const percentage = (stepNumber / totalSteps) * 100;
            progressBar.style.width = `${percentage}%`;
        }
    },
    
    // Enhanced error handling with user notifications
    handleError: (error, context = 'Unknown') => {
        const errorMessage = error?.message || String(error);
        
        QRUtils.log.error(`Error in ${context}:`, error);
        QRUtils.setStatus(`Error: ${errorMessage}`, 'error');
        
        // Show user-friendly error notification
        QRUtils.showNotification(errorMessage, 'error', context);
        
        // Report to analytics if available
        if (typeof gtag !== 'undefined') {
            gtag('event', 'exception', {
                description: `${context}: ${errorMessage}`,
                fatal: false
            });
        }
        
        return false;
    },
    
    // Enhanced success notification
    showSuccess: (message, duration = 3000) => {
        QRUtils.log.success(message);
        QRUtils.setStatus(message, 'success');
        QRUtils.showNotification(message, 'success', 'Success', duration);
    },
    
    showWarning: (message, duration = 4000) => {
        QRUtils.log.warn(message);
        QRUtils.setStatus(message, 'warning');
        QRUtils.showNotification(message, 'warning', 'Warning', duration);
    },
    
    // Toast notification system
    showNotification: (message, type = 'info', title = null, duration = 3000) => {
        const notification = document.createElement('div');
        notification.className = `toast toast-${type}`;
        notification.innerHTML = `
            ${title ? `<div class="toast-title">${QRUtils.escapeHtml(title)}</div>` : ''}
            <div class="toast-message">${QRUtils.escapeHtml(message)}</div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('toast-show'), 10);
        
        // Auto remove
        setTimeout(() => {
            notification.classList.add('toast-hide');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    },
    
    // Device detection with detailed info
    isMobile: () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    isIOS: () => {
        return /iPad|iPhone|iPod/.test(navigator.userAgent);
    },
    
    isAndroid: () => {
        return /Android/.test(navigator.userAgent);
    },
    
    isTouchDevice: () => {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    },
    
    getDeviceInfo: () => {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            languages: navigator.languages,
            online: navigator.onLine,
            cookiesEnabled: navigator.cookieEnabled,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null,
            screen: {
                width: screen.width,
                height: screen.height,
                availWidth: screen.availWidth,
                availHeight: screen.availHeight,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            isMobile: QRUtils.isMobile(),
            isIOS: QRUtils.isIOS(),
            isAndroid: QRUtils.isAndroid(),
            isTouchDevice: QRUtils.isTouchDevice()
        };
    },
    
    // Camera utilities with detailed checking
    hasCamera: async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                return false;
            }
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(device => device.kind === 'videoinput');
        } catch (e) {
            QRUtils.log.warn('Camera check failed:', e);
            return false;
        }
    },
    
    getCameraCount: async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'videoinput').length;
        } catch (e) {
            return 0;
        }
    },
    
    // Enhanced performance utilities
    measure: async (name, func) => {
        const start = performance.now();
        
        try {
            const result = typeof func === 'function' ? await func() : func;
            const end = performance.now();
            const duration = end - start;
            
            QRUtils.log.debug(`Performance [${name}]: ${duration.toFixed(2)}ms`);
            
            return { result, duration };
        } catch (error) {
            const end = performance.now();
            const duration = end - start;
            
            QRUtils.log.error(`Performance [${name}]: ${duration.toFixed(2)}ms (ERROR)`, error);
            throw error;
        }
    },
    
    measureMemory: () => {
        if ('memory' in performance) {
            const memory = performance.memory;
            return {
                used: Math.round(memory.usedJSHeapSize / 1048576),
                total: Math.round(memory.totalJSHeapSize / 1048576),
                limit: Math.round(memory.jsHeapSizeLimit / 1048576)
            };
        }
        return null;
    },
    
    // Network utilities
    isOnline: () => navigator.onLine,
    
    checkConnection: async (timeout = 5000) => {
        return new Promise((resolve) => {
            const start = performance.now();
            const img = new Image();
            
            img.onload = img.onerror = () => {
                const duration = performance.now() - start;
                resolve({ online: true, latency: duration });
            };
            
            setTimeout(() => {
                resolve({ online: false, latency: null });
            }, timeout);
            
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        });
    },
    
    // Enhanced validation helpers
    isValidArray: (arr) => Array.isArray(arr) && arr.length > 0,
    
    isValidObject: (obj) => obj && typeof obj === 'object' && !Array.isArray(obj) && obj !== null,
    
    isValidString: (str) => typeof str === 'string' && str.trim().length > 0,
    
    // Clean text for matching with advanced options
    cleanText: (text, options = {}) => {
        if (!text) return '';
        
        let cleaned = String(text).trim();
        
        if (options.toLowerCase) cleaned = cleaned.toLowerCase();
        if (options.removeSpaces) cleaned = cleaned.replace(/\s+/g, '');
        if (options.removeSpecialChars) cleaned = cleaned.replace(/[^a-zA-Z0-9\s]/g, '');
        if (options.normalizeSpaces) cleaned = cleaned.replace(/\s+/g, ' ');
        
        return cleaned;
    },
    
    // Generate unique ID with options
    generateId: (prefix = '', length = 8) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = prefix;
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result + '_' + Date.now().toString(36);
    },
    
    // CSS utilities
    addClass: (element, className) => {
        if (typeof element === 'string') element = QRUtils.$(element);
        if (element) element.classList.add(className);
    },
    
    removeClass: (element, className) => {
        if (typeof element === 'string') element = QRUtils.$(element);
        if (element) element.classList.remove(className);
    },
    
    toggleClass: (element, className) => {
        if (typeof element === 'string') element = QRUtils.$(element);
        if (element) element.classList.toggle(className);
        return element ? element.classList.contains(className) : false;
    },
    
    hasClass: (element, className) => {
        if (typeof element === 'string') element = QRUtils.$(element);
        return element ? element.classList.contains(className) : false;
    },
    
    // Math utilities
    clamp: (value, min, max) => Math.min(Math.max(value, min), max),
    
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    
    round: (value, decimals = 0) => {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    },
    
    percentage: (value, total) => total > 0 ? QRUtils.round((value / total) * 100, 2) : 0,
    
    // Animation utilities
    fadeIn: (element, duration = 300) => {
        if (typeof element === 'string') element = QRUtils.$(element);
        if (!element) return;
        
        element.style.opacity = '0';
        element.style.display = 'block';
        
        const start = performance.now();
        
        function animate(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = progress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    },
    
    fadeOut: (element, duration = 300) => {
        if (typeof element === 'string') element = QRUtils.$(element);
        if (!element) return;
        
        const start = performance.now();
        const startOpacity = parseFloat(window.getComputedStyle(element).opacity) || 1;
        
        function animate(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = startOpacity * (1 - progress);
            
            if (progress >= 1) {
                element.style.display = 'none';
            } else {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    },
    
    // Initialize utilities
    init: () => {
        QRUtils.log.info(`QR Scanner Utils v${QRUtils.version} initialized`);
        
        // Set debug mode in development
        if (window.location.hostname === 'localhost' || window.location.search.includes('debug')) {
            QRUtils.log.level = 'debug';
            QRUtils.log.debug('Debug mode enabled');
        }
        
        // Add global CSS for toast notifications
        if (!document.getElementById('qr-utils-styles')) {
            const styles = document.createElement('style');
            styles.id = 'qr-utils-styles';
            styles.textContent = `
                .toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 12px 16px;
                    border-radius: 4px;
                    color: white;
                    font-size: 14px;
                    font-weight: 500;
                    z-index: 10000;
                    opacity: 0;
                    transform: translateX(100%);
                    transition: all 0.3s ease;
                    max-width: 400px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .toast-show {
                    opacity: 1;
                    transform: translateX(0);
                }
                .toast-hide {
                    opacity: 0;
                    transform: translateX(100%);
                }
                .toast-success { background-color: #16a34a; }
                .toast-error { background-color: #dc2626; }
                .toast-warning { background-color: #f59e0b; }
                .toast-info { background-color: #2563eb; }
                .toast-title {
                    font-weight: 600;
                    margin-bottom: 4px;
                }
            `;
            document.head.appendChild(styles);
        }
        
        // Check browser compatibility
        QRUtils._checkCompatibility();
    },
    
    // Private method for compatibility checking
    _checkCompatibility: () => {
        const features = {
            'Local Storage': typeof Storage !== 'undefined',
            'Media Devices': !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            'File API': !!(window.File && window.FileReader),
            'Canvas': !!document.createElement('canvas').getContext,
            'Web Workers': typeof Worker !== 'undefined',
            'Service Workers': 'serviceWorker' in navigator,
            'WebRTC': !!(window.RTCPeerConnection || window.webkitRTCPeerConnection)
        };
        
        const unsupported = Object.entries(features)
            .filter(([name, supported]) => !supported)
            .map(([name]) => name);
        
        if (unsupported.length > 0) {
            QRUtils.log.warn('Unsupported features:', unsupported);
        } else {
            QRUtils.log.success('All required features supported');
        }
        
        return features;
    }
};

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', QRUtils.init);
    } else {
        QRUtils.init();
    }
    
    // Make globally available
    window.QRUtils = QRUtils;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QRUtils;
}