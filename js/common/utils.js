/**
 * Enhanced Utility Functions
 * Common utility functions for calculations, validations, and data processing
 * Part of K4LP Engineering Tools - Swiss Minimalist Design
 * @version 2.0.0
 */

class UtilityManager {
    constructor() {
        this.version = '2.0.0';
        
        // Pricing calculation constants
        this.pricingDefaults = {
            defaultQuantity: 1,
            maxQuantity: 1000000,
            decimalPrecision: 6
        };
        
        // Validation patterns
        this.patterns = {
            partNumber: /^[A-Z0-9\-_\.]{2,50}$/i,
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            phone: /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/,
            url: /^https?:\/\/[^\s]+$/,
            alphanumeric: /^[A-Z0-9]+$/i,
            numeric: /^\d+(\.\d+)?$/,
            hexColor: /^#[0-9A-F]{6}$/i
        };
        
        // Common data transformations
        this.transformations = {
            currency: {
                USD: { symbol: '$', position: 'before' },
                EUR: { symbol: '€', position: 'after' },
                GBP: { symbol: '£', position: 'before' },
                JPY: { symbol: '¥', position: 'before' }
            }
        };
        
        // Initialize
        this.initialize();
    }

    /**
     * Initialize utility manager
     */
    initialize() {
        console.log('✓ K4LP Utility Manager v2.0.0 initialized');
    }

    /**
     * Calculate unit price based on quantity and price breaks (Digikey method)
     * Digikey uses tiered pricing - find the highest quantity tier that's <= requested quantity
     */
    calculateDigikeyUnitPrice(priceBreaks, quantity) {
        try {
            if (!priceBreaks || !Array.isArray(priceBreaks) || priceBreaks.length === 0) {
                return { unitPrice: 0, error: 'No price breaks available' };
            }
            
            if (!quantity || quantity <= 0) {
                return { unitPrice: 0, error: 'Invalid quantity' };
            }
            
            // Sort price breaks by quantity (ascending)
            const sortedBreaks = priceBreaks
                .filter(pb => pb.quantity > 0 && pb.unitPrice >= 0)
                .sort((a, b) => a.quantity - b.quantity);
            
            if (sortedBreaks.length === 0) {
                return { unitPrice: 0, error: 'No valid price breaks found' };
            }
            
            // Find the appropriate price tier
            let selectedBreak = sortedBreaks[0]; // Start with lowest quantity tier
            
            for (const priceBreak of sortedBreaks) {
                if (quantity >= priceBreak.quantity) {
                    selectedBreak = priceBreak;
                } else {
                    break; // We've found the highest applicable tier
                }
            }
            
            return {
                unitPrice: parseFloat(selectedBreak.unitPrice),
                selectedTier: selectedBreak,
                totalPrice: parseFloat(selectedBreak.unitPrice) * quantity,
                savings: this.calculateSavings(sortedBreaks[0], selectedBreak, quantity),
                nextTier: this.findNextTier(sortedBreaks, selectedBreak)
            };
            
        } catch (error) {
            return { unitPrice: 0, error: `Calculation error: ${error.message}` };
        }
    }

    /**
     * Calculate unit price based on quantity and price breaks (Mouser method)
     * Mouser also uses tiered pricing similar to Digikey
     */
    calculateMouserUnitPrice(priceBreaks, quantity) {
        try {
            if (!priceBreaks || !Array.isArray(priceBreaks) || priceBreaks.length === 0) {
                return { unitPrice: 0, error: 'No price breaks available' };
            }
            
            if (!quantity || quantity <= 0) {
                return { unitPrice: 0, error: 'Invalid quantity' };
            }
            
            // Parse Mouser price breaks (they might have currency symbols)
            const parsedBreaks = priceBreaks.map(pb => ({
                quantity: parseInt(pb.quantity) || parseInt(pb.Quantity) || 0,
                unitPrice: this.parsePrice(pb.unitPrice || pb.Price || '0')
            })).filter(pb => pb.quantity > 0 && pb.unitPrice >= 0);
            
            if (parsedBreaks.length === 0) {
                return { unitPrice: 0, error: 'No valid price breaks found' };
            }
            
            // Sort by quantity (ascending)
            const sortedBreaks = parsedBreaks.sort((a, b) => a.quantity - b.quantity);
            
            // Find the appropriate price tier
            let selectedBreak = sortedBreaks[0];
            
            for (const priceBreak of sortedBreaks) {
                if (quantity >= priceBreak.quantity) {
                    selectedBreak = priceBreak;
                } else {
                    break;
                }
            }
            
            return {
                unitPrice: selectedBreak.unitPrice,
                selectedTier: selectedBreak,
                totalPrice: selectedBreak.unitPrice * quantity,
                savings: this.calculateSavings(sortedBreaks[0], selectedBreak, quantity),
                nextTier: this.findNextTier(sortedBreaks, selectedBreak)
            };
            
        } catch (error) {
            return { unitPrice: 0, error: `Calculation error: ${error.message}` };
        }
    }

