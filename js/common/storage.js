/**
 * Enhanced Client-side Storage Management
 * Handles localStorage operations for API keys, settings, and persistent data
 * Part of K4LP Engineering Tools - Swiss Minimalist Design
 * @version 2.0.0
 */

class StorageManager {
    constructor() {
        this.prefix = 'k4lp_';
        this.version = '2.0.0';
        this.maxStorageSize = 5 * 1024 * 1024; // 5MB limit
        
        // Error tracking
        this.errorLog = [];
        this.maxErrorLogSize = 100;
        
        // Initialize and migrate if needed
        this.initialize();
    }

    /**
     * Initialize storage system and handle migrations
     */
    initialize() {
        try {
            this.checkStorageSupport();
            this.migrateFromLegacyStorage();
            this.cleanupExpiredData();
            this.validateStorageQuota();
        } catch (error) {
            this.logError('Storage initialization failed', error);
            this.handleStorageError(error);
        }
    }

    /**
     * Check if localStorage is supported
     */
    checkStorageSupport() {
        if (typeof(Storage) === "undefined") {
            throw new Error('localStorage not supported in this browser');
        }
        
        // Test write capability
        try {
            const testKey = this.prefix + 'test';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
        } catch (error) {
            throw new Error('localStorage write access denied or storage full');
        }
    }

    /**
     * Migrate data from legacy storage format
     */
    migrateFromLegacyStorage() {
        const currentVersion = this.getItem('storage_version');
        if (!currentVersion || currentVersion < this.version) {
            console.log('Migrating storage to version', this.version);
            
            // Migrate legacy API keys
            const legacyDigikeyId = localStorage.getItem(this.prefix + 'digikey_client_id');
            const legacyDigikeySecret = localStorage.getItem(this.prefix + 'digikey_client_secret');
            
            if (legacyDigikeyId && legacyDigikeySecret) {
                this.saveDigikeyCredentials(legacyDigikeyId, legacyDigikeySecret);
                localStorage.removeItem(this.prefix + 'digikey_client_id');
                localStorage.removeItem(this.prefix + 'digikey_client_secret');
            }
            
            const legacyMouserKey = localStorage.getItem(this.prefix + 'mouser_api_key');
            if (legacyMouserKey) {
                this.saveMouserCredentials(legacyMouserKey);
                localStorage.removeItem(this.prefix + 'mouser_api_key');
            }
            
            this.setItem('storage_version', this.version);
        }
    }

    /**
     * Set item in localStorage with comprehensive error handling
     */
    setItem(key, value, options = {}) {
        try {
            const prefixedKey = this.prefix + key;
            const timestamp = Date.now();
            const expires = options.expires ? timestamp + options.expires : null;
            
            const dataObject = {
                value: value,
                timestamp: timestamp,
                expires: expires,
                version: this.version,
                checksum: this.calculateChecksum(value)
            };
            
            const serializedData = JSON.stringify(dataObject);
            
            // Check storage quota before writing
            this.checkStorageQuota(serializedData.length);
            
            localStorage.setItem(prefixedKey, serializedData);
            
            // Log successful operation
            console.debug(`Storage: Set ${key} (${serializedData.length} bytes)`);
            return true;
            
        } catch (error) {
            this.logError(`Failed to set storage item: ${key}`, error);
            
            // Handle quota exceeded
            if (error.name === 'QuotaExceededError') {
                this.handleQuotaExceeded();
                // Try again after cleanup
                try {
                    localStorage.setItem(this.prefix + key, JSON.stringify({ value, timestamp: Date.now() }));
                    return true;
                } catch (retryError) {
                    this.logError(`Retry failed for: ${key}`, retryError);
                    return false;
                }
            }
            return false;
        }
    }

