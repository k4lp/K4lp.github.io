/**
 * Clean Utilities - Essential helper functions only
 * Single responsibility: Core utilities for engineering workflows
 * NO MPN validation, NO email validation, NO package functions
 */

class UtilityManager {
    constructor() {
        this.notificationDuration = 3000;
    }

    /**
     * Show notification (clean, no bloat)
     * @param {string} message - Message to display
     * @param {string} type - 'success', 'error', 'warning', 'info'
     */
    showNotification(message, type = 'info') {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Show with animation
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Auto remove
        const timeout = setTimeout(() => this.removeNotification(notification), this.notificationDuration);
        
        // Manual close
        notification.querySelector('.notification-close').onclick = () => {
            clearTimeout(timeout);
            this.removeNotification(notification);
        };
    }

    /**
     * Remove notification with animation
     * @param {Element} notification - Notification element
     */
    removeNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    /**
     * Debounce function calls
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
     * Format date for display
     * @param {Date|string|number} date - Date to format
     * @returns {string} Formatted date
     */
    formatDate(date) {
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
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
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.cssText = 'position: fixed; opacity: 0; pointer-events: none;';
            document.body.appendChild(textarea);
            textarea.select();
            
            try {
                const success = document.execCommand('copy');
                document.body.removeChild(textarea);
                if (success) {
                    this.showNotification('Copied to clipboard', 'success');
                    return true;
                }
            } catch (fallbackError) {
                document.body.removeChild(textarea);
            }
            
            this.showNotification('Failed to copy', 'error');
            return false;
        }
    }

    /**
     * Download data as file
     * @param {string} data - Data to download
     * @param {string} filename - File name
     * @param {string} mimeType - MIME type
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
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    /**
     * Generate random ID
     * @param {number} length - ID length
     * @returns {string} Random ID
     */
    randomId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Format file size
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    /**
     * Check if device is mobile
     * @returns {boolean} Is mobile device
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Create performance timer
     * @param {string} label - Timer label
     * @returns {Object} Timer with stop() method
     */
    createTimer(label = 'Timer') {
        const start = performance.now();
        return {
            stop: () => {
                const elapsed = performance.now() - start;
                console.log(`${label}: ${elapsed.toFixed(2)}ms`);
                return elapsed;
            }
        };
    }
}

// Global instance
const utils = new UtilityManager();
window.utils = utils;