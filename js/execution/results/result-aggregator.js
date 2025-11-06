/**
 * ResultAggregator
 *
 * Aggregates execution results and calculates metrics.
 * Lightweight, focused module for statistical aggregation.
 *
 * Provides:
 * - Real-time metric aggregation
 * - Statistical calculations (mean, median, percentiles)
 * - Error type tracking
 * - Performance metrics
 */

export class ResultAggregator {
  constructor() {
    this.reset();
  }

  /**
   * Add result to aggregation
   * @param {Object} result - Execution result
   */
  add(result) {
    // Update counts
    this.metrics.total++;

    if (result.success) {
      this.metrics.successful++;
    } else {
      this.metrics.failed++;

      // Track error types
      if (result.error) {
        const errorType = result.error.name || 'Unknown';
        this.metrics.errorTypes.set(
          errorType,
          (this.metrics.errorTypes.get(errorType) || 0) + 1
        );
      }

      // Track timeouts
      if (result.error?.message?.includes('timeout') ||
          result.error?.message?.includes('timed out')) {
        this.metrics.timeouts++;
      }
    }

    // Track retries
    if (result.attemptCount && result.attemptCount > 1) {
      this.metrics.retries += (result.attemptCount - 1);
    }

    // Track durations
    if (result.executionTime !== undefined) {
      this.durations.push(result.executionTime);
    }

    // Track code sizes
    if (result.analysis?.charCount !== undefined) {
      this.codeSizes.push(result.analysis.charCount);
    }

    // Keep last N results for detailed analysis
    this.recentResults.push({
      id: result.id,
      success: result.success,
      duration: result.executionTime,
      error: result.error?.name,
      timestamp: result.finishedAt || new Date().toISOString()
    });

    // Trim to max size
    if (this.recentResults.length > this.maxRecentResults) {
      this.recentResults.shift();
    }
  }

  /**
   * Get aggregated metrics
   * @returns {Object} Metrics object
   */
  getMetrics() {
    return {
      counts: {
        total: this.metrics.total,
        successful: this.metrics.successful,
        failed: this.metrics.failed,
        timeouts: this.metrics.timeouts,
        retries: this.metrics.retries
      },
      rates: {
        successRate: this._calculateRate(this.metrics.successful, this.metrics.total),
        failureRate: this._calculateRate(this.metrics.failed, this.metrics.total),
        timeoutRate: this._calculateRate(this.metrics.timeouts, this.metrics.total)
      },
      errorTypes: Object.fromEntries(this.metrics.errorTypes),
      performance: {
        avgDuration: this._calculateMean(this.durations),
        medianDuration: this._calculateMedian(this.durations),
        p95Duration: this._calculatePercentile(this.durations, 95),
        p99Duration: this._calculatePercentile(this.durations, 99),
        minDuration: this.durations.length > 0 ? Math.min(...this.durations) : 0,
        maxDuration: this.durations.length > 0 ? Math.max(...this.durations) : 0
      },
      codeSize: {
        avgSize: this._calculateMean(this.codeSizes),
        medianSize: this._calculateMedian(this.codeSizes),
        minSize: this.codeSizes.length > 0 ? Math.min(...this.codeSizes) : 0,
        maxSize: this.codeSizes.length > 0 ? Math.max(...this.codeSizes) : 0
      }
    };
  }

  /**
   * Get recent results
   * @param {number} count - Number of results to return
   * @returns {Array} Recent results
   */
  getRecentResults(count) {
    if (!count) return [...this.recentResults];
    return this.recentResults.slice(-count);
  }

  /**
   * Reset aggregator
   */
  reset() {
    this.metrics = {
      total: 0,
      successful: 0,
      failed: 0,
      timeouts: 0,
      retries: 0,
      errorTypes: new Map()
    };

    this.durations = [];
    this.codeSizes = [];
    this.recentResults = [];
    this.maxRecentResults = 100;
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
   * Calculate mean
   * @private
   */
  _calculateMean(values) {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Number((sum / values.length).toFixed(2));
  }

  /**
   * Calculate median
   * @private
   */
  _calculateMedian(values) {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
    }
    return Number(sorted[mid].toFixed(2));
  }

  /**
   * Calculate percentile
   * @private
   */
  _calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;

    return Number(sorted[Math.max(0, index)].toFixed(2));
  }

  /**
   * Get summary string
   * @returns {string} Human-readable summary
   */
  getSummary() {
    const metrics = this.getMetrics();

    return [
      `Total: ${metrics.counts.total}`,
      `Success: ${metrics.counts.successful} (${metrics.rates.successRate}%)`,
      `Failed: ${metrics.counts.failed} (${metrics.rates.failureRate}%)`,
      `Avg Duration: ${metrics.performance.avgDuration}ms`,
      `Median Duration: ${metrics.performance.medianDuration}ms`
    ].join(' | ');
  }

  /**
   * Export data for analysis
   * @returns {Object} Exportable data
   */
  exportData() {
    return {
      metrics: this.getMetrics(),
      recentResults: this.recentResults,
      timestamp: new Date().toISOString()
    };
  }
}

// Legacy bridge (deprecated)
if (typeof window !== 'undefined') {
  window.ResultAggregator = ResultAggregator;
}
