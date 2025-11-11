/**
 * COMPACTION EXECUTOR
 *
 * Calls Gemini to generate compacted summary.
 * Simple LLM execution with error handling.
 */

import { GeminiAPI } from '../../api/gemini-client.js';
import { Storage } from '../../storage/storage.js';
import { COMPACTION_CONFIG } from '../../config/compaction-config.js';

export class CompactionExecutor {
  /**
   * Execute compaction with Gemini
   *
   * @param {string} prompt - Compaction prompt
   * @returns {Promise<string>} Compacted summary
   */
  async execute(prompt) {
    console.log('[CompactionExecutor] Starting compaction...');

    try {
      // Use user-selected model, fallback to config default
      const modelId = Storage.loadSelectedModel() || COMPACTION_CONFIG.model;

      console.log(`[CompactionExecutor] Calling Gemini (${modelId})...`);

      const response = await GeminiAPI.generateContent(modelId, prompt);

      const summary = GeminiAPI.extractResponseText(response);

      if (!summary || summary.trim().length === 0) {
        throw new Error('Gemini returned empty summary');
      }

      console.log(`[CompactionExecutor] Success - Summary length: ${summary.length} chars`);

      return summary;

    } catch (error) {
      console.error('[CompactionExecutor] Error:', error);
      throw new Error(`Compaction failed: ${error.message}`);
    }
  }
}

export default CompactionExecutor;