    /**
     * Parse price string and extract numeric value
     */
    parsePrice(priceString) {
        if (typeof priceString === 'number') {
            return priceString;
        }
        
        if (typeof priceString !== 'string') {
            return 0;
        }
        
        // Remove currency symbols and whitespace
        const cleanPrice = priceString
            .replace(/[$£€¥,\s]/g, '')
            .replace(/[^\d\.]/g, '');
        
        const parsed = parseFloat(cleanPrice);
        return isNaN(parsed) ? 0 : parsed;
    }

    /**
     * Calculate savings between price tiers
     */
    calculateSavings(baseTier, selectedTier, quantity) {
        if (!baseTier || !selectedTier || quantity <= 0) {
            return { absolute: 0, percentage: 0 };
        }
        
        const baseTotal = baseTier.unitPrice * quantity;
        const selectedTotal = selectedTier.unitPrice * quantity;
        const absoluteSavings = baseTotal - selectedTotal;
        const percentageSavings = baseTotal > 0 ? (absoluteSavings / baseTotal) * 100 : 0;
        
        return {
            absolute: Math.max(0, absoluteSavings),
            percentage: Math.max(0, percentageSavings)
        };
    }

    /**
     * Find the next available price tier
     */
    findNextTier(sortedBreaks, currentTier) {
        const currentIndex = sortedBreaks.findIndex(pb => 
            pb.quantity === currentTier.quantity && pb.unitPrice === currentTier.unitPrice
        );
        
        if (currentIndex >= 0 && currentIndex < sortedBreaks.length - 1) {
            return sortedBreaks[currentIndex + 1];
        }
        
        return null;
    }

    /**
     * Get optimal quantity recommendations based on price breaks
     */
    getOptimalQuantityRecommendations(priceBreaks, targetQuantity) {
        try {
            if (!priceBreaks || !Array.isArray(priceBreaks)) {
                return [];
            }
            
            const sortedBreaks = priceBreaks
                .filter(pb => pb.quantity > 0 && pb.unitPrice >= 0)
                .sort((a, b) => a.quantity - b.quantity);
            
            const recommendations = [];
            
            sortedBreaks.forEach((priceBreak, index) => {
                // Calculate efficiency (lower unit price is better)
                const efficiency = 1 / priceBreak.unitPrice;
                
                // Calculate cost difference for target quantity
                const costForTarget = priceBreak.unitPrice * targetQuantity;
                
                recommendations.push({
                    quantity: priceBreak.quantity,
                    unitPrice: priceBreak.unitPrice,
                    totalCost: costForTarget,
                    efficiency: efficiency,
                    recommended: priceBreak.quantity >= targetQuantity,
                    isBreakpoint: true,
                    savingsVsNext: index < sortedBreaks.length - 1 ? 
                        this.calculateSavings(priceBreak, sortedBreaks[index + 1], targetQuantity) : null
                });
            });
            
            // Sort by efficiency (best deals first)
            return recommendations.sort((a, b) => b.efficiency - a.efficiency);
            
        } catch (error) {
            console.error('Error calculating optimal quantities:', error);
            return [];
        }
    }

    /**
     * Extract and normalize product attributes/parameters
     */
    extractProductAttributes(product, provider) {
        try {
            const attributes = {
                basic: {},
                electrical: {},
                physical: {},
                compliance: {},
                other: {}
            };
            
            let rawParameters = [];
            
            // Extract parameters based on provider
            if (provider === 'digikey' && product.Parameters) {
                rawParameters = product.Parameters;
            } else if (provider === 'mouser' && product.ProductAttributes) {
                rawParameters = product.ProductAttributes;
            } else if (product.parameters) {
                // Already normalized
                return this.categorizeAttributes(product.parameters);
            }
            
            // Normalize parameter format
            rawParameters.forEach(param => {
                let name, value, unit;
                
                if (provider === 'digikey') {
                    name = param.Parameter;
                    value = param.Value;
                    unit = param.ValueId || '';
                } else if (provider === 'mouser') {
                    name = param.AttributeName;
                    value = param.AttributeValue;
                    unit = param.AttributeUnit || '';
                }
                
                if (name && value) {
                    const category = this.categorizeParameter(name);
                    attributes[category][name] = {
                        value: value,
                        unit: unit,
                        displayValue: unit ? `${value} ${unit}` : value
                    };
                }
            });
            
            return attributes;
            
        } catch (error) {
            console.error('Error extracting product attributes:', error);
            return { basic: {}, electrical: {}, physical: {}, compliance: {}, other: {} };
        }
    }

