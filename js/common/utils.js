/**
 * Clean Utilities - Core utility functions for K4LP Engineering Tools
 * Single-responsibility module for common utility functions
 * Part of K4LP Engineering Tools - Swiss Minimalist Design
 */

class UtilityManager {
    constructor() {
        this.notificationSettings = {
            duration: 5000,
            position: 'top-right'
        };
    }

    /**
     * Show notification to user
     * @param {string} message - Message to display
     * @param {string} type - 'success', 'error', 'warning', 'info'
     * @param {Object} options - Additional options
     */
    showNotification(message, type = 'info', options = {}) {
        const config = { ...this.notificationSettings, ...options };
        
        // Remove any existing notifications
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} show`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after duration
        const timeout = setTimeout(() => {
            this.removeNotification(notification);
        }, config.duration);
        
        // Close button handler
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            clearTimeout(timeout);
            this.removeNotification(notification);
        });
        
        return notification;
    }

    /**
     * Remove notification with animation
     * @param {Element} notification - Notification element to remove
     */
    removeNotification(notification) {
        if (!notification || !notification.parentNode) return;
        
        notification.classList.remove('show');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    /**
     * Format date in readable format
     * @param {Date|string|number} date - Date to format
     * @returns {string} Formatted date string
     */
    formatDate(date) {
        const d = new Date(date);
        return d.toLocaleString();
    }

    /**
     * Debounce function calls to prevent excessive execution
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Deep clone an object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }

    /**
     * Generate random string
     * @param {number} length - Length of string
     * @returns {string} Random string
     */
    randomString(length = 8) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return result;
    }

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} Success status
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Copied to clipboard', 'success');
            return true;
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showNotification('Copied to clipboard', 'success');
                return true;
            } catch (fallbackError) {
                document.body.removeChild(textArea);
                this.showNotification('Failed to copy to clipboard', 'error');
                return false;
            }
        }
    }

    /**
     * Download data as file
     * @param {string} data - Data to download
     * @param {string} filename - Name of file
     * @param {string} mimeType - MIME type of file
     */
    downloadFile(data, filename, mimeType = 'text/plain') {
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    /**
     * Check if running on mobile device
     * @returns {boolean} True if mobile
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Get nested property from object safely
     * @param {Object} obj - Object to traverse
     * @param {string} path - Dot-notation path to property
     * @returns {*} Property value or undefined
     */
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Create performance timer
     * @param {string} label - Label for timer
     * @returns {Object} Timer object with elapsed() and stop() methods
     */
    createTimer(label = 'Timer') {
        const startTime = performance.now();
        
        return {
            elapsed: () => performance.now() - startTime,
            stop: () => {
                const elapsed = performance.now() - startTime;
                console.log(`${label}: ${elapsed.toFixed(2)}ms`);
                return elapsed;
            }
        };
    }

    /**
     * Format file size in human readable format
     * @param {number} bytes - Number of bytes
     * @returns {string} Formatted size string
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }
}

// Create and export singleton instance
const utils = new UtilityManager();
window.utils = utils;