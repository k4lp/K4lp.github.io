/**
 * EXECUTION CONTEXT API
 *
 * Builds and injects runtime APIs into JavaScript execution context.
 * Provides clean, programmatic access to vault, memory, tasks, goals, and utilities.
 *
 * This is a lightweight assembler that imports modular APIs from apis/ directory.
 */

import { VaultAPI } from './apis/vault-api.js';
import { MemoryAPI } from './apis/memory-api.js';
import { TasksAPI } from './apis/tasks-api.js';
import { GoalsAPI } from './apis/goals-api.js';
import { nowISO } from '../core/utils.js';

/**
 * Build execution context with all APIs
 * This is injected into the JavaScript execution environment
 *
 * @returns {Object} Execution context with APIs
 *
 * @example
 * // In executed code:
 * const data = vault.get('my_data');
 * memory.set('key', 'value', 'My heading');
 * tasks.setStatus('task_001', 'finished');
 */
export function buildExecutionContext() {
    return {
        // DataVault API
        vault: new VaultAPI(),

        // Memory API
        memory: new MemoryAPI(),

        // Tasks API
        tasks: new TasksAPI(),

        // Goals API
        goals: new GoalsAPI(),

        // Utility functions
        utils: {
            /**
             * Generate a unique ID
             * @param {string} prefix - ID prefix
             * @returns {string} Unique ID
             *
             * @example
             * const id = utils.generateId('task'); // 'task_1699..._abc123'
             */
            generateId: (prefix = 'item') => {
                return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            },

            /**
             * Get current ISO timestamp
             * @returns {string} ISO timestamp
             *
             * @example
             * const timestamp = utils.now(); // '2025-11-01T12:00:00.000Z'
             */
            now: () => nowISO(),

            /**
             * Sleep for specified milliseconds
             * @param {number} ms - Milliseconds to sleep
             * @returns {Promise} Promise that resolves after delay
             *
             * @example
             * await utils.sleep(1000); // Wait 1 second
             */
            sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
        },
    };
}

/**
 * Export individual APIs for direct use if needed
 */
export {
    VaultAPI,
    MemoryAPI,
    TasksAPI,
    GoalsAPI,
};

export default {
    buildExecutionContext,
    VaultAPI,
    MemoryAPI,
    TasksAPI,
    GoalsAPI,
};
