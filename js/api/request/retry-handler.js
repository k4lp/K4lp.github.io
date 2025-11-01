/**
 * Retry Handler
 * Handles retry logic with key rotation
 */

import { KeySelector } from '../keys/key-selector.js';
import { KeyFailureTracker } from '../keys/key-failure-tracker.js';
import { KeyUI } from '../keys/key-ui.js';
import { GeminiRequest } from './gemini-request.js';

const MAX_RETRY_ATTEMPTS = 3;
const EMPTY_RESPONSE_RETRY_DELAY = 1000;

export const RetryHandler = {
    async generateContentWithRetry(modelId, prompt, retryCount = 0) {
        const availableKeys = KeySelector.getAllAvailableKeys();

        if (availableKeys.length === 0) {
            throw new Error('No valid API keys available');
        }

        let lastUsedKeySlot = null;

        // Try each available key
        for (let keyIndex = 0; keyIndex < availableKeys.length; keyIndex++) {
            const currentKey = availableKeys[keyIndex];

            try {
                console.log(`🔑 Attempting with key #${currentKey.slot} (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);

                if (lastUsedKeySlot && lastUsedKeySlot !== currentKey.slot) {
                    KeyUI.showKeyRotationIndicator(lastUsedKeySlot, currentKey.slot, 'auto rotation');
                }

                const result = await GeminiRequest.makeRequest(modelId, prompt, currentKey);

                KeyFailureTracker.bumpUsage(currentKey.slot);
                console.log(`✅ Success with key #${currentKey.slot}`);
                return result;

            } catch (error) {
                console.warn(`❌ Key #${currentKey.slot} failed: ${error.message}`);
                lastUsedKeySlot = currentKey.slot;

                if (error.message.includes('429') || error.message.includes('Rate limited')) {
                    KeyFailureTracker.markRateLimit(currentKey.slot, 60);
                } else if (error.message.includes('401') || error.message.includes('403') || error.message.includes('Invalid API key')) {
                    KeyFailureTracker.markValid(currentKey.slot, false);
                } else if (error.message.includes('Empty response')) {
                    KeyFailureTracker.markFailure(currentKey.slot, 'empty_response');
                } else {
                    KeyFailureTracker.markFailure(currentKey.slot, error.message.substring(0, 50));
                }

                continue;
            }
        }

        if (retryCount < MAX_RETRY_ATTEMPTS - 1) {
            console.warn(`⏳ All keys failed, retrying in ${EMPTY_RESPONSE_RETRY_DELAY}ms (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);

            await new Promise(resolve => setTimeout(resolve, EMPTY_RESPONSE_RETRY_DELAY));

            return await this.generateContentWithRetry(modelId, prompt, retryCount + 1);
        }

        throw new Error(`All API keys failed after ${MAX_RETRY_ATTEMPTS} attempts. Please check your keys and try again.`);
    }
};
