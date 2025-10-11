/**
 * Excel API Processor - Enhanced Utils (FIXED)
 * Alica Technologies
 */

window.ExcelProcessorUtils = {
    // Enhanced logging with levels
    log: {
        _logLevel: 'info', // debug, info, warn, error
        _logHistory: [],
        _maxHistory: 100,

        _log(level, message, ...args) {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                level,
                message: typeof message === 'string' ? message : JSON.stringify(message),
                args: args.length > 0 ? args : undefined
            };

            // Add to history
            this._logHistory.push(logEntry);
            if (this._logHistory.length > this._maxHistory) {
                this._logHistory.shift();
            }

            // Console output with styling
            const styles = {
                debug: 'color: #666; font-size: 11px;',
                info: 'color: #2563eb; font-weight: 500;',
                warn: 'color: #d97706; font-weight: 500;',
                error: 'color: #dc2626; font-weight: bold;'
            };

            console.log(
                `%c[EXCE ${level.toUpperCase()}] ${logEntry.message}`,
                styles[level] || '',
                ...args
            );

            // Update activity log in UI
            this._updateActivityLog(logEntry);
        },

        _updateActivityLog(logEntry) {
            const logElement = document.getElementById('activityLog');
            if (!logElement) return;

            const logItem = document.createElement('div');
            logItem.className = `log-item log-item--${logEntry.level}`;
            logItem.innerHTML = `
                <span class="log-time">${new Date(logEntry.timestamp).toLocaleTimeString()}</span>
                <span class="log-message">${logEntry.message}</span>
            `;

            logElement.insertBefore(logItem, logElement.firstChild);

            // Keep only last 20 entries visible
            const items = logElement.querySelectorAll('.log-item');
            if (items.length > 20) {
                items[items.length - 1].remove();
            }
        },

        debug(message, ...args) { this._log('debug', message, ...args); },
        info(message, ...args) { this._log('info', message, ...args); },
        warn(message, ...args) { this._log('warn', message, ...args); },
        error(message, ...args) { this._log('error', message, ...args); },

        getHistory() { return [...this._logHistory]; },
        setLevel(level) { this._logLevel = level; }
    },

    // Enhanced DOM utilities
    dom: {
        get(elementId) {
            const element = document.getElementById(elementId);
            if (!element) {
                window.ExcelProcessorUtils.log.debug(`Element not found: ${elementId}`);
            }
            return element;
        },

        getValue(elementId) {
            const element = this.get(elementId);
            return element ? element.value : '';
        },

        setValue(elementId, value) {
            const element = this.get(elementId);
            if (element) {
                element.value = value;
                return true;
            }
            return false;
        },

        show(elementOrId) {
            const element = typeof elementOrId === 'string' ? 
                           this.get(elementOrId) : elementOrId;
            if (element) {
                element.style.display = 'block';
                return true;
            }
            return false;
        },

        hide(elementOrId) {
            const element = typeof elementOrId === 'string' ? 
                           this.get(elementOrId) : elementOrId;
            if (element) {
                element.style.display = 'none';
                return true;
            }
            return false;
        },

        toggle(elementOrId) {
            const element = typeof elementOrId === 'string' ? 
                           this.get(elementOrId) : elementOrId;
            if (element) {
                const isHidden = element.style.display === 'none' || 
                               window.getComputedStyle(element).display === 'none';
                element.style.display = isHidden ? 'block' : 'none';
                return !isHidden;
            }
            return false;
        },

        addClass(elementOrId, className) {
            const element = typeof elementOrId === 'string' ? 
                           this.get(elementOrId) : elementOrId;
            if (element && className) {
                element.classList.add(className);
                return true;
            }
            return false;
        },

        removeClass(elementOrId, className) {
            const element = typeof elementOrId === 'string' ? 
                           this.get(elementOrId) : elementOrId;
            if (element && className) {
                element.classList.remove(className);
                return true;
            }
            return false;
        },

        hasClass(elementOrId, className) {
            const element = typeof elementOrId === 'string' ? 
                           this.get(elementOrId) : elementOrId;
            return element && className ? element.classList.contains(className) : false;
        }
    },

    // Enhanced storage utilities with error handling
    storage: {
        get(key) {
            try {
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : null;
            } catch (error) {
                window.ExcelProcessorUtils.log.error(`Storage get error for key ${key}:`, error.message);
                return null;
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                window.ExcelProcessorUtils.log.error(`Storage set error for key ${key}:`, error.message);
                return false;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                window.ExcelProcessorUtils.log.error(`Storage remove error for key ${key}:`, error.message);
                return false;
            }
        },

        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                window.ExcelProcessorUtils.log.error('Storage clear error:', error.message);
                return false;
            }
        },

        getSize() {
            try {
                const total = JSON.stringify(localStorage).length;
                return { 
                    total, 
                    formatted: this._formatBytes(total * 2) // Approximate UTF-16 encoding
                };
            } catch (error) {
                return { total: 0, formatted: '0 B' };
            }
        },

        _formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
    },

    // Enhanced status management with API state visualization - FIXED
    status: {
        setApiCount(count) {
            const element = window.ExcelProcessorUtils.dom.get('apiCount');
            if (element) {
                element.textContent = count;
                element.className = count > 0 ? 'meta text-success' : 'meta';
            }
        },

        setSystemStatus(status) {
            const element = window.ExcelProcessorUtils.dom.get('systemStatus');
            if (element) {
                element.textContent = status;
                
                // Add appropriate styling based on status
                element.className = 'meta';
                if (status.toLowerCase().includes('error')) {
                    element.classList.add('text-error');
                } else if (status.toLowerCase().includes('ready')) {
                    element.classList.add('text-success');
                } else if (status.toLowerCase().includes('processing')) {
                    element.classList.add('text-warning');
                }
            }
        },

        // FIXED: Enhanced API state management with proper visual feedback
        updateCredentialStatus(apiType, isActive, message = null) {
            const statusId = `${apiType}Status`;
            const statusElement = window.ExcelProcessorUtils.dom.get(statusId);
            
            if (!statusElement) {
                window.ExcelProcessorUtils.log.warn(`Status element not found: ${statusId}`);
                return;
            }

            const dotElement = statusElement.querySelector('.status-dot');
            const textElement = statusElement.querySelector('span');
            
            if (!dotElement || !textElement) {
                window.ExcelProcessorUtils.log.warn(`Status sub-elements not found for: ${statusId}`);
                return;
            }

            // Clear existing classes
            dotElement.className = 'status-dot';
            
            if (message) {
                // Show custom message (e.g., "Testing...", "Connecting...")
                textElement.textContent = message;
                dotElement.classList.add('status-dot--warning');
                window.ExcelProcessorUtils.log.info(`${apiType} status: ${message}`);
            } else if (isActive) {
                // Active/Connected state
                textElement.textContent = 'Active';
                dotElement.classList.add('status-dot--active');
                window.ExcelProcessorUtils.log.info(`${apiType} is now active`);
            } else {
                // Inactive state
                textElement.textContent = 'Inactive';
                dotElement.classList.add('status-dot--inactive');
                window.ExcelProcessorUtils.log.info(`${apiType} is inactive`);
            }

            // Add API-specific status classes for additional styling
            statusElement.setAttribute('data-status', isActive ? 'active' : 'inactive');
            statusElement.setAttribute('data-api', apiType);
        },

        // Show/hide processing indicator
        showProcessing(show = true, message = 'Processing...') {
            const element = window.ExcelProcessorUtils.dom.get('processingStatus');
            if (element) {
                if (show) {
                    element.textContent = `🔄 ${message}`;
                    window.ExcelProcessorUtils.dom.show(element);
                } else {
                    window.ExcelProcessorUtils.dom.hide(element);
                }
            }
        },

        // Get comprehensive status overview
        getStatusOverview() {
            return {
                system: window.ExcelProcessorUtils.dom.get('systemStatus')?.textContent || 'Unknown',
                apiCount: parseInt(window.ExcelProcessorUtils.dom.get('apiCount')?.textContent || '0'),
                processing: window.ExcelProcessorUtils.dom.get('processingStatus')?.style.display !== 'none',
                digikey: this._getApiStatus('digikey'),
                mouser: this._getApiStatus('mouser')
            };
        },

        _getApiStatus(apiType) {
            const statusElement = window.ExcelProcessorUtils.dom.get(`${apiType}Status`);
            if (!statusElement) return 'unknown';
            
            const textElement = statusElement.querySelector('span');
            return textElement ? textElement.textContent.toLowerCase() : 'unknown';
        }
    },

    // DateTime utilities
    datetime: {
        getTimestamp() {
            return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
        },

        formatDate(date = new Date()) {
            return date.toLocaleDateString();
        },

        formatTime(date = new Date()) {
            return date.toLocaleTimeString();
        },

        formatDateTime(date = new Date()) {
            return date.toLocaleString();
        }
    },

    // File utilities
    file: {
        formatSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },

        getExtension(filename) {
            return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
        },

        getBaseName(filename) {
            return filename.replace(/\.[^/.]+$/, '');
        },

        isExcelFile(filename) {
            const ext = this.getExtension(filename).toLowerCase();
            return ['xlsx', 'xls'].includes(ext);
        }
    },

    // Network utilities for API calls
    network: {
        async fetchWithTimeout(url, options = {}, timeout = 30000) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout');
                }
                throw error;
            }
        },

        async retryFetch(url, options = {}, maxRetries = 3, delay = 1000) {
            let lastError;
            
            for (let i = 0; i <= maxRetries; i++) {
                try {
                    const response = await this.fetchWithTimeout(url, options);
                    return response;
                } catch (error) {
                    lastError = error;
                    if (i < maxRetries) {
                        window.ExcelProcessorUtils.log.warn(`Request failed, retrying in ${delay}ms... (${i + 1}/${maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        delay *= 2; // Exponential backoff
                    }
                }
            }
            
            throw lastError;
        }
    },

    // Validation utilities
    validation: {
        isValidEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },

        isValidUrl(url) {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        },

        isNumber(value) {
            return !isNaN(value) && isFinite(value);
        },

        isEmpty(value) {
            return value === null || value === undefined || 
                   (typeof value === 'string' && value.trim() === '') ||
                   (Array.isArray(value) && value.length === 0) ||
                   (typeof value === 'object' && Object.keys(value).length === 0);
        }
    },

    // Performance monitoring
    performance: {
        _marks: {},

        mark(name) {
            this._marks[name] = performance.now();
        },

        measure(name, startMark) {
            if (!this._marks[startMark]) {
                window.ExcelProcessorUtils.log.warn(`Start mark not found: ${startMark}`);
                return 0;
            }
            
            const duration = performance.now() - this._marks[startMark];
            window.ExcelProcessorUtils.log.debug(`${name}: ${duration.toFixed(2)}ms`);
            return duration;
        }
    }
};

// Initialize utilities when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.ExcelProcessorUtils.log.info('Enhanced utilities initialized');
    });
} else {
    window.ExcelProcessorUtils.log.info('Enhanced utilities initialized');
}