    /**
     * Get item from localStorage with validation
     */
    getItem(key, defaultValue = null) {
        try {
            const prefixedKey = this.prefix + key;
            const item = localStorage.getItem(prefixedKey);
            
            if (!item) {
                return defaultValue;
            }

            const parsedData = JSON.parse(item);
            
            // Check expiration
            if (parsedData.expires && Date.now() > parsedData.expires) {
                this.removeItem(key);
                return defaultValue;
            }
            
            // Validate checksum if available
            if (parsedData.checksum) {
                const expectedChecksum = this.calculateChecksum(parsedData.value);
                if (parsedData.checksum !== expectedChecksum) {
                    this.logError(`Checksum validation failed for: ${key}`);
                    this.removeItem(key);
                    return defaultValue;
                }
            }
            
            return parsedData.value;
            
        } catch (error) {
            this.logError(`Failed to get storage item: ${key}`, error);
            return defaultValue;
        }
    }

    /**
     * Remove item from localStorage
     */
    removeItem(key) {
        try {
            const prefixedKey = this.prefix + key;
            localStorage.removeItem(prefixedKey);
            console.debug(`Storage: Removed ${key}`);
            return true;
        } catch (error) {
            this.logError(`Failed to remove storage item: ${key}`, error);
            return false;
        }
    }

    /**
     * Save Digikey API credentials with encryption
     */
    saveDigikeyCredentials(clientId, clientSecret) {
        const credentials = {
            clientId: this.obfuscate(clientId),
            clientSecret: this.obfuscate(clientSecret),
            savedAt: Date.now(),
            lastUsed: null
        };
        
        const success = this.setItem('digikey_credentials', credentials);
        if (success) {
            this.setApiStatus('digikey', 'configured');
        }
        return success;
    }

    /**
     * Get Digikey credentials with decryption
     */
    getDigikeyCredentials() {
        const credentials = this.getItem('digikey_credentials');
        if (!credentials) {
            return { clientId: null, clientSecret: null };
        }
        
        return {
            clientId: this.deobfuscate(credentials.clientId),
            clientSecret: this.deobfuscate(credentials.clientSecret),
            savedAt: credentials.savedAt,
            lastUsed: credentials.lastUsed
        };
    }

    /**
     * Save Mouser API credentials
     */
    saveMouserCredentials(apiKey, partnerKey = null) {
        const credentials = {
            apiKey: this.obfuscate(apiKey),
            partnerKey: partnerKey ? this.obfuscate(partnerKey) : null,
            savedAt: Date.now(),
            lastUsed: null
        };
        
        const success = this.setItem('mouser_credentials', credentials);
        if (success) {
            this.setApiStatus('mouser', 'configured');
        }
        return success;
    }

    /**
     * Get Mouser credentials
     */
    getMouserCredentials() {
        const credentials = this.getItem('mouser_credentials');
        if (!credentials) {
            return { apiKey: null, partnerKey: null };
        }
        
        return {
            apiKey: this.deobfuscate(credentials.apiKey),
            partnerKey: credentials.partnerKey ? this.deobfuscate(credentials.partnerKey) : null,
            savedAt: credentials.savedAt,
            lastUsed: credentials.lastUsed
        };
    }

    /**
     * API Status Management with history
     */
    setApiStatus(provider, status) {
        const statusHistory = this.getItem(`${provider}_status_history`, []);
        statusHistory.push({
            status: status,
            timestamp: Date.now(),
            userAgent: navigator.userAgent
        });
        
        // Keep only last 50 status changes
        if (statusHistory.length > 50) {
            statusHistory.splice(0, statusHistory.length - 50);
        }
        
        this.setItem(`${provider}_status`, status);
        this.setItem(`${provider}_status_history`, statusHistory);
    }

    /**
     * Get API status with metadata
     */
    getApiStatus(provider) {
        return {
            current: this.getItem(`${provider}_status`, 'inactive'),
            history: this.getItem(`${provider}_status_history`, []),
            lastUpdate: this.getLastStatusUpdate(provider)
        };
    }

    /**
     * Calculate simple checksum for data integrity
     */
    calculateChecksum(data) {
        const str = JSON.stringify(data);
        let hash = 0;
        
        if (str.length === 0) return hash;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return hash;
    }

    /**
     * Simple obfuscation for sensitive data
     */
    obfuscate(text) {
        if (!text) return text;
        return btoa(text.split('').reverse().join(''));
    }

    /**
     * Deobfuscate sensitive data
     */
    deobfuscate(obfuscatedText) {
        if (!obfuscatedText) return obfuscatedText;
        try {
            return atob(obfuscatedText).split('').reverse().join('');
        } catch (error) {
            this.logError('Deobfuscation failed', error);
            return null;
        }
    }

