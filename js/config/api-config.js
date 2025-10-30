/**
 * API Configuration
 *
 * API endpoints, timeouts, and request settings
 */

/**
 * Gemini API base URL
 */
export const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * API request timeout (milliseconds)
 */
export const API_TIMEOUT = 120000; // 2 minutes

/**
 * Rate limit cooldown period (milliseconds)
 */
export const RATE_LIMIT_COOLDOWN = 60000; // 1 minute

/**
 * Maximum consecutive failures before disabling a key
 */
export const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * Default API request options
 */
export const DEFAULT_REQUEST_OPTIONS = {
  temperature: 1.0,
  topP: 0.95,
  topK: 40
};

/**
 * Available Gemini models
 * This will be dynamically populated from the API
 */
export const GEMINI_MODELS = {
  // Populated dynamically via KeyManager.fetchAvailableModels()
};

/**
 * Model selection preferences
 */
export const MODEL_PREFERENCES = {
  DEFAULT: 'gemini-1.5-pro-latest',
  FALLBACK: 'gemini-1.5-flash-latest'
};
