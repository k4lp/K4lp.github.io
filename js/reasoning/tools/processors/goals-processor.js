export const goalsProcessor = {
  id: 'goals',
  async process(context, operations = []) {
    if (!Array.isArray(operations) || operations.length === 0) return;

    const summary = context.getSummary();
    let goals = context.getSnapshot('goals');

    for (const op of operations) {
      const result = {
        id: op?.identifier,
        action: op?.delete ? 'delete' : 'upsert',
        status: 'success'
      };

      try {
        if (op.delete) {
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
          if (existing && op.notes !== undefined) {
            existing.notes = op.notes;
            context.markDirty('goals');
            context.logActivity({
              type: 'goal',
              action: 'update',
              id: op.identifier,
              status: 'success'
            });
          }
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
