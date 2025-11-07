import { VaultManager } from '../../../storage/vault-manager.js';
import { nowISO } from '../../../core/utils.js';

export const finalOutputProcessor = {
  id: 'finalOutput',
  async process(context, operations = []) {
    const processStartTime = nowISO();

    if (!Array.isArray(operations) || operations.length === 0) {
      console.log(`[${processStartTime}] finalOutputProcessor.process() - No operations to process`);
      return;
    }

    console.log(`[${processStartTime}] finalOutputProcessor.process() starting - ${operations.length} operation(s)`);

    const summary = context.getSummary();

    operations.forEach((htmlContent, index) => {
      const opStartTime = nowISO();
      console.log(`[${opStartTime}] ========== Processing final output operation ${index + 1}/${operations.length} ==========`);
      console.log(`[${opStartTime}] Input - Type: ${typeof htmlContent}, Length: ${htmlContent?.length || 0} chars, Empty: ${!htmlContent || htmlContent.trim().length === 0}`);

      const result = { index, status: 'success' };

      try {
        const resolveStartTime = nowISO();
        console.log(`[${resolveStartTime}] Calling VaultManager.resolveVaultRefsInText()...`);
        const processedHTML = VaultManager.resolveVaultRefsInText(htmlContent);
        console.log(`[${nowISO()}] Vault resolution complete - Input: ${htmlContent?.length || 0} chars, Output: ${processedHTML.length} chars`);

        // Check for missing vault references
        const hasMissingVault = /\/\*\s*\[MISSING_VAULT:[^\]]+\]\s*\*\//i.test(processedHTML);
        const hasVaultError = /\/\*\s*\[VAULT_ERROR:[^\]]+\]\s*\*\//i.test(processedHTML);

        if (hasMissingVault || hasVaultError) {
          // Extract missing vault IDs for reporting
          const missingMatches = processedHTML.match(/\/\*\s*\[MISSING_VAULT:([^\]]+)\]\s*\*\//gi) || [];
          const errorMatches = processedHTML.match(/\/\*\s*\[VAULT_ERROR:([^\]]+)\]\s*\*\//gi) || [];
          const issues = [...missingMatches, ...errorMatches];

          const errorMsg = `Final output contains unresolved vault references: ${issues.join(', ')}`;
          console.error(`[${nowISO()}] Verification FAILED: ${errorMsg}`);

          throw new Error(errorMsg);
        }

        const saveStartTime = nowISO();
        console.log(`[${saveStartTime}] CRITICAL: Calling context.storage.saveFinalOutput() with verified=true`);
        console.log(`[${saveStartTime}] Parameters - html length: ${processedHTML.length}, verified: true (boolean), source: 'llm'`);

        context.storage.saveFinalOutput(processedHTML, true, 'llm');

        const saveEndTime = nowISO();
        console.log(`[${saveEndTime}] context.storage.saveFinalOutput() returned`);
        console.log(`[${saveEndTime}] This should have set the verification flag in localStorage`);

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
        console.log(`[${nowISO()}] Final output operation ${index + 1} completed successfully`);
      } catch (error) {
        const errorTime = nowISO();
        console.error(`[${errorTime}] Error processing final output operation ${index + 1}: ${error.message}`);

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

        console.error(`[${nowISO()}] Final output operation ${index + 1} failed with error`);
      }

      summary.finalOutput.push(result);
    });

    console.log(`[${nowISO()}] finalOutputProcessor.process() completed - Processed ${operations.length} operation(s)`);
  }
};

export default finalOutputProcessor;
