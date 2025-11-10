/**
 * Storage Configuration
 *
 * LocalStorage keys and storage-related structures
 */

/**
 * Local storage keys used throughout the application
 * All GDRS data is namespaced with 'gdrs_' prefix
 */
export const LS_KEYS = {
  /** Application metadata (version, etc.) */
  META: 'gdrs_meta',

  /** API key pool with usage tracking */
  KEYPOOL: 'gdrs_keypool',

  /** User-defined research goals */
  GOALS: 'gdrs_goals',

  /** Long-term memory items */
  MEMORY: 'gdrs_memory',

  /** Current tasks being worked on */
  TASKS: 'gdrs_tasks',

  /** Data vault for storing reusable content */
  VAULT: 'gdrs_vault',

  /** Final output from LLM */
  FINAL_OUTPUT: 'gdrs_final_output',

  /** Final output verification status */
  FINAL_OUTPUT_VERIFIED: 'gdrs_final_output_verified',

  /** Reasoning iteration log */
  REASONING_LOG: 'gdrs_reasoning_log',

  /** Current user query */
  CURRENT_QUERY: 'gdrs_current_query',

  /** Persisted model selection */
  SELECTED_MODEL: 'gdrs_selected_model',

  /** Code execution history */
  EXECUTION_LOG: 'gdrs_execution_log',

  /** Tool activity tracking */
  TOOL_ACTIVITY_LOG: 'gdrs_tool_activity_log',

  /** Last executed code snippet */
  LAST_EXECUTED_CODE: 'gdrs_last_executed_code',

  /** Maximum output tokens setting */
  MAX_OUTPUT_TOKENS: 'gdrs_max_output_tokens',

  /** Pending execution error context (single-use warning for next iteration) */
  PENDING_EXECUTION_ERROR: 'gdrs_pending_execution_error',

  /** Feature toggle - enable sub-agent knowledge search */
  SETTINGS_ENABLE_SUB_AGENT: 'gdrs_settings_enable_sub_agent',

  /** Feature toggle - enable Excel helper instructions */
  SETTINGS_ENABLE_EXCEL_HELPERS: 'gdrs_settings_enable_excel_helpers',

  /** Preferred default sub-agent id */
  SETTINGS_SUB_AGENT_DEFAULT: 'gdrs_settings_sub_agent_default',

  /** Sub-agent request timeout */
  SETTINGS_SUB_AGENT_TIMEOUT: 'gdrs_settings_sub_agent_timeout',

  /** Sub-agent cache TTL */
  SETTINGS_SUB_AGENT_CACHE_TTL: 'gdrs_settings_sub_agent_cache_ttl',

  /** Cached sub-agent knowledge payload */
  SUBAGENT_LAST_RESULT: 'gdrs_subagent_last_result',

  /** Detailed sub-agent trace */
  SUBAGENT_TRACE: 'gdrs_subagent_trace',

  /** Stored Groq API keys */
  GROQ_API_KEYS: 'gdrs_groq_api_keys'
};

/**
 * Create a key object from raw API key text
 *
 * This supports the unlimited keys architecture - no more fixed slots!
 *
 * @param {string} keyText - The API key text
 * @param {number} index - Index in the key list (0-based)
 * @returns {Object} Key object with metadata
 */
export const createKeyFromText = (keyText, index) => {
  return {
    slot: index + 1,  // 1-based indexing for display
    key: keyText.trim(),
    usage: 0,
    cooldownUntil: 0,
    rateLimited: false,
    valid: false,
    failureCount: 0,
    lastFailure: 0,
    addedAt: Date.now()
  };
};

/**
 * Default empty keypool
 * @returns {Array} Empty array for keypool
 */
export const DEFAULT_KEYPOOL = () => [];

/**
 * Default empty goals array
 * @returns {Array} Empty array for goals
 */
export const DEFAULT_GOALS = () => [];

/**
 * Default empty memory array
 * @returns {Array} Empty array for memory
 */
export const DEFAULT_MEMORY = () => [];

/**
 * Default empty tasks array
 * @returns {Array} Empty array for tasks
 */
export const DEFAULT_TASKS = () => [];

/**
 * Default empty vault array
 * @returns {Array} Empty array for vault
 */
export const DEFAULT_VAULT = () => [];

/**
 * Default empty reasoning log
 * @returns {Array} Empty array for reasoning log
 */
export const DEFAULT_REASONING_LOG = () => [];

/**
 * Default empty execution log
 * @returns {Array} Empty array for execution log
 */
export const DEFAULT_EXECUTION_LOG = () => [];

/**
 * Default empty tool activity log
 * @returns {Array} Empty array for tool activity log
 */
export const DEFAULT_TOOL_ACTIVITY_LOG = () => [];

/**
 * Default max output tokens
 * @returns {number} Default token limit
 */
export const DEFAULT_MAX_OUTPUT_TOKENS = () => 65536;
