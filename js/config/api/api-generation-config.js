/**
 * API Generation Configuration
 *
 * LLM generation parameters, safety settings, and model preferences
 */

/**
 * Default generation configuration
 */
export const DEFAULT_GENERATION_CONFIG = {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
};

/**
 * Alternative generation presets
 */
export const GENERATION_PRESETS = {
    CREATIVE: {
        temperature: 1.0,
        topP: 0.95,
        topK: 40,
    },
    BALANCED: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
    },
    PRECISE: {
        temperature: 0.3,
        topP: 0.5,
        topK: 20,
    },
    DETERMINISTIC: {
        temperature: 0.1,
        topP: 0.1,
        topK: 1,
    },
};

/**
 * Current active preset
 */
export const ACTIVE_PRESET = 'BALANCED';

/**
 * Safety settings configuration
 */
export const SAFETY_SETTINGS = [
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
];

/**
 * Safety threshold levels
 */
export const SAFETY_THRESHOLDS = {
    BLOCK_NONE: 'BLOCK_NONE',
    BLOCK_LOW_AND_ABOVE: 'BLOCK_LOW_AND_ABOVE',
    BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
    BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH',
};

/**
 * Model preferences
 */
export const MODEL_PREFERENCES = {
    DEFAULT: 'gemini-1.5-pro-latest',
    FALLBACK: 'gemini-1.5-flash-latest',
    EXPERIMENTAL: 'gemini-exp-1206',
};

/**
 * Get generation config for a preset
 * @param {string} preset - Preset name from GENERATION_PRESETS
 * @returns {Object} Generation configuration
 */
export function getGenerationConfig(preset = ACTIVE_PRESET) {
    return GENERATION_PRESETS[preset] || GENERATION_PRESETS.BALANCED;
}

/**
 * Build complete request configuration
 * @param {number} maxOutputTokens - Maximum output tokens
 * @param {string} preset - Generation preset
 * @returns {Object} Complete generation config
 */
export function buildGenerationConfig(maxOutputTokens, preset = ACTIVE_PRESET) {
    return {
        ...getGenerationConfig(preset),
        maxOutputTokens: maxOutputTokens,
    };
}

export default {
    DEFAULT_GENERATION_CONFIG,
    GENERATION_PRESETS,
    ACTIVE_PRESET,
    SAFETY_SETTINGS,
    SAFETY_THRESHOLDS,
    MODEL_PREFERENCES,
    getGenerationConfig,
    buildGenerationConfig,
};
