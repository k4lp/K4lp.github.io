/**
 * LLM Verification Service
 *
 * Sends final output back to LLM for verification against original requirements.
 * The LLM checks for discrepancies, completeness, and accuracy.
 *
 * This is the TRUE verification - not just "successfully saved" but
 * "LLM confirmed this output correctly fulfills the user's request".
 */

import { GeminiAPI } from '../api/gemini-client.js';
import { Storage } from '../storage/storage.js';
import { nowISO } from '../core/utils.js';

/**
 * Verification result from LLM
 * @typedef {Object} LLMVerificationResult
 * @property {boolean} verified - Whether LLM verified the output as correct
 * @property {number} confidence - Confidence score (0-100)
 * @property {Array<string>} discrepancies - Issues found by LLM
 * @property {Array<string>} warnings - Non-critical issues
 * @property {string} summary - LLM's verification summary
 * @property {Object} metadata - Additional metadata
 */

export class LLMVerificationService {
  /**
   * Verify final output using LLM
   * @param {string} finalOutput - The generated final output HTML
   * @param {Object} context - Context needed for verification
   * @param {string} context.originalQuery - User's original query/request
   * @param {Object} options - Verification options
   * @returns {Promise<LLMVerificationResult>}
   */
  static async verify(finalOutput, context = {}, options = {}) {
    const startTime = Date.now();

    try {
      // Build verification prompt with all required context
      const verificationPrompt = this.buildVerificationPrompt(
        finalOutput,
        context
      );

      console.log(`[${nowISO()}] [LLMVerification] Sending output to LLM for verification...`);
      console.log(`[${nowISO()}] [LLMVerification] Output length: ${finalOutput.length} chars`);
      console.log(`[${nowISO()}] [LLMVerification] Prompt length: ${verificationPrompt.length} chars`);

      // Send to LLM for verification using same path as main reasoning loop
      // Use currently selected model to ensure consistency with main loop
      let modelInfo = Storage.loadSelectedModelInfo();
      let modelId = modelInfo?.id || '';

      if (!modelId && typeof document !== 'undefined') {
        const selectEl = document.querySelector('#modelSelect');
        if (selectEl?.value) {
          const persisted = Storage.saveSelectedModel(selectEl.value, {
            label: selectEl.selectedOptions?.[0]?.textContent || selectEl.value.replace(/^models\//, ''),
            source: 'verification:fallback'
          });
          modelInfo = persisted || modelInfo;
          modelId = persisted?.id || selectEl.value;
        }
      }

      if (!modelId) {
        throw new Error('No model selected - cannot perform verification');
      }

      const modelLabel = modelInfo?.label ? ` (${modelInfo.label})` : '';
      console.log(`[${nowISO()}] [LLMVerification] Using model: ${modelId}${modelLabel}`);
      const response = await GeminiAPI.generateContent(modelId, verificationPrompt);

      console.log(`[${nowISO()}] [LLMVerification] Received LLM response, extracting text...`);

      // Extract response text using same method as loop-controller
      const responseText = GeminiAPI.extractResponseText(response);

      if (!responseText?.trim()) {
        throw new Error('Empty response from verification LLM');
      }

      console.log(`[${nowISO()}] [LLMVerification] Response text length: ${responseText.length} chars`);

      // Parse LLM verification response
      const result = this.parseVerificationResponse(responseText);
      result.metadata.duration = Date.now() - startTime;
      result.metadata.timestamp = nowISO();

      console.log(`[${nowISO()}] [LLMVerification] Verification ${result.verified ? 'PASSED' : 'FAILED'}`);
      if (!result.verified && result.discrepancies.length > 0) {
        console.error(`[${nowISO()}] [LLMVerification] Discrepancies found:`);
        result.discrepancies.forEach((d, i) => {
          console.error(`[${nowISO()}] [LLMVerification]   ${i + 1}. ${d}`);
        });
      }

      return result;

    } catch (error) {
      console.error(`[${nowISO()}] [LLMVerification] Verification failed:`, error);

      // Return failed verification result
      return {
        verified: false,
        confidence: 0,
        discrepancies: [`Verification process failed: ${error.message}`],
        warnings: [],
        summary: `Verification could not be completed due to error: ${error.message}`,
        metadata: {
          duration: Date.now() - startTime,
          timestamp: nowISO(),
          error: error.message,
          stack: error.stack
        }
      };
    }
  }

  /**
   * Build comprehensive verification prompt
   * @private
   */
  static buildVerificationPrompt(finalOutput, context) {
    const {
      originalQuery = '',
      vaultData = {},
      memory = [],
      tasks = [],
      goals = [],
      executionLogs = []
    } = context;

    return `# FINAL OUTPUT VERIFICATION TASK

You are reviewing a final output that was generated in response to a user's query.
Your job is to verify this output for COMPLETENESS, ACCURACY, and CORRECTNESS.

## ORIGINAL USER QUERY
${originalQuery}

## GENERATED FINAL OUTPUT
${finalOutput}

## CONTEXT AVAILABLE DURING GENERATION

### Vault Data Referenced
${this.formatVaultData(vaultData)}

### Memory Entries
${this.formatMemory(memory)}

### Tasks
${this.formatTasks(tasks)}

### Goals
${this.formatGoals(goals)}

## YOUR VERIFICATION CHECKLIST

Please verify the following and respond in the specified format:

1. **Completeness**: Does the output fully address all aspects of the user's query?
2. **Accuracy**: Is all information in the output accurate and correct?
3. **Vault References**: Are all vault references properly resolved (no missing data)?
4. **Coherence**: Is the output well-structured and coherent?
5. **Goals Alignment**: Does the output align with the stated goals?
6. **Quality**: Is the output of production-level quality?

## RESPONSE FORMAT

You MUST respond in this exact format:

VERIFICATION: [PASS or FAIL]
CONFIDENCE: [0-100]
DISCREPANCIES:
- [List each discrepancy, or write "None" if there are no discrepancies]
WARNINGS:
- [List any non-critical issues, or write "None"]
SUMMARY:
[Brief 2-3 sentence summary of your verification assessment]

Be strict and thorough. If there are ANY issues that would prevent this from being a high-quality final output, mark as FAIL.`;
  }

  /**
   * Parse LLM verification response
   * @private
   */
  static parseVerificationResponse(responseText) {
    const result = {
      verified: false,
      confidence: 0,
      discrepancies: [],
      warnings: [],
      summary: '',
      metadata: {
        rawResponse: responseText
      }
    };

    try {
      // Extract verification status
      const verificationMatch = responseText.match(/VERIFICATION:\s*(PASS|FAIL)/i);
      result.verified = verificationMatch?.[1]?.toUpperCase() === 'PASS';

      // Extract confidence
      const confidenceMatch = responseText.match(/CONFIDENCE:\s*(\d+)/);
      result.confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 0;

      // Extract discrepancies
      const discrepanciesSection = responseText.match(/DISCREPANCIES:(.*?)(?=WARNINGS:|SUMMARY:|$)/is);
      if (discrepanciesSection) {
        const discrepancies = discrepanciesSection[1]
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('-'))
          .map(line => line.substring(1).trim())
          .filter(line => line && line.toLowerCase() !== 'none');

        result.discrepancies = discrepancies;
      }

      // Extract warnings
      const warningsSection = responseText.match(/WARNINGS:(.*?)(?=SUMMARY:|$)/is);
      if (warningsSection) {
        const warnings = warningsSection[1]
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('-'))
          .map(line => line.substring(1).trim())
          .filter(line => line && line.toLowerCase() !== 'none');

        result.warnings = warnings;
      }

      // Extract summary
      const summaryMatch = responseText.match(/SUMMARY:(.*?)$/is);
      if (summaryMatch) {
        result.summary = summaryMatch[1].trim();
      }

      // If there are discrepancies, verification should fail
      if (result.discrepancies.length > 0) {
        result.verified = false;
      }

    } catch (error) {
      console.error(`[${nowISO()}] [LLMVerification] Error parsing response:`, error);
      result.discrepancies.push(`Failed to parse verification response: ${error.message}`);
      result.verified = false;
    }

