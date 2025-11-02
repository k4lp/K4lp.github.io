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
    const referenceMonitor = context.getReferenceMonitor();

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
            referenceMonitor.ensureExists({
              entityType: 'task',
              identifier: op.identifier,
              snapshot: tasks,
              operationType: 'update',
              notes: 'LLM attempted to update a task that does not exist in storage'
            });
            result.status = 'error';
            result.error = `Task not found for update: ${op.identifier}`;
            context.recordError({
              type: 'task',
              id: op.identifier,
              message: result.error
            });
            context.logActivity({
              type: 'task',
              action: 'update',
              id: op.identifier,
              status: 'error',
              error: result.error
            });
            summary.tasks.push(result);
            continue;
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
