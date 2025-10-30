/**
 * UI Configuration
 *
 * User interface constants and display settings
 */

/**
 * Duration to display key rotation indicator (milliseconds)
 */
export const KEY_ROTATION_DISPLAY_DURATION = 5000;

/**
 * UI refresh debounce delay (milliseconds)
 */
export const UI_REFRESH_DEBOUNCE = 100;

/**
 * Status pill colors
 */
export const STATUS_COLORS = {
  SUCCESS: '#4CAF50',
  ERROR: '#dc3545',
  WARNING: '#ffc107',
  INFO: '#0366d6',
  PENDING: '#6c757d'
};

/**
 * Task status values
 */
export const TASK_STATUSES = {
  PENDING: 'pending',
  ONGOING: 'ongoing',
  FINISHED: 'finished',
  PAUSED: 'paused'
};

/**
 * Vault entry types
 */
export const VAULT_TYPES = {
  TEXT: 'text',
  CODE: 'code',
  DATA: 'data'
};

/**
 * Console log styling
 */
export const CONSOLE_STYLES = {
  SUCCESS: 'color: #00ff00; font-weight: bold;',
  ERROR: 'color: #ff0000; font-weight: bold;',
  WARNING: 'color: #ff6600; font-weight: bold;',
  INFO: 'color: #0066ff; font-weight: bold;',
  DEBUG: 'color: #666666;'
};
