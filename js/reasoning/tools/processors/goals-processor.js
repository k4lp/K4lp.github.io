export const goalsProcessor = {
  id: 'goals',
  async process(context, operations = []) {
    if (!Array.isArray(operations) || operations.length === 0) return;

    const summary = context.getSummary();
    let goals = context.getSnapshot('goals');
    const referenceMonitor = context.getReferenceMonitor();

    for (const op of operations) {
      const result = {
        id: op?.identifier,
        action: op?.delete ? 'delete' : 'upsert',
        status: 'success'
      };

      try {
        if (op.delete) {
          if (!referenceMonitor.ensureExists({
            entityType: 'goal',
            identifier: op.identifier,
            snapshot: goals,
            operationType: 'delete',
            notes: 'LLM attempted to delete a goal that does not exist in storage'
          })) {
            result.status = 'error';
            result.error = `Goal not found: ${op.identifier}`;
            context.recordError({
              type: 'goal',
              id: op?.identifier || 'unknown',
              message: result.error
            });
            context.logActivity({
              type: 'goal',
              action: 'delete',
              id: op?.identifier || 'unknown',
              status: 'error',
              error: result.error
            });
            summary.goals.push(result);
            continue;
          }

          const updated = goals.filter((item) => item.identifier !== op.identifier);
          if (updated.length !== goals.length) {
            summary._snapshots.goals = updated;
            goals = summary._snapshots.goals;
            context.markDirty('goals');
            context.logActivity({
              type: 'goal',
              action: 'delete',
              id: op.identifier,
              status: 'success'
            });
          }
        } else if (op.identifier && op.heading && op.content) {
          const existing = goals.find((item) => item.identifier === op.identifier);
          if (existing) {
            existing.heading = op.heading;
            existing.content = op.content;
            if (op.notes !== undefined) existing.notes = op.notes;
          } else {
            goals.push({
              identifier: op.identifier,
              heading: op.heading,
              content: op.content,
              notes: op.notes || '',
              createdAt: context.now()
            });
          }
          context.markDirty('goals');
          context.logActivity({
            type: 'goal',
            action: existing ? 'update' : 'create',
            id: op.identifier,
            status: 'success'
          });
        } else if (op.identifier) {
          const existing = goals.find((item) => item.identifier === op.identifier);
          if (!existing) {
            referenceMonitor.ensureExists({
              entityType: 'goal',
              identifier: op.identifier,
              snapshot: goals,
              operationType: 'update',
              notes: 'LLM attempted to update a goal that does not exist in storage'
            });
            result.status = 'error';
            result.error = `Goal not found for update: ${op.identifier}`;
            context.recordError({
              type: 'goal',
              id: op.identifier,
              message: result.error
            });
            context.logActivity({
              type: 'goal',
              action: 'update',
              id: op.identifier,
              status: 'error',
              error: result.error
            });
          } else if (op.notes !== undefined) {
            existing.notes = op.notes;
            context.markDirty('goals');
            context.logActivity({
              type: 'goal',
              action: 'update',
              id: op.identifier,
              status: 'success'
            });
          }
        } else {
          throw new Error('Goal operation missing identifier');
        }
      } catch (error) {
        result.status = 'error';
        result.error = error.message;
        context.recordError({
          type: 'goal',
          id: op?.identifier || 'unknown',
          message: error.message
        });
      }

      summary.goals.push(result);
    }
  }
};

export default goalsProcessor;
