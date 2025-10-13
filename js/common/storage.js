/**
 * Enhanced Storage Manager - API credentials with environment support
 * Single responsibility: localStorage management with complete credential handling
 * Supports Digikey environment selection (production/sandbox)
 */

class StorageManager {
    constructor() {
        this.keys = {
            API_KEYS: 'k4lp_api_keys',
            USER_DATA: 'k4lp_user_data'
        };
    }

    /**
     * Save API credentials with environment support
     * @param {Object} keys - API credentials
     * @param {string} keys.digikeyClientId - Digikey Client ID
     * @param {string} keys.digikeyClientSecret - Digikey Client Secret
     * @param {string} keys.digikeyEnvironment - Digikey environment ('production' or 'sandbox')
     * @param {string} keys.mouserApiKey - Mouser API Key
     * @returns {boolean} Success status
     */
    saveApiKeys(keys) {
        try {
            const data = {
                digikeyClientId: keys.digikeyClientId || '',
                digikeyClientSecret: keys.digikeyClientSecret || '',
                digikeyEnvironment: keys.digikeyEnvironment || 'production',
                mouserApiKey: keys.mouserApiKey || '',
                savedAt: Date.now()
            };
            
            localStorage.setItem(this.keys.API_KEYS, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Storage save failed:', error);
            return false;
        }
    }

    /**
     * Get API credentials
     * @returns {Object|null} Stored credentials or null
     */
    getApiKeys() {
        try {
            const data = localStorage.getItem(this.keys.API_KEYS);
            if (!data) return null;
            
            const parsed = JSON.parse(data);
            
            // Ensure environment defaults to production for backward compatibility
            if (!parsed.digikeyEnvironment) {
                parsed.digikeyEnvironment = 'production';
            }
            
            return parsed;
        } catch (error) {
            console.error('Storage read failed:', error);
            return null;
        }
    }

    /**
     * Check if credentials exist (NOT validated)
     * @returns {Object} Existence status only
     */
    hasApiKeys() {
        const keys = this.getApiKeys();
        return {
            digikey: !!(keys?.digikeyClientId && keys?.digikeyClientSecret),
            mouser: !!(keys?.mouserApiKey)
        };
    }

    /**
     * Get Digikey credentials with environment
     * @returns {Object} Digikey credentials
     */
    getDigikeyCredentials() {
        const keys = this.getApiKeys();
        return {
            clientId: keys?.digikeyClientId || '',
            clientSecret: keys?.digikeyClientSecret || '',
            environment: keys?.digikeyEnvironment || 'production'
        };
    }

    /**
     * Get Mouser credentials
     * @returns {Object} Mouser credentials
     */
    getMouserCredentials() {
        const keys = this.getApiKeys();
        return {
            apiKey: keys?.mouserApiKey || ''
        };
    }

    /**
     * Update specific credential without affecting others
     * @param {string} provider - 'digikey' or 'mouser'
     * @param {Object} credentials - Credentials to update
     * @returns {boolean} Success status
     */
    updateCredentials(provider, credentials) {
        const existing = this.getApiKeys() || {};
        
        if (provider === 'digikey') {
            const updated = {
                ...existing,
                digikeyClientId: credentials.clientId || existing.digikeyClientId || '',
                digikeyClientSecret: credentials.clientSecret || existing.digikeyClientSecret || '',
                digikeyEnvironment: credentials.environment || existing.digikeyEnvironment || 'production'
            };
            return this.saveApiKeys(updated);
        } else if (provider === 'mouser') {
            const updated = {
                ...existing,
                mouserApiKey: credentials.apiKey || existing.mouserApiKey || ''
            };
            return this.saveApiKeys(updated);
        }
        
        return false;
    }

    /**
     * Save user data
     * @param {Object} data - User data to store
     * @returns {boolean} Success status
     */
    saveUserData(data) {
        try {
            const userData = { ...data, savedAt: Date.now() };
            localStorage.setItem(this.keys.USER_DATA, JSON.stringify(userData));
            return true;
        } catch (error) {
            console.error('User data save failed:', error);
            return false;
        }
    }

    /**
     * Get user data
     * @returns {Object|null} Stored user data or null
     */
    getUserData() {
        try {
            const data = localStorage.getItem(this.keys.USER_DATA);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('User data read failed:', error);
            return null;
        }
    }

    /**
     * Clear specific credential type
     * @param {string} provider - 'digikey' or 'mouser'
     * @returns {boolean} Success status
     */
    clearCredentials(provider) {
        const existing = this.getApiKeys();
        if (!existing) return true;
        
        if (provider === 'digikey') {
            const updated = {
                ...existing,
                digikeyClientId: '',
                digikeyClientSecret: '',
                digikeyEnvironment: 'production'
            };
            return this.saveApiKeys(updated);
        } else if (provider === 'mouser') {
            const updated = {
                ...existing,
                mouserApiKey: ''
            };
            return this.saveApiKeys(updated);
        }
        
        return false;
    }

    /**
     * Clear all stored data
     * @returns {boolean} Success status
     */
    clearAll() {
        try {
            Object.values(this.keys).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (error) {
            console.error('Storage clear failed:', error);
            return false;
        }
    }

    /**
     * Check if localStorage is available
     * @returns {boolean} Storage availability
     */
    isAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, 'test');
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get storage statistics
     * @returns {Object} Storage usage information
     */
    getStorageStats() {
        try {
            const stats = {
                available: this.isAvailable(),
                hasCredentials: false,
                credentialsCount: 0,
                lastUpdated: null
            };
            
            const apiKeys = this.getApiKeys();
            if (apiKeys) {
                stats.hasCredentials = true;
                stats.lastUpdated = apiKeys.savedAt ? new Date(apiKeys.savedAt) : null;
                
                if (apiKeys.digikeyClientId && apiKeys.digikeyClientSecret) {
                    stats.credentialsCount++;
                }
                if (apiKeys.mouserApiKey) {
                    stats.credentialsCount++;
                }
            }
            
            return stats;
        } catch (error) {
            return {
                available: false,
                hasCredentials: false,
                credentialsCount: 0,
                lastUpdated: null,
                error: error.message
            };
        }
    }

    /**
     * Export credentials (excluding secrets)
     * @returns {Object} Exportable credential metadata
     */
    exportMetadata() {
        const keys = this.getApiKeys();
        if (!keys) return null;
        
        return {
            hasDigikey: !!(keys.digikeyClientId && keys.digikeyClientSecret),
            digikeyEnvironment: keys.digikeyEnvironment || 'production',
            digikeyClientIdPreview: keys.digikeyClientId ? 
                keys.digikeyClientId.substring(0, 8) + '...' : null,
            hasMouser: !!keys.mouserApiKey,
            mouserApiKeyPreview: keys.mouserApiKey ? 
                keys.mouserApiKey.substring(0, 8) + '...' : null,
            savedAt: keys.savedAt
        };
    }
}

// Global instance
const storage = new StorageManager();
window.storage = storage;