/**
 * GDRS Storage Layer
 * Unified storage interface using modular entity stores
 */

import { LS_KEYS } from '../core/constants.js';
import { createSimpleStore } from './entities/base-store.js';
import { KeypoolStore } from './entities/keypool-store.js';
import { ConfigStore } from './entities/config-store.js';
import { OutputStore } from './entities/output-store.js';

// Create simple stores for basic entities
const goalsStore = createSimpleStore(LS_KEYS.GOALS, []);
const memoryStore = createSimpleStore(LS_KEYS.MEMORY, []);
const tasksStore = createSimpleStore(LS_KEYS.TASKS, []);
const vaultStore = createSimpleStore(LS_KEYS.VAULT, []);
const reasoningLogStore = createSimpleStore(LS_KEYS.REASONING_LOG, []);
const executionLogStore = createSimpleStore(LS_KEYS.EXECUTION_LOG, []);
const toolActivityLogStore = createSimpleStore(LS_KEYS.TOOL_ACTIVITY_LOG, []);
const queryStore = createSimpleStore(LS_KEYS.CURRENT_QUERY, '');
const lastCodeStore = createSimpleStore(LS_KEYS.LAST_EXECUTED_CODE, '');

export const Storage = {
    // === KEYPOOL MANAGEMENT ===
    loadKeypool: () => KeypoolStore.load(),
    saveKeypool: (pool) => KeypoolStore.save(pool),
    parseKeysFromText: (text) => KeypoolStore.parseFromText(text),
    formatKeysToText: (pool) => KeypoolStore.formatToText(pool),
    updateKeysFromText: (text) => KeypoolStore.updateFromText(text),
    normalizeKeypool: (arr) => KeypoolStore.normalize(arr),

    // === CONFIGURATION ===
    loadMaxOutputTokens: () => ConfigStore.loadMaxOutputTokens(),
    saveMaxOutputTokens: (tokens) => ConfigStore.saveMaxOutputTokens(tokens),

    // === GOALS ===
    loadGoals: () => goalsStore.load(),
    saveGoals: (goals) => goalsStore.save(goals),

    // === MEMORY ===
    loadMemory: () => memoryStore.load(),
    saveMemory: (memory) => memoryStore.save(memory),

    // === TASKS ===
    loadTasks: () => tasksStore.load(),
    saveTasks: (tasks) => tasksStore.save(tasks),

    // === VAULT ===
    loadVault: () => vaultStore.load(),
    saveVault: (vault) => vaultStore.save(vault),

    // === FINAL OUTPUT ===
    loadFinalOutput: () => OutputStore.load(),
    saveFinalOutput: (html, verified, source) => OutputStore.save(html, verified, source),
    isFinalOutputVerified: () => OutputStore.isVerified(),
    markFinalOutputVerified: () => OutputStore.markVerified(),
    clearFinalOutputVerification: () => OutputStore.clearVerification(),

    // === REASONING LOG ===
    loadReasoningLog: () => reasoningLogStore.load(),
    saveReasoningLog: (log) => reasoningLogStore.save(log),

    // === CURRENT QUERY ===
    loadCurrentQuery: () => queryStore.load(),
    saveCurrentQuery: (query) => queryStore.save(query),

    // === EXECUTION LOG ===
    loadExecutionLog: () => executionLogStore.load(),
    saveExecutionLog: (log) => executionLogStore.save(log),

    // === LAST EXECUTED CODE ===
    loadLastExecutedCode: () => lastCodeStore.load(),
    saveLastExecutedCode: (code) => lastCodeStore.save(code),

    // === TOOL ACTIVITY LOG ===
    loadToolActivityLog: () => toolActivityLogStore.load(),
    saveToolActivityLog: (log) => toolActivityLogStore.save(log)
};