    /**
     * Check storage quota
     */
    checkStorageQuota(additionalBytes = 0) {
        const usage = this.getStorageUsage();
        const projectedUsage = usage.totalSize + additionalBytes;
        
        if (projectedUsage > this.maxStorageSize) {
            throw new Error(`Storage quota would be exceeded: ${this.formatBytes(projectedUsage)} > ${this.formatBytes(this.maxStorageSize)}`);
        }
    }

    /**
     * Validate storage quota on startup
     */
    validateStorageQuota() {
        const usage = this.getStorageUsage();
        if (usage.totalSize > this.maxStorageSize * 0.9) {
            console.warn(`Storage usage high: ${this.formatBytes(usage.totalSize)} / ${this.formatBytes(this.maxStorageSize)}`);
        }
    }

    /**
     * Handle quota exceeded error
     */
    handleQuotaExceeded() {
        console.warn('Storage quota exceeded, attempting cleanup...');
        this.clearCache();
        this.errorLog = [];
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix + 'cache_')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            this.logError('Cache clearing failed', error);
        }
    }

    /**
     * Get storage usage statistics
     */
    getStorageUsage() {
        const keys = Object.keys(localStorage);
        const k4lpKeys = keys.filter(key => key.startsWith(this.prefix));
        
        let totalSize = 0;
        k4lpKeys.forEach(key => {
            const value = localStorage.getItem(key);
            totalSize += new Blob([value]).size;
        });
        
        return { totalSize };
    }

    /**
     * Format bytes to human readable string
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Log errors with rotation
     */
    logError(message, error = null) {
        const errorEntry = {
            timestamp: Date.now(),
            message: message,
            error: error ? error.toString() : null
        };
        
        this.errorLog.push(errorEntry);
        
        if (this.errorLog.length > this.maxErrorLogSize) {
            this.errorLog.splice(0, this.errorLog.length - this.maxErrorLogSize);
        }
        
        console.error(`Storage Error: ${message}`, error);
    }

    /**
     * Get last status update timestamp
     */
    getLastStatusUpdate(provider) {
        const history = this.getItem(`${provider}_status_history`, []);
        return history.length > 0 ? history[history.length - 1].timestamp : null;
    }

    /**
     * Handle storage errors gracefully
     */
    handleStorageError(error) {
        console.warn('Storage error detected, implementing fallback mechanisms...');
    }

    /**
     * Clear all storage data
     */
    clear() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            
            this.errorLog = [];
            console.log('Storage: All data cleared');
            return true;
        } catch (error) {
            this.logError('Failed to clear storage', error);
            return false;
        }
    }

    // Legacy compatibility methods
    setDigikeyApiKey(clientId, clientSecret) {
        return this.saveDigikeyCredentials(clientId, clientSecret);
    }

    getDigikeyApiKey() {
        const creds = this.getDigikeyCredentials();
        return { clientId: creds.clientId, clientSecret: creds.clientSecret };
    }

    setMouserApiKey(apiKey) {
        return this.saveMouserCredentials(apiKey);
    }

    getMouserApiKey() {
        const creds = this.getMouserCredentials();
        return creds.apiKey;
    }

    set(key, value) {
        return this.setItem(key, value);
    }

    get(key) {
        return this.getItem(key);
    }

    remove(key) {
        return this.removeItem(key);
    }

    /**
     * Cleanup expired data periodically
     */
    cleanupExpiredData() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    try {
                        const item = localStorage.getItem(key);
                        const data = JSON.parse(item);
                        
                        if (data.expires && Date.now() > data.expires) {
                            localStorage.removeItem(key);
                        }
                    } catch (error) {
                        // Remove corrupted items
                        localStorage.removeItem(key);
                    }
                }
            });
        } catch (error) {
            this.logError('Cleanup failed', error);
        }
    }
}

// Create and expose global instance
const storage = new StorageManager();
window.storage = storage;

// Legacy compatibility
window.StorageManager = StorageManager;

// Module export for modern environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}

console.log('✓ K4LP Storage Manager v2.0.0 initialized');
