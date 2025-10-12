/**
 * Storage Utility - Clean localStorage management for API credentials
 * Single-responsibility module for client-side data persistence
 * Part of K4LP Engineering Tools - Swiss Minimalist Design
 */

class StorageManager {
    constructor() {
        this.API_KEYS_KEY = 'k4lp_api_keys';
        this.USER_DATA_KEY = 'k4lp_user_data';
    }

    /**
     * Save API credentials to localStorage
     * @param {Object} keys - API credentials object
     * @param {string} keys.digikeyClientId - Digikey Client ID
     * @param {string} keys.digikeyClientSecret - Digikey Client Secret
     * @param {string} keys.mouserApiKey - Mouser API Key
     * @returns {boolean} Success status
     */
    saveApiKeys(keys) {
        try {
            const sanitizedKeys = {
                digikeyClientId: keys.digikeyClientId?.trim() || '',
                digikeyClientSecret: keys.digikeyClientSecret?.trim() || '',
                mouserApiKey: keys.mouserApiKey?.trim() || '',
                lastUpdated: new Date().toISOString()
            };
            
            localStorage.setItem(this.API_KEYS_KEY, JSON.stringify(sanitizedKeys));
            return true;
        } catch (error) {
            console.error('Failed to save API keys:', error);
            return false;
        }
    }

    /**
     * Retrieve API credentials from localStorage
     * @returns {Object|null} API credentials or null if not found
     */
    getApiKeys() {
        try {
            const keys = localStorage.getItem(this.API_KEYS_KEY);
            return keys ? JSON.parse(keys) : null;
        } catch (error) {
            console.error('Failed to retrieve API keys:', error);
            return null;
        }
    }

    /**
     * Clear all API credentials from localStorage
     * @returns {boolean} Success status
     */
    clearApiKeys() {
        try {
            localStorage.removeItem(this.API_KEYS_KEY);
            return true;
        } catch (error) {
            console.error('Failed to clear API keys:', error);
            return false;
        }
    }

    /**
     * Save user data to localStorage
     * @param {Object} data - User data object
     * @returns {boolean} Success status
     */
    saveUserData(data) {
        try {
            const userData = {
                ...data,
                lastUpdated: new Date().toISOString()
            };
            
            localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(userData));
            return true;
        } catch (error) {
            console.error('Failed to save user data:', error);
            return false;
        }
    }

    /**
     * Retrieve user data from localStorage
     * @returns {Object|null} User data or null if not found
     */
    getUserData() {
        try {
            const data = localStorage.getItem(this.USER_DATA_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Failed to retrieve user data:', error);
            return null;
        }
    }

    /**
     * Check if API keys are present (not validated)
     * @returns {Object} Status of each API key
     */
    hasApiKeys() {
        const keys = this.getApiKeys();
        return {
            digikey: !!(keys?.digikeyClientId && keys?.digikeyClientSecret),
            mouser: !!(keys?.mouserApiKey)
        };
    }

    /**
     * Check localStorage support
     * @returns {boolean} Whether localStorage is available
     */
    isSupported() {
        try {
            const test = 'k4lp_storage_test';
            localStorage.setItem(test, 'test');
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Create and export singleton instance
const storage = new StorageManager();

// Expose global functions
window.storage = storage;