/**
 * Gemini API Provider
 *
 * Implementation of IAPIProvider for Google Gemini API
 */

import { GEMINI_API_BASE_URL, API_TIMEOUT } from '../../config/api-config.js';

/**
 * GeminiProvider
 * Implements IAPIProvider interface for Google Gemini API
 */
export class GeminiProvider {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || GEMINI_API_BASE_URL;
    this.timeout = config.timeout || API_TIMEOUT;
    this.apiKey = config.apiKey || null;
  }

  /**
   * Generate content using Gemini API
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Generation options
   * @param {string} options.model - Model to use
   * @param {number} options.maxTokens - Maximum tokens to generate
   * @param {number} options.temperature - Sampling temperature
   * @param {string} options.apiKey - API key (overrides constructor key)
   * @returns {Promise<Object>} Response object with generated content
   */
  async generateContent(prompt, options = {}) {
    const apiKey = options.apiKey || this.apiKey;

    if (!apiKey) {
      throw new Error('API key is required');
    }

    const model = options.model || 'gemini-1.5-pro-latest';
    const maxTokens = options.maxTokens || 65536;
    const temperature = options.temperature !== undefined ? options.temperature : 1.0;

    const url = `${this.baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
        topP: options.topP || 0.95,
        topK: options.topK || 40
      }
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle different status codes
      if (response.status === 429) {
        throw new Error('Rate limited (429)');
      }

      if (response.status === 401) {
        throw new Error('Invalid API key (401)');
      }

      if (response.status === 403) {
        throw new Error('Access forbidden (403)');
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
      }

      const data = await response.json();

      // Validate response structure
      if (!data || !data.candidates || !Array.isArray(data.candidates)) {
        throw new Error('Empty response: Invalid response structure');
      }

      if (data.candidates.length === 0) {
        throw new Error('Empty response: No candidates');
      }

      const candidate = data.candidates[0];
      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error('Empty response: No content parts');
      }

      const text = candidate.content.parts[0].text;
      if (!text || text.trim().length === 0) {
        throw new Error('Empty response: No text content');
      }

      return {
        text,
        model,
        finishReason: candidate.finishReason || 'STOP',
        safetyRatings: candidate.safetyRatings || [],
        usageMetadata: data.usageMetadata || {}
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Validate an API key
   * @param {string} key - The API key to validate
   * @returns {Promise<boolean>} True if key is valid
   */
  async validateKey(key) {
    try {
      const url = `${this.baseUrl}/models?key=${encodeURIComponent(key)}`;

      const response = await fetch(url);

      if (response.status === 401 || response.status === 403) {
        return false;
      }

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return !!(data && Array.isArray(data.models) && data.models.length > 0);

    } catch (error) {
      console.error('[GeminiProvider] Validation error:', error);
      return false;
    }
  }

  /**
   * List available models
   * @returns {Promise<Array<Object>>} Array of model objects
   */
  async listModels() {
    if (!this.apiKey) {
      throw new Error('API key is required to list models');
    }

    try {
      const url = `${this.baseUrl}/models?key=${encodeURIComponent(this.apiKey)}`;

      const response = await fetch(url);

      if (response.status === 429) {
        throw new Error('Rate limited');
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid API key');
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data || !Array.isArray(data.models)) {
        return [];
      }

      return data.models.map(model => ({
        name: model.name,
        displayName: model.displayName || model.name,
        description: model.description || '',
        inputTokenLimit: model.inputTokenLimit || 0,
        outputTokenLimit: model.outputTokenLimit || 0,
        supportedGenerationMethods: model.supportedGenerationMethods || []
      }));

    } catch (error) {
      console.error('[GeminiProvider] List models error:', error);
      throw error;
    }
  }

  /**
   * Get rate limit information
   * Note: Gemini API doesn't expose rate limits directly,
   * so this returns general information
   * @returns {Promise<Object>} Rate limit info
   */
  async getRateLimits() {
    return {
      provider: 'gemini',
      rateLimit: 'See Google AI Studio for quota details',
      note: 'Rate limits vary by API key tier and model'
    };
  }

  /**
   * Set API key
   * @param {string} key - API key
   */
  setApiKey(key) {
    this.apiKey = key;
  }

  /**
   * Get current API key
   * @returns {string|null}
   */
  getApiKey() {
    return this.apiKey;
  }
}
