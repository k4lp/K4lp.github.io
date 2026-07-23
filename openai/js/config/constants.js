/**
 * @module config/constants
 */

export const APP_NAME = 'OpenAI Chat Lab';
export const APP_VERSION = '1.0.0';

/** Official OpenAI API base (Chat Completions + Models) */
export const OPENAI_API_BASE = 'https://api.openai.com/v1';

export const STORAGE_KEYS = Object.freeze({
  API_KEYS: 'oai.apiKeys',
  SETTINGS: 'oai.settings',
  SESSION: 'oai.session',
  MODELS_CACHE: 'oai.models.cache',
});

export const KEY_STATUS = Object.freeze({
  READY: 'ready',
  BUSY: 'busy',
  RATE_LIMITED: 'rate_limited',
  INVALID: 'invalid',
  DISABLED: 'disabled',
  ERROR: 'error',
  COOLDOWN: 'cooldown',
});

export const ROTATION_STRATEGY = Object.freeze({
  ROUND_ROBIN: 'round_robin',
  LEAST_USED: 'least_used',
  HEALTHY_FIRST: 'healthy_first',
});

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
  STREAM_START: 'stream:start',
  STREAM_DELTA: 'stream:delta',
  STREAM_END: 'stream:end',
  STREAM_ERROR: 'stream:error',
  STREAM_ABORT: 'stream:abort',
  CHAT_RESET: 'chat:reset',
  CHAT_MESSAGE: 'chat:message',
  CHAT_UPDATE: 'chat:update',
  SETTINGS_CHANGED: 'settings:changed',
  NET_STATUS: 'net:status',
  NET_PROBE: 'net:probe',
  LOG: 'log',
  TOAST: 'toast',
});

/** Connectivity / API health states for the live badge */
export const NET_STATE = Object.freeze({
  UNKNOWN: 'unknown',
  ONLINE: 'online',
  DEGRADED: 'degraded',
  OFFLINE: 'offline',
  API_DOWN: 'api_down',
  AUTH_FAIL: 'auth_fail',
  RATE_LIMITED: 'rate_limited',
  PROBING: 'probing',
});

export const FALLBACK_MODEL = 'gpt-4o-mini';

/** Curated chat-capable defaults when catalogue is empty */
export const KNOWN_CHAT_MODELS = Object.freeze([
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4o-2024-08-06',
  'o3',
  'o3-mini',
  'o4-mini',
  'o1',
  'o1-mini',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'chatgpt-4o-latest',
]);
