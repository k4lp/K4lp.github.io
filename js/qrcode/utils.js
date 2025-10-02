/**
 * QR Code Component Scanner - Utility Functions (Enhanced)
 * Alica Technologies
 */

window.QRScannerUtils = {

    /**
     * DOM Utilities
     */
    dom: {
        /**
         * Get element by ID
         * @param {string} id - Element ID
         * @returns {HTMLElement|null}
         */
        get: (id) => document.getElementById(id),

        /**
         * Show element
         * @param {string|HTMLElement} element - Element ID or element
         */
        show: (element) => {
            const el = typeof element === 'string' ? document.getElementById(element) : element;
            if (el) el.classList.remove(window.QRScannerConfig.CLASSES.HIDDEN);
        },

        /**
         * Hide element
         * @param {string|HTMLElement} element - Element ID or element
         */
        hide: (element) => {
            const el = typeof element === 'string' ? document.getElementById(element) : element;
            if (el) el.classList.add(window.QRScannerConfig.CLASSES.HIDDEN);
        },

        /**
         * Toggle element visibility
         * @param {string|HTMLElement} element - Element ID or element
         */
        toggle: (element) => {
            const el = typeof element === 'string' ? document.getElementById(element) : element;
            if (el) el.classList.toggle(window.QRScannerConfig.CLASSES.HIDDEN);
        },

        /**
         * Enable/disable element
         * @param {string|HTMLElement} element - Element ID or element
         * @param {boolean} enabled - Enable/disable state
         */
        setEnabled: (element, enabled) => {
            const el = typeof element === 'string' ? document.getElementById(element) : element;
            if (el) {
                el.disabled = !enabled;
                if (enabled) {
                    el.classList.remove(window.QRScannerConfig.CLASSES.DISABLED);
                } else {
                    el.classList.add(window.QRScannerConfig.CLASSES.DISABLED);
                }
            }
        },

        /**
         * Clear element content
         * @param {string|HTMLElement} element - Element ID or element
         */
        clear: (element) => {
            const el = typeof element === 'string' ? document.getElementById(element) : element;
            if (el) el.innerHTML = '';
        },

        /**
         * Set element text content
         * @param {string|HTMLElement} element - Element ID or element
         * @param {string} text - Text content
         */
        setText: (element, text) => {
            const el = typeof element === 'string' ? document.getElementById(element) : element;
            if (el) el.textContent = text;
        },

        /**
         * Set element HTML content
         * @param {string|HTMLElement} element - Element ID or element
         * @param {string} html - HTML content
         */
        setHTML: (element, html) => {
            const el = typeof element === 'string' ? document.getElementById(element) : element;
            if (el) el.innerHTML = html;
        },

        /**
         * Create HTML element with attributes
         * @param {string} tagName - Tag name
         * @param {Object} attributes - Attributes object
         * @param {string} content - Inner content
         * @returns {HTMLElement}
         */
        create: (tagName, attributes = {}, content = '') => {
            const element = document.createElement(tagName);
            Object.entries(attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
            if (content) element.innerHTML = content;
            return element;
        },

        /**
         * Check if element exists and is visible
         * @param {string|HTMLElement} element - Element ID or element
         * @returns {boolean}
         */
        isVisible: (element) => {
            const el = typeof element === 'string' ? document.getElementById(element) : element;
            if (!el) return false;
            return !el.classList.contains(window.QRScannerConfig.CLASSES.HIDDEN) && 
                   el.offsetParent !== null;
        }
    },

    /**
     * File Utilities
     */
    file: {
        /**
         * Format file size for display
         * @param {number} bytes - File size in bytes
         * @returns {string} - Formatted size string
         */
        formatSize: (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },

        /**
         * Check if file type is supported
         * @param {string} fileName - File name
         * @param {Array} supportedTypes - Array of supported extensions
         * @returns {boolean}
         */
        isTypeSupported: (fileName, supportedTypes) => {
            const extension = '.' + fileName.split('.').pop().toLowerCase();
            return supportedTypes.includes(extension);
        },

        /**
         * Validate file size
         * @param {number} fileSize - File size in bytes
         * @param {number} maxSize - Maximum allowed size in bytes
         * @returns {boolean}
         */
        isValidSize: (fileSize, maxSize) => fileSize <= maxSize,

        /**
         * Get file extension
         * @param {string} fileName - File name
         * @returns {string} - File extension (lowercase)
         */
        getExtension: (fileName) => {
            return fileName.split('.').pop().toLowerCase();
        }
    },

    /**
     * Excel Utilities
     */
    excel: {
        /**
         * Convert column number to letter (1 = A, 26 = Z, 27 = AA)
         * @param {number} num - Column number
         * @returns {string} - Column letter
         */
        numToCol: (num) => {
            let result = '';
            while (num > 0) {
                num--;
                result = String.fromCharCode(65 + (num % 26)) + result;
                num = Math.floor(num / 26);
            }
            return result;
        },

        /**
         * Convert column letter to number (A = 1, Z = 26, AA = 27)
         * @param {string} col - Column letter
         * @returns {number} - Column number
         */
        colToNum: (col) => {
            let result = 0;
            for (let i = 0; i < col.length; i++) {
                result = result * 26 + (col.charCodeAt(i) - 64);
            }
            return result;
        },

        /**
         * Get cell reference from row and column
         * @param {number} row - Row number (1-based)
         * @param {number} col - Column number (1-based)
         * @returns {string} - Cell reference (e.g., "A1")
         */
        getCellRef: (row, col) => {
            return window.QRScannerUtils.excel.numToCol(col) + row;
        },

        /**
         * Parse cell reference to row and column
         * @param {string} cellRef - Cell reference (e.g., "A1")
         * @returns {Object|null} - {row, col} or null if invalid
         */
        parseCellRef: (cellRef) => {
            const match = cellRef.match(/^([A-Z]+)(\d+)$/);
            if (!match) return null;
            return {
                col: window.QRScannerUtils.excel.colToNum(match[1]),
                row: parseInt(match[2])
            };
        },

        /**
         * Convert cell reference to position object
         * @param {string} cellRef - Cell reference (e.g., "A1")
         * @returns {Object|null} - {row, col} or null if invalid
         */
        cellRefToPosition: (cellRef) => {
            return window.QRScannerUtils.excel.parseCellRef(cellRef);
        },

        /**
         * Validate cell reference format
         * @param {string} cellRef - Cell reference to validate
         * @returns {boolean} - True if valid
         */
        isValidCellRef: (cellRef) => {
            return /^[A-Z]+[1-9]\d*$/.test(cellRef);
        },

        /**
         * Get range string from start and end positions
         * @param {Object} start - Start position {row, col}
         * @param {Object} end - End position {row, col}
         * @returns {string} - Range string (e.g., "A1:C10")
         */
        getRangeString: (start, end) => {
            const startRef = window.QRScannerUtils.excel.getCellRef(start.row, start.col);
            const endRef = window.QRScannerUtils.excel.getCellRef(end.row, end.col);
            return `${startRef}:${endRef}`;
        },

        /**
         * Parse range string to start and end positions
         * @param {string} rangeString - Range string (e.g., "A1:C10")
         * @returns {Object|null} - {start: {row, col}, end: {row, col}} or null if invalid
         */
        parseRangeString: (rangeString) => {
            const parts = rangeString.split(':');
            if (parts.length !== 2) return null;
            
            const start = window.QRScannerUtils.excel.parseCellRef(parts[0]);
            const end = window.QRScannerUtils.excel.parseCellRef(parts[1]);
            
            if (!start || !end) return null;
            
            return { start, end };
        }
    },

    /**
     * Validation Utilities
     */
    validation: {
        /**
         * Check if value is empty or whitespace
         * @param {any} value - Value to check
         * @returns {boolean}
         */
        isEmpty: (value) => {
            return value === null || value === undefined || 
                   (typeof value === 'string' && value.trim() === '');
        },

        /**
         * Validate email format
         * @param {string} email - Email address
         * @returns {boolean}
         */
        isValidEmail: (email) => {
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return regex.test(email);
        },

        /**
         * Validate numeric value
         * @param {any} value - Value to check
         * @returns {boolean}
         */
        isNumeric: (value) => {
            return !isNaN(value) && !isNaN(parseFloat(value));
        },

        /**
         * Validate positive integer
         * @param {any} value - Value to check
         * @returns {boolean}
         */
        isPositiveInteger: (value) => {
            return Number.isInteger(value) && value > 0;
        }
    },

    /**
     * String Utilities
     */
    string: {
        /**
         * Escape HTML characters
         * @param {string} str - String to escape
         * @returns {string} - Escaped string
         */
        escapeHtml: (str) => {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },

        /**
         * Truncate string to specified length
         * @param {string} str - String to truncate
         * @param {number} length - Maximum length
         * @param {string} suffix - Suffix for truncated string
         * @returns {string} - Truncated string
         */
        truncate: (str, length, suffix = '...') => {
            if (!str) return '';
            return str.length > length ? str.substring(0, length) + suffix : str;
        },

        /**
         * Convert string to title case
         * @param {string} str - String to convert
         * @returns {string} - Title case string
         */
        toTitleCase: (str) => {
            return str.replace(/\w\S*/g, (txt) => {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
        },

        /**
         * Clean and normalize string
         * @param {string} str - String to clean
         * @returns {string} - Cleaned string
         */
        clean: (str) => {
            if (!str) return '';
            return str.toString().trim().replace(/\s+/g, ' ');
        },

        /**
         * Generate random string
         * @param {number} length - Length of random string
         * @returns {string} - Random string
         */
        random: (length = 8) => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        }
    },

    /**
     * Date/Time Utilities
     */
    date: {
        /**
         * Format timestamp for display
         * @param {Date|number} timestamp - Date object or timestamp
         * @returns {string} - Formatted date string
         */
        format: (timestamp) => {
            const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
            return date.toLocaleString();
        },

        /**
         * Get current timestamp
         * @returns {number} - Current timestamp
         */
        now: () => Date.now(),

        /**
         * Calculate time difference in minutes
         * @param {number} startTime - Start timestamp
         * @param {number} endTime - End timestamp (defaults to now)
         * @returns {number} - Difference in minutes
         */
        diffMinutes: (startTime, endTime = Date.now()) => {
            return Math.round((endTime - startTime) / 60000);
        },

        /**
         * Format timestamp as ISO string
         * @param {Date|number} timestamp - Date object or timestamp
         * @returns {string} - ISO date string
         */
        toISO: (timestamp = Date.now()) => {
            const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
            return date.toISOString();
        }
    },

    /**
     * Array Utilities
     */
    array: {
        /**
         * Remove duplicates from array
         * @param {Array} arr - Input array
         * @returns {Array} - Array without duplicates
         */
        unique: (arr) => [...new Set(arr)],

        /**
         * Group array by key
         * @param {Array} arr - Input array
         * @param {string|Function} key - Key to group by
         * @returns {Object} - Grouped object
         */
        groupBy: (arr, key) => {
            const keyFn = typeof key === 'function' ? key : (item) => item[key];
            return arr.reduce((groups, item) => {
                const group = keyFn(item);
                groups[group] = groups[group] || [];
                groups[group].push(item);
                return groups;
            }, {});
        },

        /**
         * Chunk array into smaller arrays
         * @param {Array} arr - Input array
         * @param {number} size - Chunk size
         * @returns {Array} - Array of chunks
         */
        chunk: (arr, size) => {
            const chunks = [];
            for (let i = 0; i < arr.length; i += size) {
                chunks.push(arr.slice(i, i + size));
            }
            return chunks;
        },

        /**
         * Flatten nested array
         * @param {Array} arr - Input array
         * @returns {Array} - Flattened array
         */
        flatten: (arr) => arr.flat(Infinity),

        /**
         * Check if array is empty or contains only empty values
         * @param {Array} arr - Input array
         * @returns {boolean} - True if effectively empty
         */
        isEmpty: (arr) => {
            return !arr || arr.length === 0 || 
                   arr.every(item => window.QRScannerUtils.validation.isEmpty(item));
        }
    },

    /**
     * Audio Utilities
     */
    audio: {
        /**
         * Play audio feedback using Web Audio API
         * @param {number} frequency - Frequency in Hz
         * @param {number} duration - Duration in ms
         * @param {number} volume - Volume 0.0 to 1.0
         */
        playTone: (frequency, duration, volume = 0.3) => {
            if (!window.QRScannerConfig.SCANNER.AUDIO_FEEDBACK) return;

            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = frequency;
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
                gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration / 1000);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + duration / 1000);
            } catch (error) {
                window.QRScannerUtils.log.warn('Audio feedback not supported:', error);
            }
        },

        /**
         * Play success sound
         */
        success: () => {
            const config = window.QRScannerConfig.AUDIO;
            window.QRScannerUtils.audio.playTone(config.SUCCESS_FREQUENCY, config.SUCCESS_DURATION, config.VOLUME);
        },

        /**
         * Play error sound
         */
        error: () => {
            const config = window.QRScannerConfig.AUDIO;
            window.QRScannerUtils.audio.playTone(config.ERROR_FREQUENCY, config.ERROR_DURATION, config.VOLUME);
        }
    },

    /**
     * Vibration Utilities
     */
    vibration: {
        /**
         * Trigger device vibration if supported
         * @param {number|Array} pattern - Vibration pattern
         */
        vibrate: (pattern) => {
            if (!window.QRScannerConfig.SCANNER.VIBRATION_FEEDBACK) return;

            try {
                if ('vibrate' in navigator) {
                    navigator.vibrate(pattern);
                }
            } catch (error) {
                window.QRScannerUtils.log.warn('Vibration not supported:', error);
            }
        },

        /**
         * Success vibration pattern
         */
        success: () => {
            window.QRScannerUtils.vibration.vibrate([100]);
        },

        /**
         * Error vibration pattern
         */
        error: () => {
            window.QRScannerUtils.vibration.vibrate([200, 100, 200]);
        }
    },

    /**
     * Device Utilities
     */
    device: {
        /**
         * Check if device is mobile
         * @returns {boolean} - True if mobile device
         */
        isMobile: () => {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        },

        /**
         * Check if device supports touch
         * @returns {boolean} - True if touch supported
         */
        isTouch: () => {
            return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        },

        /**
         * Get device info
         * @returns {Object} - Device information
         */
        getInfo: () => {
            return {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine,
                isMobile: window.QRScannerUtils.device.isMobile(),
                isTouch: window.QRScannerUtils.device.isTouch()
            };
        }
    },

    /**
     * Performance Utilities
     */
    performance: {
        /**
         * Start performance timer
         * @param {string} label - Timer label
         */
        startTimer: (label) => {
            if (window.QRScannerConfig.DEBUG) {
                console.time(label);
            }
        },

        /**
         * End performance timer
         * @param {string} label - Timer label
         */
        endTimer: (label) => {
            if (window.QRScannerConfig.DEBUG) {
                console.timeEnd(label);
            }
        },

        /**
         * Measure function execution time
         * @param {Function} fn - Function to measure
         * @param {string} label - Measurement label
         * @returns {any} - Function result
         */
        measure: (fn, label = 'Function') => {
            const start = performance.now();
            const result = fn();
            const end = performance.now();
            
            if (window.QRScannerConfig.DEBUG) {
                console.log(`${label} took ${end - start} milliseconds.`);
            }
            
            return result;
        }
    },

    /**
     * Debounce and Throttle Utilities
     */
    control: {
        /**
         * Debounce function calls
         * @param {Function} func - Function to debounce
         * @param {number} wait - Wait time in ms
         * @param {boolean} immediate - Execute immediately
         * @returns {Function} - Debounced function
         */
        debounce: (func, wait, immediate) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    timeout = null;
                    if (!immediate) func(...args);
                };
                const callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func(...args);
            };
        },

        /**
         * Throttle function calls
         * @param {Function} func - Function to throttle
         * @param {number} limit - Time limit in ms
         * @returns {Function} - Throttled function
         */
        throttle: (func, limit) => {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }
    },

    /**
     * Logging Utilities
     */
    log: {
        /**
         * Log debug message
         * @param {string} message - Log message
         * @param {...any} args - Additional arguments
         */
        debug: (message, ...args) => {
            if (window.QRScannerConfig && window.QRScannerConfig.DEBUG) {
                console.log(`[QR Scanner Debug] ${message}`, ...args);
            }
        },

        /**
         * Log info message
         * @param {string} message - Log message
         * @param {...any} args - Additional arguments
         */
        info: (message, ...args) => {
            console.info(`[QR Scanner] ${message}`, ...args);
        },

        /**
         * Log warning message
         * @param {string} message - Log message
         * @param {...any} args - Additional arguments
         */
        warn: (message, ...args) => {
            console.warn(`[QR Scanner Warning] ${message}`, ...args);
        },

        /**
         * Log error message
         * @param {string} message - Log message
         * @param {...any} args - Additional arguments
         */
        error: (message, ...args) => {
            console.error(`[QR Scanner Error] ${message}`, ...args);
        }
    }
};

// Make utils available globally for debugging
if (window.QRScannerConfig && window.QRScannerConfig.DEBUG) {
    window.QRUtils = window.QRScannerUtils;
}