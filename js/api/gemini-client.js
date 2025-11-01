/**
 * GDRS Gemini API Client
 * API communication, error handling, retry logic with key rotation
 */

import { KeySelector } from './keys/key-selector.js';
import { KeyFailureTracker } from './keys/key-failure-tracker.js';
import { GeminiRequest } from './request/gemini-request.js';
import { RetryHandler } from './request/retry-handler.js';
import { Renderer } from '../ui/renderer.js';

export const GeminiAPI = {
  async fetchModelList() {
    KeySelector.liftCooldowns();
    const picked = KeySelector.chooseActiveKey();
    if (!picked) {
      console.error('No valid API key for model list');
      return;
    }

    try {
      const data = await GeminiRequest.fetchModelList(picked.key);
      if (!data || !Array.isArray(data.models)) return;

      Renderer.populateModelDropdown(data.models);
      KeyFailureTracker.markValid(picked.slot, true);
    } catch (err) {
      if (err.message.includes('429')) {
        KeyFailureTracker.markRateLimit(picked.slot, 30);
      } else if (err.message.includes('Invalid API key')) {
        KeyFailureTracker.markValid(picked.slot, false);
      }
      console.error('fetchModelList() error', err);
    }
  },

  async generateContent(modelId, prompt) {
    return await RetryHandler.generateContentWithRetry(modelId, prompt, 0);
  },

  extractResponseText(response) {
    return GeminiRequest.extractResponseText(response);
  }
};
