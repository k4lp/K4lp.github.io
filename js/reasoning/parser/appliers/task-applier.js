/**
 * Task Applier
 * Handles task operations
 */

import { nowISO } from '../../../core/utils.js';
import { TASK_STATUSES } from '../../../config/tool-registry-config.js';
import { appendActivity } from './applier-helpers.js';

export async function processTaskOperations(taskOps, summary) {
    const tasks = summary._snapshots.tasks;

    for (const op of taskOps) {
        const result = { id: op.identifier, action: 'upsert', status: 'success' };

        try {
            if (!op.identifier) {
                throw new Error('Task operation missing identifier');
            }

            const existing = tasks.find((item) => item.identifier === op.identifier);
            if (existing) {
                if (op.heading) existing.heading = op.heading;
                if (op.content) existing.content = op.content;
                if (op.notes !== undefined) existing.notes = op.notes;
                if (op.status && TASK_STATUSES.includes(op.status)) existing.status = op.status;
            } else {
                if (!op.heading || !op.content) {
                    throw new Error('New tasks require heading and content');
                }
                tasks.push({
                    identifier: op.identifier,
                    heading: op.heading,
                    content: op.content,
                    status: TASK_STATUSES.includes(op.status) ? op.status : 'pending',
                    notes: op.notes || '',
                    createdAt: nowISO()
                });
            }

            summary._dirty.tasks = true;
            appendActivity({
                type: 'task',
                action: existing ? 'update' : 'create',
                id: op.identifier,
                status: 'success'
            });
        } catch (error) {
            result.status = 'error';
            result.error = error.message;
            summary.errors.push({
                type: 'task',
                id: op.identifier || 'unknown',
                message: error.message
            });
        }

        summary.tasks.push(result);
    }
}
