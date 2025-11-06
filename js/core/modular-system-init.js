/**
 * ModularSystemInit
 *
 * Initializes all modular system components on application load.
 * Creates singleton instances and wires up event listeners.
 *
 * IMPORTANT: This must be loaded BEFORE any execution or reasoning code.
 */

(function() {
  'use strict';

  console.log('[ModularSystem] Initializing modular architecture...');

  // ============================================================================
  // EXECUTION SYSTEM INITIALIZATION
  // ============================================================================

  // Policy Managers
  window.GDRS_ExecutionPolicyManager = new ExecutionPolicyManager();
  window.GDRS_RetryPolicyManager = new RetryPolicyManager();

  // Error Handling
  window.GDRS_ErrorClassifier = new ErrorClassifier();
  window.GDRS_ErrorContextCleaner = new ErrorContextCleaner();
  window.GDRS_RetryStrategyManager = new RetryStrategyManager();
  window.GDRS_ExecutionErrorHandler = new ExecutionErrorHandler();

  // Context Management
  window.GDRS_ExecutionContextManager = new ExecutionContextManager();

  // Result Processing
  window.GDRS_ExecutionResultHandler = new ExecutionResultHandler();

  // Monitoring
  window.GDRS_ExecutionMetricsCollector = new ExecutionMetricsCollector();

  console.log('[ModularSystem] ✓ Execution system initialized');

  // ============================================================================
  // REASONING SYSTEM INITIALIZATION
  // ============================================================================

  // Session Management
  window.GDRS_ReasoningSessionManager = new ReasoningSessionManager();

  // Monitoring
  window.GDRS_ChainHealthMonitor = new ChainHealthMonitor();

  console.log('[ModularSystem] ✓ Reasoning system initialized');

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  // Listen to metrics events for debugging (can be disabled in production)
  if (typeof EventBus !== 'undefined') {
    EventBus.on('EXECUTION_STATE_CHANGED', (data) => {
      console.log(`[ExecutionState] ${data.fromState} → ${data.toState}`);
    });

    EventBus.on('SESSION_STATE_CHANGED', (data) => {
      console.log(`[SessionState] ${data.fromState} → ${data.toState}`);
    });

    EventBus.on('EXECUTION_RETRY_ATTEMPT', (data) => {
      console.log(`[Retry] Attempt ${data.attempt}/${data.maxAttempts} for execution ${data.executionId}`);
    });

    EventBus.on('EXECUTION_CONTEXT_CLEANED', (data) => {
      console.log(`[ContextCleaning] Cleaned context for ${data.executionId} (${data.errorType})`);
    });

    EventBus.on('SESSION_HEALTH_DEGRADED', (data) => {
      console.warn(`[Health] Session health degraded: ${data.status}`);
    });
  }

  // ============================================================================
  // GLOBAL API EXPOSURE
  // ============================================================================

  // Expose modular system API for console access
  window.GDRS_Modular = {
    // Policy Management
    setExecutionPolicy: (policyName) => {
      window.GDRS_ExecutionPolicyManager.setCurrentPolicy(policyName);
      console.log(`[Policy] Switched to execution policy: ${policyName}`);
    },

    getCurrentExecutionPolicy: () => {
      return window.GDRS_ExecutionPolicyManager.getCurrentPolicy();
    },

    // Metrics
    getExecutionMetrics: () => {
      return window.GDRS_ExecutionMetricsCollector.getSummary();
    },

    getSessionMetrics: (sessionId) => {
      return window.GDRS_ReasoningSessionManager.getSessionMetrics(sessionId);
    },

    // Health
    getSessionHealth: (sessionId) => {
      return window.GDRS_ReasoningSessionManager.getSessionHealth(sessionId);
    },

    // Debugging
    enableDebugMode: () => {
      window.GDRS_ExecutionPolicyManager.setCurrentPolicy('debug');
      console.log('[Debug] Debug mode enabled');
    },

    enableSafeMode: () => {
      window.GDRS_ExecutionPolicyManager.setCurrentPolicy('safe');
      console.log('[SafeMode] Safe mode enabled');
    },

    // System Info
    getSystemInfo: () => {
      return {
        executionPolicy: window.GDRS_ExecutionPolicyManager.getCurrentPolicy(),
        retryPolicy: window.GDRS_RetryPolicyManager.getCurrentPolicy(),
        activeContexts: window.GDRS_ExecutionContextManager.getContextCount(),
        activeSessions: window.GDRS_ReasoningSessionManager.getActiveSessionCount(),
        metrics: window.GDRS_ExecutionMetricsCollector.getSummary()
      };
    }
  };

  console.log('[ModularSystem] ✓ Global API exposed at window.GDRS_Modular');
  console.log('[ModularSystem] ✓ Initialization complete!');
  console.log('[ModularSystem] Try: GDRS_Modular.getSystemInfo()');

  // Mark as initialized
  window.GDRS_ModularSystemInitialized = true;

})();
