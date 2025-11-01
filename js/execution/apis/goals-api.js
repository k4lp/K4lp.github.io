/**
 * GOALS API
 *
 * Programmatic Goals access for JavaScript execution context.
 */

import { Storage } from '../../storage/storage.js';
import { nowISO } from '../../core/utils.js';
import { isValidIdentifier } from '../../config/tool-registry-config.js';

/**
 * Goals API - Programmatic access to goal management
 */
export class GoalsAPI {
    /**
     * Get a goal
     * @param {string} id - Goal identifier
     * @returns {Object|null} Goal or null
     *
     * @example
     * const goal = goals.get('goal_001');
     */
    get(id) {
        if (!id || !isValidIdentifier(id)) {
            throw new Error(`Invalid goal ID: ${id}`);
        }

        const goalsData = Storage.loadGoals() || [];
        return goalsData.find(g => g.identifier === id) || null;
    }

    /**
     * Set a goal
     * @param {string} id - Goal identifier
     * @param {Object} goal - Goal data
     * @param {string} goal.heading - Goal title
     * @param {string} goal.content - Goal description/success criteria
     * @param {string} goal.notes - Goal notes
     * @returns {Object} Created/updated goal
     *
     * @example
     * goals.set('goal_001', {
     *   heading: 'Complete project',
     *   content: 'Deliver all features',
     *   notes: 'Deadline: Q4'
     * });
     */
    set(id, goal = {}) {
        if (!id || !isValidIdentifier(id)) {
            throw new Error(`Invalid goal ID: ${id}`);
        }

        const goalsData = Storage.loadGoals() || [];
        const existingIndex = goalsData.findIndex(g => g.identifier === id);
        const timestamp = nowISO();

        const entry = {
            identifier: id,
            heading: goal.heading || id,
            content: goal.content || '',
            notes: goal.notes || '',
            createdAt: existingIndex >= 0 ? goalsData[existingIndex].createdAt : timestamp,
            updatedAt: timestamp,
        };

        if (existingIndex >= 0) {
            goalsData[existingIndex] = entry;
        } else {
            goalsData.push(entry);
        }

        Storage.saveGoals(goalsData);
        return entry;
    }

    /**
     * Delete a goal
     * @param {string} id - Goal identifier
     * @returns {boolean} True if deleted
     *
     * @example
     * goals.delete('goal_001');
     */
    delete(id) {
        if (!id || !isValidIdentifier(id)) {
            throw new Error(`Invalid goal ID: ${id}`);
        }

        const goalsData = Storage.loadGoals() || [];
        const filtered = goalsData.filter(g => g.identifier !== id);

        if (filtered.length < goalsData.length) {
            Storage.saveGoals(filtered);
            return true;
        }

        return false;
    }

    /**
     * List all goals
     * @returns {Array} All goals
     *
     * @example
     * const allGoals = goals.list();
     */
    list() {
        return Storage.loadGoals() || [];
    }
}

export default GoalsAPI;
