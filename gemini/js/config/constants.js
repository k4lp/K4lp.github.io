/**
 * Application-wide constants (no side effects).
 * @module config/constants
 */

export const APP_NAME = 'Gemini Multi-Talk';
export const APP_VERSION = '1.0.0';

/** Gemini Generative Language API (beta) base URL */
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** Storage keys (localStorage) */
export const STORAGE_KEYS = Object.freeze({
  API_KEYS: 'gmt.apiKeys',
  SETTINGS: 'gmt.settings',
  SESSION: 'gmt.session',
  EVENT_LOG: 'gmt.eventLog',
});

/** Key health statuses used by the rotator */
export const KEY_STATUS = Object.freeze({
  READY: 'ready',
  BUSY: 'busy',
  RATE_LIMITED: 'rate_limited',
  INVALID: 'invalid',
  DISABLED: 'disabled',
  ERROR: 'error',
  COOLDOWN: 'cooldown',
});

/** Rotation strategies */
export const ROTATION_STRATEGY = Object.freeze({
  ROUND_ROBIN: 'round_robin',
  LEAST_USED: 'least_used',
  HEALTHY_FIRST: 'healthy_first',
});

/** Event bus topic names for observability */
export const EVENTS = Object.freeze({
  KEYS_UPDATED: 'keys:updated',
  KEY_SELECTED: 'key:selected',
  KEY_STATUS: 'key:status',
  MODELS_LOADING: 'models:loading',
  MODELS_LOADED: 'models:loaded',
  MODELS_ERROR: 'models:error',
  REQUEST_START: 'api:request:start',
  REQUEST_END: 'api:request:end',
  REQUEST_ERROR: 'api:request:error',
  SESSION_RESET: 'session:reset',
  SESSION_START: 'session:start',
  SESSION_PAUSE: 'session:pause',
  SESSION_RESUME: 'session:resume',
  SESSION_STOP: 'session:stop',
  SESSION_COMPLETE: 'session:complete',
  TURN_START: 'turn:start',
  TURN_END: 'turn:end',
  TURN_ERROR: 'turn:error',
  TRANSCRIPT_APPEND: 'transcript:append',
  SETTINGS_CHANGED: 'settings:changed',
  LOG: 'log',
  TOAST: 'toast',
});

/** Default model id when catalogue is unavailable */
export const FALLBACK_MODEL = 'gemini-2.5-flash';

/** Colors assigned to candidates (CSS custom properties) */
export const CANDIDATE_COLORS = [
  '#4f8cff',
  '#34d399',
  '#fbbf24',
  '#f472b6',
  '#a78bfa',
  '#fb7185',
  '#2dd4bf',
  '#f97316',
];
