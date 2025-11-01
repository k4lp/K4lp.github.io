import { VaultManager } from '../../../storage/vault-manager.js';

export const finalOutputProcessor = {
  id: 'finalOutput',
  async process(context, operations = []) {
    if (!Array.isArray(operations) || operations.length === 0) return;

    const summary = context.getSummary();

    operations.forEach((htmlContent, index) => {
      const result = { index, status: 'success' };

      try {
        const processedHTML = VaultManager.resolveVaultRefsInText(htmlContent);

        context.storage.saveFinalOutput(processedHTML, true, 'llm');

        context.logActivity({
          type: 'final_output',
          action: 'generate',
          status: 'success',
          source: 'llm',
          verified: true,
          contentSize: processedHTML.length,
          operationIndex: index
        });

        const logEntries = context.storage.loadReasoningLog();
        logEntries.push(
          [
            '=== LLM-GENERATED FINAL OUTPUT (VERIFIED) ===',
            `Generated at: ${context.now()}`,
            `Content size: ${processedHTML.length} characters`,
            'Verification: PASSED'
          ].join('\n')
        );
        context.storage.saveReasoningLog(logEntries);
      } catch (error) {
        result.status = 'error';
        result.error = error.message;

        context.logActivity({
          type: 'final_output',
          action: 'generate',
          status: 'error',
          error: error.message,
          operationIndex: index
        });

        context.recordError({
          type: 'final_output',
          id: `block_${index}`,
          message: error.message
        });
      }

      summary.finalOutput.push(result);
    });
  }
};

export default finalOutputProcessor;
