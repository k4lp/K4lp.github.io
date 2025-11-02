import { VaultManager } from '../../../storage/vault-manager.js';
import { nowISO } from '../../../core/utils.js';

export const finalOutputProcessor = {
  id: 'finalOutput',
  async process(context, operations = []) {
    const processStartTime = nowISO();

    if (!Array.isArray(operations) || operations.length === 0) {
      console.log(`[${processStartTime}] ℹ️  finalOutputProcessor.process() - No operations to process`);
      return;
    }

    console.log(`[${processStartTime}] 🎯 finalOutputProcessor.process() starting - ${operations.length} operation(s)`);

    const summary = context.getSummary();

    operations.forEach((htmlContent, index) => {
      const opStartTime = nowISO();
      console.log(`[${opStartTime}] 📝 Processing final output operation ${index + 1}/${operations.length} - Content length: ${htmlContent.length} chars`);

      const result = { index, status: 'success' };

      try {
        const resolveStartTime = nowISO();
        console.log(`[${resolveStartTime}] 🔗 Resolving vault references...`);
        const processedHTML = VaultManager.resolveVaultRefsInText(htmlContent);
        console.log(`[${nowISO()}] ✅ Vault references resolved - Processed length: ${processedHTML.length} chars`);

        const saveStartTime = nowISO();
        console.log(`[${saveStartTime}] 💾 Saving final output with VERIFICATION=true...`);
        context.storage.saveFinalOutput(processedHTML, true, 'llm');
        const saveEndTime = nowISO();
        console.log(`[${saveEndTime}] ✅ Final output SAVED and VERIFIED`);

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
        const logTime = nowISO();
        logEntries.push(
          [
            '=== LLM-GENERATED FINAL OUTPUT (VERIFIED) ===',
            `Generated at: ${logTime}`,
            `Content size: ${processedHTML.length} characters`,
            'Verification: PASSED'
          ].join('\n')
        );
        context.storage.saveReasoningLog(logEntries);
        console.log(`[${nowISO()}] ✅ Final output operation ${index + 1} completed successfully`);
      } catch (error) {
        const errorTime = nowISO();
        console.error(`[${errorTime}] ❌ Error processing final output operation ${index + 1}: ${error.message}`);

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

        console.error(`[${nowISO()}] ⚠️  Final output operation ${index + 1} failed with error`);
      }

      summary.finalOutput.push(result);
    });

    console.log(`[${nowISO()}] ✅ finalOutputProcessor.process() completed - Processed ${operations.length} operation(s)`);
  }
};

export default finalOutputProcessor;
