import { eventBus } from '../../core/event-bus.js';

/**
 * ExecutionMetricsCollector
 *
 * Collects and aggregates execution metrics for analysis.
 * Provides real-time statistics and performance insights.
 *
 * Features:
 * - Execution count tracking
 * - Error type distribution
 * - Performance metrics (duration, code size)
 * - Success/failure rates
 * - Statistical calculations
 */

export class ExecutionMetricsCollector {
  constructor() {
    this.metrics = {
      executions: [],
      aggregates: {
        total: 0,
        successful: 0,
        failed: 0,
        timeouts: 0,
        retries: 0
      },
      errorCounts: new Map(),
      performanceMetrics: []
    };

    this.maxStoredExecutions = 100;
    this.maxPerformanceMetrics = 100;
  }

  /**
   * Record execution result
   * @param {Object} result - Execution result
   */
  recordExecution(result) {
    // Store execution summary
    this.metrics.executions.push({
      id: result.id,
      success: result.success,
      duration: result.executionTime,
      error: result.error?.name,
      timestamp: result.finishedAt || new Date().toISOString()
    });

    // Trim to max size
    if (this.metrics.executions.length > this.maxStoredExecutions) {
      this.metrics.executions.shift();
    }

    // Update aggregates
    this.metrics.aggregates.total++;

    if (result.success) {
      this.metrics.aggregates.successful++;
    } else {
      this.metrics.aggregates.failed++;

      // Track error types
      if (result.error) {
        const errorType = result.error.name || 'Unknown';
        this.metrics.errorCounts.set(
          errorType,
          (this.metrics.errorCounts.get(errorType) || 0) + 1
        );
      }

      // Track timeouts
      if (result.error?.message?.includes('timeout')) {
        this.metrics.aggregates.timeouts++;
      }
    }

    // Track retries
    if (result.attemptCount && result.attemptCount > 1) {
      this.metrics.aggregates.retries += (result.attemptCount - 1);
    }

    // Record performance
    this.recordPerformance(result);

    // Emit event
    eventBus.emit?.('METRICS_RECORDED', {
      result,
      currentMetrics: this.getSummary()
    });
  }

  /**
   * Record performance metrics
   * @param {Object} result - Execution result
   */
  recordPerformance(result) {
    if (result.executionTime === undefined) return;

    this.metrics.performanceMetrics.push({
      duration: result.executionTime,
      codeSize: result.analysis?.charCount || 0,
      timestamp: result.finishedAt || new Date().toISOString()
    });

    // Trim to max size
    if (this.metrics.performanceMetrics.length > this.maxPerformanceMetrics) {
      this.metrics.performanceMetrics.shift();
    }
  }

  /**
   * Get metrics summary
   * @returns {Object} Summary of all metrics
   */
  getSummary() {
    return {
      counts: { ...this.metrics.aggregates },
      rates: {
        successRate: this._calculateRate(
          this.metrics.aggregates.successful,
          this.metrics.aggregates.total
        ),
        failureRate: this._calculateRate(
          this.metrics.aggregates.failed,
          this.metrics.aggregates.total
        ),
        timeoutRate: this._calculateRate(
          this.metrics.aggregates.timeouts,
          this.metrics.aggregates.total
        )
      },
      errorBreakdown: Object.fromEntries(this.metrics.errorCounts),
      performance: {
        avgDuration: this.calculateAverageExecutionTime(),
        medianDuration: this.calculateMedianExecutionTime(),
        p95Duration: this._calculatePercentile(95),
        p99Duration: this._calculatePercentile(99),
        minDuration: this._getMinDuration(),
        maxDuration: this._getMaxDuration()
      }
    };
  }

  /**
   * Calculate average execution time
   * @returns {number} Average in ms
   */
  calculateAverageExecutionTime() {
    if (this.metrics.performanceMetrics.length === 0) return 0;

    const total = this.metrics.performanceMetrics.reduce(
      (sum, m) => sum + m.duration,
      0
    );
    return Number((total / this.metrics.performanceMetrics.length).toFixed(2));
  }

  /**
   * Calculate median execution time
   * @returns {number} Median in ms
   */
  calculateMedianExecutionTime() {
    if (this.metrics.performanceMetrics.length === 0) return 0;

    const sorted = this.metrics.performanceMetrics
      .map(m => m.duration)
      .sort((a, b) => a - b);

    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2))
      : Number(sorted[mid].toFixed(2));
  }

  /**
   * Calculate percentile
   * @private
   */
  _calculatePercentile(percentile) {
    if (this.metrics.performanceMetrics.length === 0) return 0;

    const sorted = this.metrics.performanceMetrics
      .map(m => m.duration)
      .sort((a, b) => a - b);

    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return Number(sorted[Math.max(0, index)].toFixed(2));
  }

  /**
   * Get minimum duration
   * @private
   */
  _getMinDuration() {
    if (this.metrics.performanceMetrics.length === 0) return 0;
    return Math.min(...this.metrics.performanceMetrics.map(m => m.duration));
  }

  /**
   * Get maximum duration
   * @private
   */
  _getMaxDuration() {
    if (this.metrics.performanceMetrics.length === 0) return 0;
    return Math.max(...this.metrics.performanceMetrics.map(m => m.duration));
  }

  /**
   * Calculate percentage rate
   * @private
   */
  _calculateRate(count, total) {
    if (total === 0) return 0;
    return Number(((count / total) * 100).toFixed(2));
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      executions: [],
      aggregates: {
        total: 0,
        successful: 0,
        failed: 0,
        timeouts: 0,
        retries: 0
      },
      errorCounts: new Map(),
      performanceMetrics: []
    };
  }

  /**
   * Get recent executions
   * @param {number} count - Number to return
   * @returns {Array} Recent executions
   */
  getRecentExecutions(count = 10) {
    return this.metrics.executions.slice(-count);
  }

  /**
   * Export metrics data
   * @returns {Object} Exportable metrics
   */
  exportData() {
    return {
      summary: this.getSummary(),
      recentExecutions: this.metrics.executions,
      timestamp: new Date().toISOString()
    };
  }
}

// Legacy bridge (deprecated)
if (typeof window !== 'undefined') {
  window.ExecutionMetricsCollector = ExecutionMetricsCollector;
}
