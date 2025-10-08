/**
 * Excel API Processor - Utilities
 * Alica Technologies
 */

window.ExcelProcessorUtils = {
    // DOM manipulation utilities
    dom: {
        get: (id) => document.getElementById(id),
        show: (elementOrId) => {
            const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
            if (el) el.style.display = 'block';
        },
        hide: (elementOrId) => {
            const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
            if (el) el.style.display = 'none';
        },
        toggle: (elementOrId) => {
            const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
            if (el) {
                el.style.display = el.style.display === 'none' ? 'block' : 'none';
            }
        },
        setText: (elementOrId, text) => {
            const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
            if (el) el.textContent = text;
        },
        setHtml: (elementOrId, html) => {
            const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
            if (el) el.innerHTML = html;
        },
        getValue: (elementOrId) => {
            const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
            return el ? el.value : '';
        },
        setValue: (elementOrId, value) => {
            const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
            if (el) el.value = value;
        },
        addClass: (elementOrId, className) => {
            const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
            if (el) el.classList.add(className);
        },
        removeClass: (elementOrId, className) => {
            const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
            if (el) el.classList.remove(className);
        },
        hasClass: (elementOrId, className) => {
            const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
            return el ? el.classList.contains(className) : false;
        }
    },

    // String utilities
    string: {
        truncate: (str, length = 50) => {
            if (!str) return '';
            return str.length > length ? str.substring(0, length) + '...' : str;
        },
        capitalize: (str) => {
            if (!str) return '';
            return str.charAt(0).toUpperCase() + str.slice(1);
        },
        sanitize: (str) => {
            if (!str) return '';
            return String(str).replace(/[<>"'&]/g, '');
        },
        isEmail: (str) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(str);
        }
    },

    // File utilities
    file: {
        formatSize: (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },
        getExtension: (filename) => {
            return '.' + filename.split('.').pop().toLowerCase();
        },
        isTypeSupported: (filename, supportedTypes) => {
            const ext = window.ExcelProcessorUtils.file.getExtension(filename);
            return supportedTypes.includes(ext);
        },
        isValidSize: (size, maxSize) => {
            return size <= maxSize;
        }
    },

    // Excel utilities
    excel: {
        numToCol: (num) => {
            let result = '';
            while (num > 0) {
                num--;
                result = String.fromCharCode(65 + (num % 26)) + result;
                num = Math.floor(num / 26);
            }
            return result;
        },
        colToNum: (col) => {
            let result = 0;
            for (let i = 0; i < col.length; i++) {
                result = result * 26 + (col.charCodeAt(i) - 64);
            }
            return result;
        },
        getCellAddress: (row, col) => {
            return window.ExcelProcessorUtils.excel.numToCol(col + 1) + (row + 1);
        }
    },

    // Date/Time utilities
    datetime: {
        formatTime: (date = new Date()) => {
            return date.toLocaleTimeString('en-US', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        },
        formatDateTime: (date = new Date()) => {
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        },
        getTimestamp: () => {
            return new Date().toISOString().replace(/[:.]/g, '-').substr(0, 19);
        }
    },

    // Logging utilities
    log: {
        info: (message, ...args) => {
            console.log(`[EXCE INFO] ${message}`, ...args);
            window.ExcelProcessorUtils.log._addToActivityLog('info', message);
        },
        warn: (message, ...args) => {
            console.warn(`[EXCE WARN] ${message}`, ...args);
            window.ExcelProcessorUtils.log._addToActivityLog('warning', message);
        },
        error: (message, ...args) => {
            console.error(`[EXCE ERROR] ${message}`, ...args);
            window.ExcelProcessorUtils.log._addToActivityLog('error', message);
        },
        debug: (message, ...args) => {
            if (window.ExcelProcessorConfig?.DEBUG) {
                console.log(`[EXCE DEBUG] ${message}`, ...args);
            }
        },
        _addToActivityLog: (type, message) => {
            const logEl = window.ExcelProcessorUtils.dom.get(window.ExcelProcessorConfig.ELEMENTS.ACTIVITY_LOG);
            if (logEl) {
                const time = window.ExcelProcessorUtils.datetime.formatTime();
                const prefix = type === 'error' ? '✗' : type === 'warning' ? '⚠' : '•';
                const newLine = `\n[${time}] ${prefix} ${message}`;
                logEl.textContent += newLine;
                logEl.scrollTop = logEl.scrollHeight;
            }
        }
    },

    // API utilities
    api: {
        sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
        
        makeRequest: async (url, options = {}) => {
            const defaultOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: window.ExcelProcessorConfig.PROCESSING.TIMEOUT
            };

            const finalOptions = { ...defaultOptions, ...options };
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), finalOptions.timeout);
            
            try {
                const response = await fetch(url, {
                    ...finalOptions,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return await response.json();
            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout');
                }
                throw error;
            }
        },

        retryRequest: async (requestFn, maxRetries = 3, delay = 1000) => {
            for (let i = 0; i <= maxRetries; i++) {
                try {
                    return await requestFn();
                } catch (error) {
                    if (i === maxRetries) throw error;
                    
                    window.ExcelProcessorUtils.log.warn(`Request failed (attempt ${i + 1}/${maxRetries + 1}), retrying...`);
                    await window.ExcelProcessorUtils.api.sleep(delay * (i + 1));
                }
            }
        }
    },

    // Storage utilities
    storage: {
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                window.ExcelProcessorUtils.log.error('Storage set failed:', error.message);
                return false;
            }
        },
        get: (key, defaultValue = null) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                window.ExcelProcessorUtils.log.error('Storage get failed:', error.message);
                return defaultValue;
            }
        },
        remove: (key) => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                window.ExcelProcessorUtils.log.error('Storage remove failed:', error.message);
                return false;
            }
        },
        clear: () => {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                window.ExcelProcessorUtils.log.error('Storage clear failed:', error.message);
                return false;
            }
        }
    },

    // Validation utilities
    validation: {
        isRequired: (value) => {
            return value !== null && value !== undefined && String(value).trim() !== '';
        },
        isNumber: (value) => {
            return !isNaN(parseFloat(value)) && isFinite(value);
        },
        isInteger: (value) => {
            return Number.isInteger(Number(value));
        },
        isInRange: (value, min, max) => {
            const num = Number(value);
            return num >= min && num <= max;
        }
    },

    // Status management
    status: {
        setApiCount: (count) => {
            window.ExcelProcessorUtils.dom.setText(window.ExcelProcessorConfig.ELEMENTS.API_COUNT, count);
        },
        setSystemStatus: (status) => {
            window.ExcelProcessorUtils.dom.setText(window.ExcelProcessorConfig.ELEMENTS.SYSTEM_STATUS, status);
        },
        showProcessing: (show = true) => {
            if (show) {
                window.ExcelProcessorUtils.dom.show(window.ExcelProcessorConfig.ELEMENTS.PROCESSING_STATUS);
            } else {
                window.ExcelProcessorUtils.dom.hide(window.ExcelProcessorConfig.ELEMENTS.PROCESSING_STATUS);
            }
        },
        updateCredentialStatus: (type, isActive, message = '') => {
            const elementId = type === 'digikey' ? 
                window.ExcelProcessorConfig.ELEMENTS.DIGIKEY_STATUS : 
                window.ExcelProcessorConfig.ELEMENTS.MOUSER_STATUS;
            
            const statusEl = window.ExcelProcessorUtils.dom.get(elementId);
            if (statusEl) {
                const dotEl = statusEl.querySelector('.status-dot');
                const textEl = statusEl.querySelector('span');
                
                if (dotEl && textEl) {
                    // Remove all status classes
                    dotEl.classList.remove('status-dot--inactive', 'status-dot--success', 'status-dot--error');
                    
                    if (isActive) {
                        dotEl.classList.add('status-dot--success');
                        textEl.textContent = 'Active';
                    } else if (message) {
                        dotEl.classList.add('status-dot--error');
                        textEl.textContent = 'Error';
                        textEl.title = message;
                    } else {
                        dotEl.classList.add('status-dot--inactive');
                        textEl.textContent = 'Inactive';
                    }
                }
            }
        }
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.ExcelProcessorUtils;
}