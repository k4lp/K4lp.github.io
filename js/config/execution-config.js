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
 * Source label used when callers omit one.
 * Used by: execution/execution-manager.js
 */
export const EXECUTION_DEFAULT_SOURCE = 'auto';

/**
 * Delay before the execution status pill resets to READY.
 * Used by: execution/js-executor.js
 */
export const EXECUTION_STATUS_RESET_DELAY_MS = 2500;

/**
 * NOTE: Vault reference pattern has been moved to tool-registry-config.js
 * for centralized pattern management. Use the vault-reference-resolver.js
 * utility for resolving vault references.
 */

