/**
 * Comprehensive Utility Functions for K4LP Engineering Tools
 * Provides common utilities for validation, formatting, calculations, and data processing
 * Part of K4LP Engineering Tools - Swiss Minimalist Design
 * @version 2.3.0 - Enhanced with engineering-specific utilities
 */

class UtilityManager {
    constructor() {
        this.version = '2.3.0';
        
        // Common engineering unit prefixes
        this.unitPrefixes = {
            'T': 1e12,   // Tera
            'G': 1e9,    // Giga
            'M': 1e6,    // Mega
            'k': 1e3,    // Kilo
            'K': 1e3,    // Kilo (alternative)
            '': 1,       // Base unit
            'm': 1e-3,   // Milli
            'u': 1e-6,   // Micro (alternative)
            'μ': 1e-6,   // Micro
            'n': 1e-9,   // Nano
            'p': 1e-12,  // Pico
            'f': 1e-15   // Femto
        };
        
        // Common engineering units
        this.engineeringUnits = {
            // Electrical
            'V': 'voltage',
            'A': 'current',
            'Ω': 'resistance',
            'ohm': 'resistance',
            'F': 'capacitance',
            'H': 'inductance',
            'W': 'power',
            'Hz': 'frequency',
            'Wh': 'energy',
            'VA': 'apparent_power',
            'VAR': 'reactive_power',
            
            // Physical
            'mm': 'length',
            'cm': 'length',
            'm': 'length',
            'in': 'length',
            'mil': 'length',
            'g': 'mass',
            'kg': 'mass',
            'oz': 'mass',
            'lb': 'mass',
            '°C': 'temperature',
            '°F': 'temperature',
            'K': 'temperature',
            
            // Time
            's': 'time',
            'min': 'time',
            'h': 'time',
            'ms': 'time',
            'us': 'time',
            'ns': 'time'
        };
        
        // Tolerance patterns for components
        this.tolerancePatterns = {
            '±': 'standard',
            '+/-': 'standard',
            '%': 'percentage',
            'ppm': 'parts_per_million'
        };
        
        // Common component packages
        this.packageTypes = {
            // SMD packages
            '0201': { type: 'chip', metric: '0603', length: 0.6, width: 0.3 },
            '0402': { type: 'chip', metric: '1005', length: 1.0, width: 0.5 },
            '0603': { type: 'chip', metric: '1608', length: 1.6, width: 0.8 },
            '0805': { type: 'chip', metric: '2012', length: 2.0, width: 1.25 },
            '1206': { type: 'chip', metric: '3216', length: 3.2, width: 1.6 },
            '1210': { type: 'chip', metric: '3225', length: 3.2, width: 2.5 },
            '2010': { type: 'chip', metric: '5025', length: 5.0, width: 2.5 },
            '2512': { type: 'chip', metric: '6432', length: 6.4, width: 3.2 },
            
            // Through-hole packages
            'DIP-8': { type: 'dip', pins: 8, pitch: 2.54 },
            'DIP-14': { type: 'dip', pins: 14, pitch: 2.54 },
            'DIP-16': { type: 'dip', pins: 16, pitch: 2.54 },
            'DIP-20': { type: 'dip', pins: 20, pitch: 2.54 },
            'DIP-28': { type: 'dip', pins: 28, pitch: 2.54 },
            
            // Surface mount packages
            'SOIC-8': { type: 'soic', pins: 8, pitch: 1.27 },
            'SOIC-14': { type: 'soic', pins: 14, pitch: 1.27 },
            'SOIC-16': { type: 'soic', pins: 16, pitch: 1.27 },
            'QFP-32': { type: 'qfp', pins: 32, pitch: 0.8 },
            'QFP-44': { type: 'qfp', pins: 44, pitch: 0.8 },
            'QFP-64': { type: 'qfp', pins: 64, pitch: 0.5 },
            'QFN-16': { type: 'qfn', pins: 16, pitch: 0.5 },
            'QFN-24': { type: 'qfn', pins: 24, pitch: 0.5 },
            'BGA-100': { type: 'bga', pins: 100, pitch: 0.8 }
        };
        
        // Notification settings
        this.notificationSettings = {
            duration: 5000, // 5 seconds
            position: 'top-right',
            showClose: true,
            enableSound: false
        };
        
        this.initialize();
    }
    
