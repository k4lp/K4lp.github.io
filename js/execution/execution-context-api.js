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
import { createInstrumentedAPIs } from './apis/instrumented-api-factory.js';
import { ExcelRuntimeStore } from '../state/excel-runtime-store.js';
import { createAttachmentsHelper } from './apis/attachments-helper.js';

/**
 * Build execution context with all APIs
 * This is injected into the JavaScript execution environment
 *
 * @param {Object} options - Options for context building
 * @param {boolean} options.instrumented - Whether to use instrumented APIs for tracking (default: true)
 * @returns {Object} Execution context with APIs
 *
 * @example
 * // In executed code:
 * const data = vault.get('my_data');
 * memory.set('key', 'value', 'My heading');
 * tasks.setStatus('task_001', 'finished');
 */
export function buildExecutionContext(options = {}) {
    const { instrumented = true } = options;

    const helper = createAttachmentsHelper(ExcelRuntimeStore);
    const attachmentsAPI = {
        hasWorkbook: () => ExcelRuntimeStore.hasWorkbook(),
        ensureWorkbook: () => {
            if (!ExcelRuntimeStore.hasWorkbook()) {
                throw new Error('No workbook attached. Upload a file before calling attachments APIs.');
            }
        },
        getMetadata: () => ExcelRuntimeStore.getMetadata(),
        getOriginal: () => ExcelRuntimeStore.getOriginal(),
        getWorkingCopy: () => ExcelRuntimeStore.getWorkingCopy(),
        getSheetNames: () => ExcelRuntimeStore.getSheetNames(),
        getDiffIndex: () => ExcelRuntimeStore.getDiffIndex(),
        updateSheet: (sheetName, mutator) => ExcelRuntimeStore.mutateSheet(sheetName, mutator),
        resetWorkingCopy: () => ExcelRuntimeStore.resetWorkingCopy(),
        getMutationLog: () => ExcelRuntimeStore.getMutationLog(),
        logSummary: () => console.table(helper.listSheets({ includeStats: true }).map(({ name, summary }) => ({
            sheet: name,
            rows: summary?.rowCount,
            columns: summary?.columnCount,
            changedCells: summary?.diff?.changedCells
        })) || []),
        // Convenience passthroughs so execution code can stay in one namespace
        listSheets: (options) => helper.listSheets(options),
        getWorkbook: () => helper.getWorkbook(),
        getWorkbookSummary: () => helper.getWorkbookSummary(),
        getSheet: (identifier) => helper.getSheet(identifier),
        selectSheet: (identifier) => helper.selectSheet(identifier),
        helper,
        get sheet() {
            throw new Error('Use attachments.getSheet(nameOrIndex) or attachments.helper.getSheet(nameOrIndex) instead of attachments.sheet.');
        }
    };

    // Create base API instances
    const baseAPIs = {
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

    // Return instrumented or base APIs based on options
    const finalAPIs = instrumented ? createInstrumentedAPIs(baseAPIs) : baseAPIs;
    return {
        ...finalAPIs,
        attachments: attachmentsAPI
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
