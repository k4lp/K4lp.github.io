/**
 * GDRS Gemini API Client
 * API communication, error handling, retry logic with key rotation
 */

import { KeyManager } from './key-manager.js';
import { Storage } from '../storage/storage.js';
import { Renderer } from '../ui/renderer.js';
import { nowISO } from '../core/utils.js';
import { MAX_RETRY_ATTEMPTS, EMPTY_RESPONSE_RETRY_DELAY } from '../core/constants.js';

export const GeminiAPI = {
  async fetchModelList() {
    KeyManager.liftCooldowns();
    const picked = KeyManager.chooseActiveKey();
    if (!picked) {
      console.error('No valid API key for model list');
      return;
    }

    const url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' +
      encodeURIComponent(picked.key);

    try {
      const resp = await fetch(url);
      if (resp.status === 429) {
        KeyManager.markRateLimit(picked.slot, 30);
        return;
      }
      if (!resp.ok) {
        if (resp.status === 401 || resp.status === 403) {
          KeyManager.markValid(picked.slot, false);
        }
        console.error('fetchModelList() non-OK', `status ${resp.status}`);
        return;
      }

      const data = await resp.json();
      if (!data || !Array.isArray(data.models)) return;

      Renderer.populateModelDropdown(data.models);
      KeyManager.markValid(picked.slot, true);
    } catch (err) {
      console.error('fetchModelList() exception', err);
    }
  },

  async generateContent(modelId, prompt) {
    const startTime = nowISO();
    console.log(`[${startTime}] 🚀 GeminiAPI.generateContent() starting...`);
    const result = await this.generateContentWithRetry(modelId, prompt, 0);
    console.log(`[${nowISO()}] ✅ GeminiAPI.generateContent() completed`);
    return result;
  },

  async generateContentWithRetry(modelId, prompt, retryCount = 0) {
    const retryStartTime = nowISO();
    console.log(`[${retryStartTime}] 🔄 Retry attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}`);

    const availableKeys = KeyManager.getAllAvailableKeys();

    if (availableKeys.length === 0) {
      console.error(`[${nowISO()}] ❌ No valid API keys available`);
      throw new Error('No valid API keys available');
    }

    console.log(`[${nowISO()}] 🔑 Found ${availableKeys.length} available key(s)`);
    let lastUsedKeySlot = null;

    // Try each available key
    for (let keyIndex = 0; keyIndex < availableKeys.length; keyIndex++) {
      const currentKey = availableKeys[keyIndex];
      const keyAttemptTime = nowISO();

      try {
        console.log(`[${keyAttemptTime}] 🔑 Attempting with key #${currentKey.slot} (key ${keyIndex + 1}/${availableKeys.length}, attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);

        if (lastUsedKeySlot && lastUsedKeySlot !== currentKey.slot) {
          KeyManager.showKeyRotationIndicator(lastUsedKeySlot, currentKey.slot, 'auto rotation');
        }

        const requestStartTime = nowISO();
        console.log(`[${requestStartTime}] 📡 Making API request...`);
        const result = await this.makeRequest(modelId, prompt, currentKey);
        const requestEndTime = nowISO();

        KeyManager.bumpUsage(currentKey.slot);
        console.log(`[${requestEndTime}] ✅ Success with key #${currentKey.slot}`);
        return result;
        
      } catch (error) {
        const errorTime = nowISO();
        console.warn(`[${errorTime}] ❌ Key #${currentKey.slot} failed: ${error.message}`);
        lastUsedKeySlot = currentKey.slot;

        if (error.message.includes('429') || error.message.includes('Rate limited')) {
          console.log(`[${nowISO()}] 🚫 Rate limit detected - marking key #${currentKey.slot}`);
          KeyManager.markRateLimit(currentKey.slot, 60);
        } else if (error.message.includes('401') || error.message.includes('403') || error.message.includes('Invalid API key')) {
          console.log(`[${nowISO()}] 🔒 Invalid key detected - marking key #${currentKey.slot} as invalid`);
          KeyManager.markValid(currentKey.slot, false);
        } else if (error.message.includes('Empty response')) {
          console.log(`[${nowISO()}] 📭 Empty response - marking failure for key #${currentKey.slot}`);
          KeyManager.markFailure(currentKey.slot, 'empty_response');
        } else {
          console.log(`[${nowISO()}] ⚠️  General error - marking failure for key #${currentKey.slot}`);
          KeyManager.markFailure(currentKey.slot, error.message.substring(0, 50));
        }

        continue;
      }
    }

    if (retryCount < MAX_RETRY_ATTEMPTS - 1) {
      const retryDelayTime = nowISO();
      console.warn(`[${retryDelayTime}] ⏳ All keys failed, retrying in ${EMPTY_RESPONSE_RETRY_DELAY}ms (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);

      await new Promise(resolve => setTimeout(resolve, EMPTY_RESPONSE_RETRY_DELAY));

      console.log(`[${nowISO()}] 🔁 Starting retry ${retryCount + 2}/${MAX_RETRY_ATTEMPTS}...`);
      return await this.generateContentWithRetry(modelId, prompt, retryCount + 1);
    }

    const finalErrorTime = nowISO();
    console.error(`[${finalErrorTime}] ❌ All API keys failed after ${MAX_RETRY_ATTEMPTS} attempts`);
    throw new Error(`All API keys failed after ${MAX_RETRY_ATTEMPTS} attempts. Please check your keys and try again.`);
  },

  async makeRequest(modelId, prompt, keyInfo) {
    const requestStartTime = nowISO();
    const cleanModelId = modelId.startsWith('models/') ? modelId : `models/${modelId}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/${cleanModelId}:generateContent?key=${encodeURIComponent(keyInfo.key)}`;

    console.log(`[${requestStartTime}] 📤 makeRequest() - Model: ${cleanModelId}, Prompt length: ${prompt.length} chars`);

    const maxOutputTokens = Storage.loadMaxOutputTokens();
    console.log(`[${nowISO()}] ⚙️  Config - maxOutputTokens: ${maxOutputTokens}`);
    
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: maxOutputTokens
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH", 
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    const fetchStartTime = nowISO();
    console.log(`[${fetchStartTime}] 🌐 Sending fetch request to Gemini API...`);

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const fetchEndTime = nowISO();
    console.log(`[${fetchEndTime}] 📥 Fetch completed - Status: ${resp.status}`);

    if (resp.status === 429) {
      console.error(`[${nowISO()}] 🚫 Rate limited (429)`);
      throw new Error('Rate limited (429)');
    }

    if (resp.status === 401 || resp.status === 403) {
      console.error(`[${nowISO()}] 🔒 Invalid API key (${resp.status})`);
      throw new Error('Invalid API key (401/403)');
    }

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error(`[${nowISO()}] ❌ HTTP error ${resp.status}: ${errorText.substring(0, 100)}`);
      throw new Error(`HTTP ${resp.status}: ${errorText}`);
    }

    const parseStartTime = nowISO();
    console.log(`[${parseStartTime}] 🔍 Parsing JSON response...`);
    const data = await resp.json();
    console.log(`[${nowISO()}] ✅ JSON parsed successfully`);

    if (!data) {
      console.error(`[${nowISO()}] ❌ Empty response from API (null data)`);
      throw new Error('Empty response from API');
    }

    if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
      console.error(`[${nowISO()}] ❌ Empty response: No candidates returned`);
      throw new Error('Empty response: No candidates returned');
    }

    const candidate = data.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      console.error(`[${nowISO()}] ❌ Empty response: No content in candidate`);
      throw new Error('Empty response: No content in candidate');
    }

    const textParts = candidate.content.parts.map(p => p.text || '').join('').trim();
    if (!textParts) {
      console.error(`[${nowISO()}] ❌ Empty response: No text content`);
      throw new Error('Empty response: No text content');
    }

    console.log(`[${nowISO()}] ✅ Valid response received - Text length: ${textParts.length} chars`);
    return data;
  },

  extractResponseText(response) {
    if (!response || !response.candidates || !response.candidates[0]) {
      return '';
    }
    const parts = response.candidates[0].content?.parts || [];
    return parts.map(p => p.text || '').join('\n').trim();
  }
};
