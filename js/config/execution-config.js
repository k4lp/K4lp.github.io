/**
 * Execution Configuration
 *
 * Centralises tunable parameters for the JavaScript execution pipeline so the
 * behaviour stays consistent across manual and automatic runs.
 */

/**
 * Default timeout (ms) applied when no explicit value is provided.
 * Used by: execution/execution-runner.js
 */
export const EXECUTION_DEFAULT_TIMEOUT_MS = 15000;

/**
 * Regex used to expand {{<vaultref/>}} placeholders prior to execution.
 * Used by: execution/execution-runner.js
 */
export const EXECUTION_VAULT_REF_PATTERN = /{{<vaultref\s+id=["']([^"']+)["']\s*\/>}}/gi;

/**
 * Source label used when callers omit one.
 * Used by: execution/execution-manager.js
 */
export const EXECUTION_DEFAULT_SOURCE = 'auto';

/**
 * Delay before the execution status pill resets to READY.
 * Used by: execution/js-executor.js
 */
export const EXECUTION_STATUS_RESET_DELAY_MS = 2500;

