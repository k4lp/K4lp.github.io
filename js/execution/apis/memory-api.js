/**
 * MEMORY API
 *
 * Programmatic Memory access for JavaScript execution context.
 */

import { Storage } from '../../storage/storage.js';
import { nowISO } from '../../core/utils.js';
import { isValidIdentifier } from '../../config/tool-registry-config.js';

/**
 * Memory API - Programmatic access to memory storage
 */
export class MemoryAPI {
    /**
     * Get a memory entry
     * @param {string} id - Memory identifier
     * @returns {Object|null} Memory entry or null
     *
     * @example
     * const mem = memory.get('user_context');
     */
    get(id) {
        if (!id || !isValidIdentifier(id)) {
            throw new Error(`Invalid memory ID: ${id}`);
        }

        const memoryData = Storage.loadMemory() || [];
        return memoryData.find(m => m.identifier === id) || null;
    }

    /**
     * Set a memory entry
     * @param {string} id - Memory identifier
     * @param {string} content - Memory content
     * @param {string} heading - Memory heading/title
     * @param {string} notes - Optional notes
     * @returns {Object} Created/updated memory entry
     *
     * @example
     * memory.set('user_name', 'John Doe', 'User Information');
     */
    set(id, content, heading, notes = '') {
        if (!id || !isValidIdentifier(id)) {
            throw new Error(`Invalid memory ID: ${id}`);
        }

        const memoryData = Storage.loadMemory() || [];
        const existingIndex = memoryData.findIndex(m => m.identifier === id);
        const timestamp = nowISO();

        const entry = {
            identifier: id,
            heading: heading || id,
            content: String(content),
            notes: String(notes),
            createdAt: existingIndex >= 0 ? memoryData[existingIndex].createdAt : timestamp,
            updatedAt: timestamp,
        };

        if (existingIndex >= 0) {
            memoryData[existingIndex] = entry;
        } else {
            memoryData.push(entry);
        }

        Storage.saveMemory(memoryData);
        return entry;
    }

    /**
     * Delete a memory entry
     * @param {string} id - Memory identifier
     * @returns {boolean} True if deleted
     *
     * @example
     * memory.delete('old_context');
     */
    delete(id) {
        if (!id || !isValidIdentifier(id)) {
            throw new Error(`Invalid memory ID: ${id}`);
        }

        const memoryData = Storage.loadMemory() || [];
        const filtered = memoryData.filter(m => m.identifier !== id);

        if (filtered.length < memoryData.length) {
            Storage.saveMemory(filtered);
            return true;
        }

        return false;
    }

    /**
     * List all memory entries
     * @returns {Array} All memory entries
     *
     * @example
     * const allMemory = memory.list();
     */
    list() {
        return Storage.loadMemory() || [];
    }

    /**
     * Search memory entries
     * @param {string|RegExp} query - Search query
     * @returns {Array} Matching entries
     *
     * @example
     * const results = memory.search('user');
     */
    search(query) {
        const memoryData = Storage.loadMemory() || [];

        const searchFn = query instanceof RegExp
            ? (text) => query.test(text)
            : (text) => text.toLowerCase().includes(String(query).toLowerCase());

        return memoryData.filter(entry =>
            searchFn(entry.identifier) ||
            searchFn(entry.heading || '') ||
            searchFn(entry.content || '') ||
            searchFn(entry.notes || '')
        );
    }
}

export default MemoryAPI;
