/**
 * Excel API Processor - Clean Utilities
 * Simple utilities that just work
 * Alica Technologies
 */

'use strict';

// Clean, simple utilities namespace
window.ExcelUtils = {
    /**
     * Simple logging function
     * @param {string} level - Log level (INFO, WARN, ERROR)
     * @param {string} message - Log message
     * @param {*} data - Optional data to log
     */
    log: function(level, message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        
        // Update activity log if element exists
        const activityLog = document.getElementById('activityLog');
        if (activityLog) {
            const logEntry = document.createElement('div');
            logEntry.className = `log-item log-${level.toLowerCase()}`;
            logEntry.textContent = logMessage;
            activityLog.insertBefore(logEntry, activityLog.firstChild);
            
            // Keep only last 20 entries
            const entries = activityLog.children;
            if (entries.length > 20) {
                activityLog.removeChild(entries[entries.length - 1]);
            }
        }
        
        // Console output with appropriate method
        const consoleMethod = level === 'ERROR' ? 'error' : 
                             level === 'WARN' ? 'warn' : 'log';
        console[consoleMethod](logMessage, data || '');
    },
    
    /**
     * Format file size in human readable format
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size
     */
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    /**
     * Get file extension from filename
     * @param {string} filename - File name
     * @returns {string} File extension with dot
     */
    getFileExtension: function(filename) {
        return '.' + filename.split('.').pop().toLowerCase();
    },
    
    /**
     * Show/hide element
     * @param {string|Element} element - Element ID or element
     * @param {boolean} show - True to show, false to hide
     */
    toggleElement: function(element, show) {
        const el = typeof element === 'string' ? document.getElementById(element) : element;
        if (el) {
            el.style.display = show ? 'block' : 'none';
        }
    },
    
    /**
     * Set element text content
     * @param {string} elementId - Element ID
     * @param {string} text - Text to set
     */
    setText: function(elementId, text) {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = text;
        }
    },
    
    /**
     * Clear select options and add new ones
     * @param {string} selectId - Select element ID
     * @param {Array} options - Array of {value, text} objects
     * @param {string} defaultText - Default option text
     */
    populateSelect: function(selectId, options, defaultText = 'Select...') {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = `<option value="">${defaultText}</option>`;
        options.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.text;
            select.appendChild(optionEl);
        });
    },
    
    /**
     * Excel column number to letter (1 = A, 26 = Z, 27 = AA)
     * @param {number} num - Column number
     * @returns {string} Column letter
     */
    numToCol: function(num) {
        let result = '';
        while (num > 0) {
            num--;
            result = String.fromCharCode((num % 26) + 65) + result;
            num = Math.floor(num / 26);
        }
        return result;
    },
    
    /**
     * Show error message to user
     * @param {string} message - Error message
     * @param {string} title - Error title (optional)
     */
    showError: function(message, title = 'Error') {
        this.log('ERROR', `${title}: ${message}`);
        alert(`${title}\n\n${message}`);
    },
    
    /**
     * Show success message to user
     * @param {string} message - Success message
     */
    showSuccess: function(message) {
        this.log('INFO', message);
        // Could implement toast notifications here later
    },
    
    /**
     * Validate that required elements exist in DOM
     * @param {Array} elementIds - Array of required element IDs
     * @returns {boolean} True if all elements exist
     */
    validateRequiredElements: function(elementIds) {
        const missing = [];
        elementIds.forEach(id => {
            if (!document.getElementById(id)) {
                missing.push(id);
            }
        });
        
        if (missing.length > 0) {
            this.log('ERROR', 'Missing required DOM elements', missing);
            return false;
        }
        return true;
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        ExcelUtils.log('INFO', 'Excel utilities initialized');
    });
} else {
    ExcelUtils.log('INFO', 'Excel utilities initialized');
}