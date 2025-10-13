/**
 * Clean Storage Manager - Minimal localStorage API for K4LP Engineering Tools
 * Single responsibility: API credentials and user data persistence
 * No validation, no assumptions - just clean storage operations
 */

class StorageManager {
    constructor() {
        this.keys = {
            API_KEYS: 'k4lp_api_keys',
            USER_DATA: 'k4lp_user_data'
        };
    }

    /**
     * Save API credentials
     * @param {Object} keys - API credentials
     * @returns {boolean} Success status
     */
    saveApiKeys(keys) {
        try {
            const data = {
                digikeyClientId: keys.digikeyClientId || '',
                digikeyClientSecret: keys.digikeyClientSecret || '',
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
            return data ? JSON.parse(data) : null;
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
}

// Global instance
const storage = new StorageManager();
window.storage = storage;