    /**
     * Initialize utility manager
     */
    initialize() {
        console.log('✓ K4LP Utility Manager v2.3.0 initialized');
    }
    
    // =================================================================
    // VALIDATION FUNCTIONS
    // =================================================================
    
    /**
     * Validate part number format
     */
    validatePartNumber(partNumber) {
        if (!partNumber || typeof partNumber !== 'string') {
            return { valid: false, error: 'Part number is required' };
        }
        
        const cleaned = partNumber.trim();
        
        if (cleaned.length < 2) {
            return { valid: false, error: 'Part number too short' };
        }
        
        if (cleaned.length > 50) {
            return { valid: false, error: 'Part number too long' };
        }
        
        // Check for valid characters (alphanumeric, hyphens, underscores, dots)
        if (!/^[A-Za-z0-9\-_\.]+$/.test(cleaned)) {
            return { valid: false, error: 'Part number contains invalid characters' };
        }
        
        return { valid: true, cleaned: cleaned };
    }
    
    /**
     * Validate email format
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Validate URL format
     */
    validateUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Validate quantity value
     */
    validateQuantity(quantity) {
        const num = Number(quantity);
        return !isNaN(num) && num >= 0 && Number.isInteger(num);
    }
    
    /**
     * Validate price value
     */
    validatePrice(price) {
        const num = Number(price);
        return !isNaN(num) && num >= 0;
    }
    
    // =================================================================
    // FORMATTING FUNCTIONS
    // =================================================================
    
