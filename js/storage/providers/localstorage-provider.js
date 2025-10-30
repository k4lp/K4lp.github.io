/**
 * LocalStorage Provider
 *
 * Implementation of IStorageProvider using browser localStorage
 * This is the default storage backend for GDRS
 */

/**
 * LocalStorageProvider
 * Implements IStorageProvider interface using browser's localStorage
 */
export class LocalStorageProvider {
  constructor() {
    this.storageAvailable = this._checkAvailability();
    if (!this.storageAvailable) {
      console.warn('[LocalStorageProvider] localStorage not available, using memory fallback');
      this.memoryStore = new Map();
    }
  }

  /**
   * Load data from localStorage
   * @param {string} key - Storage key
   * @returns {Promise<*>} The stored value, or null if not found
   */
  async load(key) {
    try {
      if (this.storageAvailable) {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      } else {
        return this.memoryStore.get(key) || null;
      }
    } catch (error) {
      console.error(`[LocalStorageProvider] Load error for "${key}":`, error);
      return null;
    }
  }

  /**
   * Save data to localStorage
   * @param {string} key - Storage key
   * @param {*} value - Value to store (will be serialized to JSON)
   * @returns {Promise<void>}
   */
  async save(key, value) {
    try {
      if (this.storageAvailable) {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        this.memoryStore.set(key, value);
      }
    } catch (error) {
      console.error(`[LocalStorageProvider] Save error for "${key}":`, error);

      // Handle quota exceeded
      if (error.name === 'QuotaExceededError') {
        console.error('[LocalStorageProvider] Storage quota exceeded!');
        throw new Error('Storage quota exceeded. Please clear some data.');
      }

      throw error;
    }
  }

  /**
   * Delete data from localStorage
   * @param {string} key - Storage key
   * @returns {Promise<void>}
   */
  async delete(key) {
    try {
      if (this.storageAvailable) {
        localStorage.removeItem(key);
      } else {
        this.memoryStore.delete(key);
      }
    } catch (error) {
      console.error(`[LocalStorageProvider] Delete error for "${key}":`, error);
      throw error;
    }
  }

  /**
   * Clear all data from localStorage
   * Note: This clears ALL localStorage, not just GDRS keys!
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      if (this.storageAvailable) {
        localStorage.clear();
      } else {
        this.memoryStore.clear();
      }
    } catch (error) {
      console.error('[LocalStorageProvider] Clear error:', error);
      throw error;
    }
  }

  /**
   * Clear only GDRS-prefixed keys
   * Safer alternative to clear() that only removes GDRS data
   * @returns {Promise<void>}
   */
  async clearGDRS() {
    try {
      if (this.storageAvailable) {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('gdrs_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } else {
        // Clear memory store keys that start with gdrs_
        for (const key of this.memoryStore.keys()) {
          if (key.startsWith('gdrs_')) {
            this.memoryStore.delete(key);
          }
        }
      }
    } catch (error) {
      console.error('[LocalStorageProvider] Clear GDRS error:', error);
      throw error;
    }
  }

  /**
   * Check if localStorage is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    return this.storageAvailable;
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Storage stats
   */
  async getStats() {
    try {
      if (this.storageAvailable) {
        let totalSize = 0;
        const items = [];

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            const value = localStorage.getItem(key);
            const size = new Blob([value]).size;
            totalSize += size;

            if (key.startsWith('gdrs_')) {
              items.push({ key, size });
            }
          }
        }

        return {
          provider: 'localStorage',
          available: true,
          totalItems: localStorage.length,
          gdrsItems: items.length,
          totalSize,
          items
        };
      } else {
        return {
          provider: 'memory (fallback)',
          available: false,
          totalItems: this.memoryStore.size,
          gdrsItems: this.memoryStore.size,
          totalSize: 0,
          items: Array.from(this.memoryStore.keys()).map(key => ({ key, size: 0 }))
        };
      }
    } catch (error) {
      console.error('[LocalStorageProvider] Get stats error:', error);
      return {
        provider: 'localStorage',
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Export all GDRS data
   * @returns {Promise<Object>} All GDRS data
   */
  async exportAll() {
    const data = {};

    try {
      if (this.storageAvailable) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('gdrs_')) {
            const value = localStorage.getItem(key);
            data[key] = value ? JSON.parse(value) : null;
          }
        }
      } else {
        for (const [key, value] of this.memoryStore.entries()) {
          if (key.startsWith('gdrs_')) {
            data[key] = value;
          }
        }
      }
    } catch (error) {
      console.error('[LocalStorageProvider] Export error:', error);
    }

    return data;
  }

  /**
   * Import GDRS data
   * @param {Object} data - Data to import
   * @returns {Promise<void>}
   */
  async importAll(data) {
    try {
      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith('gdrs_')) {
          await this.save(key, value);
        }
      }
      console.log(`[LocalStorageProvider] Imported ${Object.keys(data).length} items`);
    } catch (error) {
      console.error('[LocalStorageProvider] Import error:', error);
      throw error;
    }
  }

  /**
   * Check if localStorage is available
   * @private
   * @returns {boolean}
   */
  _checkAvailability() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}
