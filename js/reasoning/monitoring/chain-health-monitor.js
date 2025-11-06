/**
 * ChainHealthMonitor
 *
 * Monitors reasoning chain health and detects issues.
 * Provides early warning system for degraded performance.
 *
 * Features:
 * - Iteration tracking
 * - Consecutive error detection
 * - Error rate monitoring
 * - Progress rate tracking
 * - Health status (healthy/degraded/critical)
 * - Issue reporting
 */

class ChainHealthMonitor {
  constructor(thresholds = {}) {
    this.healthMetrics = {
      iterations: [],
      issues: [],
      status: 'healthy'
    };

    this.thresholds = {
      maxConsecutiveErrors: thresholds.maxConsecutiveErrors || 3,
      maxErrorRate: thresholds.maxErrorRate || 0.5, // 50%
      minProgressRate: thresholds.minProgressRate || 0.1, // 10%
      ...thresholds
    };

    this.maxStoredIterations = 50;
    this.maxStoredIssues = 20;
  }

  /**
   * Record iteration
   * @param {Object} iterationData - Iteration data
   */
  recordIteration(iterationData) {
    this.healthMetrics.iterations.push({
      number: iterationData.number,
      hasErrors: (iterationData.errors?.length || 0) > 0,
      errorCount: iterationData.errors?.length || 0,
      progress: iterationData.progress || 0,
      timestamp: new Date().toISOString()
    });

    // Trim to max size
    if (this.healthMetrics.iterations.length > this.maxStoredIterations) {
      this.healthMetrics.iterations.shift();
    }

    // Analyze health after each iteration
    this.analyzeHealth();

    // Emit event if degraded
    if (this.healthMetrics.status !== 'healthy') {
      if (typeof EventBus !== 'undefined') {
        EventBus.emit('SESSION_HEALTH_DEGRADED', {
          status: this.healthMetrics.status,
          issues: this.healthMetrics.issues.slice(-5)
        });
      }
    }
  }

  /**
   * Analyze reasoning chain health
   */
  analyzeHealth() {
    const recentIterations = this.healthMetrics.iterations.slice(-5);

    if (recentIterations.length === 0) return;

    // Check consecutive errors
    const consecutiveErrors = this.countConsecutiveErrors(recentIterations);
    if (consecutiveErrors >= this.thresholds.maxConsecutiveErrors) {
      this.reportIssue('CONSECUTIVE_ERRORS', {
        count: consecutiveErrors,
        severity: 'high'
      });
    }

    // Check error rate
    const errorRate = this._calculateErrorRate(recentIterations);
    if (errorRate > this.thresholds.maxErrorRate) {
      this.reportIssue('HIGH_ERROR_RATE', {
        rate: errorRate,
        severity: 'medium'
      });
    }

    // Check progress rate
    const progressRate = this._calculateProgressRate(recentIterations);
    if (progressRate < this.thresholds.minProgressRate) {
      this.reportIssue('LOW_PROGRESS', {
        rate: progressRate,
        severity: 'low'
      });
    }

    // Update overall status
    this.updateStatus();
  }

  /**
   * Count consecutive errors from end
   * @param {Array} iterations - Recent iterations
   * @returns {number} Consecutive error count
   */
  countConsecutiveErrors(iterations) {
    let count = 0;
    for (let i = iterations.length - 1; i >= 0; i--) {
      if (iterations[i].hasErrors) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  /**
   * Calculate error rate
   * @private
   */
  _calculateErrorRate(iterations) {
    if (iterations.length === 0) return 0;

    const errorsCount = iterations.filter(i => i.hasErrors).length;
    return errorsCount / iterations.length;
  }

  /**
   * Calculate progress rate
   * @private
   */
  _calculateProgressRate(iterations) {
    if (iterations.length === 0) return 0;

    const totalProgress = iterations.reduce((sum, i) => sum + (i.progress || 0), 0);
    return totalProgress / iterations.length;
  }

  /**
   * Report issue
   * @param {string} type - Issue type
   * @param {Object} details - Issue details
   */
  reportIssue(type, details) {
    this.healthMetrics.issues.push({
      type,
      details,
      timestamp: new Date().toISOString()
    });

    // Trim to max size
    if (this.healthMetrics.issues.length > this.maxStoredIssues) {
      this.healthMetrics.issues.shift();
    }
  }

  /**
   * Update health status
   */
  updateStatus() {
    const recentIssues = this.healthMetrics.issues.slice(-5);
    const highSeverityIssues = recentIssues.filter(
      i => i.details.severity === 'high'
    );

    if (highSeverityIssues.length > 0) {
      this.healthMetrics.status = 'critical';
    } else if (recentIssues.length > 3) {
      this.healthMetrics.status = 'degraded';
    } else {
      this.healthMetrics.status = 'healthy';
    }
  }

  /**
   * Get health status
   * @returns {Object} Health status and metrics
   */
  getHealthStatus() {
    return {
      status: this.healthMetrics.status,
      recentIssues: this.healthMetrics.issues.slice(-5),
      metrics: {
        totalIterations: this.healthMetrics.iterations.length,
        errorRate: this.calculateOverallErrorRate(),
        consecutiveErrors: this.countConsecutiveErrors(
          this.healthMetrics.iterations.slice(-5)
        )
      }
    };
  }

  /**
   * Calculate overall error rate
   * @returns {string} Error rate percentage
   */
  calculateOverallErrorRate() {
    if (this.healthMetrics.iterations.length === 0) return '0%';

    const errorsCount = this.healthMetrics.iterations.filter(
      i => i.hasErrors
    ).length;
    return ((errorsCount / this.healthMetrics.iterations.length) * 100).toFixed(2) + '%';
  }

  /**
   * Check if chain is healthy
   * @returns {boolean}
   */
  isHealthy() {
    return this.healthMetrics.status === 'healthy';
  }

  /**
   * Check if chain is degraded
   * @returns {boolean}
   */
  isDegraded() {
    return this.healthMetrics.status === 'degraded';
  }

  /**
   * Check if chain is critical
   * @returns {boolean}
   */
  isCritical() {
    return this.healthMetrics.status === 'critical';
  }

  /**
   * Reset health monitor
   */
  reset() {
    this.healthMetrics = {
      iterations: [],
      issues: [],
      status: 'healthy'
    };
  }

  /**
   * Update thresholds
   * @param {Object} newThresholds - Threshold updates
   */
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * Get thresholds
   * @returns {Object} Current thresholds
   */
  getThresholds() {
    return { ...this.thresholds };
  }

  /**
   * Export health data
   * @returns {Object} Exportable data
   */
  exportData() {
    return {
      healthStatus: this.getHealthStatus(),
      iterations: this.healthMetrics.iterations,
      issues: this.healthMetrics.issues,
      thresholds: this.thresholds,
      timestamp: new Date().toISOString()
    };
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.ChainHealthMonitor = ChainHealthMonitor;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChainHealthMonitor;
}
