/**
 * VAULT API
 *
 * Programmatic DataVault access for JavaScript execution context.
 * Provides clean methods for CRUD operations on vault entries.
 */

import { Storage } from '../../storage/storage.js';
import { nowISO } from '../../core/utils.js';
import {
    isValidIdentifier,
    normalizeVaultType,
    VAULT_TYPES,
} from '../../config/tool-registry-config.js';

/**
 * DataVault API - Programmatic access to vault storage
 */
export class VaultAPI {
    /**
     * Get a vault entry by ID
     * @param {string} id - Vault entry identifier
     * @param {Object} options - Options
     * @param {boolean} options.parseJSON - Auto-parse JSON content (default: true)
     * @returns {*} Vault entry content or null if not found
     *
     * @example
     * const data = vault.get('my_data');
     * const rawText = vault.get('my_data', { parseJSON: false });
     */
    get(id, options = {}) {
        if (!id || !isValidIdentifier(id)) {
            throw new Error(`Invalid vault ID: ${id}`);
        }

        const vaultData = Storage.loadVault() || [];
        const entry = vaultData.find(v => v.identifier === id);

        if (!entry) {
            return null;
        }

        const content = entry.content;

        // Auto-parse JSON if requested (default)
        if (options.parseJSON !== false && entry.type === 'data') {
            try {
                return JSON.parse(content);
            } catch {
                // Return as-is if parsing fails
                return content;
            }
        }

        return content;
    }

    /**
     * Get full vault entry with metadata
     * @param {string} id - Vault entry identifier
     * @returns {Object|null} Full vault entry or null
     *
     * @example
     * const entry = vault.getEntry('my_data');
     * console.log(entry.type, entry.description, entry.createdAt);
     */
    getEntry(id) {
        if (!id || !isValidIdentifier(id)) {
            throw new Error(`Invalid vault ID: ${id}`);
        }

        const vaultData = Storage.loadVault() || [];
        return vaultData.find(v => v.identifier === id) || null;
    }

    /**
     * Create or update a vault entry
     * @param {string} id - Vault entry identifier
     * @param {*} content - Content to store
     * @param {Object} options - Entry options
     * @param {string} options.type - Entry type: 'text', 'code', or 'data' (default: auto-detect)
     * @param {string} options.description - Entry description
     * @returns {Object} Created/updated entry
     *
     * @example
     * vault.set('results', { score: 95 }, { type: 'data', description: 'Test results' });
     * vault.set('code_snippet', 'function test() {}', { type: 'code' });
     */
    set(id, content, options = {}) {
        if (!id || !isValidIdentifier(id)) {
            throw new Error(`Invalid vault ID: ${id}`);
        }

        const vaultData = Storage.loadVault() || [];
        const existingIndex = vaultData.findIndex(v => v.identifier === id);

        // Determine content type
        let contentType = options.type || this._detectType(content);
        contentType = normalizeVaultType(contentType);

        // Serialize content if needed
        let serializedContent = content;
        if (contentType === 'data' && typeof content === 'object') {
            serializedContent = JSON.stringify(content, null, 2);
        } else if (typeof content !== 'string') {
            serializedContent = String(content);
        }

        const timestamp = nowISO();

        if (existingIndex >= 0) {
            // Update existing entry
            vaultData[existingIndex] = {
                ...vaultData[existingIndex],
                content: serializedContent,
                type: contentType,
                description: options.description || vaultData[existingIndex].description,
                updatedAt: timestamp,
            };
        } else {
            // Create new entry
            vaultData.push({
                identifier: id,
                type: contentType,
                description: options.description || '',
                content: serializedContent,
                createdAt: timestamp,
                updatedAt: timestamp,
            });
        }

        Storage.saveVault(vaultData);

        return vaultData.find(v => v.identifier === id);
    }

    /**
     * Delete a vault entry
     * @param {string} id - Vault entry identifier
     * @returns {boolean} True if deleted, false if not found
     *
     * @example
     * const deleted = vault.delete('old_data');
     */
    delete(id) {
        if (!id || !isValidIdentifier(id)) {
            throw new Error(`Invalid vault ID: ${id}`);
        }

        const vaultData = Storage.loadVault() || [];
        const initialLength = vaultData.length;
        const filtered = vaultData.filter(v => v.identifier !== id);

        if (filtered.length < initialLength) {
            Storage.saveVault(filtered);
            return true;
        }

        return false;
    }

    /**
     * Check if vault entry exists
     * @param {string} id - Vault entry identifier
     * @returns {boolean} True if exists
     *
     * @example
     * if (vault.exists('my_data')) { ... }
     */
    exists(id) {
        if (!id || !isValidIdentifier(id)) {
            return false;
        }

        const vaultData = Storage.loadVault() || [];
        return vaultData.some(v => v.identifier === id);
    }

    /**
     * List all vault entries
     * @param {Object} options - List options
     * @param {string} options.type - Filter by type
     * @param {boolean} options.metadataOnly - Return only metadata (no content)
     * @returns {Array} Array of vault entries
     *
     * @example
     * const all = vault.list();
     * const dataOnly = vault.list({ type: 'data' });
     * const metadata = vault.list({ metadataOnly: true });
     */
    list(options = {}) {
        let vaultData = Storage.loadVault() || [];

        // Filter by type if requested
        if (options.type) {
            const normalizedType = normalizeVaultType(options.type);
            vaultData = vaultData.filter(v => v.type === normalizedType);
        }

        // Return metadata only if requested
        if (options.metadataOnly) {
            return vaultData.map(({ identifier, type, description, createdAt, updatedAt }) => ({
                identifier,
                type,
                description,
                createdAt,
                updatedAt,
            }));
        }

        return vaultData;
    }

    /**
     * Search vault entries
     * @param {string|RegExp} query - Search query (searches ID and description)
     * @returns {Array} Matching vault entries
     *
     * @example
     * const results = vault.search('analysis');
     * const regexResults = vault.search(/^data_/);
     */
    search(query) {
        const vaultData = Storage.loadVault() || [];

        const searchFn = query instanceof RegExp
            ? (text) => query.test(text)
            : (text) => text.toLowerCase().includes(String(query).toLowerCase());

        return vaultData.filter(entry =>
            searchFn(entry.identifier) ||
            searchFn(entry.description || '') ||
            searchFn(entry.type || '')
        );
    }

    /**
     * Get vault statistics
     * @returns {Object} Vault statistics
     *
     * @example
     * const stats = vault.stats();
     * console.log(`Total entries: ${stats.total}`);
     */
    stats() {
        const vaultData = Storage.loadVault() || [];

        const byType = {};
        Object.values(VAULT_TYPES).forEach(type => {
            byType[type] = vaultData.filter(v => v.type === type).length;
        });

        return {
            total: vaultData.length,
            byType,
            ids: vaultData.map(v => v.identifier),
        };
    }

    /**
     * Clear all vault entries (use with caution!)
     * @returns {number} Number of entries cleared
     *
     * @example
     * const count = vault.clear();
     */
    clear() {
        const vaultData = Storage.loadVault() || [];
        const count = vaultData.length;
        Storage.saveVault([]);
        return count;
    }

    /**
     * Detect content type from value
     * @private
     */
    _detectType(content) {
        if (typeof content === 'object') {
            return 'data';
        }

        const strContent = String(content);

        // Check if it looks like code
        if (/^(function|class|const|let|var|import|export)\s/m.test(strContent) ||
            /[{}();]/.test(strContent)) {
            return 'code';
        }

        return 'text';
    }
}

export default VaultAPI;
