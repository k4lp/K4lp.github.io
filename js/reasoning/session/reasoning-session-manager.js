/**
 * ReasoningSessionManager
 *
 * Manages reasoning session lifecycle with full orchestration.
 * Integrates state machines, iteration tracking, middleware, and health monitoring.
 *
 * Features:
 * - Session creation and lifecycle management
 * - State machine integration
 * - Iteration tracking and metrics
 * - Middleware system
 * - Health monitoring
 * - Session archiving
 */

import { SessionStateMachine } from './session-state-machine.js';
import { IterationStateManager } from './iteration-state-manager.js';
import { ChainHealthMonitor } from '../monitoring/chain-health-monitor.js';
import { DisabledHealthMonitor } from '../monitoring/disabled-health-monitor.js';
import { ReasoningChainMiddleware } from '../chain/reasoning-chain-middleware.js';
import { eventBus } from '../../core/event-bus.js';
import { REASONING_HEALTH_MONITORING_ENABLED } from '../../config/reasoning-config.js';

export class ReasoningSessionManager {
  constructor(options = {}) {
    this.activeSessions = new Map();
    this.sessionIdCounter = 0;
    this.defaultHealthMonitoringEnabled = options.healthMonitoringEnabled ?? REASONING_HEALTH_MONITORING_ENABLED;
  }

  /**
   * Create new reasoning session
   * @param {string} query - User query
   * @param {Object} options - Session options
   * @returns {Object} Session object
   */
  createSession(query, options = {}) {
    const sessionId = this.generateSessionId();

    const healthMonitoringEnabled = options.healthMonitoringEnabled ?? this.defaultHealthMonitoringEnabled;

    const session = {
      id: sessionId,
      query,
      options: {
        maxIterations: options.maxIterations || 30,
        maxConsecutiveErrors: options.maxConsecutiveErrors || 3,
        healthMonitoringEnabled,
        ...options
      },
      startedAt: new Date().toISOString(),

      // State management
      stateMachine: new SessionStateMachine(sessionId),
      iterationManager: new IterationStateManager(sessionId),

      // Middleware and monitoring
      middleware: new ReasoningChainMiddleware(),
      healthMonitor: healthMonitoringEnabled
        ? new ChainHealthMonitor({
            maxConsecutiveErrors: options.maxConsecutiveErrors || 3,
            maxErrorRate: options.maxErrorRate || 0.5,
            minProgressRate: options.minProgressRate || 0.1
          })
        : new DisabledHealthMonitor(),

      // Metrics
      metrics: {
        iterations: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        consecutiveErrors: 0, // CRITICAL: Track consecutive errors for session health
        errors: [],
        contextCleanings: 0,
        recoveryAttempts: 0
      }
    };

    // Store session
    this.activeSessions.set(sessionId, session);

    // Transition to active
    session.stateMachine.transition('active', {
      message: 'Session started',
      query
    });

    // Emit event
    eventBus.emit?.('SESSION_CREATED', {
      sessionId,
      query,
      options: session.options
    });

    return session;
  }

  /**
   * Get active session by ID
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Session object
   */
  getSession(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Stop session
   * @param {string} sessionId - Session ID
   * @param {Object} metadata - Stop metadata
   */
  stopSession(sessionId, metadata = {}) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Transition to stopped
    session.stateMachine.transition('stopped', metadata);
    session.endedAt = new Date().toISOString();

    // Calculate duration
    const startTime = new Date(session.startedAt).getTime();
    const endTime = new Date(session.endedAt).getTime();
    session.duration = endTime - startTime;

    // Archive session
    this.archiveSession(session);

    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    // Emit event
    eventBus.emit?.('SESSION_STOPPED', {
      sessionId,
      duration: session.duration,
      metrics: session.metrics
    });
  }

  /**
   * Complete session successfully
   * @param {string} sessionId - Session ID
   * @param {Object} metadata - Completion metadata
   */
  completeSession(sessionId, metadata = {}) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Transition to completed
    session.stateMachine.transition('completed', metadata);
    session.endedAt = new Date().toISOString();

    // Calculate duration
    const startTime = new Date(session.startedAt).getTime();
    const endTime = new Date(session.endedAt).getTime();
    session.duration = endTime - startTime;

