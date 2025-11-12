/**
 * COMPACTION EXECUTOR
 *
 * Calls Gemini to generate compacted summary.
 * Simple LLM execution with error handling.
 */

import { GeminiAPI } from '../../api/gemini-client.js';
import { Storage } from '../../storage/storage.js';
import { COMPACTION_CONFIG } from '../../config/compaction-config.js';

/**
 * Model selection priority for compaction (fallback chain)
 */
const COMPACTION_MODEL_PRIORITY = [
  'gemini-2.5-pro',        // 1. Preferred model for complex summarization
  'user-selected',          // 2. User's choice (placeholder, replaced at runtime)
  'gemini-flash-latest'     // 3. Fast fallback
];

export class CompactionExecutor {
  /**
   * Get model fallback chain for compaction
   *
   * @returns {string[]} Array of model IDs to try in order
   * @private
   */
  _getModelFallbackChain() {
    const userSelectedModel = Storage.loadSelectedModel();

    const chain = [
      COMPACTION_MODEL_PRIORITY[0], // gemini-2.5-pro (preferred)
    ];

    // Add user-selected model if it exists and is different from preferred
    if (userSelectedModel && userSelectedModel !== COMPACTION_MODEL_PRIORITY[0]) {
      chain.push(userSelectedModel);
    }

    // Add final fallback
    chain.push(COMPACTION_MODEL_PRIORITY[2]); // gemini-flash-latest

    return chain;
  }

  /**
   * Execute compaction with Gemini using fallback chain
   *
   * @param {string} prompt - Compaction prompt
   * @returns {Promise<string>} Compacted summary
   */
  async execute(prompt) {
    console.log('[CompactionExecutor] Starting compaction...');

    const modelChain = this._getModelFallbackChain();
    console.log(`[CompactionExecutor] Model fallback chain: ${modelChain.join(' → ')}`);

    let lastError = null;

    // Try each model in the fallback chain
    for (let i = 0; i < modelChain.length; i++) {
      const modelId = modelChain[i];
      const isLastAttempt = i === modelChain.length - 1;

      try {
        console.log(`[CompactionExecutor] Attempting with model: ${modelId} (${i + 1}/${modelChain.length})`);

        const response = await GeminiAPI.generateContent(modelId, prompt);
        const summary = GeminiAPI.extractResponseText(response);

        if (!summary || summary.trim().length === 0) {
          throw new Error('Empty response from model');
        }

        console.log(`[CompactionExecutor] Success with ${modelId} - Summary length: ${summary.length} chars`);
        return summary;

      } catch (error) {
        lastError = error;
        console.warn(`[CompactionExecutor] Failed with ${modelId}: ${error.message}`);

        if (isLastAttempt) {
          // All models failed, throw the last error
          console.error('[CompactionExecutor] All models in fallback chain failed');
          throw new Error(`Compaction failed after trying all models: ${error.message}`);
        }

        // Continue to next model in chain
        console.log(`[CompactionExecutor] Trying next model in fallback chain...`);
      }
    }

    // Should never reach here, but just in case
    throw new Error(`Compaction failed: ${lastError?.message || 'Unknown error'}`);
  }
}

export default CompactionExecutor;