    return result;
  }

  /**
   * Format helpers for building verification prompt
   */

  static formatVaultData(vaultData) {
    if (!vaultData || Object.keys(vaultData).length === 0) {
      return '(No vault data)';
    }

    return Object.entries(vaultData)
      .map(([id, entry]) => {
        return `- [${id}]: ${entry.description || 'No description'}\n  Type: ${entry.type}\n  Content: ${entry.content?.substring(0, 200)}...`;
      })
      .join('\n\n');
  }

  static formatMemory(memory) {
    if (!memory || memory.length === 0) {
      return '(No memory entries)';
    }

    return memory
      .map(m => `- [${m.identifier}] ${m.heading}\n  ${m.content}`)
      .join('\n\n');
  }

  static formatTasks(tasks) {
    if (!tasks || tasks.length === 0) {
      return '(No tasks)';
    }

    return tasks
      .map(t => `- [${t.status}] ${t.heading}\n  ${t.content}`)
      .join('\n\n');
  }

  static formatGoals(goals) {
    if (!goals || goals.length === 0) {
      return '(No goals)';
    }

    return goals
      .map(g => `- ${g.heading}\n  ${g.content}`)
      .join('\n\n');
  }

  /**
   * Quick verification check - returns true/false
   * @param {string} finalOutput - Output to verify
   * @param {Object} context - Verification context
   * @returns {Promise<boolean>}
   */
  static async quickVerify(finalOutput, context) {
    const result = await this.verify(finalOutput, context);
    return result.verified;
  }
}

export default LLMVerificationService;