    /**
     * Categorize parameter by name
     */
    categorizeParameter(parameterName) {
        const name = parameterName.toLowerCase();
        
        // Electrical parameters
        if (name.includes('voltage') || name.includes('current') || name.includes('power') || 
            name.includes('resistance') || name.includes('capacitance') || name.includes('inductance') ||
            name.includes('frequency') || name.includes('impedance') || name.includes('gain')) {
            return 'electrical';
        }
        
        // Physical parameters
        if (name.includes('size') || name.includes('dimension') || name.includes('length') ||
            name.includes('width') || name.includes('height') || name.includes('diameter') ||
            name.includes('weight') || name.includes('package') || name.includes('mounting')) {
            return 'physical';
        }
        
        // Compliance parameters
        if (name.includes('rohs') || name.includes('lead') || name.includes('halogen') ||
            name.includes('compliance') || name.includes('standard') || name.includes('certification')) {
            return 'compliance';
        }
        
        // Basic parameters
        if (name.includes('manufacturer') || name.includes('part') || name.includes('series') ||
            name.includes('category') || name.includes('family') || name.includes('type')) {
            return 'basic';
        }
        
        return 'other';
    }

    /**
     * Categorize already normalized attributes
     */
    categorizeAttributes(parameters) {
        const attributes = {
            basic: {},
            electrical: {},
            physical: {},
            compliance: {},
            other: {}
        };
        
        Object.entries(parameters).forEach(([name, data]) => {
            const category = this.categorizeParameter(name);
            attributes[category][name] = data;
        });
        
        return attributes;
    }

    /**
     * Search and filter attributes
     */
    searchAttributes(attributes, searchTerm) {
        if (!searchTerm) return attributes;
        
        const filtered = {
            basic: {},
            electrical: {},
            physical: {},
            compliance: {},
            other: {}
        };
        
        const lowerSearch = searchTerm.toLowerCase();
        
        Object.entries(attributes).forEach(([category, params]) => {
            Object.entries(params).forEach(([name, data]) => {
                if (name.toLowerCase().includes(lowerSearch) || 
                    data.value.toString().toLowerCase().includes(lowerSearch)) {
                    filtered[category][name] = data;
                }
            });
        });
        
        return filtered;
    }

    /**
     * Format currency with proper symbols and localization
     */
    formatCurrency(amount, currency = 'USD', options = {}) {
        try {
            const {
                showSymbol = true,
                precision = 2,
                showZero = true
            } = options;
            
            if (amount === 0 && !showZero) {
                return 'N/A';
            }
            
            const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: precision,
                maximumFractionDigits: precision
            });
            
