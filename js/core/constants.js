/**
 * GDRS Core Constants and Configuration
 *
 * REFACTORED: This file now serves as a compatibility layer
 * All configuration has been extracted to focused modules:
 * - config/app-config.js - Application settings and system prompt
 * - config/storage-config.js - LocalStorage keys and structures
 * - config/api-config.js - API endpoints and settings
 * - config/ui-config.js - UI constants and display settings
 *
 * Import from this file for backward compatibility,
 * or import directly from config/* files
 */

// Re-export application configuration
export {
  VERSION,
  MAX_ITERATIONS,
  ITERATION_DELAY,
  MAX_RETRY_ATTEMPTS,
  EMPTY_RESPONSE_RETRY_DELAY,
  SYSTEM_PROMPT
} from '../config/app-config.js';

// Re-export storage configuration
export {
  LS_KEYS,
  createKeyFromText,
  DEFAULT_KEYPOOL,
  DEFAULT_GOALS,
  DEFAULT_MEMORY,
  DEFAULT_TASKS,
  DEFAULT_VAULT,
  DEFAULT_REASONING_LOG,
  DEFAULT_EXECUTION_LOG,
  DEFAULT_TOOL_ACTIVITY_LOG,
  DEFAULT_MAX_OUTPUT_TOKENS
} from '../config/storage-config.js';

// Re-export API configuration
export {
  GEMINI_API_BASE_URL,
  API_TIMEOUT,
  RATE_LIMIT_COOLDOWN,
  MAX_CONSECUTIVE_FAILURES,
  DEFAULT_REQUEST_OPTIONS,
  GEMINI_MODELS,
  MODEL_PREFERENCES
} from '../config/api-config.js';

// Re-export UI configuration
export {
  KEY_ROTATION_DISPLAY_DURATION,
  UI_REFRESH_DEBOUNCE,
  STATUS_COLORS,
  TASK_STATUSES,
  VAULT_TYPES,
  CONSOLE_STYLES
} from '../config/ui-config.js';

// Re-export reasoning configuration
export {
  REASONING_CONTEXT_LIMITS,
  REASONING_CONTEXT_SECTIONS,
  REASONING_PROMPT_FRAGMENTS,
  REASONING_STRATEGIC_INSTRUCTION,
  REASONING_HEALTH_MONITORING_ENABLED,
  GOAL_COMPLETION_RULES
} from '../config/reasoning-config.js';

// Re-export tool usage configuration
export {
  TOOL_OPERATION_PIPELINE,
  TOOL_SUMMARY_BLUEPRINT
} from '../config/tool-usage-config.js';