    // Archive session
    this.archiveSession(session);

    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    // Emit event
    eventBus.emit?.('SESSION_COMPLETED', {
      sessionId,
      duration: session.duration,
      metrics: session.metrics
    });
  }

  /**
   * Fail session
   * @param {string} sessionId - Session ID
   * @param {Object} metadata - Failure metadata
   */
  failSession(sessionId, metadata = {}) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Transition to failed
    session.stateMachine.transition('failed', metadata);
    session.endedAt = new Date().toISOString();

    // Archive session
    this.archiveSession(session);

    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    // Emit event
    eventBus.emit?.('SESSION_FAILED', {
      sessionId,
      metadata
    });
  }

  /**
   * Pause session
   * @param {string} sessionId - Session ID
   */
  pauseSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.stateMachine.transition('paused', {
      message: 'Session paused by user'
    });

    // Emit event
    eventBus.emit?.('SESSION_PAUSED', { sessionId });
  }

  /**
   * Resume session
   * @param {string} sessionId - Session ID
   */
  resumeSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.stateMachine.transition('active', {
      message: 'Session resumed'
    });

    // Emit event
    eventBus.emit?.('SESSION_RESUMED', { sessionId });
  }

  /**
   * Record iteration
   * @param {string} sessionId - Session ID
   * @param {Object} iterationData - Iteration data
   */
  recordIteration(sessionId, iterationData) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.metrics.iterations++;

    // CRITICAL: Manage consecutive errors counter
    const hasErrors = iterationData.hasErrors || (iterationData.errors && iterationData.errors.length > 0);

    if (hasErrors) {
      // Increment consecutive errors on failure
      session.metrics.consecutiveErrors++;

      // Record error details
      session.metrics.errors.push({
        iteration: session.metrics.iterations,
        errors: iterationData.errors || [],
        timestamp: new Date().toISOString()
      });
    } else {
      // Reset consecutive errors on success
      session.metrics.consecutiveErrors = 0;
    }

    // Record execution results
    if (iterationData.executionResults) {
      iterationData.executionResults.forEach(result => {
        if (result.success) {
          session.metrics.successfulExecutions++;
        } else {
          session.metrics.failedExecutions++;
        }
      });
    }

    // Record context cleanings
    if (iterationData.contextCleaned) {
      session.metrics.contextCleanings++;
    }

    // Record recovery attempts
    if (iterationData.recoveryAttempted) {
      session.metrics.recoveryAttempts++;
    }

    // Update health monitor
    session.healthMonitor.recordIteration({
      number: session.metrics.iterations,
      errors: iterationData.errors || [],
      progress: iterationData.progress || 0
    });
  }

  /**
   * Generate unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    this.sessionIdCounter++;
    return `session-${Date.now()}-${this.sessionIdCounter}`;
  }

  /**
   * Archive session for history
   * @param {Object} session - Session to archive
   */
  archiveSession(session) {
    const archive = {
      id: session.id,
      query: session.query,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      duration: session.duration,
      metrics: session.metrics,
      finalState: session.stateMachine.getCurrentState(),
      healthStatus: session.healthMonitor.getHealthStatus()
    };

    // Store in localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        const archivedSessions = JSON.parse(
          localStorage.getItem('gdrs_archived_sessions') || '[]'
        );
        archivedSessions.push(archive);

        // Keep only last 50 sessions
        if (archivedSessions.length > 50) {
          archivedSessions.shift();
        }

        localStorage.setItem('gdrs_archived_sessions', JSON.stringify(archivedSessions));
      } catch (error) {
        console.error('Error archiving session:', error);
      }
    }
  }

  /**
   * Get all active session IDs
   * @returns {Array} Session IDs
   */
  getActiveSessionIds() {
    return Array.from(this.activeSessions.keys());
  }

  /**
   * Get all active sessions
   * @returns {Array} Session objects
   */
  getActiveSessions() {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get active session count
   * @returns {number} Number of active sessions
   */
  getActiveSessionCount() {
    return this.activeSessions.size;
  }

  /**
   * Get session metrics
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Session metrics
   */
  getSessionMetrics(sessionId) {
    const session = this.activeSessions.get(sessionId);
    return session ? session.metrics : null;
  }

  /**
   * Get session health status
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Health status
   */
  getSessionHealth(sessionId) {
    const session = this.activeSessions.get(sessionId);
    return session ? session.healthMonitor.getHealthStatus() : null;
  }
}

// Legacy bridge (deprecated)
if (typeof window !== 'undefined') {
  window.ReasoningSessionManager = ReasoningSessionManager;
}
