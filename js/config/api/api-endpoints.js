/**
 * API Endpoints Configuration
 *
 * Centralized API endpoint URLs for all external services
 */

/**
 * Gemini API endpoints
 */
export const GEMINI_ENDPOINTS = {
    BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
    MODELS_LIST: 'https://generativelanguage.googleapis.com/v1beta/models',

    // URL builders
    generateContentUrl: (modelId) => {
        const cleanModelId = modelId.startsWith('models/') ? modelId : `models/${modelId}`;
        return `https://generativelanguage.googleapis.com/v1beta/${cleanModelId}:generateContent`;
    },

    modelsListWithKey: (apiKey) => {
        return `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
    }
};

export default GEMINI_ENDPOINTS;