            return formatter.format(amount);
            
        } catch (error) {
            // Fallback formatting
            const symbol = this.transformations.currency[currency]?.symbol || '$';
            return showSymbol ? `${symbol}${amount.toFixed(2)}` : amount.toFixed(2);
        }
    }

    /**
     * Format large numbers with appropriate units (K, M, B)
     */
    formatLargeNumber(number, precision = 1) {
        if (number < 1000) {
            return number.toString();
        }
        
        const units = ['', 'K', 'M', 'B', 'T'];
        const tier = Math.floor(Math.log10(Math.abs(number)) / 3);
        
        if (tier === 0) return number.toString();
        
        const unit = units[tier] || units[units.length - 1];
        const scale = Math.pow(10, tier * 3);
        const scaled = number / scale;
        
        return scaled.toFixed(precision) + unit;
    }

    /**
     * Validate data using various validation rules
     */
    validate(value, rules) {
        const results = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        if (!rules || rules.length === 0) {
            return results;
        }
        
        rules.forEach(rule => {
            try {
                const ruleResult = this.applyValidationRule(value, rule);
                
                if (!ruleResult.isValid) {
                    results.isValid = false;
                    results.errors.push(ruleResult.message);
                }
                
                if (ruleResult.warning) {
                    results.warnings.push(ruleResult.warning);
                }
                
            } catch (error) {
                results.isValid = false;
                results.errors.push(`Validation rule error: ${error.message}`);
            }
        });
        
        return results;
    }

    /**
     * Apply individual validation rule
     */
    applyValidationRule(value, rule) {
        const result = { isValid: true, message: '', warning: null };
        
        switch (rule.type) {
            case 'required':
                if (value === null || value === undefined || value === '') {
                    result.isValid = false;
                    result.message = rule.message || 'This field is required';
                }
                break;
                
            case 'pattern':
                if (value && !new RegExp(rule.pattern).test(value)) {
                    result.isValid = false;
                    result.message = rule.message || 'Invalid format';
                }
                break;
                
            case 'minLength':
                if (value && value.length < rule.value) {
                    result.isValid = false;
                    result.message = rule.message || `Minimum length is ${rule.value}`;
                }
                break;
                
            case 'maxLength':
                if (value && value.length > rule.value) {
                    result.isValid = false;
                    result.message = rule.message || `Maximum length is ${rule.value}`;
                }
                break;
                
            case 'range':
                const numValue = parseFloat(value);
                if (!isNaN(numValue) && (numValue < rule.min || numValue > rule.max)) {
                    result.isValid = false;
                    result.message = rule.message || `Value must be between ${rule.min} and ${rule.max}`;
                }
                break;
                
            case 'email':
                if (value && !this.patterns.email.test(value)) {
                    result.isValid = false;
                    result.message = rule.message || 'Invalid email format';
                }
                break;
                
            case 'partNumber':
                if (value && !this.patterns.partNumber.test(value)) {
                    result.isValid = false;
                    result.message = rule.message || 'Invalid part number format';
                }
                break;
        }
        
        return result;
    }

    /**
     * Debounce function execution
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
     * Throttle function execution
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Deep clone object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }
        
        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        }
    }

    /**
     * Generate unique ID
     */
    generateId(prefix = 'id', length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = prefix + '_';
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    }

    /**
     * Calculate hash of string (simple djb2 algorithm)
     */
    calculateHash(str) {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
        }
        return hash >>> 0; // Convert to unsigned 32-bit integer
    }

    /**
     * Compare two versions (semantic versioning)
     */
    compareVersions(version1, version2) {
        const v1parts = version1.split('.').map(Number);
        const v2parts = version2.split('.').map(Number);
        
        const maxLength = Math.max(v1parts.length, v2parts.length);
        
        for (let i = 0; i < maxLength; i++) {
            const v1part = v1parts[i] || 0;
            const v2part = v2parts[i] || 0;
            
            if (v1part < v2part) return -1;
            if (v1part > v2part) return 1;
        }
        
        return 0;
    }

    /**
     * Get browser and device information
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
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            timestamp: Date.now()
        };
    }

    /**
     * Log performance metrics
     */
    logPerformance(label, startTime) {
        if (typeof startTime === 'undefined') {
            return performance.now();
        }
        
        const duration = performance.now() - startTime;
        console.log(`⚡ Performance [${label}]: ${duration.toFixed(2)}ms`);
        return duration;
    }

    /**
     * Safe JSON parse with error handling
     */
    safeJsonParse(jsonString, defaultValue = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('JSON parse error:', error);
            return defaultValue;
        }
    }

    /**
     * Safe JSON stringify with error handling
     */
    safeJsonStringify(obj, defaultValue = '{}') {
        try {
            return JSON.stringify(obj);
        } catch (error) {
            console.warn('JSON stringify error:', error);
            return defaultValue;
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Unescape HTML
     */
    unescapeHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    /**
     * Check if object is empty
     */
    isEmpty(obj) {
        if (obj == null) return true;
        if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
        if (obj instanceof Map || obj instanceof Set) return obj.size === 0;
        return Object.keys(obj).length === 0;
    }

    /**
     * Get file extension from filename
     */
    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    /**
     * Format file size in human readable format
     */
    formatFileSize(bytes, precision = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(precision)) + ' ' + sizes[i];
    }
}

// Create and expose global instance
const utils = new UtilityManager();
window.utils = utils;

// Legacy compatibility
window.UtilityManager = UtilityManager;

// Module export for modern environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UtilityManager;
}

console.log('✓ K4LP Utility Manager v2.0.0 initialized');
