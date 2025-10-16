/*!
 * Storage Manager
 *
 * Provides a simple, prefixed interface for interacting with localStorage.
 * Handles JSON serialization and deserialization automatically.
 */
class StorageManager {
    constructor(prefix = 'pcb-assembly-tools_') {
        this.prefix = prefix;
        if (!this.isSupported()) {
            console.error('LocalStorage is not supported in this browser. Settings and data will not be saved.');
        }
    }

    /**
     * Checks if localStorage is available and writable.
     * @returns {boolean} True if supported, false otherwise.
     */
    isSupported() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Saves a value to localStorage.
     * @param {string} key - The key to store the value under.
     * @param {any} value - The value to store. Can be any JSON-serializable type.
     */
    set(key, value) {
        if (!this.isSupported()) return;
        try {
            const serializedValue = JSON.stringify(value);
            localStorage.setItem(this.prefix + key, serializedValue);
        } catch (e) {
            console.error(`Error saving to localStorage for key "${key}":`, e);
        }
    }

    /**
     * Retrieves a value from localStorage.
     * @param {string} key - The key of the value to retrieve.
     * @returns {any|null} The retrieved value, or null if not found or on error.
     */
    get(key) {
        if (!this.isSupported()) return null;
        try {
            const serializedValue = localStorage.getItem(this.prefix + key);
            if (serializedValue === null) {
                return null;
            }
            return JSON.parse(serializedValue);
        } catch (e) {
            console.error(`Error reading from localStorage for key "${key}":`, e);
            return null;
        }
    }

    /**
     * Removes a value from localStorage.
     * @param {string} key - The key of the value to remove.
     */
    remove(key) {
        if (!this.isSupported()) return;
        localStorage.removeItem(this.prefix + key);
    }
}

// Create a single, global instance for the application to use.
const storage = new StorageManager();
window.storage = storage;