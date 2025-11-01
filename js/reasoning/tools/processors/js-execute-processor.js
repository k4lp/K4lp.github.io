export const jsExecuteProcessor = {
  id: 'jsExecute',
  async process(context, operations = []) {
    if (!Array.isArray(operations) || operations.length === 0) return;

    const summary = context.getSummary();

    for (let index = 0; index < operations.length; index += 1) {
      const code = operations[index];

      const execResult = await context.jsExecutor.executeCode(code, {
        source: 'auto',
        context: {
          blockIndex: index
        },
        metadata: {
          operationsBefore: {
            vault: summary.vault.length,
            memory: summary.memory.length,
            tasks: summary.tasks.length,
            goals: summary.goals.length
          }
        }
      });

      summary.executions.push(execResult);

      if (!execResult.success) {
        context.recordError({
          type: 'execution',
          id: execResult.id,
          message: execResult.error?.message || 'Execution failed'
        });
      }
    }
  }
};

export default jsExecuteProcessor;
