/**
 * Parser Appliers
 * Orchestrates application of parsed operations
 */

import { eventBus, Events } from '../../core/event-bus.js';
import { createEmptySummary, commitEntityChanges } from './appliers/applier-helpers.js';
import { processVaultOperations } from './appliers/vault-applier.js';
import { processMemoryOperations } from './appliers/memory-applier.js';
import { processTaskOperations } from './appliers/task-applier.js';
import { processGoalOperations } from './appliers/goal-applier.js';
import { processExecutionBlocks } from './appliers/execution-applier.js';
import { processFinalOutputs } from './appliers/output-applier.js';

export async function applyOperations(operations, options = {}) {
    const summary = createEmptySummary();
    const startedAt = Date.now();

    await processVaultOperations(operations.vault, summary);
    await processMemoryOperations(operations.memories, summary);
    await processTaskOperations(operations.tasks, summary);
    await processGoalOperations(operations.goals, summary);

    // Persist entity changes before executing code
    commitEntityChanges(summary);

    await processExecutionBlocks(operations.jsExecute, summary);
    processFinalOutputs(operations.finalOutput, summary);

    summary.duration = Date.now() - startedAt;

    if (options.render !== false) {
        eventBus.emit(Events.UI_REFRESH_REQUEST);
    }

    return summary;
}

// Backward-compatible single-operation helpers
export function applyVaultOperation(op) {
    const summary = createEmptySummary();
    return processVaultOperations([op], summary).then(() => {
        commitEntityChanges(summary);
        return summary;
    });
}

export function applyMemoryOperation(op) {
    const summary = createEmptySummary();
    return processMemoryOperations([op], summary).then(() => {
        commitEntityChanges(summary);
        return summary;
    });
}

export function applyTaskOperation(op) {
    const summary = createEmptySummary();
    return processTaskOperations([op], summary).then(() => {
        commitEntityChanges(summary);
        return summary;
    });
}

export function applyGoalOperation(op) {
    const summary = createEmptySummary();
    return processGoalOperations([op], summary).then(() => {
        commitEntityChanges(summary);
        return summary;
    });
}
