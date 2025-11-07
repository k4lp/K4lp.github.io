/**
 * Final Output Processor V2
 *
 * Properly architected final output processing with:
 * 1. Structured vault resolution
 * 2. Content validation
 * 3. LLM-based verification
 * 4. Proper error handling and logging
 *
 * Replaces the old processor that just saved outputs without real verification.
 */

import { VaultResolutionService } from '../../../storage/vault-resolution-service.js';
import { createDefaultValidator } from '../../../validation/content-validator.js';
import { LLMVerificationService } from '../../../verification/llm-verification-service.js';
import { Storage } from '../../../storage/storage.js';
import { nowISO } from '../../../core/utils.js';

export const finalOutputProcessorV2 = {
  id: 'finalOutput', // Keep same ID for compatibility

  async process(context, operations = []) {
    const processStartTime = nowISO();

    if (!Array.isArray(operations) || operations.length === 0) {
      console.log(`[${processStartTime}] finalOutputProcessorV2 - No operations to process`);
      return;
    }

    console.log(`[${processStartTime}] ========== FINAL OUTPUT PROCESSING V2 ==========`);
    console.log(`[${processStartTime}] Processing ${operations.length} final output operation(s)`);

    const summary = context.getSummary();

    for (let index = 0; index < operations.length; index++) {
      const htmlContent = operations[index];
      const opStartTime = nowISO();

      console.log(`[${opStartTime}] ========== Operation ${index + 1}/${operations.length} ==========`);
      console.log(`[${opStartTime}] Input length: ${htmlContent?.length || 0} chars`);

      const operationResult = {
        index,
        status: 'pending',
        verification: null,
        errors: [],
        warnings: []
      };

      try {
        // STEP 1: Resolve Vault References (Structured)
        console.log(`[${nowISO()}] STEP 1: Resolving vault references...`);
        const vaultResolution = VaultResolutionService.resolve(htmlContent);
        VaultResolutionService.logResult(vaultResolution, 'FinalOutput');

        if (!vaultResolution.success) {
          throw new Error(
            `Vault resolution failed: ${vaultResolution.missingReferences.length} missing, ` +
            `${vaultResolution.errors.length} errors`
          );
        }

        const resolvedHTML = vaultResolution.resolvedText;
        console.log(`[${nowISO()}] Vault resolution successful - ${resolvedHTML.length} chars`);

        // STEP 2: Validate Content
        console.log(`[${nowISO()}] STEP 2: Validating content...`);
        const validator = createDefaultValidator();
        const validation = validator.validate(resolvedHTML);

        console.log(`[${nowISO()}] Content validation: ${validation.status}`);
        if (validation.errors.length > 0) {
          console.error(`[${nowISO()}] Validation errors found:`);
          validation.errors.forEach(err => {
            console.error(`[${nowISO()}]   - ${err.message}`);
          });
          throw new Error(`Content validation failed: ${validation.errors.length} error(s)`);
        }

        if (validation.warnings.length > 0) {
          console.warn(`[${nowISO()}] Validation warnings:`);
          validation.warnings.forEach(warn => {
            console.warn(`[${nowISO()}]   - ${warn.message}`);
            operationResult.warnings.push(warn.message);
          });
        }

        // STEP 3: LLM Verification
        console.log(`[${nowISO()}] STEP 3: Sending to LLM for verification...`);

        // Gather context for LLM verification
        const verificationContext = this.buildVerificationContext(context);

        const llmVerification = await LLMVerificationService.verify(
          resolvedHTML,
          verificationContext
        );

        console.log(`[${nowISO()}] LLM Verification: ${llmVerification.verified ? 'PASSED' : 'FAILED'}`);
        console.log(`[${nowISO()}] Confidence: ${llmVerification.confidence}%`);

        if (!llmVerification.verified) {
          console.error(`[${nowISO()}] LLM found discrepancies:`);
          llmVerification.discrepancies.forEach((d, i) => {
            console.error(`[${nowISO()}]   ${i + 1}. ${d}`);
          });

          throw new Error(
            `LLM verification failed: ${llmVerification.discrepancies.length} discrepancy(ies) found. ` +
            `Summary: ${llmVerification.summary}`
          );
        }

        // STEP 4: Save Output (ONLY if verification passed)
        console.log(`[${nowISO()}] STEP 4: Saving verified final output...`);
        context.storage.saveFinalOutput(resolvedHTML, true, 'llm');

        // STEP 5: Log Activity and Reasoning
        console.log(`[${nowISO()}] STEP 5: Logging verification results...`);

        context.logActivity({
          type: 'final_output',
          action: 'generate',
          status: 'success',
          source: 'llm',
          verified: true,
          verification: {
            method: 'llm',
            confidence: llmVerification.confidence,
            timestamp: llmVerification.metadata.timestamp
          },
          contentSize: resolvedHTML.length,
          operationIndex: index
        });

        const logEntries = context.storage.loadReasoningLog();
        const verificationLog = [
          '=== LLM-GENERATED FINAL OUTPUT (VERIFIED) ===',
          `Generated at: ${nowISO()}`,
          `Content size: ${resolvedHTML.length} characters`,
          `Verification: PASSED (LLM-verified)`,
          `Confidence: ${llmVerification.confidence}%`,
          `Summary: ${llmVerification.summary}`,
          llmVerification.warnings.length > 0
            ? `Warnings: ${llmVerification.warnings.length}`
            : '',
          `Vault References: ${vaultResolution.resolvedReferences.length} resolved`
        ].filter(Boolean).join('\n');

        logEntries.push(verificationLog);
        context.storage.saveReasoningLog(logEntries);

        operationResult.status = 'success';
        operationResult.verification = llmVerification;

        console.log(`[${nowISO()}] ========== Operation ${index + 1} COMPLETED SUCCESSFULLY ==========`);

      } catch (error) {
        const errorTime = nowISO();
        console.error(`[${errorTime}] ========== Operation ${index + 1} FAILED ==========`);
        console.error(`[${errorTime}] Error: ${error.message}`);

        operationResult.status = 'error';
        operationResult.errors.push(error.message);

        // Log the failure
        context.logActivity({
          type: 'final_output',
          action: 'generate',
          status: 'error',
          error: error.message,
          operationIndex: index
        });

        context.recordError({
          type: 'final_output_verification_failed',
          id: `block_${index}`,
          message: error.message,
          stack: error.stack
        });

        // Log to reasoning log
        const logEntries = context.storage.loadReasoningLog();
        logEntries.push([
          '=== FINAL OUTPUT VERIFICATION FAILED ===',
          `Timestamp: ${errorTime}`,
          `Error: ${error.message}`,
          `Operation: ${index + 1}/${operations.length}`
        ].join('\n'));
        context.storage.saveReasoningLog(logEntries);

        // Mark as unverified in storage
        context.storage.saveFinalOutput(
          htmlContent,
          false, // NOT verified
          'llm'
        );
      }

      summary.finalOutput.push(operationResult);
    }

    console.log(`[${nowISO()}] ========== FINAL OUTPUT PROCESSING COMPLETE ==========`);
    console.log(`[${nowISO()}] Processed ${operations.length} operation(s)`);
  },

  /**
   * Build context needed for LLM verification
   * @private
   */
  buildVerificationContext(context) {
    return {
      originalQuery: Storage.loadCurrentQuery() || '',
      vaultData: this.getReferencedVaultData(),
      memory: Storage.loadMemory() || [],
      tasks: Storage.loadTasks() || [],
      goals: Storage.loadGoals() || [],
      executionLogs: Storage.loadExecutionLog() || []
    };
  },

  /**
   * Get vault data that was referenced in the output
   * @private
   */
  getReferencedVaultData() {
    const vault = Storage.loadVault() || [];
    const vaultMap = {};

    vault.forEach(entry => {
      if (entry.identifier) {
        vaultMap[entry.identifier] = {
          type: entry.type,
          description: entry.description,
          content: entry.content
        };
      }
    });

    return vaultMap;
  }
};

export default finalOutputProcessorV2;
