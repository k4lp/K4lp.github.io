/**
 * Memory Applier
 * Handles memory operations
 */

import { nowISO } from '../../../core/utils.js';
import { appendActivity } from './applier-helpers.js';

export async function processMemoryOperations(memoryOps, summary) {
    let memories = summary._snapshots.memory;

    for (const op of memoryOps) {
        const result = { id: op.identifier, action: op.delete ? 'delete' : 'upsert', status: 'success' };

        try {
            if (op.delete) {
                const updated = memories.filter((item) => item.identifier !== op.identifier);
                if (updated.length !== memories.length) {
                    summary._snapshots.memory = updated;
                    memories = summary._snapshots.memory;
                    summary._dirty.memory = true;
                    appendActivity({
                        type: 'memory',
                        action: 'delete',
                        id: op.identifier,
                        status: 'success'
                    });
                }
            } else if (op.identifier && op.heading && op.content) {
                const existing = memories.find((item) => item.identifier === op.identifier);
                if (existing) {
                    existing.heading = op.heading;
                    existing.content = op.content;
                    if (op.notes !== undefined) existing.notes = op.notes;
                } else {
                    memories.push({
                        identifier: op.identifier,
                        heading: op.heading,
                        content: op.content,
                        notes: op.notes || '',
                        createdAt: nowISO()
                    });
                }
                summary._dirty.memory = true;
                appendActivity({
                    type: 'memory',
                    action: existing ? 'update' : 'create',
                    id: op.identifier,
                    status: 'success'
                });
            } else if (op.identifier) {
                const existing = memories.find((item) => item.identifier === op.identifier);
                if (existing && op.notes !== undefined) {
                    existing.notes = op.notes;
                    summary._dirty.memory = true;
                    appendActivity({
                        type: 'memory',
                        action: 'update',
                        id: op.identifier,
                        status: 'success'
                    });
                }
            }
        } catch (error) {
            result.status = 'error';
            result.error = error.message;
            summary.errors.push({
                type: 'memory',
                id: op.identifier || 'unknown',
                message: error.message
            });
        }

        summary.memory.push(result);
    }
}
