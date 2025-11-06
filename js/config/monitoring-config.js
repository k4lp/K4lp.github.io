/**
 * MonitoringConfig
 *
 * Configuration for monitoring and observability system.
 * Defines metrics collection and health monitoring.
 */

const MONITORING_CONFIG = {
  // Enable metrics collection
  enableMetrics: true,

  // Enable health monitoring
  enableHealthMonitoring: true,

  // Metrics collection settings
  metrics: {
    collectExecutionMetrics: true,
    collectReasoningMetrics: true,
    collectPerformanceMetrics: true,
    maxStoredExecutions: 100,
    maxStoredIterations: 50,
    aggregateRealTime: true
  },

  // Health monitoring thresholds
  health: {
    maxConsecutiveErrors: 3,
    maxErrorRate: 0.5, // 50%
    minProgressRate: 0.1, // 10%
    checkInterval: 1000, // ms
    alertOnDegraded: true
  },

  // Performance monitoring
  performance: {
    trackExecutionTime: true,
    trackMemoryUsage: false, // Future
    trackCodeSize: true,
    warnOnSlowExecution: true,
    slowExecutionThreshold: 5000 // ms
  },

  // Export settings
  export: {
    enableAutoExport: false,
    exportInterval: 300000, // 5 minutes
    exportFormat: 'json',
    exportToLocalStorage: true,
    maxExportSize: 1048576 // 1MB
  },

  // Event logging
  eventLogging: {
    logStateTransitions: true,
    logMiddlewareExecution: false,
    logErrorClassification: true,
    logRetryAttempts: true,
    logContextCleaning: true
  },

  // Alert thresholds
  alerts: {
    consecutiveErrors: {
      threshold: 3,
      severity: 'high'
    },
    highErrorRate: {
      threshold: 0.5,
      severity: 'medium'
    },
    lowProgress: {
      threshold: 0.1,
      severity: 'low'
    },
    slowExecution: {
      threshold: 10000, // ms
      severity: 'low'
    }
  }
};

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MONITORING_CONFIG };
}

// Export to window
if (typeof window !== 'undefined') {
  window.MONITORING_CONFIG = MONITORING_CONFIG;
}
