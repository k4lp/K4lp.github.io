// storage.js - Manages localStorage operations

class StorageManager {
    constructor() {
        this.storageAvailable = this.checkStorageAvailable();
    }

    // Check if localStorage is available
    checkStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('localStorage not available:', e);
            return false;
        }
    }

    // Set item in localStorage
    set(key, value) {
        if (!this.storageAvailable) return false;
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
            return true;
        } catch (e) {
            console.error('Error setting localStorage:', e);
            return false;
        }
    }

    // Get item from localStorage
    get(key, defaultValue = null) {
        if (!this.storageAvailable) return defaultValue;
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Error getting localStorage:', e);
            return defaultValue;
        }
    }

    // Remove item from localStorage
    remove(key) {
        if (!this.storageAvailable) return false;
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Error removing localStorage:', e);
            return false;
        }
    }

    // Clear all localStorage
    clear() {
        if (!this.storageAvailable) return false;
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.error('Error clearing localStorage:', e);
            return false;
        }
    }

    // Get all keys matching a pattern
    getKeys(pattern) {
        if (!this.storageAvailable) return [];
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (pattern && key.includes(pattern)) {
                keys.push(key);
            } else if (!pattern) {
                keys.push(key);
            }
        }
        return keys;
    }

    // Get storage size estimation
    getStorageSize() {
        if (!this.storageAvailable) return 0;
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return total;
    }

    // Export all data
    exportAll() {
        if (!this.storageAvailable) return null;
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data[key] = localStorage.getItem(key);
        }
        return data;
    }

    // Import data
    importAll(data) {
        if (!this.storageAvailable || !data) return false;
        try {
            for (let key in data) {
                if (data.hasOwnProperty(key)) {
                    localStorage.setItem(key, data[key]);
                }
            }
            return true;
        } catch (e) {
            console.error('Error importing data:', e);
            return false;
        }
    }
}

// Export
window.StorageManager = StorageManager;
