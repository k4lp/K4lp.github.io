export const memoryProcessor = {
  id: 'memory',
  async process(context, operations = []) {
    if (!Array.isArray(operations) || operations.length === 0) return;

    const summary = context.getSummary();
    let memories = context.getSnapshot('memory');
    const referenceMonitor = context.getReferenceMonitor();

    for (const op of operations) {
      const result = {
        id: op?.identifier,
        action: op?.delete ? 'delete' : 'upsert',
        status: 'success'
      };

      try {
        if (!op?.identifier) {
          throw new Error('Memory operation missing identifier');
        }

        const existing = memories.find((item) => item.identifier === op.identifier);

        if (op.delete) {
          if (!referenceMonitor.ensureExists({
            entityType: 'memory',
            identifier: op.identifier,
            snapshot: memories,
            operationType: 'delete',
            notes: 'LLM attempted to delete a memory that is not present in storage'
          })) {
            result.status = 'error';
            result.error = `Memory entry not found: ${op.identifier}`;
            context.recordError({
              type: 'memory',
              id: op.identifier,
              message: result.error
            });
            context.logActivity({
              type: 'memory',
              action: 'delete',
              id: op.identifier,
              status: 'error',
              error: result.error
            });
            continue;
          }

          const updated = memories.filter((item) => item.identifier !== op.identifier);
          if (updated.length !== memories.length) {
            summary._snapshots.memory = updated;
            memories = summary._snapshots.memory;
            context.markDirty('memory');
            context.logActivity({
              type: 'memory',
              action: 'delete',
              id: op.identifier,
              status: 'success'
            });
          }
        } else if (op.identifier && op.heading && op.content) {
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
              createdAt: context.now()
            });
          }
          context.markDirty('memory');
          context.logActivity({
            type: 'memory',
            action: existing ? 'update' : 'create',
            id: op.identifier,
            status: 'success'
          });
        } else if (op.identifier) {
          const existsForUpdate = referenceMonitor.ensureExists({
            entityType: 'memory',
            identifier: op.identifier,
            snapshot: memories,
            operationType: 'update',
            notes: 'LLM attempted to update memory notes but identifier does not exist'
          });

          if (!existsForUpdate) {
            result.status = 'error';
            result.error = `Memory entry not found for update: ${op.identifier}`;
            context.recordError({
              type: 'memory',
              id: op.identifier,
              message: result.error
            });
          } else if (op.notes !== undefined) {
            existing.notes = op.notes;
            context.markDirty('memory');
            context.logActivity({
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
        context.recordError({
          type: 'memory',
          id: op?.identifier || 'unknown',
          message: error.message
        });
      }

      summary.memory.push(result);
    }
  }
};

export default memoryProcessor;
