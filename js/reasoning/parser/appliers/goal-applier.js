/**
 * Goal Applier
 * Handles goal operations
 */

import { nowISO } from '../../../core/utils.js';
import { appendActivity } from './applier-helpers.js';

export async function processGoalOperations(goalOps, summary) {
    const goals = summary._snapshots.goals;

    for (const op of goalOps) {
        const result = { id: op.identifier, action: 'upsert', status: 'success' };

        try {
            if (!op.identifier) {
                throw new Error('Goal operation missing identifier');
            }

            if (op.delete) {
                const updated = goals.filter((item) => item.identifier !== op.identifier);
                if (updated.length !== goals.length) {
                    summary._snapshots.goals = updated;
                    summary._dirty.goals = true;
                    appendActivity({
                        type: 'goal',
                        action: 'delete',
                        id: op.identifier,
                        status: 'success'
                    });
                }
            } else {
                const existing = goals.find((item) => item.identifier === op.identifier);
                if (existing) {
                    if (op.heading) existing.heading = op.heading;
                    if (op.content) existing.content = op.content;
                    if (op.notes !== undefined) existing.notes = op.notes;
                } else {
                    if (!op.heading || !op.content) {
                        throw new Error('New goals require heading and content');
                    }
                    goals.push({
                        identifier: op.identifier,
                        heading: op.heading,
                        content: op.content,
                        notes: op.notes || '',
                        createdAt: nowISO()
                    });
                }

                summary._dirty.goals = true;
                appendActivity({
                    type: 'goal',
                    action: existing ? 'update' : 'create',
                    id: op.identifier,
                    status: 'success'
                });
            }
        } catch (error) {
            result.status = 'error';
            result.error = error.message;
            summary.errors.push({
                type: 'goal',
                id: op.identifier || 'unknown',
                message: error.message
            });
        }

        summary.goals.push(result);
    }
}
