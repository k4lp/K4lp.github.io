/**
 * Request Builder
 *
 * Builds API request payloads for Gemini API
 */

import { GEMINI_ENDPOINTS } from '../../config/api/api-endpoints.js';
import { SAFETY_SETTINGS, buildGenerationConfig } from '../../config/api/api-generation-config.js';

/**
 * Build URL for generate content endpoint
 * @param {string} modelId - Model ID
 * @param {string} apiKey - API key
 * @returns {string} Full URL
 */
export function buildGenerateContentUrl(modelId, apiKey) {
    const cleanModelId = modelId.startsWith('models/') ? modelId : `models/${modelId}`;
    return `${GEMINI_ENDPOINTS.generateContentUrl(cleanModelId)}?key=${encodeURIComponent(apiKey)}`;
}

/**
 * Build request payload for content generation
 * @param {string} prompt - User prompt
 * @param {number} maxOutputTokens - Maximum output tokens
 * @param {string} preset - Generation preset
 * @returns {Object} Request payload
 */
export function buildGenerateContentPayload(prompt, maxOutputTokens, preset = 'BALANCED') {
    return {
        contents: [{
            parts: [{ text: prompt }]
        }],
        generationConfig: buildGenerationConfig(maxOutputTokens, preset),
        safetySettings: SAFETY_SETTINGS
    };
}

/**
 * Build request options for fetch
 * @param {Object} payload - Request payload
 * @returns {Object} Fetch options
 */
export function buildRequestOptions(payload) {
    return {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    };
}

export default {
    buildGenerateContentUrl,
    buildGenerateContentPayload,
    buildRequestOptions,
};
