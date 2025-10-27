/**
 * GDRS GEMINI CLIENT - Gemini API integration with key rotation
 */

(function() {
  'use strict';

  // Gemini API configuration
  const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
  const DEFAULT_MODEL = 'gemini-1.5-pro-latest';
  
  // Rate limiting constants
  const RATE_LIMIT_COOLDOWN = 60000; // 60 seconds
  const REQUEST_TIMEOUT = 30000; // 30 seconds
  
  /**
   * Gemini API Client with automatic key rotation and rate limit handling
   */
  class GeminiClient {
    constructor() {
      this.currentKeyIndex = 0;
      this.rateLimitedKeys = new Set();
    }

    /**
     * Get available API keys from localStorage
     */
    getApiKeys() {
      try {
        const keys = JSON.parse(localStorage.getItem('gdrs_keypool') || '[]');
        return keys.filter(k => k && k.key && k.key.trim().length > 0);
      } catch {
        return [];
      }
    }

    /**
     * Get next available API key (with rotation)
     */
    getNextKey() {
      const keys = this.getApiKeys();
      if (keys.length === 0) {
        throw new Error('No API keys configured');
      }

      // Find a non-rate-limited key
      for (let i = 0; i < keys.length; i++) {
        const keyIndex = (this.currentKeyIndex + i) % keys.length;
        const keyData = keys[keyIndex];
        
        if (!this.rateLimitedKeys.has(keyIndex)) {
          this.currentKeyIndex = keyIndex;
          return { key: keyData.key.trim(), index: keyIndex };
        }
      }

      throw new Error('All API keys are rate-limited. Please wait and try again.');
    }

    /**
     * Mark a key as rate-limited
     */
    markKeyRateLimited(keyIndex) {
      this.rateLimitedKeys.add(keyIndex);
      
      // Clear the rate limit after cooldown period
      setTimeout(() => {
        this.rateLimitedKeys.delete(keyIndex);
        logWithTime(`Key ${keyIndex + 1} cooldown expired`, 'info');
      }, RATE_LIMIT_COOLDOWN);
      
      logWithTime(`Key ${keyIndex + 1} marked as rate-limited for ${RATE_LIMIT_COOLDOWN / 1000}s`, 'warn');
    }

    /**
     * Fetch available models from Gemini API
     */
    async fetchModels() {
      const { key, index } = this.getNextKey();
      const url = `${GEMINI_BASE_URL}/models?key=${encodeURIComponent(key)}`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        clearTimeout(timeoutId);

        if (response.status === 429) {
          this.markKeyRateLimited(index);
          throw new Error('Rate limited. Trying next key...');
        }

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.models || [];
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
    }

    /**
     * Generate content using Gemini API
     */
    async generateContent(prompt, modelId = DEFAULT_MODEL, options = {}) {
      const { key, index } = this.getNextKey();
      const url = `${GEMINI_BASE_URL}/models/${modelId}:generateContent?key=${encodeURIComponent(key)}`;

      const payload = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: options.temperature || 0.8,
          topP: options.topP || 1,
          topK: options.topK || 95,
          maxOutputTokens: options.maxOutputTokens || 65536,
          ...options.generationConfig
        },
        safetySettings: options.safetySettings || [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "OFF"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "OFF"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "OFF"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "OFF"
          }
        ]
      };

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 429) {
          this.markKeyRateLimited(index);
          // Try with next key automatically
          return this.generateContent(prompt, modelId, options);
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const data = await response.json();
        return this.extractResponseText(data);
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
    }

    /**
     * Extract text from Gemini API response
     */
    extractResponseText(response) {
      if (!response || !response.candidates || response.candidates.length === 0) {
        throw new Error('No candidates in response');
      }

      const candidate = response.candidates[0];
      
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        logWithTime(`Response finished with reason: ${candidate.finishReason}`, 'warn');
      }

      if (!candidate.content || !candidate.content.parts) {
        throw new Error('No content in response candidate');
      }

      return candidate.content.parts
        .filter(part => part.text)
        .map(part => part.text)
        .join('\n')
        .trim();
    }

    /**
     * Validate an API key
     */
    async validateKey(apiKey) {
      const url = `${GEMINI_BASE_URL}/models?key=${encodeURIComponent(apiKey)}`;
      
      try {
        const response = await fetch(url, { method: 'GET' });
        return response.ok;
      } catch {
        return false;
      }
    }
  }

  // Create global instance
  const geminiClient = new GeminiClient();

  // Export to global scope
  if (typeof window !== 'undefined') {
    window.GeminiClient = GeminiClient;
    window.geminiClient = geminiClient;
    
    // Add to GDRS namespace
    window.GDRS = window.GDRS || {};
    window.GDRS.geminiClient = geminiClient;
    window.GDRS.GeminiClient = GeminiClient;
  }

  logWithTime('Gemini API client initialized', 'info');
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GeminiClient, geminiClient };
}
