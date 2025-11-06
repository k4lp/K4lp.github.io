/**
 * ErrorRecoveryConfig
 *
 * Configuration for error recovery system.
 * Defines recovery behavior and context cleaning.
 */

export const ERROR_RECOVERY_CONFIG = {
  // Enable automatic error recovery
  enableRecovery: true,

  // Error types that trigger recovery
  recoverableErrors: [
    'ReferenceError',
    'TimeoutError',
    'NetworkError'
  ],

  // Error types that don't trigger recovery
  nonRecoverableErrors: [
    'SyntaxError',
    'TypeError'
  ],

  // Context cleaning settings
  contextCleaning: {
    enabled: true,
    cleanExecutionLog: true,
    cleanReasoningLog: false, // Keep reasoning log for continuity
    cleanApiTracker: true,
    cleanConsoleOutput: true
  },

  // Recovery attempt limits
  maxRecoveryAttempts: 2,

  // Reasoning-based recovery settings
  reasoningRecovery: {
    enabled: true,
    provideValidEntities: true,
    providePreviousReasoning: true,
    provideErrorContext: true,
    enhancePrompt: true
  },

  // Silent recovery (transparent to user)
  silentRecovery: {
    enabled: true,
    logRecoveryAttempts: true,
    replaceFailedEntry: true
  },

  // Recovery strategies per error type
  errorRecoveryStrategies: {
    'ReferenceError': {
      cleanContext: true,
      provideValidEntities: true,
      maxAttempts: 1
    },
    'TimeoutError': {
      cleanContext: true,
      increaseTimeout: true,
      maxAttempts: 1
    },
    'NetworkError': {
      cleanContext: false,
      exponentialBackoff: true,
      maxAttempts: 3
    }
  }
};

export function getErrorRecoveryStrategy(errorName) {
  return ERROR_RECOVERY_CONFIG.errorRecoveryStrategies[errorName] || null;
}

// Legacy bridge (deprecated)
if (typeof window !== 'undefined') {
  window.ERROR_RECOVERY_CONFIG = ERROR_RECOVERY_CONFIG;
}
