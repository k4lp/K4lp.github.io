/**
 * Example: In-Memory Storage Provider
 *
 * This demonstrates how to create a custom storage backend.
 * Useful for testing, temporary sessions, or when you don't want persistence.
 */

import { Registry, ExtensionPoints } from '../core/extension-points.js';
import { Interfaces } from '../core/interfaces.js';

/**
 * In-Memory Storage Provider
 * Stores data in memory (lost on page refresh)
 */
class MemoryStorageProvider {
  constructor() {
    this.store = new Map();
    console.log('📦 [MemoryStorage] Initialized (non-persistent)');
  }

  /**
   * Load data from memory
   * @param {string} key - Storage key
   * @returns {Promise<*>} The stored value, or null if not found
   */
  async load(key) {
    const value = this.store.get(key);
    console.log(`📖 [MemoryStorage] Load "${key}":`, value ? 'found' : 'not found');
    return value || null;
  }

  /**
   * Save data to memory
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @returns {Promise<void>}
   */
  async save(key, value) {
    this.store.set(key, value);
    console.log(`💾 [MemoryStorage] Saved "${key}" (${this._getSize(value)} bytes)`);
  }

  /**
   * Delete data from memory
   * @param {string} key - Storage key
   * @returns {Promise<void>}
   */
  async delete(key) {
    const existed = this.store.has(key);
    this.store.delete(key);
    console.log(`🗑️ [MemoryStorage] Deleted "${key}":`, existed ? 'existed' : 'not found');
  }

  /**
   * Clear all data from memory
   * @returns {Promise<void>}
   */
  async clear() {
    const count = this.store.size;
    this.store.clear();
    console.log(`🧹 [MemoryStorage] Cleared all data (${count} items)`);
  }

  /**
   * Check if storage is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    return true; // Memory is always available
  }

  /**
   * Get storage statistics
   * @returns {Object} Statistics
   */
  getStats() {
    let totalSize = 0;
    const items = [];

    for (const [key, value] of this.store.entries()) {
      const size = this._getSize(value);
      totalSize += size;
      items.push({ key, size });
    }

    return {
      itemCount: this.store.size,
      totalSize,
      items
    };
  }

  /**
   * Export all data (for backup/migration)
   * @returns {Object} All stored data
   */
  exportAll() {
    const data = {};
    for (const [key, value] of this.store.entries()) {
      data[key] = value;
    }
    return data;
  }

  /**
   * Import data (for restore/migration)
   * @param {Object} data - Data to import
   */
  importAll(data) {
    this.store.clear();
    for (const [key, value] of Object.entries(data)) {
      this.store.set(key, value);
    }
    console.log(`📥 [MemoryStorage] Imported ${Object.keys(data).length} items`);
  }

  /**
   * Helper: Estimate size of data in bytes
   * @private
   */
  _getSize(value) {
    try {
      return new Blob([JSON.stringify(value)]).size;
    } catch {
      return 0;
    }
  }
}

/**
 * Session Storage Provider
 * Uses browser sessionStorage (persists until tab/browser is closed)
 */
class SessionStorageProvider {
  constructor() {
    console.log('📦 [SessionStorage] Initialized (session-persistent)');
  }

  async load(key) {
    try {
      const value = sessionStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`[SessionStorage] Load error for "${key}":`, error);
      return null;
    }
  }

  async save(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
      console.log(`💾 [SessionStorage] Saved "${key}"`);
    } catch (error) {
      console.error(`[SessionStorage] Save error for "${key}":`, error);
      throw error;
    }
  }

  async delete(key) {
    sessionStorage.removeItem(key);
    console.log(`🗑️ [SessionStorage] Deleted "${key}"`);
  }

  async clear() {
    const count = sessionStorage.length;
    sessionStorage.clear();
    console.log(`🧹 [SessionStorage] Cleared all data (${count} items)`);
  }

  async isAvailable() {
    try {
      const testKey = '__storage_test__';
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Register storage providers with the Registry
 */
export function registerStorageProviders() {
  console.log('%c[Example] Registering custom storage providers...', 'color: #00aaff; font-weight: bold;');

  // Register memory storage
  Registry.register(
    ExtensionPoints.STORAGE_PROVIDERS,
    'memory',
    MemoryStorageProvider
  );

  // Register session storage
  Registry.register(
    ExtensionPoints.STORAGE_PROVIDERS,
    'session',
    SessionStorageProvider
  );

  console.log('%c✅ [Example] 2 storage providers registered!', 'color: #00ff00;');
  console.log('%c   - memory: In-memory storage (non-persistent)', 'color: #666;');
  console.log('%c   - session: Session storage (persists until tab closes)', 'color: #666;');
}

/**
 * Demonstrate storage providers
 */
export async function demonstrateStorageProviders() {
  console.group('%c[Example] Testing Storage Providers', 'color: #ff6600; font-weight: bold;');

  // Test Memory Storage
  const MemoryStorage = Registry.get(ExtensionPoints.STORAGE_PROVIDERS, 'memory');
  if (MemoryStorage) {
    console.log('\n💾 Testing Memory Storage:');
    const storage = new MemoryStorage();

    // Save some data
    await storage.save('user', { name: 'Alice', age: 30 });
    await storage.save('settings', { theme: 'dark', language: 'en' });

    // Load data
    const user = await storage.load('user');
    console.log('  Loaded user:', user);

    // Get stats
    const stats = storage.getStats();
    console.log('  Stats:', stats);

    // Export all
    const exported = storage.exportAll();
    console.log('  Exported data:', exported);

    // Clear
    await storage.clear();
    console.log('  Cleared all data');
  }

  // Test Session Storage
  const SessionStorage = Registry.get(ExtensionPoints.STORAGE_PROVIDERS, 'session');
  if (SessionStorage) {
    console.log('\n🗂️ Testing Session Storage:');
    const storage = new SessionStorage();

    // Check availability
    const available = await storage.isAvailable();
    console.log('  Available:', available);

    if (available) {
      // Save and load
      await storage.save('temp_data', { timestamp: Date.now() });
      const data = await storage.load('temp_data');
      console.log('  Loaded temp data:', data);

      // Delete
      await storage.delete('temp_data');
      const deleted = await storage.load('temp_data');
      console.log('  After delete:', deleted);
    }
  }

  console.groupEnd();
}

// Auto-register when this module is imported
registerStorageProviders();

// Export for direct use
export {
  MemoryStorageProvider,
  SessionStorageProvider
};