    /**
     * Format currency value
     */
    formatCurrency(value, currency = 'USD', locale = 'en-US') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
        }).format(value);
    }
    
    /**
     * Format number with engineering notation
     */
    formatEngineering(value, unit = '', precision = 3) {
        if (value === 0) return `0 ${unit}`.trim();
        
        const absValue = Math.abs(value);
        let prefix = '';
        let scaledValue = value;
        
        // Find appropriate prefix
        const prefixes = Object.keys(this.unitPrefixes).sort((a, b) => 
            Math.abs(Math.log10(this.unitPrefixes[b])) - Math.abs(Math.log10(this.unitPrefixes[a]))
        );
        
        for (const p of prefixes) {
            const prefixValue = this.unitPrefixes[p];
            if (absValue >= prefixValue && prefixValue !== 1) {
                prefix = p;
                scaledValue = value / prefixValue;
                break;
            }
        }
        
        // Format with appropriate precision
        const formatted = Number(scaledValue.toPrecision(precision));
        return `${formatted} ${prefix}${unit}`.trim();
    }
    
    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }
    
    /**
     * Format duration in human readable format
     */
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
    
    /**
     * Format date in various formats
     */
    formatDate(date, format = 'iso') {
        const d = new Date(date);
        
        switch (format) {
            case 'iso':
                return d.toISOString();
            case 'short':
                return d.toLocaleDateString();
            case 'long':
                return d.toLocaleDateString(undefined, { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            case 'time':
                return d.toLocaleTimeString();
            case 'datetime':
                return d.toLocaleString();
            default:
                return d.toString();
        }
    }
    
    /**
     * Format percentage
     */
    formatPercentage(value, precision = 1) {
        return `${(value * 100).toFixed(precision)}%`;
    }
    
    // =================================================================
    // PARSING FUNCTIONS
    // =================================================================
    
    /**
     * Parse engineering value with units
     */
    parseEngineering(valueStr) {
        if (!valueStr || typeof valueStr !== 'string') {
            return { value: NaN, unit: '', prefix: '' };
        }
        
        const cleaned = valueStr.trim();
        
        // Match number with optional prefix and unit
        const match = cleaned.match(/^([+-]?[\d\.]+)\s*([a-zA-Z\u03bc\u03a9\u2126\u00b5]*)$/i);
        
        if (!match) {
            return { value: NaN, unit: cleaned, prefix: '' };
        }
        
        const numValue = parseFloat(match[1]);
        const unitPart = match[2] || '';
        
        // Try to separate prefix from unit
        let prefix = '';
        let unit = unitPart;
        
        if (unitPart.length > 1) {
            const possiblePrefix = unitPart.charAt(0);
            const remainingUnit = unitPart.slice(1);
            
            if (this.unitPrefixes[possiblePrefix] && this.engineeringUnits[remainingUnit]) {
                prefix = possiblePrefix;
                unit = remainingUnit;
            }
        }
        
        // Convert to base units
        const multiplier = this.unitPrefixes[prefix] || 1;
        const baseValue = numValue * multiplier;
        
        return {
            value: baseValue,
            originalValue: numValue,
            unit: unit,
            prefix: prefix,
            multiplier: multiplier
        };
    }
    
    /**
     * Parse tolerance value
     */
    parseTolerance(toleranceStr) {
        if (!toleranceStr || typeof toleranceStr !== 'string') {
            return { value: NaN, type: 'unknown' };
        }
        
        const cleaned = toleranceStr.trim();
        
        // Check for percentage tolerance
        if (cleaned.includes('%')) {
            const match = cleaned.match(/([+-]?[\d\.]+)\s*%/);
            if (match) {
                return {
                    value: parseFloat(match[1]),
                    type: 'percentage',
                    symbol: '%'
                };
            }
        }
        
        // Check for ppm tolerance
        if (cleaned.toLowerCase().includes('ppm')) {
            const match = cleaned.match(/([+-]?[\d\.]+)\s*ppm/i);
            if (match) {
                return {
                    value: parseFloat(match[1]),
                    type: 'ppm',
                    symbol: 'ppm'
                };
            }
        }
        
        // Check for plus/minus tolerance
        const plusMinusMatch = cleaned.match(/[±+\/-]\s*([\d\.]+)/);
        if (plusMinusMatch) {
            return {
                value: parseFloat(plusMinusMatch[1]),
                type: 'absolute',
                symbol: '±'
            };
        }
        
        return { value: NaN, type: 'unknown' };
    }
    
    /**
     * Parse price from various formats
     */
    parsePrice(priceStr) {
        if (typeof priceStr === 'number') return priceStr;
        if (!priceStr || typeof priceStr !== 'string') return NaN;
        
        // Remove currency symbols and commas
        const cleaned = priceStr.replace(/[\$£€¥,]/g, '').trim();
        return parseFloat(cleaned);
    }
    
    // =================================================================
    // DATA PROCESSING FUNCTIONS
    // =================================================================
    
    /**
     * Deep clone an object
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
     * Merge objects deeply
     */
    deepMerge(target, source) {
        const result = this.deepClone(target);
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }
    
    /**
     * Remove duplicates from array based on property
     */
    removeDuplicates(array, keyFn = null) {
        if (!Array.isArray(array)) return [];
        
        if (keyFn) {
            const seen = new Set();
            return array.filter(item => {
                const key = keyFn(item);
                if (seen.has(key)) {
                    return false;
                }
                seen.add(key);
                return true;
            });
        }
        
        return [...new Set(array)];
    }
    
    /**
     * Group array by property
     */
    groupBy(array, keyFn) {
        return array.reduce((groups, item) => {
            const key = keyFn(item);
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
            return groups;
        }, {});
    }
    
    /**
     * Sort array by multiple criteria
     */
    sortBy(array, ...criteria) {
        return array.sort((a, b) => {
            for (const criterion of criteria) {
                let aVal, bVal;
                
                if (typeof criterion === 'string') {
                    aVal = this.getNestedProperty(a, criterion);
                    bVal = this.getNestedProperty(b, criterion);
                } else if (typeof criterion === 'function') {
                    aVal = criterion(a);
                    bVal = criterion(b);
                }
                
                if (aVal < bVal) return -1;
                if (aVal > bVal) return 1;
            }
            return 0;
        });
    }
    
    /**
     * Get nested property from object
     */
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    
    /**
     * Set nested property in object
     */
    setNestedProperty(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, obj);
        
        target[lastKey] = value;
        return obj;
    }
    
    // =================================================================
    // STRING UTILITIES
    // =================================================================
    
    /**
     * Generate slug from string
     */
    slugify(str) {
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    }
    
    /**
     * Capitalize first letter
     */
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
    
    /**
     * Convert camelCase to Title Case
     */
    camelToTitle(str) {
        return str
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
    
    /**
     * Truncate string with ellipsis
     */
    truncate(str, maxLength, suffix = '...') {
        if (!str || str.length <= maxLength) return str;
        return str.substring(0, maxLength - suffix.length) + suffix;
    }
    
    /**
     * Generate random string
     */
    randomString(length = 8, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return result;
    }
    
    /**
     * Generate UUID v4
     */
    generateUuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    // =================================================================
    // NOTIFICATION SYSTEM
    // =================================================================
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info', options = {}) {
        const config = { ...this.notificationSettings, ...options };
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                ${config.showClose ? '<button class="notification-close">&times;</button>' : ''}
            </div>
        `;
        
        // Add to container or create one
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = `notification-container ${config.position}`;
            document.body.appendChild(container);
        }
        
        container.appendChild(notification);
        
        // Auto-remove after duration
        const timeout = setTimeout(() => {
            this.removeNotification(notification);
        }, config.duration);
        
        // Close button handler
        if (config.showClose) {
            const closeBtn = notification.querySelector('.notification-close');
            closeBtn.addEventListener('click', () => {
                clearTimeout(timeout);
                this.removeNotification(notification);
            });
        }
        
        // Play sound if enabled
        if (config.enableSound) {
            this.playNotificationSound(type);
        }
        
        return notification;
    }
    
    /**
     * Remove notification
     */
    removeNotification(notification) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
    
    /**
     * Play notification sound
     */
    playNotificationSound(type) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Different frequencies for different types
            const frequencies = {
                success: 800,
                warning: 600,
                error: 400,
                info: 500
            };
            
            oscillator.frequency.value = frequencies[type] || 500;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            // Silent fail for sound
        }
    }
    
    // =================================================================
    // FILE UTILITIES
    // =================================================================
    
    /**
     * Download data as file
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
     * Read file as text
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
    
    /**
     * Read file as data URL
     */
    readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }
    
    // =================================================================
    // ENGINEERING CALCULATIONS
    // =================================================================
    
    /**
     * Calculate resistor color code value
     */
    calculateResistorValue(colors) {
        const colorValues = {
            'black': 0, 'brown': 1, 'red': 2, 'orange': 3, 'yellow': 4,
            'green': 5, 'blue': 6, 'violet': 7, 'grey': 8, 'gray': 8, 'white': 9
        };
        
        const multipliers = {
            'black': 1, 'brown': 10, 'red': 100, 'orange': 1000, 'yellow': 10000,
            'green': 100000, 'blue': 1000000, 'violet': 10000000, 'grey': 100000000,
            'gray': 100000000, 'white': 1000000000, 'gold': 0.1, 'silver': 0.01
        };
        
        const tolerances = {
            'brown': 1, 'red': 2, 'green': 0.5, 'blue': 0.25, 'violet': 0.1,
            'grey': 0.05, 'gray': 0.05, 'gold': 5, 'silver': 10, 'none': 20
        };
        
        if (colors.length < 3) {
            throw new Error('At least 3 colors required');
        }
        
        let value = 0;
        
        // 4-band or 5-band resistor
        if (colors.length === 4) {
            // 4-band: digit1, digit2, multiplier, tolerance
            value = (colorValues[colors[0]] * 10 + colorValues[colors[1]]) * multipliers[colors[2]];
        } else if (colors.length === 5) {
            // 5-band: digit1, digit2, digit3, multiplier, tolerance
            value = (colorValues[colors[0]] * 100 + colorValues[colors[1]] * 10 + colorValues[colors[2]]) * multipliers[colors[3]];
        }
        
        const tolerance = tolerances[colors[colors.length - 1]] || 20;
        
        return {
            value: value,
            tolerance: tolerance,
            formatted: this.formatEngineering(value, 'Ω') + ' ±' + tolerance + '%'
        };
    }
    
    /**
     * Calculate series resistance
     */
    calculateSeriesResistance(resistors) {
        return resistors.reduce((sum, r) => sum + r, 0);
    }
    
    /**
     * Calculate parallel resistance
     */
    calculateParallelResistance(resistors) {
        if (resistors.length === 0) return 0;
        if (resistors.length === 1) return resistors[0];
        
        const reciprocalSum = resistors.reduce((sum, r) => sum + (1 / r), 0);
        return 1 / reciprocalSum;
    }
    
    /**
     * Calculate power dissipation (P = V²/R or I²R or VI)
     */
    calculatePower(voltage = null, current = null, resistance = null) {
        if (voltage !== null && current !== null) {
            return voltage * current;
        } else if (voltage !== null && resistance !== null) {
            return (voltage * voltage) / resistance;
        } else if (current !== null && resistance !== null) {
            return current * current * resistance;
        }
        throw new Error('Insufficient parameters for power calculation');
    }
    
    /**
     * Calculate capacitor reactance (Xc = 1/(2πfC))
     */
    calculateCapacitiveReactance(frequency, capacitance) {
        return 1 / (2 * Math.PI * frequency * capacitance);
    }
    
    /**
     * Calculate inductor reactance (XL = 2πfL)
     */
    calculateInductiveReactance(frequency, inductance) {
        return 2 * Math.PI * frequency * inductance;
    }
    
    // =================================================================
    // DEBUGGING AND LOGGING
    // =================================================================
    
    /**
     * Enhanced console logging with timestamps and colors
     */
    log(message, level = 'info', context = '') {
        const timestamp = new Date().toISOString();
        const prefix = context ? `[${context}]` : '';
        const fullMessage = `${timestamp} ${prefix} ${message}`;
        
        const styles = {
            info: 'color: #2196F3',
            success: 'color: #4CAF50',
            warning: 'color: #FF9800',
            error: 'color: #F44336',
            debug: 'color: #9E9E9E'
        };
        
        console.log(`%c${fullMessage}`, styles[level] || styles.info);
    }
    
    /**
     * Performance timer
     */
    createTimer(label = 'Timer') {
        const startTime = performance.now();
        
        return {
            elapsed: () => performance.now() - startTime,
            stop: () => {
                const elapsed = performance.now() - startTime;
                this.log(`${label}: ${elapsed.toFixed(2)}ms`, 'debug', 'TIMER');
                return elapsed;
            }
        };
    }
    
    /**
     * Debounce function calls
     */
    debounce(func, wait, immediate = false) {
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
    }
    
    /**
     * Throttle function calls
     */
    throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function(...args) {
            if (!lastRan) {
                func(...args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if ((Date.now() - lastRan) >= limit) {
                        func(...args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }
    
    // =================================================================
    // BROWSER UTILITIES
    // =================================================================
    
    /**
     * Check if running in mobile browser
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    /**
     * Check if running in development mode
     */
    isDevelopment() {
        return location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname.includes('.local');
    }
    
    /**
     * Get browser information
     */
    getBrowserInfo() {
        const ua = navigator.userAgent;
        return {
            userAgent: ua,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            vendor: navigator.vendor,
            isMobile: this.isMobile(),
            isDevelopment: this.isDevelopment()
        };
    }
    
    /**
     * Copy text to clipboard
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
     * Get current page URL parameters
     */
    getUrlParams() {
        return Object.fromEntries(new URLSearchParams(window.location.search));
    }
    
    /**
     * Update URL without reload
     */
    updateUrl(params, replace = false) {
        const url = new URL(window.location);
        
        Object.entries(params).forEach(([key, value]) => {
            if (value === null || value === undefined) {
                url.searchParams.delete(key);
            } else {
                url.searchParams.set(key, value);
            }
        });
        
        if (replace) {
            history.replaceState(null, '', url);
        } else {
            history.pushState(null, '', url);
        }
    }
}

// Create and expose global instance
const utilityManager = new UtilityManager();
window.utils = utilityManager;

// Legacy compatibility
window.UtilityManager = UtilityManager;

// Module export for modern environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UtilityManager;
}

console.log('✓ K4LP Utility Manager v2.3.0 initialized');