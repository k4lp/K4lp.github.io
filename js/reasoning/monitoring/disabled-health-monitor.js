/**
 * DisabledHealthMonitor
 *
 * Provides a no-op implementation of the ChainHealthMonitor interface so
 * that session code can keep calling the same methods without triggering
 * health-based gating. All methods either do nothing or return static data
 * that represents a permanently healthy/disabled state.
 */

export class DisabledHealthMonitor {
  constructor() {
    this.healthMetrics = {
      iterations: [],
      issues: [],
      status: 'disabled'
    };
    this.thresholds = {};
  }

  recordIteration(iterationData = {}) {
    this.healthMetrics.iterations.push({
      number: iterationData.number ?? this.healthMetrics.iterations.length + 1,
      timestamp: new Date().toISOString()
    });

    if (this.healthMetrics.iterations.length > 50) {
      this.healthMetrics.iterations.shift();
    }
  }

  analyzeHealth() {}

  countConsecutiveErrors() {
    return 0;
  }

  _calculateErrorRate() {
    return 0;
  }

  _calculateProgressRate() {
    return 1;
  }

  reportIssue() {}

  updateStatus() {}

  getHealthStatus() {
    return {
      status: 'disabled',
      recentIssues: [],
      metrics: {
        totalIterations: this.healthMetrics.iterations.length,
        errorRate: this.calculateOverallErrorRate(),
        consecutiveErrors: 0
      },
      score: 1
    };
  }

  calculateOverallErrorRate() {
    return '0%';
  }

  isHealthy() {
    return true;
  }

  isDegraded() {
    return false;
  }

  isCritical() {
    return false;
  }

  reset() {
    this.healthMetrics = {
      iterations: [],
      issues: [],
      status: 'disabled'
    };
  }

  updateThresholds(newThresholds = {}) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  getThresholds() {
    return { ...this.thresholds };
  }

  exportData() {
    return {
      healthStatus: this.getHealthStatus(),
      iterations: this.healthMetrics.iterations.slice(),
      issues: [],
      thresholds: this.thresholds,
      timestamp: new Date().toISOString(),
      disabled: true
    };
  }
}
