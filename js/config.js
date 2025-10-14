// config.js - Configuration and constants for the application

const CONFIG = {
    // API Configuration
    API_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
    DEFAULT_MODEL: 'gemini-2.5-pro-latest',
    AVAILABLE_MODELS: [
        { value: 'gemini-2.5-pro-latest', label: 'Gemini 2.5 Pro' },
        { value: 'gemini-2.5-flash-latest', label: 'Gemini 2.5 Flash' }
    ],

    // Generation Configuration
    DEFAULT_TEMPERATURE: 1.0,
    DEFAULT_MAX_TOKENS: 8192,
    MAX_ITERATIONS: 10,

    // Storage Keys
    STORAGE_KEYS: {
        API_KEYS: 'gemini-api-keys',
        SESSION_DATA: 'session-data',
        CONVERSATION_HISTORY: 'conversation-history',
        MODEL_CONFIG: 'model-config',
        MEMORY: 'memory-data',
        GOALS: 'goals-data',
        CHECKPOINTS: 'checkpoints-data'
    },

    // UI Configuration
    MAX_INPUT_LENGTH: 32768,
    STREAM_CHUNK_DELAY: 10,
    AUTO_SCROLL_THRESHOLD: 100,

    // Tool Tags
    TOOL_TAGS: {
        MEMORY_FETCH: 'memory_fetch',
        MEMORY_STORE: 'memory_store',
        JS_EXEC: 'js_exec',
        CANVAS_RENDER: 'canvas_render',
        GOAL_ADD: 'goal_add',
        GOAL_UPDATE: 'goal_update',
        CHECKPOINT_SAVE: 'checkpoint_save'
    },

    // Status Messages
    MESSAGES: {
        NO_API_KEYS: 'Please configure API keys in settings',
        RATE_LIMIT: 'Rate limit reached, rotating to next key',
        API_ERROR: 'API error occurred',
        EXECUTION_ERROR: 'Code execution error',
        NETWORK_ERROR: 'Network error occurred'
    }
};

// Export configuration
window.CONFIG = CONFIG;
