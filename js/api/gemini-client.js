/**
 * GDRS Gemini API Client
 * API communication, error handling, retry logic with key rotation
 */

import { KeyManager } from './key-manager.js';
import { Storage } from '../storage/storage.js';
import { Renderer } from '../ui/renderer.js';
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
    return await this.generateContentWithRetry(modelId, prompt, 0);
  },

  async generateContentWithRetry(modelId, prompt, retryCount = 0) {
    const availableKeys = KeyManager.getAllAvailableKeys();
    
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
          KeyManager.showKeyRotationIndicator(lastUsedKeySlot, currentKey.slot, 'auto rotation');
        }
        
        const result = await this.makeRequest(modelId, prompt, currentKey);
        
        KeyManager.bumpUsage(currentKey.slot);
        console.log(`✅ Success with key #${currentKey.slot}`);
        return result;
        
      } catch (error) {
        console.warn(`❌ Key #${currentKey.slot} failed: ${error.message}`);
        lastUsedKeySlot = currentKey.slot;
        
        if (error.message.includes('429') || error.message.includes('Rate limited')) {
          KeyManager.markRateLimit(currentKey.slot, 60);
        } else if (error.message.includes('401') || error.message.includes('403') || error.message.includes('Invalid API key')) {
          KeyManager.markValid(currentKey.slot, false);
        } else if (error.message.includes('Empty response')) {
          KeyManager.markFailure(currentKey.slot, 'empty_response');
        } else {
          KeyManager.markFailure(currentKey.slot, error.message.substring(0, 50));
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
  },

  async makeRequest(modelId, prompt, keyInfo) {
    const cleanModelId = modelId.startsWith('models/') ? modelId : `models/${modelId}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/${cleanModelId}:generateContent?key=${encodeURIComponent(keyInfo.key)}`;
    
    const maxOutputTokens = Storage.loadMaxOutputTokens();
    
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

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (resp.status === 429) {
      throw new Error('Rate limited (429)');
    }
    
    if (resp.status === 401 || resp.status === 403) {
      throw new Error('Invalid API key (401/403)');
    }
    
    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${errorText}`);
    }

    const data = await resp.json();
    
    if (!data) {
      throw new Error('Empty response from API');
    }
    
    if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
      throw new Error('Empty response: No candidates returned');
    }
    
    const candidate = data.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error('Empty response: No content in candidate');
    }
    
    const textParts = candidate.content.parts.map(p => p.text || '').join('').trim();
    if (!textParts) {
      throw new Error('Empty response: No text content');
    }
    
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
