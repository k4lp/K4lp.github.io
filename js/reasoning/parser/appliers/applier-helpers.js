/**
 * Applier Helpers
 * Shared utilities for all appliers
 */

import { Storage } from '../../../storage/storage.js';
import { nowISO } from '../../../core/utils.js';

export function createEmptySummary() {
    return {
        vault: [],
        memory: [],
        tasks: [],
        goals: [],
        executions: [],
        finalOutput: [],
        errors: [],
        duration: 0,
        _dirty: {
            vault: false,
            memory: false,
            tasks: false,
            goals: false
        },
        _snapshots: {
            vault: Storage.loadVault(),
            memory: Storage.loadMemory(),
            tasks: Storage.loadTasks(),
            goals: Storage.loadGoals()
        }
    };
}

export function commitEntityChanges(summary) {
    if (summary._dirty.vault) Storage.saveVault(summary._snapshots.vault);
    if (summary._dirty.memory) Storage.saveMemory(summary._snapshots.memory);
    if (summary._dirty.tasks) Storage.saveTasks(summary._snapshots.tasks);
    if (summary._dirty.goals) Storage.saveGoals(summary._snapshots.goals);
}

export function appendActivity(activity) {
    const log = Storage.loadToolActivityLog();
    log.push({
        ...activity,
        timestamp: nowISO()
    });
    Storage.saveToolActivityLog(log);
}
