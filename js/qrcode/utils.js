/**
 * QR Code Component Scanner - Utility Functions
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
        isValidSize: (fileSize, maxSize) => fileSize <= maxSize
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
            return this.excel.numToCol(col) + row;
        },

        /**
         * Parse cell reference to row and column
         * @param {string} cellRef - Cell reference (e.g., "A1")
         * @returns {Object} - {row, col}
         */
        parseCellRef: (cellRef) => {
            const match = cellRef.match(/^([A-Z]+)(\d+)$/);
            if (!match) return null;
            return {
                col: this.excel.colToNum(match[1]),
                row: parseInt(match[2])
            };
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
                console.warn('Audio feedback not supported:', error);
            }
        },

        /**
         * Play success sound
         */
        success: () => {
            const config = window.QRScannerConfig.AUDIO;
            this.audio.playTone(config.SUCCESS_FREQUENCY, config.SUCCESS_DURATION, config.VOLUME);
        },

        /**
         * Play error sound
         */
        error: () => {
            const config = window.QRScannerConfig.AUDIO;
            this.audio.playTone(config.ERROR_FREQUENCY, config.ERROR_DURATION, config.VOLUME);
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
                console.warn('Vibration not supported:', error);
            }
        },

        /**
         * Success vibration pattern
         */
        success: () => {
            this.vibration.vibrate([100]);
        },

        /**
         * Error vibration pattern
         */
        error: () => {
            this.vibration.vibrate([200, 100, 200]);
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
            if (window.QRScannerConfig.DEBUG) {
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
if (window.QRScannerConfig.DEBUG) {
    window.QRUtils = window.QRScannerUtils;
}
