import { TASK_STATUSES } from '../../../config/tool-registry-config.js';

function resolveStatus(op, existing) {
  if (op.status && TASK_STATUSES.includes(op.status)) {
    return op.status;
  }
  return existing ? existing.status : 'pending';
}

export const tasksProcessor = {
  id: 'tasks',
  async process(context, operations = []) {
    if (!Array.isArray(operations) || operations.length === 0) return;

    const summary = context.getSummary();
    const tasks = context.getSnapshot('tasks');

    for (const op of operations) {
      const result = { id: op?.identifier, action: 'upsert', status: 'success' };

      try {
        if (!op.identifier) {
          throw new Error('Task operation missing identifier');
        }

        const existing = tasks.find((item) => item.identifier === op.identifier);
        if (existing) {
          if (op.heading) existing.heading = op.heading;
          if (op.content) existing.content = op.content;
          if (op.notes !== undefined) existing.notes = op.notes;
          existing.status = resolveStatus(op, existing);
        } else {
          if (!op.heading || !op.content) {
            throw new Error('New tasks require heading and content');
          }

          tasks.push({
            identifier: op.identifier,
            heading: op.heading,
            content: op.content,
            status: resolveStatus(op),
            notes: op.notes || '',
            createdAt: context.now()
          });
        }

        context.markDirty('tasks');
        context.logActivity({
          type: 'task',
          action: existing ? 'update' : 'create',
          id: op.identifier,
          status: 'success',
          newStatus: resolveStatus(op, existing)
        });
      } catch (error) {
        result.status = 'error';
        result.error = error.message;
        context.recordError({
          type: 'task',
          id: op?.identifier || 'unknown',
          message: error.message
        });
      }

      summary.tasks.push(result);
    }
  }
};

export default tasksProcessor;
