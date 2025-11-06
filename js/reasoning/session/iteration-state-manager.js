/**
 * IterationStateManager
 *
 * Tracks and manages individual iteration states within a reasoning session.
 * Provides detailed iteration lifecycle management and metrics.
 *
 * Features:
 * - Phase tracking (context building, API call, parsing, execution, etc.)
 * - Error recording
 * - Metrics collection per iteration
 * - Iteration history
 */

import { eventBus } from '../../core/event-bus.js';

export class IterationStateManager {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.iterations = [];
    this.currentIteration = null;
  }

  /**
   * Start new iteration
   * @param {number} iterationNumber - Iteration number (1-based)
   * @returns {Object} Iteration object
   */
  startIteration(iterationNumber) {
    this.currentIteration = {
      number: iterationNumber,
      startedAt: new Date().toISOString(),
      state: 'STARTED',
      phases: [],
      errors: [],
      metrics: {},
      operations: {
        vault: 0,
        memory: 0,
        tasks: 0,
        goals: 0,
        executions: 0
      }
    };

    this.iterations.push(this.currentIteration);

    eventBus.emit?.('SESSION_ITERATION_START', {
      sessionId: this.sessionId,
      iterationNumber
    });

    return this.currentIteration;
  }

  /**
   * Record phase completion
   * @param {string} phaseName - Name of phase
   * @param {Object} data - Phase data
   */
  recordPhase(phaseName, data = {}) {
    if (!this.currentIteration) return;

    this.currentIteration.phases.push({
      name: phaseName,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record error
   * @param {Error|Object} error - Error object
   */
  recordError(error) {
    if (!this.currentIteration) return;

    this.currentIteration.errors.push({
      error: {
        name: error.name || 'Error',
        message: error.message || String(error)
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record operation counts
   * @param {Object} operations - Operation counts
   */
  recordOperations(operations) {
    if (!this.currentIteration) return;

    Object.assign(this.currentIteration.operations, operations);
  }

  /**
   * Update iteration metrics
   * @param {Object} metrics - Metrics to add
   */
  updateMetrics(metrics) {
    if (!this.currentIteration) return;

    Object.assign(this.currentIteration.metrics, metrics);
  }

  /**
   * Complete current iteration
   * @param {Object} result - Iteration result
   * @returns {Object} Completed iteration
   */
  completeIteration(result = {}) {
    if (!this.currentIteration) return null;

    this.currentIteration.state = result.success ? 'COMPLETED' : 'FAILED';
    this.currentIteration.completedAt = new Date().toISOString();
    this.currentIteration.result = result;

    // Calculate duration
    const startTime = new Date(this.currentIteration.startedAt).getTime();
    const endTime = new Date(this.currentIteration.completedAt).getTime();
    this.currentIteration.duration = endTime - startTime;

    const completed = this.currentIteration;
    this.currentIteration = null;

    eventBus.emit?.('SESSION_ITERATION_COMPLETE', {
      sessionId: this.sessionId,
      iterationNumber: completed.number,
      result: completed.result
    });

    return completed;
  }

  /**
   * Get all iterations
   * @returns {Array} Iteration history
   */
  getIterations() {
    return [...this.iterations];
  }

  /**
   * Get current iteration
   * @returns {Object|null} Current iteration
   */
  getCurrentIteration() {
    return this.currentIteration;
  }

  /**
   * Get specific iteration by number
   * @param {number} iterationNumber - Iteration number
   * @returns {Object|null} Iteration object
   */
  getIteration(iterationNumber) {
    return this.iterations.find(iter => iter.number === iterationNumber);
  }

  /**
   * Get iteration metrics summary
   * @returns {Object} Aggregated metrics
   */
  getMetrics() {
    const completed = this.iterations.filter(i => i.completedAt);

    return {
      totalIterations: this.iterations.length,
      completed: completed.length,
      successful: this.iterations.filter(i => i.state === 'COMPLETED').length,
      failed: this.iterations.filter(i => i.state === 'FAILED').length,
      totalErrors: this.iterations.reduce((sum, i) => sum + i.errors.length, 0),
      averageDuration: this._calculateAverageDuration(completed),
      totalOperations: this._calculateTotalOperations()
    };
  }

  /**
   * Calculate average iteration duration
   * @private
   */
  _calculateAverageDuration(completedIterations) {
    if (completedIterations.length === 0) return 0;

    const totalDuration = completedIterations.reduce((sum, iter) => {
      return sum + (iter.duration || 0);
    }, 0);

    return Math.round(totalDuration / completedIterations.length);
  }

  /**
   * Calculate total operations across all iterations
   * @private
   */
  _calculateTotalOperations() {
    const totals = {
      vault: 0,
      memory: 0,
      tasks: 0,
      goals: 0,
      executions: 0
    };

    this.iterations.forEach(iter => {
      Object.keys(totals).forEach(key => {
        totals[key] += iter.operations[key] || 0;
      });
    });

    return totals;
  }

  /**
   * Get last N iterations
   * @param {number} count - Number of iterations
   * @returns {Array} Recent iterations
   */
  getRecentIterations(count) {
    return this.iterations.slice(-count);
  }

  /**
   * Export data for analysis
   * @returns {Object} Exportable data
   */
  exportData() {
    return {
      sessionId: this.sessionId,
      iterations: this.iterations,
      metrics: this.getMetrics(),
      timestamp: new Date().toISOString()
    };
  }
}

// Legacy bridge (deprecated)
if (typeof window !== 'undefined') {
  window.IterationStateManager = IterationStateManager;
}
